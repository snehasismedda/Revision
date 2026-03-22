import * as questionModel from '../models/questionModel.js';
import * as topicModel from '../models/topicModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js';
import * as deletionService from '../services/deletionService.js';
import * as subjectModel from '../models/subjectModel.js';
import { parseQuestionToRichText } from '../services/ai_service/response/questionParser.js';

export const getQuestions = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const questions = await questionModel.getQuestionsBySubject(subjectId);
        res.json({ questions });
    } catch (error) {
        next(error);
    }
};

export const getQuestionImage = async (req, res, next) => {
    try {
        const { subjectId, questionId } = req.params;

        let image = await questionModel.getQuestionImage(questionId, subjectId);

        if (!image || !image.content) {
            const question = await questionModel.getQuestionById(questionId, subjectId);

            if (question?.source_image_id) {
                const sourceImg = await sourceImageModel.getSourceImageById(question.source_image_id, subjectId);
                if (sourceImg) image = { content: sourceImg.data };
            } else if (question?.parent_id) {
                image = await questionModel.getQuestionImage(question.parent_id, subjectId);
            }
        }
        if (!image || !image.content) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.json({ content: image.content });
    } catch (error) {
        next(error);
    }
};

export const createQuestion = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const { content, type, skipAI, tags: manualTags } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const typeValue = type === 'image' ? 'image' : 'text';
        const finalManualTags = Array.isArray(manualTags) ? manualTags : [];

        // Check for Skip AI
        if (skipAI) {
            let sourceImageId = null;
            if (typeValue === 'image') {
                const savedImage = await sourceImageModel.createSourceImage(subjectId, content);
                sourceImageId = savedImage.id;
            }

            const [question] = await questionModel.createQuestions({
                subject_id: subjectId,
                content: typeValue === 'text' ? content : '',
                type: typeValue,
                source_image_id: sourceImageId,
                tags: JSON.stringify(finalManualTags)
            });
            await subjectModel.touchSubject(subjectId);
            return res.status(201).json({ questions: [question] });
        }

        const parsedQuestions = await parseQuestionToRichText({
            content,
            type: typeValue,
            topics: [] // No topics filter needed
        });

        const { questions } = parsedQuestions;

        let sourceImageId = null;
        if (typeValue === 'image') {
            const savedImage = await sourceImageModel.createSourceImage(subjectId, content);
            sourceImageId = savedImage.id;
        }

        if (questions.length === 1) {
            // Merge manual tags with AI tags, avoiding duplicates
            const aiTags = questions[0].tags || [];
            const mergedTags = [...new Set([...finalManualTags, ...aiTags])];

            const question = await questionModel.createQuestions({
                subject_id: subjectId,
                content: questions[0].question,
                type: typeValue,
                formatted_content: parsedQuestions,
                source_image_id: sourceImageId,
                tags: JSON.stringify(mergedTags)
            });
            await subjectModel.touchSubject(subjectId);
            return res.status(201).json({ questions: question });
        } else {
            const parentQuestion = await questionModel.createQuestions({
                subject_id: subjectId,
                type: typeValue,
                formatted_content: parsedQuestions,
                tags: JSON.stringify(finalManualTags) // Parent gets manual tags
            });

            const childQuestions = await questionModel.createQuestions(questions.map(q => {
                const aiTags = q.tags || [];
                const mergedTags = [...new Set([...finalManualTags, ...aiTags])];
                return {
                    subject_id: subjectId,
                    content: q.question,
                    type: typeValue,
                    parent_id: parentQuestion[0].id,
                    tags: JSON.stringify(mergedTags),
                    source_image_id: sourceImageId,
                };
            }));
            await subjectModel.touchSubject(subjectId);
            return res.status(201).json({ questions: childQuestions });
        }
    } catch (error) {
        next(error);
    }
};

export const deleteQuestion = async (req, res, next) => {
    try {
        const { subjectId, questionId } = req.params;
        const { questionIds } = req.body;

        const ids = questionIds && Array.isArray(questionIds) ? questionIds : [questionId];

        if (ids.length === 0 || !ids[0]) {
            return res.status(400).json({ error: 'No question IDs provided' });
        }

        await questionModel.softDeleteQuestions(ids, subjectId);
        await deletionService.deleteQuestionsCascade(ids, subjectId);
        
        res.json({ message: 'Questions deleted successfully', deletedCount: ids.length });
    } catch (error) {
        next(error);
    }
};


export const updateQuestion = async (req, res, next) => {
    try {
        const { subjectId, questionId } = req.params;
        const { content, type, tags } = req.body;

        const updateData = {};
        if (content !== undefined) {
            updateData.content = content;
            updateData.formatted_content = null;
        }
        if (type !== undefined) updateData.type = type;
        if (tags !== undefined) updateData.tags = JSON.stringify(tags);

        const question = await questionModel.updateQuestion(questionId, subjectId, updateData);
        await subjectModel.touchSubject(subjectId);
        res.json({ question });
    } catch (error) {
        next(error);
    }
};

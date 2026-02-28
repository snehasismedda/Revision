import * as questionModel from '../models/questionModel.js';
import * as topicModel from '../models/topicModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js';
import * as deletionService from '../services/deletionService.js';
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
        const { topicId, content, type } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        const subjectTopics = await topicModel.findTopicsBySubject({ subjectId });

        const allParentIds = new Set(subjectTopics.map(t => t.parent_id).filter(id => id !== null));
        const leafTopics = subjectTopics.filter(t => !allParentIds.has(t.id));
        const topicNames = leafTopics.map(t => t.name);

        const typeValue = type === 'image' ? 'image' : 'text';

        const parsedQuestions = await parseQuestionToRichText({
            content,
            type: typeValue,
            topics: topicNames
        });

        const { questions } = parsedQuestions;

        let sourceImageId = null;
        if (typeValue === 'image') {
            const savedImage = await sourceImageModel.createSourceImage(subjectId, content);
            sourceImageId = savedImage.id;
        }

        if (questions.length === 1) {
            const question = await questionModel.createQuestions({
                subject_id: subjectId,
                topic_id: topicId,
                content: questions[0].question,
                type: typeValue,
                formatted_content: parsedQuestions,
                source_image_id: sourceImageId,
                tags: JSON.stringify(questions[0].tags)
            });
            return res.status(201).json({ questions: question });
        } else {
            const parentQuestion = await questionModel.createQuestions({
                subject_id: subjectId,
                topic_id: topicId,
                type: typeValue,
                formatted_content: parsedQuestions,
            });

            const childQuestions = await questionModel.createQuestions(questions.map(q => ({
                subject_id: subjectId,
                topic_id: topicId,
                content: q.question,
                type: typeValue,
                parent_id: parentQuestion[0].id,
                tags: JSON.stringify(q.tags),
                source_image_id: sourceImageId,
            })));
            return res.status(201).json({ questions: childQuestions });
        }
    } catch (error) {
        next(error);
    }
};

export const deleteQuestion = async (req, res, next) => {
    try {
        const { subjectId, questionId } = req.params;
        await questionModel.deleteQuestion(questionId, subjectId);
        await deletionService.deleteQuestionCascade(questionId);
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const updateQuestion = async (req, res, next) => {
    try {
        const { subjectId, questionId } = req.params;
        const { topicId, content, type, tags } = req.body;

        const updateData = {};
        if (topicId !== undefined) updateData.topic_id = topicId;
        if (content !== undefined) {
            updateData.content = content;
            updateData.formatted_content = null;
        }
        if (type !== undefined) updateData.type = type;
        if (tags !== undefined) updateData.tags = JSON.stringify(tags);

        const question = await questionModel.updateQuestion(questionId, subjectId, updateData);
        res.json({ question });
    } catch (error) {
        next(error);
    }
};

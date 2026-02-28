import * as questionModel from '../models/questionModel.js';
import * as topicModel from '../models/topicModel.js';
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

        // First try to get the image directly from this question
        let image = await questionModel.getQuestionImage(questionId, subjectId);

        // If not found, check if this question has a source_image_id (shared image)
        if (!image || !image.content) {
            const question = await questionModel.getQuestionById(questionId, subjectId);
            if (question?.source_image_id) {
                image = await questionModel.getQuestionImage(question.source_image_id, subjectId);
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

        // Fetch available topics for AI context
        const subjectTopics = await topicModel.findTopicsBySubject({ subjectId });

        // Find leaf topics (those that are not parent_ids for any other topic)
        const allParentIds = new Set(subjectTopics.map(t => t.parent_id).filter(id => id !== null));
        const leafTopics = subjectTopics.filter(t => !allParentIds.has(t.id));
        const topicNames = leafTopics.map(t => t.name);

        const typeValue = type === 'image' ? 'image' : 'text';

        // AI parser now returns an ARRAY of formatted question objects
        const parsedQuestions = await parseQuestionToRichText({
            content,
            type: typeValue,
            topics: topicNames
        });

        if (parsedQuestions.length === 1) {
            // Single question — simple path
            const question = await questionModel.createQuestion(
                subjectId, topicId, content, typeValue, parsedQuestions[0]
            );
            return res.status(201).json({ questions: [question] });
        }

        // Multiple questions detected in the input
        // For images: first row stores the actual image data,
        // subsequent rows store a placeholder and reference the first via source_image_id
        const firstQuestion = await questionModel.createQuestion(
            subjectId, topicId, content, typeValue, parsedQuestions[0]
        );

        const siblingRows = parsedQuestions.slice(1).map((formatted) => ({
            subject_id: subjectId,
            topic_id: topicId || null,
            content: typeValue === 'image' ? `[shared image: ${firstQuestion.id}]` : content,
            type: typeValue,
            formatted_content: formatted,
            source_image_id: firstQuestion.id,
        }));

        const siblings = await questionModel.createQuestions(siblingRows);

        res.status(201).json({ questions: [firstQuestion, ...siblings] });
    } catch (error) {
        next(error);
    }
};

export const deleteQuestion = async (req, res, next) => {
    try {
        const { subjectId, questionId } = req.params;
        await questionModel.deleteQuestion(questionId, subjectId);
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
        if (content !== undefined) updateData.content = content;
        if (type !== undefined) updateData.type = type;
        if (tags !== undefined) updateData.tags = JSON.stringify(tags);

        // If content changed, we might want to re-parse it
        if (content) {
            const typeValue = type || 'text';
            const parsedQuestions = await parseQuestionToRichText({ content, type: typeValue });
            if (parsedQuestions && parsedQuestions.length > 0) {
                updateData.formatted_content = JSON.stringify(parsedQuestions[0]);
            }
        }

        const question = await questionModel.updateQuestion(questionId, subjectId, updateData);
        res.json({ question });
    } catch (error) {
        next(error);
    }
};

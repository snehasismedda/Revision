import * as questionModel from '../models/questionModel.js';
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

        const typeValue = type === 'image' ? 'image' : 'text';

        // AI parser now returns an ARRAY of formatted question objects
        const parsedQuestions = await parseQuestionToRichText({ content, type: typeValue });

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

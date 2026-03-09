import * as noteModel from '../models/noteModel.js';
import * as questionModel from '../models/questionModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js';
import * as topicModel from '../models/topicModel.js';
import { ollama, models } from '../config/ollama.js';
import { noteAnalysisPrompt } from '../system_prompts/index.js';
import { parseQuestionToRichText } from '../services/ai_service/response/questionParser.js';

export const getAllImages = async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const images = await sourceImageModel.getAllSourceImagesByUser(
            req.user.id,
            limit ? parseInt(limit, 10) : undefined,
            offset ? parseInt(offset, 10) : undefined
        );
        res.status(200).json({ images });
    } catch (error) {
        console.error('[getAllImages]', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
};

export const getImagesBySubject = async (req, res) => {
    try {
        const { id: subjectId } = req.params;
        const { limit, offset } = req.query;
        const images = await sourceImageModel.getSourceImagesBySubject(
            subjectId,
            limit ? parseInt(limit, 10) : undefined,
            offset ? parseInt(offset, 10) : undefined
        );
        res.status(200).json({ images });
    } catch (error) {
        console.error('[getImagesBySubject]', error);
        res.status(500).json({ error: 'Failed to fetch subject images' });
    }
};

export const saveImageAs = async (req, res) => {
    const { content, type, subjectId, skipAI } = req.body;
    if (!content || !type || !subjectId) {
        return res.status(400).json({ error: 'content, type, and subjectId are required' });
    }

    try {
        // 1. Create source image
        const savedImage = await sourceImageModel.createSourceImage(subjectId, content);
        const sourceImageId = savedImage.id;

        if (type === 'question') {
            if (skipAI) {
                const results = await questionModel.createQuestions({
                    subject_id: subjectId,
                    content: 'Captured Question',
                    type: 'image',
                    source_image_id: sourceImageId,
                    tags: '[]'
                });
                return res.status(201).json({ questions: results });
            }

            const subjectTopics = await topicModel.findTopicsBySubject({ subjectId });
            const allParentIds = new Set(subjectTopics.map(t => t.parent_id).filter(id => id !== null));
            const leafTopics = subjectTopics.filter(t => !allParentIds.has(t.id));
            const topicNames = leafTopics.map(t => t.name);

            const parsedQuestions = await parseQuestionToRichText({
                content,
                type: 'image',
                topics: topicNames
            });

            const { questions } = parsedQuestions || {};

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                return res.status(422).json({ error: 'AI failed to extract any questions from the image. Please try a clearer image.' });
            }

            if (questions.length === 1) {
                const results = await questionModel.createQuestions({
                    subject_id: subjectId,
                    content: questions[0].question,
                    type: 'image',
                    formatted_content: parsedQuestions,
                    source_image_id: sourceImageId,
                    tags: JSON.stringify(questions[0].tags || [])
                });
                return res.status(201).json({ questions: results });
            } else {
                const parentQuestion = await questionModel.createQuestions({
                    subject_id: subjectId,
                    type: 'image',
                    formatted_content: parsedQuestions,
                    source_image_id: sourceImageId, // Associate source image with parent too
                });

                const childQuestions = await questionModel.createQuestions(questions.map(q => ({
                    subject_id: subjectId,
                    content: q.question,
                    type: 'image',
                    parent_id: parentQuestion[0].id,
                    tags: JSON.stringify(q.tags || []),
                    source_image_id: sourceImageId,
                })));
                return res.status(201).json({ questions: childQuestions });
            }
        } else if (type === 'note') {
            const { title: manualTitle, noteContent: manualContent } = req.body;

            // Use manual input or defaults - DO NOT use AI here as per user request
            const title = manualTitle || 'New Image Note';
            const noteContent = manualContent || 'No description provided.';

            const note = await noteModel.createNote(subjectId, null, title, noteContent, sourceImageId);
            res.status(201).json({ note });
        } else {
            res.status(400).json({ error: 'invalid type' });
        }
    } catch (error) {
        console.error('[saveImageAs]', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
};

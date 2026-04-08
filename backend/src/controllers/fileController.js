import * as noteModel from '../models/noteModel.js';
import * as questionModel from '../models/questionModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js'; // Using the alias inside sourceImageModel
import * as topicModel from '../models/topicModel.js';
import { ollama, models } from '../config/ollama.js';
import { noteAnalysisPrompt } from '../system_prompts/index.js';
import { parseQuestionToRichText } from '../services/ai_service/response/questionParser.js';

export const getAllFiles = async (req, res) => {
    try {
        const { limit, offset, type } = req.query;
        const files = await sourceImageModel.getAllSourceImagesByUser(
            req.user.id,
            limit ? parseInt(limit, 10) : undefined,
            offset ? parseInt(offset, 10) : undefined,
            type
        );
        res.status(200).json({ files });
    } catch (error) {
        console.error('[getAllFiles]', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
};

export const getFilesBySubject = async (req, res) => {
    try {
        const { id: subjectId } = req.params;
        const { limit, offset, type } = req.query;
        const files = await sourceImageModel.getSourceImagesBySubject(
            subjectId,
            limit ? parseInt(limit, 10) : undefined,
            offset ? parseInt(offset, 10) : undefined,
            type
        );
        res.status(200).json({ files });
    } catch (error) {
        console.error('[getFilesBySubject]', error);
        res.status(500).json({ error: 'Failed to fetch subject files' });
    }
};

export const saveFileAs = async (req, res) => {
    const { content, type, fileType, fileName, subjectId, skipAI } = req.body; // type here is content type ('question', 'note'). fileType is 'image', 'pdf', etc.
    if (!content || !type || !subjectId) {
        return res.status(400).json({ error: 'content, type, and subjectId are required' });
    }

    try {
        // 1. Create file 
        const savedFile = await sourceImageModel.createFile(subjectId, content, fileType || 'image', fileName);
        const sourceImageId = savedFile.id;

        if (type === 'file') {
            return res.status(201).json({ file: savedFile });
        } else if (type === 'question') {
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
        console.error('[saveFileAs]', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
};

export const deleteFile = async (req, res) => {
    try {
        const { subjectId, id } = req.params;
        await sourceImageModel.softDeleteSourceImage(id, subjectId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[deleteFile]', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

export const updateFile = async (req, res) => {
    try {
        const { subjectId, id } = req.params;
        const { fileName } = req.body;
        const [updatedFile] = await sourceImageModel.updateFileName(id, subjectId, fileName);
        if (!updatedFile) return res.status(404).json({ error: 'File not found' });
        res.status(200).json({ file: updatedFile });
    } catch (error) {
        console.error('[updateFile]', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
};

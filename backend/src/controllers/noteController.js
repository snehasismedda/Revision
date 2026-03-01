import * as noteModel from '../models/noteModel.js';
import * as questionModel from '../models/questionModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js';
import { generateNoteFromQuestion } from '../services/ai_service/response/noteGenerator.js';

export const getNoteImage = async (req, res, next) => {
    try {
        const { subjectId, noteId } = req.params;
        const note = await noteModel.getNotesBySubject(subjectId).then(notes => notes.find(n => n.id === noteId));
        if (!note || !note.source_image_id) return res.status(404).json({ error: 'Image not found' });

        const sourceImg = await sourceImageModel.getSourceImageById(note.source_image_id, subjectId);
        if (!sourceImg) return res.status(404).json({ error: 'Image content not found' });

        res.json({ content: sourceImg.data });
    } catch (error) {
        next(error);
    }
};

export const getNotes = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const notes = await noteModel.getNotesBySubject(subjectId);
        res.json({ notes });
    } catch (error) {
        next(error);
    }
};

export const createNote = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const { questionId, title, content, sourceImageId: existingSourceImageId, sourceImageContent } = req.body;

        let finalContent = content;
        let finalTitle = title;
        let sourceImageId = existingSourceImageId;

        if (sourceImageContent && !sourceImageId) {
            const savedImage = await sourceImageModel.createSourceImage(subjectId, sourceImageContent);
            sourceImageId = savedImage.id;
        }

        if (questionId && !content) {
            const question = await questionModel.getQuestionById(questionId, subjectId);
            if (!question) {
                return res.status(404).json({ error: 'Question not found' });
            }

            let promptText = question.content || '';

            if (!promptText && question.formatted_content) {
                if (typeof question.formatted_content === 'object') {
                    // Try to join all questions if it's our new raw AI JSON structure
                    if (Array.isArray(question.formatted_content.questions)) {
                        promptText = question.formatted_content.questions.map(q => q.question).join('\n\n');
                    } else {
                        promptText = JSON.stringify(question.formatted_content);
                    }
                } else {
                    promptText = question.formatted_content;
                }
            }

            if (!promptText) {
                return res.status(400).json({ error: 'Cannot generate note: No text found in this question. Please ensure the question has been processed first.' });
            }

            const aiResponse = await generateNoteFromQuestion(promptText);

            finalTitle = `AI Note: ${aiResponse.title}` || `AI Note: ${Math.random().toString(36).substring(2, 15)}`;
            finalContent = aiResponse.content;
        }

        if (!finalTitle || !finalContent) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const note = await noteModel.createNote(subjectId, questionId, finalTitle, finalContent, sourceImageId);
        res.status(201).json({ note });
    } catch (error) {
        next(error);
    }
};

export const deleteNote = async (req, res, next) => {
    try {
        const { subjectId, noteId } = req.params;
        await noteModel.deleteNote(noteId, subjectId);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const updateNote = async (req, res, next) => {
    try {
        const { subjectId, noteId } = req.params;
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const note = await noteModel.updateNote(noteId, subjectId, { title, content });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({ note });
    } catch (error) {
        next(error);
    }
};

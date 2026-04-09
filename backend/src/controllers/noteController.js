import * as noteModel from '../models/noteModel.js';
import * as questionModel from '../models/questionModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js';
import { generateNoteFromQuestion } from '../services/ai_service/response/noteGenerator.js';
import * as deletionService from '../services/deletionService.js';
import * as subjectModel from '../models/subjectModel.js';
import db from '../knex/db.js';

export const getNoteImages = async (req, res, next) => {
    try {
        const { subjectId, noteId } = req.params;
        const notes = await noteModel.getNotesBySubject(subjectId, undefined, 0, false);
        const note = notes.find(n => String(n.id) === String(noteId));
        
        if (!note || !note.source_image_ids || note.source_image_ids.length === 0) {
            return res.json({ images: [] });
        }

        const images = await db('revision.files')
            .whereIn('id', note.source_image_ids)
            .where({ subject_id: subjectId, is_deleted: false });

        res.json({ images: images.map(img => ({ id: img.id, referenceId: img.reference_id, data: img.data })) });
    } catch (error) {
        next(error);
    }
};

export const getAllNotes = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const { limit, offset } = req.query;
        const limitNum = limit ? parseInt(limit) : undefined;
        const offsetNum = offset ? parseInt(offset) : 0;

        const [notes, totalCount] = await Promise.all([
            noteModel.getNotesBySubject(subjectId, limitNum, offsetNum),
            noteModel.getNoteCountBySubject(subjectId)
        ]);

        res.json({ notes, totalCount: parseInt(totalCount.count) });
    } catch (error) {
        next(error);
    }
};

export const createNote = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const { questionId, title, content, sourceImageIds: existingSourceImageIds, images, parentNoteId, tags } = req.body;

        let finalContent = content;
        let finalTitle = title;
        let sourceImageIds = existingSourceImageIds || [];

        if (questionId && !content) {
            const question = await questionModel.getQuestionById(questionId, subjectId);
            if (!question) {
                return res.status(404).json({ error: 'Question not found' });
            }

            let promptText = question.content || '';

            if (!promptText && question.formatted_content) {
                if (typeof question.formatted_content === 'object') {
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

        // Handle multiple image uploads bundled with the note
        // Moved here to ensure finalTitle is available (especially for AI generation)
        if (images && Array.isArray(images) && images.length > 0) {
            const uploadPromises = images.map(img => 
                sourceImageModel.createSourceImage(subjectId, img.data, 'image', `${finalTitle}_${img.referenceId}`, img.referenceId)
            );
            const savedImages = await Promise.all(uploadPromises);
            const newImageIds = savedImages.map(img => img.id);
            sourceImageIds = [...sourceImageIds, ...newImageIds];
        }

        const note = await noteModel.createNote(subjectId, questionId, finalTitle, finalContent, sourceImageIds, parentNoteId, tags);

        await subjectModel.touchSubject(subjectId);

        res.status(201).json({ note });
    } catch (error) {
        next(error);
    }
};

export const deleteNote = async (req, res, next) => {
    try {
        const { subjectId, noteId } = req.params;
        const { noteIds } = req.body;

        const ids = noteIds && Array.isArray(noteIds) ? noteIds : [noteId];

        if (ids.length === 0 || !ids[0]) {
            return res.status(400).json({ error: 'No note IDs provided' });
        }

        await noteModel.softDeleteNotes(ids, subjectId);
        await deletionService.deleteNotesCascade(ids, subjectId);


        res.json({ message: 'Notes deleted successfully', deletedCount: ids.length });
    } catch (error) {
        next(error);
    }
};

export const updateNote = async (req, res, next) => {
    try {
        const { subjectId, noteId } = req.params;
        const { title, content, tags, sourceImageIds: existingSourceImageIds, images } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        let sourceImageIds = existingSourceImageIds || [];

        // Handle multiple image uploads bundled with the update
        if (images && Array.isArray(images) && images.length > 0) {
            const uploadPromises = images.map(img => 
                sourceImageModel.createSourceImage(subjectId, img.data, 'image', `${title}_${img.referenceId}`, img.referenceId)
            );
            const savedImages = await Promise.all(uploadPromises);
            const newImageIds = savedImages.map(img => img.id);
            sourceImageIds = [...sourceImageIds, ...newImageIds];
        }

        const note = await noteModel.updateNote(noteId, subjectId, { 
            title, 
            content, 
            tags, 
            source_image_ids: sourceImageIds 
        });
        
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await subjectModel.touchSubject(subjectId);
        res.json({ note });
    } catch (error) {
        next(error);
    }
};

export const getNotes = async (req, res, next) => {
    try {
        const { noteIds } = req.params;
        const ids = noteIds.split(',').filter(Boolean);
        const notes = await noteModel.getNotesByIds(ids);
        if (!notes) {
            return res.status(404).json({ error: 'Notes not found' });
        }
        res.json({ notes });
    } catch (error) {
        next(error);
    }
};

export const getNoteTags = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const tags = await noteModel.getUniqueTagsBySubject(subjectId);
        res.json({ tags });
    } catch (error) {
        next(error);
    }
};

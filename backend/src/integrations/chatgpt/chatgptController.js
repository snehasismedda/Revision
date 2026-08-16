import db from '../../knex/db.js';
import * as subjectModel from '../../models/subjectModel.js';
import * as noteModel from '../../models/noteModel.js';
import * as questionModel from '../../models/questionModel.js';
import * as solutionModel from '../../models/solutionModel.js';
import * as fileModel from '../../models/fileModel.js';
import * as folderModel from '../../models/folderModel.js';

/**
 * Controller handling ChatGPT Action requests.
 */

// Helper to save base64 images into revision.files
const handleImageUploads = async (subjectId, imagesData, titlePrefix = 'upload') => {
    if (!imagesData) return [];
    const list = Array.isArray(imagesData) ? imagesData : [imagesData];
    const imageIds = [];

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'string' || !item.trim()) continue;
        
        try {
            const file = await fileModel.createFile({
                subjectId,
                data: item.trim(),
                fileType: 'image',
                fileName: `${titlePrefix}_image_${Date.now()}_${i + 1}.png`
            });
            if (file?.id) {
                imageIds.push(file.id);
            }
        } catch (err) {
            console.error('[ChatGPT Image Upload Error]:', err);
        }
    }
    return imageIds;
};

// 1. Get list of available subjects
export const getSubjects = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const subjects = await subjectModel.findSubjectsByUser({ userId, archived: 'false' });
        
        const formatted = subjects.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            tags: typeof s.tags === 'string' ? JSON.parse(s.tags || '[]') : (s.tags || [])
        }));

        res.json({
            count: formatted.length,
            subjects: formatted
        });
    } catch (error) {
        next(error);
    }
};

// 2. Explicitly Create a Subject (when user specifically wants to create a new subject)
export const createSubject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, description = '', tags = [] } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Subject name is required' });
        }

        const trimmedName = name.trim();

        // Check if subject already exists for this user (case-insensitive)
        const existing = await db('revision.subjects')
            .where('user_id', userId)
            .whereRaw('LOWER(name) = ?', [trimmedName.toLowerCase()])
            .where('is_deleted', false)
            .first();

        if (existing) {
            return res.status(200).json({
                message: `Subject '${existing.name}' already exists`,
                subject: {
                    id: existing.id,
                    name: existing.name,
                    description: existing.description,
                    tags: typeof existing.tags === 'string' ? JSON.parse(existing.tags || '[]') : (existing.tags || [])
                }
            });
        }

        const created = await subjectModel.createSubject({
            userId,
            name: trimmedName,
            description: description || null,
            tags: Array.isArray(tags) ? tags : [tags]
        });

        res.status(201).json({
            message: `Subject '${created.name}' created successfully`,
            subject: {
                id: created.id,
                name: created.name,
                description: created.description,
                tags: typeof created.tags === 'string' ? JSON.parse(created.tags || '[]') : (created.tags || [])
            }
        });
    } catch (error) {
        next(error);
    }
};

// 3. Save standalone Study Note into existing subject (with optional image)
export const saveNote = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { 
            subjectId,
            subjectName,
            title, 
            content, 
            tags = [], 
            keyHighlights = [], 
            imageBase64, 
            images
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'title and content are required' });
        }

        if (!subjectId && !subjectName) {
            return res.status(400).json({ error: 'subjectId is required' });
        }

        let targetSubject;

        if (subjectId) {
            targetSubject = await db('revision.subjects')
                .where({ id: subjectId, user_id: userId, is_deleted: false })
                .first();
        }

        if (!targetSubject && subjectName) {
            targetSubject = await db('revision.subjects')
                .where('user_id', userId)
                .whereRaw('LOWER(name) = ?', [subjectName.trim().toLowerCase()])
                .where('is_deleted', false)
                .first();
        }

        // Strictly do NOT auto-create subjects silently during note saving!
        if (!targetSubject) {
            return res.status(404).json({
                error: `Subject '${subjectId || subjectName}' not found. Please choose an existing subject from getAvailableSubjects or call createSubject first.`
            });
        }

        // Upload any attached images
        const rawImages = images || (imageBase64 ? [imageBase64] : []);
        const sourceImageIds = await handleImageUploads(targetSubject.id, rawImages, title);

        // Create the note
        const note = await noteModel.createNote(
            targetSubject.id,
            null, // questionId
            title,
            content,
            sourceImageIds,
            null, // parentNoteId
            Array.isArray(tags) ? tags : [tags],
            Array.isArray(keyHighlights) ? keyHighlights : [keyHighlights]
        );

        await subjectModel.touchSubject(targetSubject.id);

        res.status(201).json({
            success: true,
            message: `Study note successfully saved under '${targetSubject.name}'`,
            subject: {
                id: targetSubject.id,
                name: targetSubject.name
            },
            note: {
                id: note.id,
                title: note.title,
                tags: note.tags,
                key_highlights: note.key_highlights,
                source_image_ids: sourceImageIds,
                created_at: note.created_at
            }
        });
    } catch (error) {
        next(error);
    }
};

// 4. Save Question, Solution, and Linked Notes into existing subject atomically
export const saveQuestionWithLinkedNote = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { 
            subjectId,
            subjectName,
            questionText, 
            solutionTitle,
            solutionContent,
            noteTitle, 
            noteContent, 
            tags = [], 
            keyHighlights = [], 
            imageBase64,
            images
        } = req.body;

        if (!questionText) {
            return res.status(400).json({ error: 'questionText is required' });
        }

        if (!subjectId && !subjectName) {
            return res.status(400).json({ error: 'subjectId is required' });
        }

        let targetSubject;

        if (subjectId) {
            targetSubject = await db('revision.subjects')
                .where({ id: subjectId, user_id: userId, is_deleted: false })
                .first();
        }

        if (!targetSubject && subjectName) {
            targetSubject = await db('revision.subjects')
                .where('user_id', userId)
                .whereRaw('LOWER(name) = ?', [subjectName.trim().toLowerCase()])
                .where('is_deleted', false)
                .first();
        }

        // Strictly do NOT auto-create subjects silently during question saving!
        if (!targetSubject) {
            return res.status(404).json({
                error: `Subject '${subjectId || subjectName}' not found. Please choose an existing subject from getAvailableSubjects or call createSubject first.`
            });
        }

        const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
        const highlightList = Array.isArray(keyHighlights) ? keyHighlights : (keyHighlights ? [keyHighlights] : []);

        // Upload any attached images
        const rawImages = images || (imageBase64 ? [imageBase64] : []);
        const sourceImageIds = await handleImageUploads(targetSubject.id, rawImages, `question_${Date.now()}`);
        const primaryImageId = sourceImageIds.length > 0 ? sourceImageIds[0] : null;

        // 1. Create the Question in revision.questions (Questions Tab)
        const [question] = await questionModel.createQuestions({
            subject_id: targetSubject.id,
            content: questionText,
            type: primaryImageId ? 'image' : 'text',
            source_image_id: primaryImageId,
            tags: JSON.stringify(tagList)
        });

        // 2. Create Solution in revision.solutions (Solutions Tab) if provided
        let savedSolution = null;
        if (solutionContent) {
            savedSolution = await solutionModel.createSolution(
                targetSubject.id,
                question.id,
                solutionTitle || `Solution for Question #${question.id}`,
                solutionContent,
                primaryImageId
            );
        }

        // 3. Create Linked Note in revision.notes (Notes Tab) if provided
        let linkedNote = null;
        if (noteContent) {
            const finalTitle = noteTitle || `Notes for Question #${question.id}`;
            linkedNote = await noteModel.createNote(
                targetSubject.id,
                question.id, // linked to question!
                finalTitle,
                noteContent,
                sourceImageIds,
                null,        // parentNoteId
                tagList,
                highlightList
            );
        }

        await subjectModel.touchSubject(targetSubject.id);

        res.status(201).json({
            success: true,
            message: `Successfully saved Question in Questions tab, Solution in Solutions table, and Note in Notes table under '${targetSubject.name}'`,
            subject: {
                id: targetSubject.id,
                name: targetSubject.name
            },
            question: {
                id: question.id,
                content: question.content,
                source_image_id: primaryImageId,
                tags: question.tags,
                created_at: question.created_at
            },
            solution: savedSolution ? {
                id: savedSolution.id,
                questionId: savedSolution.question_id,
                title: savedSolution.title,
                content: savedSolution.content,
                source_image_id: savedSolution.source_image_id,
                created_at: savedSolution.created_at
            } : null,
            note: linkedNote ? {
                id: linkedNote.id,
                questionId: linkedNote.question_id,
                title: linkedNote.title,
                tags: linkedNote.tags,
                key_highlights: linkedNote.key_highlights,
                source_image_ids: sourceImageIds,
                created_at: linkedNote.created_at
            } : null
        });
    } catch (error) {
        next(error);
    }
};

// 4. Fetch list of notes for a subject (METADATA ONLY - title, tags, key_highlights)
export const getNotesForSubject = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { subjectId, subjectName, limit = 20 } = req.query;

        if (!subjectId && !subjectName) {
            return res.status(400).json({ error: 'subjectId (or subjectName) query parameter is required' });
        }

        let subject;
        if (subjectId) {
            subject = await db('revision.subjects')
                .where({ id: subjectId, user_id: userId, is_deleted: false })
                .first();
        }

        if (!subject && subjectName) {
            subject = await db('revision.subjects')
                .where('user_id', userId)
                .whereRaw('LOWER(name) = ?', [subjectName.trim().toLowerCase()])
                .where('is_deleted', false)
                .first();
        }

        if (!subject) {
            return res.status(404).json({ error: `Subject '${subjectId || subjectName}' not found.` });
        }

        const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
        // Fetch notes with includeContent = false for lightweight metadata
        const notes = await noteModel.getNotesBySubject(subject.id, safeLimit, 0, false);

        const metadataList = notes.map(n => ({
            id: n.id,
            title: n.title,
            tags: typeof n.tags === 'string' ? JSON.parse(n.tags || '[]') : (n.tags || []),
            keyHighlights: typeof n.key_highlights === 'string' ? JSON.parse(n.key_highlights || '[]') : (n.key_highlights || []),
            createdAt: n.created_at
        }));

        res.json({
            subject: subject.name,
            count: metadataList.length,
            notes: metadataList
        });
    } catch (error) {
        next(error);
    }
};

// 5. Fetch FULL specific note by Title / Name or ID
export const getNoteDetailByTitle = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { title, noteTitle, noteId, subjectId, subjectName } = req.query;
        const searchTitle = (title || noteTitle || '').trim();

        if (!searchTitle && !noteId) {
            return res.status(400).json({ error: 'Either title (or noteTitle) or noteId is required' });
        }

        let query = db('revision.notes as n')
            .join('revision.subjects as s', 'n.subject_id', 's.id')
            .where('s.user_id', userId)
            .where('n.is_deleted', false)
            .where('s.is_deleted', false);

        if (noteId) {
            query = query.where('n.id', noteId);
        } else {
            // Case-insensitive title match or partial match
            query = query.whereRaw('LOWER(n.title) LIKE ?', [`%${searchTitle.toLowerCase()}%`]);
            if (subjectId) {
                query = query.where('s.id', subjectId);
            } else if (subjectName) {
                query = query.whereRaw('LOWER(s.name) = ?', [subjectName.trim().toLowerCase()]);
            }
        }

        const note = await query.select([
            'n.id',
            'n.subject_id',
            's.name as subject_name',
            'n.question_id',
            'n.title',
            'n.content',
            'n.tags',
            'n.key_highlights',
            'n.created_at',
            'n.updated_at'
        ]).first();

        if (!note) {
            return res.status(404).json({
                error: `Note '${searchTitle || noteId}' not found.`
            });
        }

        res.json({
            success: true,
            id: note.id,
            subject: note.subject_name,
            title: note.title,
            content: note.content,
            tags: typeof note.tags === 'string' ? JSON.parse(note.tags || '[]') : (note.tags || []),
            keyHighlights: typeof note.key_highlights === 'string' ? JSON.parse(note.key_highlights || '[]') : (note.key_highlights || []),
            createdAt: note.created_at
        });
    } catch (error) {
        next(error);
    }
};

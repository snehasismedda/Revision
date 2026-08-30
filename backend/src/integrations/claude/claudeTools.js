import { z } from 'zod';
import db from '../../knex/db.js';
import * as subjectModel from '../../models/subjectModel.js';
import * as noteModel from '../../models/noteModel.js';
import * as questionModel from '../../models/questionModel.js';
import * as solutionModel from '../../models/solutionModel.js';

/**
 * Helper to resolve a subject by ID or case-insensitive name for a specific user.
 */
const resolveSubject = async (userId, subjectId, subjectName) => {
    if (subjectId) {
        const found = await db('revision.subjects')
            .where({ id: subjectId, user_id: userId, is_deleted: false })
            .first();
        if (found) return found;
    }

    if (subjectName) {
        const found = await db('revision.subjects')
            .where('user_id', userId)
            .whereRaw('LOWER(name) = ?', [subjectName.trim().toLowerCase()])
            .where('is_deleted', false)
            .first();
        if (found) return found;
    }

    return null;
};

/**
 * Registers all Revision MCP Tools on an McpServer instance for a given authenticated user.
 */
export const registerRevisionTools = (server, user) => {
    const userId = user.id;

    // 1. Tool: list_subjects
    server.tool(
        'list_subjects',
        'List all active revision subjects (e.g. Mathematics, Physics, DSA) along with their IDs and tags.',
        {},
        async () => {
            try {
                const subjects = await subjectModel.findSubjectsByUser({ userId, archived: 'false' });
                const formatted = subjects.map(s => ({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    tags: typeof s.tags === 'string' ? JSON.parse(s.tags || '[]') : (s.tags || [])
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify({ count: formatted.length, subjects: formatted }, null, 2) }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to list subjects: ${err.message}` }]
                };
            }
        }
    );

    // 2. Tool: create_subject
    server.tool(
        'create_subject',
        'Create a new revision subject if a required subject does not already exist.',
        {
            name: z.string().describe('Name of the subject (e.g. "Linear Algebra")'),
            description: z.string().optional().describe('Short description of the subject'),
            tags: z.array(z.string()).optional().describe('List of tags (e.g. ["Math", "Semester 3"])')
        },
        async ({ name, description = '', tags = [] }) => {
            try {
                const trimmedName = name.trim();
                const existing = await resolveSubject(userId, null, trimmedName);
                if (existing) {
                    return {
                        content: [{ 
                            type: 'text', 
                            text: JSON.stringify({
                                message: `Subject '${existing.name}' already exists.`,
                                subject: {
                                    id: existing.id,
                                    name: existing.name,
                                    description: existing.description,
                                    tags: typeof existing.tags === 'string' ? JSON.parse(existing.tags || '[]') : (existing.tags || [])
                                }
                            }, null, 2)
                        }]
                    };
                }

                const created = await subjectModel.createSubject({
                    userId,
                    name: trimmedName,
                    description: description || null,
                    tags: Array.isArray(tags) ? tags : [tags]
                });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            message: `Subject '${created.name}' created successfully.`,
                            subject: {
                                id: created.id,
                                name: created.name,
                                description: created.description,
                                tags: typeof created.tags === 'string' ? JSON.parse(created.tags || '[]') : (created.tags || [])
                            }
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to create subject: ${err.message}` }]
                };
            }
        }
    );

    // 3. Tool: list_notes
    server.tool(
        'list_notes',
        'List metadata of study notes (titles, tags, key highlights, dates) under a specific subject.',
        {
            subjectId: z.string().optional().describe('UUID of the subject'),
            subjectName: z.string().optional().describe('Name of the subject (if ID is not known)'),
            limit: z.number().optional().describe('Maximum number of notes to return (default 20, max 50)')
        },
        async ({ subjectId, subjectName, limit = 20 }) => {
            try {
                if (!subjectId && !subjectName) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'Error: Either subjectId or subjectName must be provided.' }]
                    };
                }

                const subject = await resolveSubject(userId, subjectId, subjectName);
                if (!subject) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Subject '${subjectId || subjectName}' not found. Use list_subjects to see available subjects.` }]
                    };
                }

                const safeLimit = Math.min(Math.max(limit || 20, 1), 50);
                const notes = await noteModel.getNotesBySubject(subject.id, safeLimit, 0, false);

                const metadataList = notes.map(n => ({
                    id: n.id,
                    title: n.title,
                    tags: typeof n.tags === 'string' ? JSON.parse(n.tags || '[]') : (n.tags || []),
                    keyHighlights: typeof n.key_highlights === 'string' ? JSON.parse(n.key_highlights || '[]') : (n.key_highlights || []),
                    createdAt: n.created_at
                }));

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            subject: subject.name,
                            subjectId: subject.id,
                            count: metadataList.length,
                            notes: metadataList
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to list notes: ${err.message}` }]
                };
            }
        }
    );

    // 4. Tool: read_note
    server.tool(
        'read_note',
        'Read the full content, Markdown text, formulas, and highlights of a specific note by title or note ID.',
        {
            title: z.string().optional().describe('Exact or partial note title to search'),
            noteId: z.string().optional().describe('Exact UUID of the note (if known)'),
            subjectId: z.string().optional().describe('Optional subject UUID to narrow down search'),
            subjectName: z.string().optional().describe('Optional subject name to narrow down search')
        },
        async ({ title, noteId, subjectId, subjectName }) => {
            try {
                const searchTitle = (title || '').trim();
                if (!searchTitle && !noteId) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'Error: Either title or noteId must be provided.' }]
                    };
                }

                let query = db('revision.notes as n')
                    .join('revision.subjects as s', 'n.subject_id', 's.id')
                    .where('s.user_id', userId)
                    .where('n.is_deleted', false)
                    .where('s.is_deleted', false);

                if (noteId) {
                    query = query.where('n.id', noteId);
                } else {
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
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Note '${searchTitle || noteId}' not found.` }]
                    };
                }

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            id: note.id,
                            subject: note.subject_name,
                            subjectId: note.subject_id,
                            title: note.title,
                            content: note.content,
                            tags: typeof note.tags === 'string' ? JSON.parse(note.tags || '[]') : (note.tags || []),
                            keyHighlights: typeof note.key_highlights === 'string' ? JSON.parse(note.key_highlights || '[]') : (note.key_highlights || []),
                            createdAt: note.created_at,
                            updatedAt: note.updated_at
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to read note: ${err.message}` }]
                };
            }
        }
    );

    // 5. Tool: create_note
    server.tool(
        'create_note',
        'Create and save a new study note into Revision under a subject. Supports rich Markdown, LaTeX math ($...$ or $$...$$), and code blocks.',
        {
            subjectId: z.string().optional().describe('UUID of the target subject'),
            subjectName: z.string().optional().describe('Name of the target subject (if ID is not known)'),
            title: z.string().describe('Descriptive title of the note'),
            content: z.string().describe('Rich Markdown content of the study note (including core theory, formulas, explanations)'),
            tags: z.array(z.string()).optional().describe('List of tags (e.g. ["Thermodynamics", "Formulas"])'),
            keyHighlights: z.array(z.string()).optional().describe('Key takeaways / summary bullets')
        },
        async ({ subjectId, subjectName, title, content, tags = [], keyHighlights = [] }) => {
            try {
                if (!title || !content) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'Error: Both title and content are required to create a note.' }]
                    };
                }

                const subject = await resolveSubject(userId, subjectId, subjectName);
                if (!subject) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Subject '${subjectId || subjectName}' not found. Please choose an existing subject from list_subjects or create it using create_subject.` }]
                    };
                }

                const note = await noteModel.createNote(
                    subject.id,
                    null, // questionId
                    title.trim(),
                    content,
                    [], // sourceImageIds
                    null, // parentNoteId
                    Array.isArray(tags) ? tags : [tags],
                    Array.isArray(keyHighlights) ? keyHighlights : [keyHighlights]
                );

                await subjectModel.touchSubject(subject.id);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Study note '${note.title}' successfully saved under '${subject.name}'.`,
                            note: {
                                id: note.id,
                                subjectId: subject.id,
                                subjectName: subject.name,
                                title: note.title,
                                tags: typeof note.tags === 'string' ? JSON.parse(note.tags || '[]') : (note.tags || []),
                                keyHighlights: typeof note.key_highlights === 'string' ? JSON.parse(note.key_highlights || '[]') : (note.key_highlights || []),
                                createdAt: note.created_at
                            }
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to create note: ${err.message}` }]
                };
            }
        }
    );

    // 6. Tool: update_note
    server.tool(
        'update_note',
        'Update an existing study note with new or modified content, title, tags, or key highlights.',
        {
            noteId: z.string().describe('UUID of the note to update'),
            title: z.string().optional().describe('Updated note title (if changing)'),
            content: z.string().optional().describe('Updated full Markdown content of the note'),
            tags: z.array(z.string()).optional().describe('Updated tags list'),
            keyHighlights: z.array(z.string()).optional().describe('Updated key highlights list')
        },
        async ({ noteId, title, content, tags, keyHighlights }) => {
            try {
                // Find note and verify ownership via subject
                const existing = await db('revision.notes as n')
                    .join('revision.subjects as s', 'n.subject_id', 's.id')
                    .where('n.id', noteId)
                    .where('s.user_id', userId)
                    .where('n.is_deleted', false)
                    .select('n.*', 's.name as subject_name')
                    .first();

                if (!existing) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Note with ID '${noteId}' not found or you do not have permission to edit it.` }]
                    };
                }

                const updatePayload = {
                    title: title !== undefined ? title.trim() : existing.title,
                    content: content !== undefined ? content : existing.content
                };

                if (tags !== undefined) {
                    updatePayload.tags = tags;
                }
                if (keyHighlights !== undefined) {
                    updatePayload.key_highlights = keyHighlights;
                }

                const updated = await noteModel.updateNote(existing.id, existing.subject_id, updatePayload);
                await subjectModel.touchSubject(existing.subject_id);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Note '${updated.title}' updated successfully.`,
                            note: {
                                id: updated.id,
                                subjectId: existing.subject_id,
                                subjectName: existing.subject_name,
                                title: updated.title,
                                content: updated.content,
                                tags: typeof updated.tags === 'string' ? JSON.parse(updated.tags || '[]') : (updated.tags || []),
                                keyHighlights: typeof updated.key_highlights === 'string' ? JSON.parse(updated.key_highlights || '[]') : (updated.key_highlights || []),
                                updatedAt: updated.updated_at
                            }
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to update note: ${err.message}` }]
                };
            }
        }
    );

    // 7. Tool: save_question_and_solution
    server.tool(
        'save_question_and_solution',
        'Save a solved question into Revision. Atomically records the question in Questions, the step-by-step solution in Solutions, and an optional concept/theory note in Notes.',
        {
            subjectId: z.string().optional().describe('UUID of the target subject'),
            subjectName: z.string().optional().describe('Name of the target subject (if ID is not known)'),
            questionText: z.string().describe('Exact problem statement or question text'),
            solutionTitle: z.string().optional().describe('Title for the solution (e.g. "Solution for Problem 1")'),
            solutionContent: z.string().describe('Step-by-step calculation, explanation, and final answer in Markdown / LaTeX'),
            noteTitle: z.string().optional().describe('Title for the optional linked theory note'),
            noteContent: z.string().optional().describe('Underlying concept / theory note without repeating the calculation steps'),
            tags: z.array(z.string()).optional().describe('List of tags'),
            keyHighlights: z.array(z.string()).optional().describe('Key takeaways or highlights')
        },
        async ({
            subjectId,
            subjectName,
            questionText,
            solutionTitle,
            solutionContent,
            noteTitle,
            noteContent,
            tags = [],
            keyHighlights = []
        }) => {
            try {
                if (!questionText) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'Error: questionText is required.' }]
                    };
                }

                const subject = await resolveSubject(userId, subjectId, subjectName);
                if (!subject) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Subject '${subjectId || subjectName}' not found. Please choose an existing subject from list_subjects or create it first.` }]
                    };
                }

                const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
                const highlightList = Array.isArray(keyHighlights) ? keyHighlights : (keyHighlights ? [keyHighlights] : []);

                // 1. Create Question
                const [question] = await questionModel.createQuestions({
                    subject_id: subject.id,
                    content: questionText,
                    type: 'text',
                    source_image_id: null,
                    tags: JSON.stringify(tagList)
                });

                // 2. Create Solution
                let savedSolution = null;
                if (solutionContent) {
                    savedSolution = await solutionModel.createSolution(
                        subject.id,
                        question.id,
                        solutionTitle || `Solution for Question #${question.id}`,
                        solutionContent,
                        null
                    );
                }

                // 3. Create Linked Note
                let linkedNote = null;
                if (noteContent) {
                    const finalTitle = noteTitle || `Notes for Question #${question.id}`;
                    linkedNote = await noteModel.createNote(
                        subject.id,
                        question.id,
                        finalTitle,
                        noteContent,
                        [],
                        null,
                        tagList,
                        highlightList
                    );
                }

                await subjectModel.touchSubject(subject.id);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Successfully saved Question, Solution, and linked Note under '${subject.name}'.`,
                            subject: { id: subject.id, name: subject.name },
                            question: { id: question.id, content: question.content, tags: tagList },
                            solution: savedSolution ? { id: savedSolution.id, title: savedSolution.title } : null,
                            note: linkedNote ? { id: linkedNote.id, title: linkedNote.title } : null
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to save question and solution: ${err.message}` }]
                };
            }
        }
    );

    // 8. Tool: list_questions
    server.tool(
        'list_questions',
        'List existing questions under a subject to inspect or solve them.',
        {
            subjectId: z.string().optional().describe('UUID of the target subject'),
            subjectName: z.string().optional().describe('Name of the target subject (if ID is not known)'),
            limit: z.number().optional().describe('Number of questions to return (default 20)')
        },
        async ({ subjectId, subjectName, limit = 20 }) => {
            try {
                const subject = await resolveSubject(userId, subjectId, subjectName);
                if (!subject) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: `Subject '${subjectId || subjectName}' not found.` }]
                    };
                }

                const questions = await questionModel.getQuestionsBySubject(subject.id);
                const safeLimit = Math.min(Math.max(limit || 20, 1), 50);
                const sliced = questions.slice(0, safeLimit).map(q => ({
                    id: q.id,
                    content: q.content,
                    type: q.type,
                    tags: typeof q.tags === 'string' ? JSON.parse(q.tags || '[]') : (q.tags || []),
                    createdAt: q.created_at
                }));

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            subject: subject.name,
                            subjectId: subject.id,
                            count: sliced.length,
                            questions: sliced
                        }, null, 2)
                    }]
                };
            } catch (err) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Failed to list questions: ${err.message}` }]
                };
            }
        }
    );
};

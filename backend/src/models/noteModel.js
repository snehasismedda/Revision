import db from '../db/knex.js';

export const getNotesBySubject = async (subjectId) => {
    return await db('notes')
        .where({ subject_id: subjectId })
        .orderBy('created_at', 'desc');
};

export const getNotesByQuestion = async (questionId) => {
    return await db('notes')
        .where({ question_id: questionId })
        .orderBy('created_at', 'desc');
};

export const createNote = async (subjectId, questionId, title, content) => {
    const [note] = await db('notes').insert({
        subject_id: subjectId,
        question_id: questionId || null,
        title,
        content
    }).returning('*');
    return note;
};

export const deleteNote = async (noteId, subjectId) => {
    return await db('notes')
        .where({ id: noteId, subject_id: subjectId })
        .delete();
};

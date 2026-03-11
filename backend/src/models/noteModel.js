import db from '../knex/db.js';

export const getNotesBySubject = async (subjectId) => {
    return await db('revision.notes')
        .where({ subject_id: subjectId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const getNotesByQuestion = async (questionId) => {
    return await db('revision.notes')
        .where({ question_id: questionId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const createNote = async (subjectId, questionId, title, content, sourceImageId, parentNoteId, tags = []) => {
    const [note] = await db('revision.notes').insert({
        subject_id: subjectId,
        question_id: questionId || null,
        source_image_id: sourceImageId || null,
        parent_note_id: parentNoteId || null,
        title,
        content,
        tags: JSON.stringify(tags || [])
    }).returning('*');
    return note;
};

export const deleteNote = async (noteId, subjectId) => {
    return await db('revision.notes')
        .where({ id: noteId, subject_id: subjectId })
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const updateNote = async (noteId, subjectId, data) => {
    const updateData = {
        title: data.title,
        content: data.content,
        updated_at: db.fn.now()
    };

    if (data.tags !== undefined) {
        updateData.tags = JSON.stringify(data.tags || []);
    }

    const [updated] = await db('revision.notes')
        .where({ id: noteId, subject_id: subjectId })
        .update(updateData)
        .returning('*');
    return updated;
};

export const getUniqueTagsBySubject = async (subjectId) => {
    const notes = await db('revision.notes')
        .where({ subject_id: subjectId, is_deleted: false })
        .select('tags');
    
    const tagSet = new Set();
    notes.forEach(note => {
        const noteTags = note.tags || [];
        if (Array.isArray(noteTags)) {
            noteTags.forEach(tag => tagSet.add(tag));
        }
    });
    return Array.from(tagSet).sort();
};

export const softDeleteNotesBySubject = async (data) => {
    return await db('revision.notes')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteNotesByQuestion = async (data) => {
    return await db('revision.notes')
        .where('question_id', data.questionId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteNotesByTopic = async (data) => {
    // Soft-delete notes by joining with the questions table to filter by topic_id
    const questionIds = await db('revision.questions')
        .where('topic_id', data.topicId)
        .select('id');

    const ids = questionIds.map(q => q.id);

    if (ids.length > 0) {
        return await db('revision.notes')
            .whereIn('question_id', ids)
            .update({ is_deleted: true, deleted_at: db.fn.now() });
    }
    return 0;
};

import db from '../knex/db.js';

export const getNotesBySubject = async (subjectId, limit, offset, includeContent = false) => {
    let query = db('revision.notes')
        .where({ subject_id: subjectId, is_deleted: false })
        .orderBy('created_at', 'desc');

    if (!includeContent) {
        query = query.select('id', 'subject_id', 'question_id', 'parent_note_id', 'source_image_ids', 'title', 'tags', 'created_at', 'updated_at');
    }

    if (limit !== undefined) {
        query = query.limit(limit);
    }

    if (offset !== undefined) {
        query = query.offset(offset);
    }

    return await query;
};

export const getNoteCountBySubject = async (subjectId) => {
    return await db('revision.notes')
        .where({ subject_id: subjectId, is_deleted: false })
        .count('id as count')
        .first();
};

export const getNotesByQuestion = async (questionId) => {
    return await db('revision.notes')
        .where({ question_id: questionId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const createNote = async (subjectId, questionId, title, content, sourceImageIds = [], parentNoteId, tags = []) => {
    const [note] = await db('revision.notes').insert({
        subject_id: subjectId,
        question_id: questionId || null,
        source_image_ids: sourceImageIds || [],
        parent_note_id: parentNoteId || null,
        title,
        content,
        tags: JSON.stringify(tags || [])
    }).returning('*');
    return note;
};

export const softDeleteNotes = async (ids, subjectId) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    return await db('revision.notes')
        .whereIn('id', idList)
        .where('subject_id', subjectId)
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

    if (data.source_image_ids !== undefined) {
        updateData.source_image_ids = data.source_image_ids || [];
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

export const getNotesByIds = async (ids) => {
    return await db('revision.notes')
        .whereIn('id', ids)
        .select('*');
};

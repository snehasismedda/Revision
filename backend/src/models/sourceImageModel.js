import db from '../knex/db.js';

export const createSourceImage = async (subjectId, data) => {
    const [image] = await db('revision.source_images')
        .insert({
            subject_id: subjectId,
            data
        })
        .returning('*');
    return image;
};

export const getSourceImageById = async (id, subjectId) => {
    return await db('revision.source_images')
        .where({ id, subject_id: subjectId })
        .first();
};

export const getAllSourceImagesByUser = async (userId, limit, offset) => {
    let query = db('revision.source_images as si')
        .join('revision.subjects as s', 'si.subject_id', 's.id')
        .where('s.user_id', userId)
        .where('s.is_deleted', false)
        .select(
            'si.*',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = si.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE n.source_image_id = si.id AND n.is_deleted = false LIMIT 1) as linked_note_id')
        )
        .orderBy('si.created_at', 'desc');

    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return await query;
};
export const getSourceImagesBySubject = async (subjectId, limit, offset) => {
    let query = db('revision.source_images as si')
        .join('revision.subjects as s', 'si.subject_id', 's.id')
        .where('si.subject_id', subjectId)
        .where('s.is_deleted', false)
        .select(
            'si.*',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = si.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE n.source_image_id = si.id AND n.is_deleted = false LIMIT 1) as linked_note_id')
        )
        .orderBy('si.created_at', 'desc');

    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return await query;
};

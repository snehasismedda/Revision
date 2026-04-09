import db from '../knex/db.js';

export const createFile = async (subjectId, data, fileType = 'image', fileName = null, referenceId = null) => {
    const insertData = {
        subject_id: subjectId,
        data,
        file_type: fileType,
        file_name: fileName,
    };
    if (referenceId) {
        insertData.reference_id = referenceId;
    }
    const [file] = await db('revision.files')
        .insert(insertData)
        .returning('*');
    return file;
};

// Keep backward-compat alias
export const createSourceImage = (subjectId, data, fileType = 'image', fileName = null, referenceId = null) =>
    createFile(subjectId, data, fileType, fileName, referenceId);

export const getSourceImageById = async (id, subjectId) => {
    return await db('revision.files')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .first();
};

export const getAllSourceImagesByUser = async (userId, limit, offset, fileType = null) => {
    let query = db('revision.files as si')
        .join('revision.subjects as s', 'si.subject_id', 's.id')
        .where('s.user_id', userId)
        .where('s.is_deleted', false)
        .where('si.is_deleted', false)
        .select(
            'si.*',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = si.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE si.id = ANY(n.source_image_ids) AND n.is_deleted = false LIMIT 1) as linked_note_id'),
            db.raw('(EXISTS(SELECT 1 FROM revision.questions q WHERE q.source_image_id = si.id AND q.is_deleted = false) OR EXISTS(SELECT 1 FROM revision.notes n WHERE si.id = ANY(n.source_image_ids) AND n.is_deleted = false)) as is_linked')
        )
        .orderBy('si.created_at', 'desc');

    if (fileType) query = query.where('si.file_type', fileType);
    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return await query;
};

export const getSourceImagesBySubject = async (subjectId, limit, offset, fileType = null) => {
    let query = db('revision.files as si')
        .join('revision.subjects as s', 'si.subject_id', 's.id')
        .where('si.subject_id', subjectId)
        .where('s.is_deleted', false)
        .where('si.is_deleted', false)
        .select(
            'si.*',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = si.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE si.id = ANY(n.source_image_ids) AND n.is_deleted = false LIMIT 1) as linked_note_id'),
            db.raw('(EXISTS(SELECT 1 FROM revision.questions q WHERE q.source_image_id = si.id AND q.is_deleted = false) OR EXISTS(SELECT 1 FROM revision.notes n WHERE si.id = ANY(n.source_image_ids) AND n.is_deleted = false)) as is_linked')
        )
        .orderBy('si.created_at', 'desc');

    if (fileType) query = query.where('si.file_type', fileType);
    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return await query;
};

export const softDeleteSourceImagesBySubject = async (data) => {
    return await db('revision.files')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteSourceImage = async (ids, subjectId) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    return await db('revision.files')
        .whereIn('id', idList)
        .where('subject_id', subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const updateFileName = async (id, subjectId, fileName) => {
    return await db('revision.files')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .update({ file_name: fileName, updated_at: db.fn.now() })
        .returning('*');
};

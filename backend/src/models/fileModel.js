import db from '../knex/db.js';

export const createFile = async (subjectId, data, fileType = 'image', fileName = null, thumbnail = null, referenceId = null) => {
    const insertData = {
        subject_id: subjectId,
        data,
        file_type: fileType,
        file_name: fileName,
        thumbnail
    };
    if (referenceId) {
        insertData.reference_id = referenceId;
    }
    const [file] = await db('revision.files')
        .insert(insertData)
        .returning('*');
    return file;
};

export const getFileById = async (id, subjectId) => {
    return await db('revision.files')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .first();
};

export const getAllFilesByUser = async (userId, limit, offset, fileType = null, metadataOnly = false) => {
    let query = db('revision.files as f')
        .join('revision.subjects as s', 'f.subject_id', 's.id')
        .where('s.user_id', userId)
        .where('s.is_deleted', false)
        .where('f.is_deleted', false);

    if (metadataOnly) {
        query = query.select(
            'f.id', 'f.subject_id', 'f.file_type', 'f.file_name', 'f.thumbnail', 'f.created_at', 'f.is_deleted', 'f.deleted_at', 'f.reference_id',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false LIMIT 1) as linked_note_id'),
            db.raw('(EXISTS(SELECT 1 FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false) OR EXISTS(SELECT 1 FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false)) as is_linked')
        );
    } else {
        query = query.select(
            'f.*',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false LIMIT 1) as linked_note_id'),
            db.raw('(EXISTS(SELECT 1 FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false) OR EXISTS(SELECT 1 FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false)) as is_linked')
        );
    }

    query = query.orderBy('f.created_at', 'desc');

    if (fileType) query = query.where('f.file_type', fileType);
    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return await query;
};

export const getFilesBySubject = async (subjectId, limit, offset, fileType = null, metadataOnly = false) => {
    let query = db('revision.files as f')
        .join('revision.subjects as s', 'f.subject_id', 's.id')
        .where('f.subject_id', subjectId)
        .where('s.is_deleted', false)
        .where('f.is_deleted', false);

    if (metadataOnly) {
        query = query.select(
            'f.id', 'f.subject_id', 'f.file_type', 'f.file_name', 'f.thumbnail', 'f.created_at', 'f.is_deleted', 'f.deleted_at', 'f.reference_id',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false LIMIT 1) as linked_note_id'),
            db.raw('(EXISTS(SELECT 1 FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false) OR EXISTS(SELECT 1 FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false)) as is_linked')
        );
    } else {
        query = query.select(
            'f.*',
            's.name as subject_name',
            db.raw('(SELECT id FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false LIMIT 1) as linked_question_id'),
            db.raw('(SELECT id FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false LIMIT 1) as linked_note_id'),
            db.raw('(EXISTS(SELECT 1 FROM revision.questions q WHERE q.source_image_id = f.id AND q.is_deleted = false) OR EXISTS(SELECT 1 FROM revision.notes n WHERE f.id = ANY(n.source_image_ids) AND n.is_deleted = false)) as is_linked')
        );
    }

    query = query.orderBy('f.created_at', 'desc');

    if (fileType) query = query.where('f.file_type', fileType);
    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);

    return await query;
};

export const softDeleteFilesBySubject = async (data) => {
    return await db('revision.files')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteFile = async (ids, subjectId) => {
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
        .update({ file_name: fileName })
        .returning('*');
};

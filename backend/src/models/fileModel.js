import db from '../knex/db.js';

export const createFile = async ({ subjectId, testSeriesId, data, fileType = 'image', fileName = null, thumbnail = null, referenceId = null }) => {
    const insertData = {
        subject_id: subjectId || null,
        test_series_id: testSeriesId || null,
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

export const getFileById = async (id, subjectId, testSeriesId) => {
    const query = db('revision.files')
        .where({ id, is_deleted: false });

    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.first();
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
            'f.id', 'f.subject_id', 'f.test_series_id', 'f.file_type', 'f.file_name', 'f.thumbnail', 'f.created_at', 'f.is_deleted', 'f.deleted_at', 'f.reference_id',
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

export const getFilesByTestSeries = async (testSeriesId, limit, offset, fileType = null, metadataOnly = false) => {
    let query = db('revision.files as f')
        .join('revision.test_series as ts', 'f.test_series_id', 'ts.id')
        .where('f.test_series_id', testSeriesId)
        .where('ts.is_deleted', false)
        .where('f.is_deleted', false);

    if (metadataOnly) {
        query = query.select(
            'f.id', 'f.subject_id', 'f.test_series_id', 'f.file_type', 'f.file_name', 'f.thumbnail', 'f.created_at', 'f.is_deleted', 'f.deleted_at', 'f.reference_id',
            'ts.name as series_name',
            db.raw('false as is_linked') // Test series files might not be linked to questions/notes in the same way yet
        );
    } else {
        query = query.select(
            'f.*',
            'ts.name as series_name',
            db.raw('false as is_linked')
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

export const softDeleteFile = async (ids, subjectId, testSeriesId) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    const query = db('revision.files')
        .whereIn('id', idList);

    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const updateFileName = async (id, subjectId, testSeriesId, fileName) => {
    const query = db('revision.files')
        .where({ id, is_deleted: false });

    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.update({ file_name: fileName })
        .returning('*');
};

import db from '../knex/db.js';

export const createFolder = async ({ name, parentId, subjectId, testSeriesId, isSystem = false }) => {
    const insertData = {
        name,
        parent_id: parentId || null,
        subject_id: subjectId || null,
        test_series_id: testSeriesId || null,
        is_system: isSystem
    };
    const [folder] = await db('revision.file_folders')
        .insert(insertData)
        .returning('*');
    return folder;
};

export const getSystemFolderByName = async (subjectId, name) => {
    return await db('revision.file_folders')
        .where({ 
            subject_id: subjectId, 
            name, 
            is_system: true, 
            is_deleted: false 
        })
        .first();
};

export const getFoldersByScope = async (subjectId, testSeriesId, parentId = undefined) => {
    const query = db('revision.file_folders')
        .where('is_deleted', false);

    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    if (parentId !== undefined) {
        if (parentId === 'null' || parentId === null) {
            query.whereNull('parent_id');
        } else {
            query.where({ parent_id: parentId });
        }
    }

    // Ensure we are fetching from at least one scope
    if(!subjectId && !testSeriesId) {
        throw new Error("Must provide either subjectId or testSeriesId");
    }

    return await query.orderBy('created_at', 'asc');
};

export const getFolderById = async (id, subjectId, testSeriesId) => {
     const query = db('revision.file_folders')
        .where({ id, is_deleted: false });

    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.first();
}

export const renameFolder = async (id, name, subjectId, testSeriesId) => {
     const query = db('revision.file_folders')
        .where({ id, is_deleted: false });

    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.update({ name }).returning('*');
};

export const softDeleteFolder = async (id, subjectId, testSeriesId) => {
    const query = db('revision.file_folders').where({ id });
    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteFoldersBatch = async (ids, subjectId, testSeriesId) => {
    const query = db('revision.file_folders').whereIn('id', ids);
    if (subjectId) query.where({ subject_id: subjectId });
    if (testSeriesId) query.where({ test_series_id: testSeriesId });

    return await query.update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const getSubfolderIds = async (folderId) => {
    // Helper to get all nested folder IDs recursively
    const folders = await db('revision.file_folders').where({ parent_id: folderId, is_deleted: false });
    let ids = [folderId];
    for (const f of folders) {
        const subIds = await getSubfolderIds(f.id);
        ids = [...ids, ...subIds];
    }
    return ids;
};

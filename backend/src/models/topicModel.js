import db from '../knex/db.js';

export const buildTopicTree = (topics) => {
    const map = {};
    const roots = [];

    topics.forEach((t) => {
        map[t.id] = { ...t, children: [] };
    });

    topics.forEach((t) => {
        if (t.parent_id && map[t.parent_id]) {
            map[t.parent_id].children.push(map[t.id]);
        } else {
            roots.push(map[t.id]);
        }
    });

    return roots;
};

export const createTopic = async (data) => {
    const [topic] = await db('revision.topics')
        .insert({
            subject_id: data.subjectId,
            parent_id: data.parentId || null,
            name: data.name,
            sort_order: data.orderIndex || 0,
            order_index: data.orderIndex || 0,
        })
        .returning('*');
    return topic;
};

export const bulkCreateTopics = async (data, trx) => {
    const { subjectId, topics } = data;
    const dbToUse = trx || db;
    const created = [];

    const insertNode = async (node, parentId = null, depth = 0, sortOrder = 0) => {
        const [inserted] = await dbToUse('revision.topics')
            .insert({
                subject_id: subjectId,
                parent_id: parentId,
                name: node.name,
                depth: depth,
                sort_order: sortOrder,
                order_index: sortOrder,
            })
            .returning('*');

        created.push(inserted);

        if (node.children && Array.isArray(node.children)) {
            for (let i = 0; i < node.children.length; i++) {
                await insertNode(node.children[i], inserted.id, depth + 1, i);
            }
        }
    };

    for (let i = 0; i < topics.length; i++) {
        await insertNode(topics[i], null, 0, i);
    }

    return created;
};

export const findTopicsBySubject = async (data) => {
    return db('revision.topics')
        .where('subject_id', data.subjectId)
        .where('is_deleted', false)
        .orderBy(['depth', { column: 'created_at', order: 'asc' }, 'sort_order'])
        .select('*');
};

export const findTopicById = async (data) => {
    return db('revision.topics')
        .where('id', data.id)
        .where('is_deleted', false)
        .first();
};

export const updateTopic = async (data) => {
    const [updated] = await db('revision.topics')
        .where('id', data.id)
        .where('is_deleted', false)
        .update({
            name: data.name,
            order_index: data.orderIndex,
            sort_order: data.orderIndex,
            updated_at: new Date(),
        })
        .returning('*');
    return updated;
};

export const findAllDescendants = async (topicId) => {
    const result = await db.raw(`
        WITH RECURSIVE descendants AS (
            SELECT id FROM revision.topics WHERE parent_id = ? AND is_deleted = false
            UNION ALL
            SELECT t.id FROM revision.topics t
            JOIN descendants d ON t.parent_id = d.id
            WHERE t.is_deleted = false
        )
        SELECT id FROM descendants;
    `, [topicId]);
    return result.rows || [];
};

export const softDeleteTopics = async (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    let allIdsToDelete = [...idList];
    
    // For each topic ID, find all its descendants
    for (const id of idList) {
        const descendants = await findAllDescendants(id);
        allIdsToDelete = [...allIdsToDelete, ...descendants.map(d => d.id)];
    }

    // De-duplicate IDs
    const uniqueIds = [...new Set(allIdsToDelete)];

    return db('revision.topics')
        .whereIn('id', uniqueIds)
        .update({ is_deleted: true, deleted_at: new Date() });
};


export const softDeleteTopicsBySubject = async (data) => {
    return db('revision.topics')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: new Date() });
};

export const findSubTopics = async (parentId) => {
    return db('revision.topics')
        .where('parent_id', parentId)
        .where('is_deleted', false);
};

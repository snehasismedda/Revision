import db from '../knex/db.js';

export const createSession = async (subjectId, userId, name, topicIds) => {
    return await db.transaction(async (trx) => {
        const [session] = await trx('revision.revision_sessions')
            .insert({
                subject_id: subjectId,
                user_id: userId,
                name: name
            })
            .returning('*');

        if (topicIds && topicIds.length > 0) {
            const trackerRows = topicIds.map(topicId => ({
                revision_session_id: session.id,
                topic_id: topicId,
                status: 'pending'
            }));
            await trx('revision.revision_session_tracker').insert(trackerRows);
        }

        return session;
    });
};

export const getSessions = async (subjectId, userId) => {
    // get sessions
    const sessions = await db('revision.revision_sessions')
        .where({ subject_id: subjectId, user_id: userId })
        .orderBy('created_at', 'desc');

    if (sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.id);

    // get tracker items with topic name
    const trackerItems = await db('revision.revision_session_tracker as t')
        .join('revision.topics as tp', 't.topic_id', 'tp.id')
        .whereIn('t.revision_session_id', sessionIds)
        .select('t.*', 'tp.name as topic_name', 'tp.parent_id')
        .orderBy('tp.created_at', 'asc');

    const itemsBySession = {};
    trackerItems.forEach(item => {
        if (!itemsBySession[item.revision_session_id]) {
            itemsBySession[item.revision_session_id] = [];
        }
        itemsBySession[item.revision_session_id].push({
            topicId: item.topic_id,
            topicName: item.topic_name,
            parentId: item.parent_id,
            status: item.status,
            completedAt: item.completed_at
        });
    });

    return sessions.map(s => ({
        id: s.id,
        name: s.name,
        createdAt: s.created_at,
        topics: itemsBySession[s.id] || []
    }));
};

export const updateTrackerStatus = async (sessionId, topicId, status) => {
    const isCompleted = status === 'completed';
    const updates = {
        status,
        updated_at: new Date(),
        completed_at: isCompleted ? new Date() : null
    };

    await db('revision.revision_session_tracker')
        .where({ revision_session_id: sessionId, topic_id: topicId })
        .update(updates);

    return { topicId, ...updates };
};

export const deleteSession = async (sessionId, subjectId, userId) => {
    await db('revision.revision_sessions')
        .where({ id: sessionId, subject_id: subjectId, user_id: userId })
        .del();
    return true;
};

export const getRevisionAnalytics = async (subjectId, userId) => {
    // Total breakdown
    const totalStats = await db('revision.topics')
        .where('subject_id', subjectId)
        .where('is_deleted', false)
        .select(
            db.raw('count(*) as total'),
            db.raw('count(case when parent_id is null then 1 end) as roots'),
            db.raw('count(case when parent_id is not null then 1 end) as subs')
        )
        .first();

    // Completion breakdown (topics completed at least once)
    const completedTopics = await db('revision.revision_session_tracker as t')
        .join('revision.revision_sessions as s', 't.revision_session_id', 's.id')
        .join('revision.topics as tp', 't.topic_id', 'tp.id')
        .where('s.subject_id', subjectId)
        .where('s.user_id', userId)
        .where('t.status', 'completed')
        .select('tp.id', 'tp.name', 'tp.parent_id')
        .count('t.id as completed_count')
        .max('t.completed_at as last_revised_at')
        .groupBy('tp.id', 'tp.name', 'tp.parent_id')
        .orderBy('completed_count', 'desc');

    const rootsCompleted = completedTopics.filter(t => t.parent_id === null).length;
    const subsCompleted = completedTopics.filter(t => t.parent_id !== null).length;

    // 4. Get ALL topics for the subject to ensure we show 0 for unrevised ones
    const allTopics = await db('revision.topics')
        .where({ subject_id: subjectId, is_deleted: false })
        .select('id', 'name', 'parent_id')
        .orderBy('name', 'asc');

    // 5. Map revision counts to ALL topics
    const topicStatsMap = allTopics.map(topic => {
        const revised = completedTopics.find(ct => ct.id === topic.id);
        return {
            id: topic.id,
            name: topic.name,
            parentId: topic.parent_id,
            revised_count: parseInt(revised?.completed_count || 0),
            last_revised_at: revised?.last_revised_at || null
        };
    });

    // Sort for most/least
    const sortedByRevision = [...topicStatsMap].sort((a, b) => b.revised_count - a.revised_count);

    // Most revised (top 10 with at least 1 revision)
    const mostRevised = sortedByRevision.filter(t => t.revised_count > 0).slice(0, 10);

    // Least revised (bottom 10 - including those with 0)
    const leastRevised = [...topicStatsMap]
        .sort((a, b) => a.revised_count - b.revised_count)
        .slice(0, 10);

    return {
        totalTopics: parseInt(totalStats?.total || 0),
        totalRoots: parseInt(totalStats?.roots || 0),
        totalSubs: parseInt(totalStats?.subs || 0),
        topicsCompletedAtLeastOnce: completedTopics.length,
        rootsCompletedAtLeastOnce: rootsCompleted,
        subsCompletedAtLeastOnce: subsCompleted,
        mostRevised,
        leastRevised,
        allTopicStats: topicStatsMap
    };
};

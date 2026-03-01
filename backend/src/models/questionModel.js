import db from '../knex/db.js';

export const createQuestions = async (data) => {
    return await db('revision.questions')
        .insert(data)
        .returning('*');
};

export const getQuestionsBySubject = async (subjectId) => {
    return await db('revision.questions')
        .select(
            'id', 'subject_id', 'topic_id', 'type', 'formatted_content',
            'source_image_id', 'parent_id', 'created_at', 'updated_at', 'tags',
            db.raw("CASE WHEN type = 'text' OR content IS NOT NULL THEN content ELSE NULL END as content")
        )
        .where({ subject_id: subjectId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const getQuestionImage = async (id, subjectId) => {
    const question = await db('revision.questions')
        .select('content', 'formatted_content')
        .where({ id, subject_id: subjectId, type: 'image', is_deleted: false })
        .first();

    if (!question) return null;

    // Only return 'content' if it's actual image data (legacy questions)
    // Modern questions store markdown in 'content' even if type is 'image'
    if (question.content && question.content.startsWith('data:image')) {
        return { content: question.content };
    }

    // Check if it's in formatted_content (modern parent structure)
    if (question.formatted_content && typeof question.formatted_content === 'object' && question.formatted_content.image_data) {
        return { content: question.formatted_content.image_data };
    }

    return null;
};

export const getQuestionById = async (id, subjectId) => {
    return await db('revision.questions')
        .select('id', 'source_image_id', 'parent_id', 'type', 'content', 'formatted_content', 'tags')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .first();
};

export const updateQuestion = async (id, subjectId, updateData) => {
    const [updated] = await db('revision.questions')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');
    return updated;
};

export const deleteQuestion = async (id, subjectId) => {
    await db('revision.questions')
        .where({ id, subject_id: subjectId })
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteQuestionsByTopic = async (data) => {
    return await db('revision.questions')
        .where('topic_id', data.topicId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteQuestionsBySubject = async (data) => {
    return await db('revision.questions')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

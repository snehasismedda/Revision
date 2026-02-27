import db from '../db/knex.js';

export const createQuestion = async (subjectId, topicId, content, type, formattedContent = null, sourceImageId = null) => {
    const [question] = await db('questions')
        .insert({
            subject_id: subjectId,
            topic_id: topicId || null,
            content,
            type,
            formatted_content: formattedContent,
            source_image_id: sourceImageId || null,
        })
        .returning('*');
    return question;
};

export const createQuestions = async (rows) => {
    return await db('questions')
        .insert(rows)
        .returning('*');
};

export const getQuestionsBySubject = async (subjectId) => {
    return await db('questions')
        .select('id', 'subject_id', 'topic_id', 'type', 'formatted_content', 'source_image_id', 'created_at', 'updated_at', db.raw("CASE WHEN type = 'text' THEN content ELSE NULL END as content"))
        .where({ subject_id: subjectId })
        .orderBy('created_at', 'desc');
};

export const getQuestionImage = async (id, subjectId) => {
    return await db('questions')
        .select('content')
        .where({ id, subject_id: subjectId, type: 'image' })
        .first();
};

export const getQuestionById = async (id, subjectId) => {
    return await db('questions')
        .select('id', 'source_image_id', 'type')
        .where({ id, subject_id: subjectId })
        .first();
};

export const updateQuestion = async (id, subjectId, updateData) => {
    const [updated] = await db('questions')
        .where({ id, subject_id: subjectId })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');
    return updated;
};

export const deleteQuestion = async (id, subjectId) => {
    await db('questions').where({ id, subject_id: subjectId }).del();
};

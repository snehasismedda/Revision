import db from '../db/knex.js';

export const createQuestion = async (subjectId, topicId, content, type, formattedContent = null, sourceImageId = null) => {
    let tags = [];
    let cleanFormattedContent = formattedContent;

    if (formattedContent && typeof formattedContent === 'object' && !Array.isArray(formattedContent)) {
        tags = formattedContent.tags || [];
        cleanFormattedContent = JSON.stringify(formattedContent);
    }

    const [question] = await db('questions')
        .insert({
            subject_id: subjectId,
            topic_id: topicId || null,
            content,
            type,
            formatted_content: cleanFormattedContent,
            source_image_id: sourceImageId || null,
            tags: JSON.stringify(tags),
        })
        .returning('*');
    return question;
};

export const createQuestions = async (rows) => {
    const processedRows = rows.map(row => {
        let tags = [];
        let cleanFormattedContent = row.formatted_content;

        if (row.formatted_content && typeof row.formatted_content === 'object' && !Array.isArray(row.formatted_content)) {
            tags = row.formatted_content.tags || [];
            cleanFormattedContent = JSON.stringify(row.formatted_content);
        }

        return {
            ...row,
            formatted_content: cleanFormattedContent,
            tags: JSON.stringify(tags)
        };
    });

    return await db('questions')
        .insert(processedRows)
        .returning('*');
};

export const getQuestionsBySubject = async (subjectId) => {
    return await db('questions')
        .select('id', 'subject_id', 'topic_id', 'type', 'formatted_content', 'source_image_id', 'created_at', 'updated_at', 'tags', db.raw("CASE WHEN type = 'text' THEN content ELSE NULL END as content"))
        .where({ subject_id: subjectId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const getQuestionImage = async (id, subjectId) => {
    return await db('questions')
        .select('content')
        .where({ id, subject_id: subjectId, type: 'image', is_deleted: false })
        .first();
};

export const getQuestionById = async (id, subjectId) => {
    return await db('questions')
        .select('id', 'source_image_id', 'type', 'content', 'formatted_content', 'tags')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .first();
};

export const updateQuestion = async (id, subjectId, updateData) => {
    const [updated] = await db('questions')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');
    return updated;
};

export const deleteQuestion = async (id, subjectId) => {
    await db('questions')
        .where({ id, subject_id: subjectId })
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

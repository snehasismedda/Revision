import db from '../knex/db.js';

export const getSolutionsBySubject = async (subjectId) => {
    return await db('revision.solutions')
        .where({ subject_id: subjectId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const getSolutionsByQuestion = async (questionId) => {
    return await db('revision.solutions')
        .where({ question_id: questionId, is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const createSolution = async (subjectId, questionId, title, content, sourceImageId) => {
    const [solution] = await db('revision.solutions').insert({
        subject_id: subjectId,
        question_id: questionId || null,
        source_image_id: sourceImageId || null,
        title,
        content,
    }).returning('*');
    return solution;
};

export const softDeleteSolutions = async (ids, subjectId) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    return await db('revision.solutions')
        .whereIn('id', idList)
        .where('subject_id', subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};


export const updateSolution = async (solutionId, subjectId, data) => {
    const updateData = {
        updated_at: db.fn.now()
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.source_image_id !== undefined) updateData.source_image_id = data.source_image_id;

    const [updated] = await db('revision.solutions')
        .where({ id: solutionId, subject_id: subjectId })
        .update(updateData)
        .returning('*');
    return updated;
};

export const softDeleteSolutionsBySubject = async (data) => {
    return await db('revision.solutions')
        .where('subject_id', data.subjectId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const softDeleteSolutionsByQuestion = async (data) => {
    return await db('revision.solutions')
        .where('question_id', data.questionId)
        .update({ is_deleted: true, deleted_at: db.fn.now() });
};

export const getSolutionById = async (id, subjectId) => {
    return await db('revision.solutions')
        .where({ id, subject_id: subjectId, is_deleted: false })
        .first();
};

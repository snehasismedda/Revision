import db from '../knex/db.js';

export const createQuizSet = async (data) => {
    const [quizSet] = await db('revision.quiz_sets')
        .insert(data)
        .returning('*');
    return quizSet;
};

export const getQuizSets = async () => {
    return await db('revision.quiz_sets')
        .where({ is_deleted: false })
        .orderBy('created_at', 'desc');
};

export const getQuizSetById = async (id) => {
    return await db('revision.quiz_sets')
        .where({ id, is_deleted: false })
        .first();
};

export const deleteQuizSet = async (id) => {
    const [quizSet] = await db('revision.quiz_sets')
        .where({ id })
        .update({ is_deleted: true, deleted_at: new Date() })
        .returning('*');
    return quizSet;
};

export const updateQuizSet = async (id, data) => {
    const [quizSet] = await db('revision.quiz_sets')
        .where({ id, is_deleted: false })
        .update(data)
        .returning('*');
    return quizSet;
};

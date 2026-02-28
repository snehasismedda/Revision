import db from '../knex/db.js';

export const createSourceImage = async (subjectId, data) => {
    const [image] = await db('revision.source_images')
        .insert({
            subject_id: subjectId,
            data
        })
        .returning('*');
    return image;
};

export const getSourceImageById = async (id, subjectId) => {
    return await db('revision.source_images')
        .where({ id, subject_id: subjectId })
        .first();
};

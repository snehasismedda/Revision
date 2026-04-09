import * as topicModel from '../models/topicModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as entryModel from '../models/entryModel.js';
import * as questionModel from '../models/questionModel.js';
import * as noteModel from '../models/noteModel.js';
import * as solutionModel from '../models/solutionModel.js';
import * as sourceImageModel from '../models/sourceImageModel.js';
import db from '../knex/db.js';

export const deleteSubjectCascade = async (subjectId) => {

    try {
        // Find all sessions for this subject to delete their entries
        const sessions = await sessionModel.findSessionsBySubject({ subjectId });
        const sessionIds = sessions.map(s => s.id);
        
        if (sessionIds.length > 0) {
            await entryModel.softDeleteEntriesBySessions(sessionIds);
        }

        await sessionModel.softDeleteSessionsBySubject({ subjectId });
        await topicModel.softDeleteTopicsBySubject({ subjectId });
        await questionModel.softDeleteQuestionsBySubject({ subjectId });
        await noteModel.softDeleteNotesBySubject({ subjectId });
        await solutionModel.softDeleteSolutionsBySubject({ subjectId });
        await sourceImageModel.softDeleteSourceImagesBySubject({ subjectId });
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete subject ${subjectId}:`, error.message);
        throw error;
    }
};

export const deleteSessionCascade = async (sessionId) => {
    return deleteSessionsCascade([sessionId]);
};

export const deleteSessionsCascade = async (sessionIds) => {
    try {
        await entryModel.softDeleteEntriesBySessions(sessionIds);
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to bulk cascade delete sessions:`, error.message);
        throw error;
    }
};

export const deleteTopicCascade = async (topicId) => {
    return deleteTopicsCascade([topicId]);
};

export const deleteTopicsCascade = async (topicIds) => {
    try {
        // Collect all descendants for all topics
        let allTopicIds = [...topicIds];
        for (const topicId of topicIds) {
            const descendants = await topicModel.findAllDescendants(topicId);
            allTopicIds = [...allTopicIds, ...descendants.map(t => t.id)];
        }
        const uniqueTopicIds = [...new Set(allTopicIds)];

        // Delete entries for all these topics in bulk
        await entryModel.softDeleteEntriesByTopics(uniqueTopicIds);
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to bulk cascade delete topics:`, error.message);
        throw error;
    }
};


export const deleteNoteCascade = async (noteId, subjectId) => {

    return deleteNotesCascade([noteId], subjectId);
};

export const deleteNotesCascade = async (noteIds, subjectId) => {
    try {
        const idList = Array.isArray(noteIds) ? noteIds : [noteIds];
        if (idList.length === 0) return;

        // Find all notes to get their source image IDs
        const notes = await db('revision.notes')
            .whereIn('id', idList)
            .where('subject_id', subjectId)
            .select('source_image_ids');

        const sourceImageIds = [];
        notes.forEach(n => {
            if (n.source_image_ids && Array.isArray(n.source_image_ids)) {
                sourceImageIds.push(...n.source_image_ids);
            }
        });

        if (sourceImageIds.length > 0) {
            await sourceImageModel.softDeleteSourceImage(sourceImageIds, subjectId);
        }
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to bulk cascade delete notes:`, error.message);
        throw error;
    }
};

export const deleteSolutionCascade = async (solutionId, subjectId) => {
    return deleteSolutionsCascade([solutionId], subjectId);
};

export const deleteSolutionsCascade = async (solutionIds, subjectId) => {
    try {
        const idList = Array.isArray(solutionIds) ? solutionIds : [solutionIds];
        if (idList.length === 0) return;

        // Find all solutions to get their source image IDs
        const solutions = await db('revision.solutions')
            .whereIn('id', idList)
            .where('subject_id', subjectId)
            .select('source_image_id');

        const sourceImageIds = solutions
            .map(s => s.source_image_id)
            .filter(id => id !== null);

        if (sourceImageIds.length > 0) {
            await sourceImageModel.softDeleteSourceImage(sourceImageIds, subjectId);
        }
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to bulk cascade delete solutions:`, error.message);
        throw error;
    }
};

export const deleteQuestionCascade = async (questionId, subjectId) => {
    return deleteQuestionsCascade([questionId], subjectId);
};

export const deleteQuestionsCascade = async (questionIds, subjectId) => {
    try {
        const idList = Array.isArray(questionIds) ? questionIds : [questionIds];
        if (idList.length === 0) return;

        const sourceImageIds = [];

        // 1. Find images for all notes related to these questions
        const notes = await db('revision.notes')
            .whereIn('question_id', idList)
            .where('is_deleted', false)
            .select('source_image_ids');
        
        notes.forEach(note => {
            if (note.source_image_ids && Array.isArray(note.source_image_ids)) {
                sourceImageIds.push(...note.source_image_ids);
            }
        });

        // 2. Find images for all solutions related to these questions
        const solutions = await db('revision.solutions')
            .whereIn('question_id', idList)
            .where('is_deleted', false)
            .select('source_image_id');
        
        solutions.forEach(solution => {
            if (solution.source_image_id) sourceImageIds.push(solution.source_image_id);
        });

        // 3. Find the questions themselves to see if they have source images
        const questions = await db('revision.questions')
            .whereIn('id', idList)
            .where('subject_id', subjectId)
            .select('source_image_id');
        
        questions.forEach(q => {
            if (q.source_image_id) sourceImageIds.push(q.source_image_id);
        });

        // Bulk delete images
        const uniqueImageIds = [...new Set(sourceImageIds)];
        if (uniqueImageIds.length > 0) {
            await sourceImageModel.softDeleteSourceImage(uniqueImageIds, subjectId);
        }

        // 4. Soft-delete the related records (notes and solutions)
        await db('revision.notes')
            .whereIn('question_id', idList)
            .update({ is_deleted: true, deleted_at: new Date() });

        await db('revision.solutions')
            .whereIn('question_id', idList)
            .update({ is_deleted: true, deleted_at: new Date() });

    } catch (error) {
        console.error(`[deletionService] ❌ Failed to bulk cascade delete questions:`, error.message);
        throw error;
    }
};



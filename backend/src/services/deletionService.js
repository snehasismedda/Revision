import * as topicModel from '../models/topicModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as entryModel from '../models/entryModel.js';
import * as questionModel from '../models/questionModel.js';
import * as noteModel from '../models/noteModel.js';

export const deleteSubjectCascade = async (subjectId) => {
    try {
        console.log(`[deletionService] Processing subject deletion: ${subjectId}`);

        // Find all sessions for this subject
        const sessions = await sessionModel.findSessionsBySubject({ subjectId });

        for (const session of sessions) {
            await entryModel.softDeleteEntriesBySession({ sessionId: session.id });
        }

        await sessionModel.softDeleteSessionsBySubject({ subjectId });
        await topicModel.softDeleteTopicsBySubject({ subjectId });
        await questionModel.softDeleteQuestionsBySubject({ subjectId });
        await noteModel.softDeleteNotesBySubject({ subjectId });

        console.log(`[deletionService] ✅ Cascade soft-deleted subject ${subjectId}`);
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete subject ${subjectId}:`, error.message);
        throw error;
    }
};

export const deleteSessionCascade = async (sessionId) => {
    try {
        console.log(`[deletionService] Processing session deletion: ${sessionId}`);
        await entryModel.softDeleteEntriesBySession({ sessionId });
        console.log(`[deletionService] ✅ Cascade soft-deleted session ${sessionId}`);
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete session ${sessionId}:`, error.message);
        throw error;
    }
};

export const deleteTopicCascade = async (topicId) => {
    try {
        console.log(`[deletionService] Processing topic deletion: ${topicId}`);

        // Cascade delete subtopics and related data
        const subtopics = await topicModel.findSubTopics(topicId);
        const topicIds = [topicId, ...subtopics.map(t => t.id)];

        for (const id of topicIds) {
            // Delete entries for this topic
            await entryModel.softDeleteEntriesByTopic({ topicId: id });
            // Delete questions for this topic
            await questionModel.softDeleteQuestionsByTopic({ topicId: id });
            // Delete notes for this topic (via questions)
            await noteModel.softDeleteNotesByTopic({ topicId: id });
        }

        // Finally soft-delete the subtopics themselves
        await topicModel.softDeleteSubTopics(topicId);

        console.log(`[deletionService] ✅ Cascade soft-deleted topic ${topicId} and its ${subtopics.length} subtopics`);
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete topic ${topicId}:`, error.message);
        throw error;
    }
};

export const deleteQuestionCascade = async (questionId) => {
    try {
        console.log(`[deletionService] Processing question deletion: ${questionId}`);
        // Delete all notes related to this question
        await noteModel.softDeleteNotesByQuestion({ questionId });
        console.log(`[deletionService] ✅ Cascade soft-deleted notes for question ${questionId}`);
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete question ${questionId}:`, error.message);
        throw error;
    }
};

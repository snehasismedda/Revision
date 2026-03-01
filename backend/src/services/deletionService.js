import * as topicModel from '../models/topicModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as entryModel from '../models/entryModel.js';
import * as questionModel from '../models/questionModel.js';
import * as noteModel from '../models/noteModel.js';

export const deleteSubjectCascade = async (subjectId) => {
    try {
        // Find all sessions for this subject
        const sessions = await sessionModel.findSessionsBySubject({ subjectId });
        for (const session of sessions) {
            await entryModel.softDeleteEntriesBySession({ sessionId: session.id });
        }

        await sessionModel.softDeleteSessionsBySubject({ subjectId });
        await topicModel.softDeleteTopicsBySubject({ subjectId });
        await questionModel.softDeleteQuestionsBySubject({ subjectId });
        await noteModel.softDeleteNotesBySubject({ subjectId });
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete subject ${subjectId}:`, error.message);
        throw error;
    }
};

export const deleteSessionCascade = async (sessionId) => {
    try {
        await entryModel.softDeleteEntriesBySession({ sessionId });
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete session ${sessionId}:`, error.message);
        throw error;
    }
};

export const deleteTopicCascade = async (topicId) => {
    try {
        // Find all descendants recursively
        const descendants = await topicModel.findAllDescendants(topicId);
        const topicIds = [topicId, ...descendants.map(t => t.id)];

        for (const id of topicIds) {
            // Delete entries for this topic
            await entryModel.softDeleteEntriesByTopic({ topicId: id });
            // Delete questions for this topic
            await questionModel.softDeleteQuestionsByTopic({ topicId: id });
            // Delete notes for this topic (via questions)
            await noteModel.softDeleteNotesByTopic({ topicId: id });
        }
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete topic ${topicId}:`, error.message);
        throw error;
    }
};

export const deleteQuestionCascade = async (questionId) => {
    try {
        // Delete all notes related to this question
        await noteModel.softDeleteNotesByQuestion({ questionId });
    } catch (error) {
        console.error(`[deletionService] ❌ Failed to cascade delete question ${questionId}:`, error.message);
        throw error;
    }
};

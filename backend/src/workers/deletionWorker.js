import { Worker } from 'bullmq';
import redisConnection from '../config/redis.js';
import * as topicModel from '../models/topicModel.js';
import * as sessionModel from '../models/sessionModel.js';
import * as entryModel from '../models/entryModel.js';

const deletionWorker = new Worker(
    'revision-deletion',
    async (job) => {
        const { type, subjectId, sessionId } = job.data;
        console.log(`[deletionWorker] Processing ${type} deletion job`, job.data);

        if (type === 'subject') {
            // Soft-delete all sessions for this subject, then all their entries, then topics
            const sessions = await sessionModel.findSessionsBySubject({ subjectId });

            for (const session of sessions) {
                await entryModel.softDeleteEntriesBySession({ sessionId: session.id });
            }

            await sessionModel.softDeleteSessionsBySubject({ subjectId });
            await topicModel.softDeleteTopicsBySubject({ subjectId });

            console.log(`[deletionWorker] ✅ Cascade soft-deleted subject ${subjectId}`);
        }

        if (type === 'session') {
            await entryModel.softDeleteEntriesBySession({ sessionId });
            console.log(`[deletionWorker] ✅ Cascade soft-deleted session ${sessionId}`);
        }
    },
    { connection: redisConnection },
);

deletionWorker.on('completed', (job) => {
    console.log(`[deletionWorker] Job ${job.id} completed`);
});

deletionWorker.on('failed', (job, err) => {
    console.error(`[deletionWorker] Job ${job?.id} failed:`, err.message);
});

export default deletionWorker;

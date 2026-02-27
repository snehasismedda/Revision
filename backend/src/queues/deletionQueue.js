import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

const deletionQueue = new Queue('revision-deletion', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
    },
});

export const addDeletionJob = async (data) => {
    await deletionQueue.add(`delete-${data.type}-${data.subjectId || data.sessionId}`, data);
};

export default deletionQueue;

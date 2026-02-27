import qdrant from '../../config/qdrant.js';
import ollama from '../../config/ollama.js';
import dotenv from 'dotenv';
dotenv.config();

const COLLECTION = process.env.QDRANT_COLLECTION || 'revision_topics';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const VECTOR_SIZE = 768;

export const ensureCollection = async () => {
    try {
        await qdrant.getCollection(COLLECTION);
    } catch {
        await qdrant.createCollection(COLLECTION, {
            vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log(`✅ Qdrant collection "${COLLECTION}" created`);
    }
};

const embed = async (text) => {
    const response = await ollama.embeddings({
        model: EMBED_MODEL,
        prompt: text,
    });
    return response.embedding;
};

export const upsertTopic = async ({ topicId, topicName, subjectId }) => {
    await ensureCollection();
    const vector = await embed(topicName);

    await qdrant.upsert(COLLECTION, {
        points: [
            {
                id: topicId,
                vector,
                payload: { topic_name: topicName, subject_id: subjectId },
            },
        ],
    });
};

export const deleteTopic = async ({ topicId }) => {
    await qdrant.delete(COLLECTION, {
        points: [topicId],
    });
};

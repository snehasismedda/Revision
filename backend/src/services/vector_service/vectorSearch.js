import qdrant from '../../config/qdrant.js';
import ollama from '../../config/ollama.js';
import dotenv from 'dotenv';
dotenv.config();

const COLLECTION = process.env.QDRANT_COLLECTION || 'revision_topics';
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

export const search = async ({ query, subjectId, limit = 5 }) => {
    const response = await ollama.embeddings({
        model: EMBED_MODEL,
        prompt: query,
    });
    const vector = response.embedding;

    const searchParams = {
        vector,
        limit,
        with_payload: true,
    };

    if (subjectId) {
        searchParams.filter = {
            must: [{ key: 'subject_id', match: { value: subjectId } }],
        };
    }

    const results = await qdrant.search(COLLECTION, searchParams);

    return results.map((r) => ({
        topicId: r.id,
        topicName: r.payload.topic_name,
        subjectId: r.payload.subject_id,
        score: r.score,
    }));
};

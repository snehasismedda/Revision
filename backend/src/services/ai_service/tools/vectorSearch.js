import { search } from '../../vector_service/vectorSearch.js';

export const vectorSearchTool = {
    definition: {
        name: 'search_similar_topics',
        description: 'Search for semantically similar topics in the knowledge base. Use this to find related concepts when analyzing performance or suggesting revision areas.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The topic or concept to search for similar items',
                },
                subject_id: {
                    type: 'string',
                    description: 'Optional subject ID to filter results to a specific subject',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 5)',
                },
            },
            required: ['query'],
        },
    },

    execute: async (args) => {
        try {
            const results = await search({
                query: args.query,
                subjectId: args.subject_id,
                limit: args.limit || 5,
            });
            return { results };
        } catch (error) {
            return { results: [], error: error.message };
        }
    },
};

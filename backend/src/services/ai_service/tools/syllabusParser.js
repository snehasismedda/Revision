export const syllabusParserTool = {
    definition: {
        name: 'parse_syllabus_to_topics',
        description: 'Parse raw syllabus text into a structured list of topics and subtopics. Use when the user provides a syllabus, curriculum, or course outline and wants it organized into a topic hierarchy.',
        parameters: {
            type: 'object',
            properties: {
                syllabus_text: {
                    type: 'string',
                    description: 'The raw syllabus or curriculum text to parse',
                },
                subject_name: {
                    type: 'string',
                    description: 'The name of the subject or course',
                },
            },
            required: ['syllabus_text'],
        },
    },

    execute: async (args) => {
        // This tool is a structural helper — the actual parsing happens in the LLM itself
        // The tool signals to the model to structure its output as a topic tree
        return {
            instruction: 'Return a JSON array of topics. Each topic: { name: string, children: Topic[] }. Keep names concise (2-6 words). No explanations, only JSON.',
            syllabusText: args.syllabus_text,
            subjectName: args.subject_name || 'Unknown Subject',
        };
    },
};

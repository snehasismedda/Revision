/**
 * OpenAPI 3.1.0 specification for ChatGPT Custom Actions
 */
export const getOpenApiSpec = (serverUrl = 'https://resume-zips-unfixable.ngrok-free.dev') => ({
    openapi: '3.1.0',
    info: {
        title: 'Revision Platform AI Assistant API',
        version: '1.0.0',
        description: 'API for Custom GPT to save study notes, explanations, and key takeaways directly into user subjects on the Revision platform.'
    },
    servers: [
        {
            url: serverUrl,
            description: 'Revision Backend Server'
        }
    ],
    paths: {
        '/api/integrations/chatgpt/subjects': {
            get: {
                operationId: 'getAvailableSubjects',
                summary: 'Get all available subjects and their unique IDs (UUIDs)',
                description: 'Returns the list of all subjects along with their unique UUID `id`. Call this FIRST to get the `subjectId` before saving notes, questions, or solutions.',
                responses: {
                    '200': {
                        description: 'List of available subjects with IDs',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        count: { type: 'integer' },
                                        subjects: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string', description: 'Unique UUID of the subject' },
                                                    name: { type: 'string', description: 'Name of the subject' },
                                                    description: { type: 'string' },
                                                    tags: { type: 'array', items: { type: 'string' } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                operationId: 'createSubject',
                summary: 'Create a new subject explicitly',
                description: 'Used ONLY when the user explicitly asks to create a brand new subject. Returns the subject details and its unique UUID `id` to be used for subsequent saves.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'Name of the new subject (e.g. Linear Algebra, Digital Logic)'
                                    },
                                    description: {
                                        type: 'string',
                                        description: 'Optional brief description of the subject'
                                    },
                                    tags: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Optional tags for the subject'
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Subject created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string' },
                                            subject: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    name: { type: 'string' },
                                                    description: { type: 'string' },
                                                    tags: { type: 'array', items: { type: 'string' } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/integrations/chatgpt/notes': {
            post: {
                operationId: 'saveStudyNote',
                summary: 'Save study notes into a specific subject using subjectId',
                description: 'Creates a note containing detailed explanations, key concepts, formulas, and Q&A under the subject identified by its subjectId UUID.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['subjectId', 'title', 'content'],
                                properties: {
                                    subjectId: {
                                        type: 'string',
                                        description: 'The exact subject UUID obtained from getAvailableSubjects (e.g. 47c8c1cb-62c0-4371-b3cd-11180321ee1f)'
                                    },
                                    title: {
                                        type: 'string',
                                        description: 'Clear, descriptive title for the note or topic'
                                    },
                                    content: {
                                        type: 'string',
                                        description: 'Complete study note formatted in Markdown, including theory, key concepts, and explanations'
                                    },
                                    tags: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'List of relevant keywords or sub-topic tags such as chapter name, topic name, etc.'
                                    },
                                    keyHighlights: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Bullet list of important formulas, definitions, or exam takeaways'
                                    },
                                    imageBase64: {
                                        type: 'string',
                                        description: 'Optional base64 encoded image data URL of diagrams/notes'
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Note successfully saved',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            subject: { type: 'object' },
                                            note: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/integrations/chatgpt/questions-with-note': {
            post: {
                operationId: 'saveQuestionWithLinkedNote',
                summary: 'Save a Question, Solution, and linked Note using subjectId',
                description: 'Saves the question into Questions tab, step-by-step solution into Solutions table, and optionally creates a linked theory note in the Notes table ONLY IF new concepts or core theory are involved. noteTitle and noteContent are strictly optional and not mandatory for all questions.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['subjectId', 'questionText'],
                                properties: {
                                    subjectId: {
                                        type: 'string',
                                        description: 'The exact subject UUID obtained from getAvailableSubjects (e.g. 47c8c1cb-62c0-4371-b3cd-11180321ee1f)'
                                    },
                                    questionText: {
                                        type: 'string',
                                        description: 'Exact text or formulation of the practice problem or exam question'
                                    },
                                    solutionTitle: {
                                        type: 'string',
                                        description: 'Title of the solution (e.g. Step-by-Step Solution)'
                                    },
                                    solutionContent: {
                                        type: 'string',
                                        description: 'STRICTLY the direct step-by-step working, calculations, and final answer for THIS specific problem. Do NOT include general background lectures or theory here.'
                                    },
                                    noteTitle: {
                                        type: 'string',
                                        description: 'OPTIONAL. Title of the conceptual topic/theory (e.g. Banker Algorithm & Deadlock Avoidance Theory). Use ONLY if new concepts or theory are involved and need a dedicated note. Not mandatory for all questions—omit if no new concepts are involved.'
                                    },
                                    noteContent: {
                                        type: 'string',
                                        description: 'OPTIONAL. Deep theoretical explanation, core definitions, formulas, underlying principles, and exam tips about the TOPIC. Do NOT repeat the step-by-step calculation of this specific problem. Use ONLY if new concepts are involved that need to be learned/revised. Not mandatory—omit if no new concepts are involved or if only the question and solution are needed.'
                                    },
                                    tags: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Tags for the question. Add relevant tags like "QS marks", "chapter name", "topic name", "year of exam", if clearly visible in the question paper. Do not add extra description. For Notes just make such as chapter name and keywords if any. Do not add description.'
                                    },
                                    keyHighlights: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'Key formulas or tricks to remember. Don\'t make it lengthy, just give bullet points'
                                    },
                                    imageBase64: {
                                        type: 'string',
                                        description: 'Optional base64 encoded image data URL of the problem/diagram to attach'
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Question, Solution, and linked Note created successfully'
                        }
                    }
                }
            }
        },
        '/api/integrations/chatgpt/notes/search': {
            get: {
                operationId: 'getNotesForSubject',
                summary: 'Fetch note titles and metadata for a specific subjectId',
                description: 'Returns only note metadata (id, title, tags, keyHighlights) for a subject. Very lightweight, avoids response limits.',
                parameters: [
                    {
                        name: 'subjectId',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                        description: 'The exact subject UUID obtained from getAvailableSubjects'
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        required: false,
                        schema: { type: 'integer', default: 20 },
                        description: 'Number of recent notes to fetch'
                    }
                ],
                responses: {
                    '200': {
                        description: 'List of note metadata for the subject'
                    }
                }
            }
        },
        '/api/integrations/chatgpt/notes/detail': {
            get: {
                operationId: 'getNoteDetailByTitle',
                summary: 'Get the full complete content of a specific note by title and subjectId',
                description: 'Fetches the complete markdown content, explanations, and key highlights of an individual note using its title or ID.',
                parameters: [
                    {
                        name: 'title',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Title or name of the note to retrieve (e.g. CPU Scheduling Algorithms, Process Synchronization)'
                    },
                    {
                        name: 'subjectId',
                        in: 'query',
                        required: false,
                        schema: { type: 'string' },
                        description: 'The subject UUID'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Full note content and details'
                    },
                    '404': {
                        description: 'Note not found'
                    }
                }
            }
        }
    }
});

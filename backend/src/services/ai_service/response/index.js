import { generateQwenResponse } from './qwen.js';

/**
 * Main AI service router — dispatches to the correct model adapter.
 * To add a new model: create response/newmodel.js and add a case below.
 */
export const generateResponse = async (data) => {
    const model = (data.model || 'qwen').toLowerCase();

    switch (model) {
        case 'qwen':
            return _generateQwenAiResponse(data);
        default:
            throw new Error(`Model '${model}' not supported. Supported: qwen`);
    }
};

const _generateQwenAiResponse = async (data) => {
    return generateQwenResponse(data, []);
};

import { ollama, models } from '../../../config/ollama.js';
import { notePrompt } from '../../../system_prompts/index.js';

/**
 * Generates detailed notes about a question's topic, method, and theory.
 */
export const generateNoteFromQuestion = async (questionContent) => {
    try {
        const messages = [
            {
                role: "system",
                content: notePrompt
            },
            {
                role: "user",
                content: `Here is the question:\n\n${questionContent}`
            }
        ];

        const response = await ollama.chat({
            model: models.TEXT,
            messages,
            stream: false,
            format: 'json',
        });

        const content = response.message?.content;
        if (!content) return { title: '', content: 'Failed to generate note content.' };

        try {
            const parsed = JSON.parse(content);

            // Helper to restore backslashes for common LaTeX commands that JSON.parse misinterprets as control characters
            const restoreMathEscapes = (text) => {
                if (typeof text !== 'string') return text;
                return text
                    .replace(/\u000c/g, '\\f')   // \frac
                    .replace(/\u0009/g, '\\t')   // \tau, \text, \theta
                    .replace(/\u0008/g, '\\b')   // \beta, \begin, \binom
                    .replace(/\u000d/g, '\\r')   // \rho, \rightarrow
                    .replace(/\u000b/g, '\\v');  // \vec, \vfill
            };

            if (parsed.title) parsed.title = restoreMathEscapes(parsed.title);
            if (parsed.content) parsed.content = restoreMathEscapes(parsed.content);

            return parsed;
        } catch (e) {
            console.error('Failed to parse AI note JSON:', e);
            return { title: 'AI Note', content: content };
        }
    } catch (error) {
        console.error('generateNoteFromQuestion error:', error);
        throw error;
    }
};

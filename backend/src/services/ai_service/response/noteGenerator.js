import ollama from '../../../config/ollama.js';

/**
 * Generates detailed notes about a question's topic, method, and theory.
 */
export const generateNoteFromQuestion = async (questionContent) => {
    try {
        const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
        const messages = [
            {
                role: "system",
                content: `You are an expert tutor and conceptual note generator.

        Your task is to analyze a given question and generate STUDY NOTES that explain ALL the concepts a student must know to solve that question — including prerequisite and related core concepts (not just the obvious one).

        You MUST return a valid JSON object with EXACTLY these keys:

        {
        "title": "Short concept-focused title",
        "content": "Markdown formatted notes"
        }

        STRICT OUTPUT RULES:
        1. Output ONLY the JSON object. No text before or after.
        2. Content must be concise, pointer-wise, and revision-friendly.
        3. Focus on THEORY, REQUIRED CONCEPTS, and SOLVING STRATEGY — NOT the final numerical answer.
        4. Include prerequisite concepts automatically (example: if adjacency matrix is needed, also include graph properties, degree rules, matrix powers, etc.).
        5. Use Markdown headers and bullet points only.
        6. Use LaTeX for ALL mathematical expressions:
        - Inline: $a^2$
        - Block: $$equation$$
        7. Add proper spacing, next-line, break between lines and sections.
        8. Avoid long paragraphs. Prefer structured bullets.
        9. Notes must help solve SIMILAR problems, not just the given one.

        MANDATORY CONTENT STRUCTURE:

        # Core Concept
        - Main topic being tested
        - Related subtopics required to understand it

        # Important Concepts Involved
        - Key definitions
        - Theorems / identities
        - Properties used
        - Supporting or prerequisite concepts

        # Recognition Pattern
        - How to identify this type of question
        - Keywords or structural hints

        # Solving Method (Step-by-Step Strategy)
        - General approach
        - Logical sequence of steps
        - Decision rules

        # Key Formulas / Identities
        - All formulas required (LaTeX)

        # Common Pitfalls
        - Typical mistakes students make
        - Misconceptions

        # Exam Tips
        - Short tricks
        - Time-saving observations

        IMPORTANT:
        Include EVERY foundational concept required to solve the problem, even if the question mentions only one concept explicitly.`
            },
            {
                role: "user",
                content: `Here is the question:\n\n${questionContent}`
            }
        ];

        const response = await ollama.chat({
            model,
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

import ollama from '../../../config/ollama.js';

/**
 * Parses question content (text or image) using Qwen models.
 * For images, uses Qwen2-VL.
 *
 * IMPORTANT: When input contains MULTIPLE questions (common in images),
 * returns an ARRAY of rich-text question objects. When input is a single
 * question, wraps it in an array for consistent handling.
 *
 * @returns {Array<object>} Array of { root: { children: [...] } } objects
 */
export const parseQuestionToRichText = async ({ content, type, topics = [] }) => {
  try {
    const model = type === 'image' ? (process.env.OLLAMA_VL_MODEL) : (process.env.OLLAMA_TEXT_MODEL);

    const topicsString = topics.length > 0 ? `
                ====================
                AVAILABLE TOPICS
                ====================
                The subject currently has these topics: [${topics.join(', ')}].
                Please prioritize selecting tags from this list if they are relevant.
                If no existing topic fits, you may create a new, concise academic topic (e.g. 'Thermodynamics').
` : '';

    const messages = [
      {
        role: "system",
        content: `
                You are an expert academic content extractor.
                Your task is to identify and extract individual educational questions from text or images and format them into a structured Rich Text JSON array.

                ====================
                STRICT REQUIREMENT: MULTIPLE QUESTIONS & CATEGORIZATION
                ====================
                VERY IMPORTANT: Educational materials often contain multiple questions (e.g., Problem 1, Problem 2, Problem 3... or a list of equations to solve).
                
                - DO NOT bundle multiple questions into one object.
                - For EACH distinct question identified, you MUST create a separate entry in the "questions" array.
                - A "question" is usually defined by a leading number (1, 2, 3...), a bullet point, or clear semantic separation.
                - For EACH question, you MUST determine relevant academic topics or concepts (tags) that the question tests.
                ${topicsString}

                ====================
                MANDATORY OUTPUT STRUCTURE
                ====================
                You MUST return ONLY a JSON object with a "questions" key containing an array:

                {
                  "questions": [
                    {
                      "tags": ["Algebra", "Linear Equations"],
                      "root": {
                        "children": [ ...nodes for question 1... ]
                      }
                    },
                    {
                      "tags": ["Calculus", "Derivatives"],
                      "root": {
                        "children": [ ...nodes for question 2... ]
                      }
                    }
                  ]
                }

                Each question object MUST follow the standard Rich Text schema under the "root" key:
                - "paragraph" nodes for text.
                - "list" and "listItem" nodes for options/parts.
                - "text" nodes with content.
                - Additionally, provide a "tags" array consisting of 1-3 concise string tags (topics) representing the concepts.

                ====================
                FORMATTING RULES
                ====================
                1. Strip the global question number (e.g., if the image says "1) Solve x", the output text should just be "Solve $x$").
                2. Use LaTeX for ALL math. Formulas MUST be wrapped in \\( ... \\) for inline or \\[ ... \\] for blocks. This includes ALL subscripts/superscripts (e.g., use $t_{pd}$ instead of HTML).
                3. Preserve original wording faithfully.
                4. For tags, use standard academic terminology (e.g., 'Thermodynamics', 'Data Structures', 'Kinematics').

                ====================
                EXAMPLE
                ====================
                Input: "1) 2+2=?  2) 3+3=?"
                Correct Output:
                {
                  "questions": [
                    { "tags": ["Basic Arithmetic", "Addition"], "root": { "children": [{ "type": "paragraph", "children": [{ "type": "text", "text": "2+2=?" }] }] } },
                    { "tags": ["Basic Arithmetic", "Addition"], "root": { "children": [{ "type": "paragraph", "children": [{ "type": "text", "text": "3+3=?" }] }] } }
                  ]
                }

                Incorrect Output (Do NOT do this):
                {
                  "questions": [
                    { "tags": [], "root": { "children": [{ "type": "paragraph", "children": [{ "type": "text", "text": "1) 2+2=? 2) 3+3=?" }] }] } }
                  ]
                }
                `
      }
    ];

    if (type === 'image') {
      const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
      messages.push({
        role: 'user',
        content: 'Extract every distinct question from this image into the mandatory "questions" array format. Ensure each numbered problem becomes a separate object.',
        images: [base64Data]
      });
    } else {
      messages.push({
        role: 'user',
        content: `Extract every distinct question from the following text into the mandatory "questions" array format. Ensure each numbered problem or equation becomes a separate object:\n\n${content}`
      });
    }

    const response = await ollama.chat({
      model,
      messages,
      format: 'json',
      stream: false,
    });

    const result = response.message?.content || '';
    const parsed = JSON.parse(result);

    // Normalize: always return an array of question objects
    if (parsed.questions && Array.isArray(parsed.questions)) {
      // Further validation: filter out empty or malformed roots
      return parsed.questions.filter(q => q && q.root);
    }

    // Backward compat: if AI still returns old single-question format { root: ... }
    if (parsed.root) {
      // Try a heuristic split if it contains multiple numbered items in one paragraph
      // but for now, just wrap it and hope the improved prompt works better.
      return [{ tags: parsed.tags || [], root: parsed.root }];
    }

    // Final fallback
    return [{ tags: [], root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: content }] }] } }];

  } catch (error) {
    console.error('parseQuestionToRichText error:', error);
    const fallbackText = type === 'image' ? 'Could not extract text from image.' : content;
    return [{
      tags: [],
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: fallbackText }]
          }
        ]
      }
    }];
  }
};

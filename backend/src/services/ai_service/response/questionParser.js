import { ollama, models } from "../../../config/ollama.js";
import { questionPrompt } from "../../../system_prompts/index.js";

export const parseQuestionToRichText = async ({ content, type, topics = [] }) => {
  try {
    const model = type === 'image' ? models.IMAGE : models.TEXT;

    const topicsString = topics.length > 0 ? `
    ================================================
    AVAILABLE TOPICS
    ================================================
    The subject currently has these topics:
    [${topics.join(', ')}]

    Tagging Rules:
    - PRIORITIZE selecting tags from this list only.
    - Do not create a NEW topic.
    ` : '';

    const messages = [
      {
        role: "system",
        content: questionPrompt
      },
      {
        role: "user",
        content: topicsString
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

    if (parsed.questions && Array.isArray(parsed.questions)) {
      parsed.questions = parsed.questions.map(q => ({
        ...q,
        question: restoreMathEscapes(q.question)
      }));
    }

    return parsed;

  } catch (error) {
    console.error('parseQuestionToRichText error:', error);
    const fallbackText = type === 'image' ? 'Could not extract text from image.' : content;
    throw new Error(fallbackText);
  }
};

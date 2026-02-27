import ollama from '../../../config/ollama.js';
import { toolDefinitions, toolRegistry } from '../tools/index.js';

/**
 * Convert shared JSON Schema tool definitions to Ollama's expected format.
 * Ollama expects: { type: 'function', function: { name, description, parameters } }
 */
const convertToolsToOllamaFormat = (definitions) => {
    return definitions.map((def) => ({
        type: 'function',
        function: {
            name: def.name,
            description: def.description,
            parameters: def.parameters,
        },
    }));
};

/**
 * Qwen model adapter — calls Ollama and handles agentic tool-call loop.
 * Returns final text response after all tool calls are resolved.
 */
export const generateQwenResponse = async (data, conversationsToSave = []) => {
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const messages = [
        ...(data.systemPrompt ? [{ role: 'system', content: data.systemPrompt }] : []),
        ...data.history,
        ...(data.query ? [{ role: 'user', content: data.query }] : []),
    ];

    const response = await ollama.chat({
        model,
        messages,
        tools: convertToolsToOllamaFormat(toolDefinitions),
        stream: false,
    });

    const message = response.message;
    conversationsToSave.push({ role: 'assistant', content: message.content || '' });

    // Agentic loop: if tool_calls present → execute tools → recurse
    if (message.tool_calls && message.tool_calls.length > 0) {
        const updatedHistory = [
            ...messages,
            message,
        ];

        for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = toolCall.function.arguments || {};

            const executor = toolRegistry[toolName];
            let toolResult;

            if (executor) {
                toolResult = await executor(toolArgs);
            } else {
                toolResult = { error: `Tool "${toolName}" not found in registry` };
            }

            updatedHistory.push({
                role: 'tool',
                content: JSON.stringify(toolResult),
            });

            conversationsToSave.push({
                role: 'tool',
                tool_name: toolName,
                content: JSON.stringify(toolResult),
            });
        }

        // Recurse with updated history, empty query (conversation continues)
        return generateQwenResponse(
            { ...data, query: '', history: updatedHistory },
            conversationsToSave,
        );
    }

    // Terminal response — return final text
    return message.content || '';
};

import { syllabusParserTool } from './syllabusParser.js';

const tools = [syllabusParserTool];

export const toolDefinitions = tools.map((tool) => tool.definition);

export const toolRegistry = {};
tools.forEach((tool) => {
    toolRegistry[tool.definition.name] = tool.execute;
});

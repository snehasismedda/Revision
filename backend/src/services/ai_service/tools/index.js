import { syllabusParserTool } from './syllabusParser.js';
import { vectorSearchTool } from './vectorSearch.js';

const tools = [syllabusParserTool, vectorSearchTool];

export const toolDefinitions = tools.map((tool) => tool.definition);

export const toolRegistry = {};
tools.forEach((tool) => {
    toolRegistry[tool.definition.name] = tool.execute;
});

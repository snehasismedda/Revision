import { Ollama } from 'ollama';
import dotenv from 'dotenv';
dotenv.config();

export const ollama = new Ollama({
    host: process.env.OLLAMA_URL || 'http://localhost:11434',
});

export const models = {
    TEXT: process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b',
    IMAGE: process.env.OLLAMA_VL_MODEL || 'qwen2.5vl:latest',
};
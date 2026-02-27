import { Ollama } from 'ollama';
import dotenv from 'dotenv';
dotenv.config();

const ollama = new Ollama({
    host: process.env.OLLAMA_URL || 'http://localhost:11434',
});

export default ollama;

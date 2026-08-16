import express from 'express';
import { authenticateChatGPT } from './chatgptAuth.js';
import * as chatgptController from './chatgptController.js';
import { getOpenApiSpec } from './openapiSchema.js';

const router = express.Router();

// 1. Dynamic OpenAPI Specification endpoint (no auth needed so ChatGPT can import schema)
router.get('/openapi.json', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const serverUrl = `${protocol}://${host}`;
    
    res.json(getOpenApiSpec(serverUrl));
});

// 2. Protected Action Endpoints (authenticated via x-api-key / Bearer)
router.get('/subjects', authenticateChatGPT, chatgptController.getSubjects);
router.post('/subjects', authenticateChatGPT, chatgptController.createSubject);
router.post('/notes', authenticateChatGPT, chatgptController.saveNote);
router.post('/questions-with-note', authenticateChatGPT, chatgptController.saveQuestionWithLinkedNote);
router.get('/notes/search', authenticateChatGPT, chatgptController.getNotesForSubject);
router.get('/notes/detail', authenticateChatGPT, chatgptController.getNoteDetailByTitle);

export default router;

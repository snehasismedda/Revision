import express from 'express';
import { getPrompts, createPrompt, updatePrompt, deletePrompt } from '../controllers/systemPromptController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPrompts);
router.post('/', createPrompt);
router.put('/:id', updatePrompt);
router.delete('/:id', deletePrompt);

export default router;

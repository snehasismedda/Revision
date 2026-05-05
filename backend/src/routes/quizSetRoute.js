import express from 'express';
import { createQuizSetController, getQuizSetsController, getQuizSetByIdController, deleteQuizSetController, updateQuizSetController } from '../controllers/quizSetController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createQuizSetController);
router.get('/', getQuizSetsController);
router.get('/:id', getQuizSetByIdController);
router.delete('/:id', deleteQuizSetController);
router.put('/:id', updateQuizSetController);

export default router;

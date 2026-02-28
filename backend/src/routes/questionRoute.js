import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import * as questionController from '../controllers/questionController.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', questionController.getQuestions);
router.get('/:questionId/image', questionController.getQuestionImage);
router.post('/', questionController.createQuestion);
router.put('/:questionId', questionController.updateQuestion);
router.delete('/:questionId', questionController.deleteQuestion);

export default router;

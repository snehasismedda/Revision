import express from 'express';
import * as solutionController from '../controllers/solutionController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', solutionController.getSolutions);
router.post('/', solutionController.createSolution);
router.put('/:solutionId', solutionController.updateSolution);
router.delete('/:solutionId', solutionController.deleteSolution);
router.get('/:solutionId/image', solutionController.getSolutionImage);

export default router;

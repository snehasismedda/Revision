import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import * as testController from '../controllers/testController.js';

// The router is mounted at /api/test-series/:seriesId/tests
const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.post('/', testController.createTest);
router.get('/:testId', testController.getTestDetail);
router.get('/:testId/results', testController.getTestResults);
router.post('/:testId/subjects/:subjectId/results', testController.submitTestResult);
router.delete('/:testId', testController.deleteTest);
router.put('/:testId', testController.updateTest);

export default router;


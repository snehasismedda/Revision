import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import * as testSeriesController from '../controllers/testSeriesController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', testSeriesController.createTestSeries);
router.get('/', testSeriesController.getTestSeries);
router.get('/:id', testSeriesController.getTestSeriesDetail);
router.get('/:id/tests', testSeriesController.getTestsBySeries);
router.delete('/:id', testSeriesController.deleteTestSeries);
router.put('/:id', testSeriesController.updateTestSeries);

export default router;


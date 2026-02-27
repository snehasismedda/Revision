import express from 'express';
import { getOverview, getTopicPerformance, getTrends, getWeakAreas } from '../controllers/analyticsController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/:subjectId/overview', getOverview);
router.get('/:subjectId/topic-performance', getTopicPerformance);
router.get('/:subjectId/trends', getTrends);
router.get('/:subjectId/weak-areas', getWeakAreas);

export default router;

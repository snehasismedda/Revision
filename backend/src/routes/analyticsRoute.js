import express from 'express';
import { getOverview, getTopicPerformance, getTrends, getWeakAreas, getSessionTopicDistribution, getTestSeriesAnalytics, getTestAnalytics } from '../controllers/analyticsController.js';
import { getTestInsights } from '../controllers/aiController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/overview', getOverview);
router.get('/:subjectId/overview', getOverview);
router.get('/:subjectId/topic-performance', getTopicPerformance);
router.get('/:subjectId/trends', getTrends);
router.get('/:subjectId/weak-areas', getWeakAreas);
router.get('/session/:sessionId/distribution', getSessionTopicDistribution);
router.get('/test-series/:seriesId/tests/:testId', getTestAnalytics);
router.get('/test-series/:seriesId/tests/:testId/insights', getTestInsights);
router.get('/test-series/:seriesId', getTestSeriesAnalytics);

export default router;

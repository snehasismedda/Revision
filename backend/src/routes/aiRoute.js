import express from 'express';
import { parseSyllabus, getInsights, getSessionInsights, getGlobalInsights, parseNote, describeImage, enhanceNote } from '../controllers/aiController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.post('/parse-syllabus', parseSyllabus);
router.post('/parse-note', parseNote);
router.post('/enhance-note', enhanceNote);
router.post('/describe-image', describeImage);
router.get('/global-insights', getGlobalInsights);
router.get('/insights/:subjectId', getInsights);
router.get('/insights/:subjectId/sessions/:sessionId', getSessionInsights);

export default router;

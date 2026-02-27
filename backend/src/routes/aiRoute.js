import express from 'express';
import { parseSyllabus, getInsights, getSessionInsights } from '../controllers/aiController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.post('/parse-syllabus', parseSyllabus);
router.get('/insights/:subjectId', getInsights);
router.get('/insights/:subjectId/sessions/:sessionId', getSessionInsights);

export default router;

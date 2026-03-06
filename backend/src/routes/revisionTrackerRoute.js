import express from 'express';
import { listSessions, createSession, toggleStatus, deleteSession, getRevisionAnalytics } from '../controllers/revisionTrackerController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });
router.use(authenticate);

// GET  /subjects/:subjectId/revision-tracker/sessions
router.get('/sessions', listSessions);
// POST /subjects/:subjectId/revision-tracker/sessions
router.post('/sessions', createSession);
// DELETE /subjects/:subjectId/revision-tracker/sessions/:sessionId
router.delete('/sessions/:sessionId', deleteSession);
// PUT  /subjects/:subjectId/revision-tracker/sessions/:sessionId/topics/:topicId
router.put('/sessions/:sessionId/topics/:topicId', toggleStatus);
// GET  /subjects/:subjectId/revision-tracker/analytics
router.get('/analytics', getRevisionAnalytics);

export default router;

import express from 'express';
import { getSessions, createSession, getSession, updateSession, deleteSession } from '../controllers/sessionController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getSessions);
router.post('/', createSession);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;

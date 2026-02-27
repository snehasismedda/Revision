import express from 'express';
import { getSubjects, createSubject, getSubject, updateSubject, deleteSubject } from '../controllers/subjectController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSubjects);
router.post('/', createSubject);
router.get('/:id', getSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;

import express from 'express';
import * as noteController from '../controllers/noteController.js';

const router = express.Router({ mergeParams: true });

// Mounted at /api/subjects/:subjectId/notes
router.get('/', noteController.getNotes);
router.post('/', noteController.createNote);
router.delete('/:noteId', noteController.deleteNote);

export default router;

import express from 'express';
import * as noteController from '../controllers/noteController.js';

const router = express.Router({ mergeParams: true });

// Mounted at /api/subjects/:subjectId/notes
router.get('/', noteController.getNotes);
router.get('/:noteId/image', noteController.getNoteImage);
router.post('/', noteController.createNote);
router.put('/:noteId', noteController.updateNote);
router.delete('/:noteId', noteController.deleteNote);

export default router;

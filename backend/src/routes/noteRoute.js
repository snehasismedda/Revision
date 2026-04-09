import express from 'express';
import * as noteController from '../controllers/noteController.js';

const router = express.Router({ mergeParams: true });

// Mounted at /api/subjects/:subjectId/notesx
router.get('/', noteController.getAllNotes);
router.get('/tags', noteController.getNoteTags);
router.get('/:noteIds', noteController.getNotes);
router.get('/:noteId/images', noteController.getNoteImages);
router.post('/', noteController.createNote);
router.put('/:noteId', noteController.updateNote);
router.delete('/:noteId', noteController.deleteNote);

export default router;

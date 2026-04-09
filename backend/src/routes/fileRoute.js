import express from 'express';
import { getAllFiles, saveFileAs, getFilesBySubject, deleteFile, updateFile, getFileById } from '../controllers/fileController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllFiles);
router.get('/subject/:id', getFilesBySubject);
router.get('/subject/:subjectId/:id', getFileById);
router.post('/save-as', saveFileAs);
router.delete('/subject/:subjectId/:id', deleteFile);
router.put('/subject/:subjectId/:id', updateFile);

export default router;

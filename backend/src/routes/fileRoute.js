import express from 'express';
import { getAllFiles, saveFileAs, getFilesBySubject, getFilesByTestSeries, deleteFile, updateFile, getFileById } from '../controllers/fileController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllFiles);
router.post('/save-as', saveFileAs);

// Subject-based files
router.get('/subject/:id', getFilesBySubject);
router.get('/subject/:subjectId/:id', getFileById);
router.delete('/subject/:subjectId/:id', deleteFile);
router.put('/subject/:subjectId/:id', updateFile);

// Test Series-based files
router.get('/test-series/:id', getFilesByTestSeries);
router.get('/test-series/:seriesId/:id', getFileById);
router.delete('/test-series/:seriesId/:id', deleteFile);
router.put('/test-series/:seriesId/:id', updateFile);

export default router;

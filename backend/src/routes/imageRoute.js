import express from 'express';
import { getAllImages, saveImageAs, getImagesBySubject } from '../controllers/imageController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAllImages);
router.get('/subject/:id', getImagesBySubject);
router.post('/save-as', saveImageAs);

export default router;

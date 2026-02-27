import express from 'express';
import { createEntries, updateEntries, getEntries } from '../controllers/entryController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', getEntries);
router.post('/', createEntries);
router.put('/', updateEntries);

export default router;

import express from 'express';
import { getFolders, getFolderContents, createFolder, renameFolder, deleteFolder } from '../controllers/folderController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getFolders);
router.get('/contents', getFolderContents);
router.post('/', createFolder);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

export default router;

import express from 'express';
import { getAllUsers, deleteUser, createUser, updateUserByAdmin } from '../controllers/userController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();


router.use(authenticate);

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUserByAdmin);
router.delete('/:id', deleteUser);

export default router;

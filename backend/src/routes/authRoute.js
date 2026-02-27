import express from 'express';
import { register, login, logout, refresh, getMe } from '../controllers/authController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);

export default router;

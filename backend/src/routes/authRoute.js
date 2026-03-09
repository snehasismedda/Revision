import express from 'express';
import { register, login, logout, refresh, getMe, updateMe, forgotPassword } from '../controllers/authController.js';
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);

export default router;

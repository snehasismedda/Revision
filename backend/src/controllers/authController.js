import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as userModel from '../models/userModel.js';
import { sendPasswordResetEmail } from '../services/mailService.js';

const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
};

const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });
    return { accessToken, refreshToken };
};

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }

        const existing = await userModel.findUserByEmail({ email });
        if (existing) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await userModel.createUser({ name, email, passwordHash });
        const { accessToken, refreshToken } = generateTokens(user.id);

        res
            .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_MAX_AGE })
            .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TOKEN_MAX_AGE })
            .status(201)
            .json({ user: { id: user.id, name: user.name, email: user.email, profile_picture: user.profile_picture } });
    } catch (error) {
        console.error('register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }

        const user = await userModel.findUserByEmail({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { accessToken, refreshToken } = generateTokens(user.id);

        res
            .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_MAX_AGE })
            .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TOKEN_MAX_AGE })
            .status(200)
            .json({ user: { id: user.id, name: user.name, email: user.email, profile_picture: user.profile_picture } });
    } catch (error) {
        console.error('login error:', error);
        res.status(500).json({ error: 'Failed to login user' });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }

        const user = await userModel.findUserByEmail({ email });
        if (!user) {
            // Prevent user enumeration by returning a generic success message
            return res.status(200).json({ message: 'If an account with that email exists, we have sent a new password.' });
        }

        // Generate a random default password of length 8
        const newPassword = crypto.randomBytes(4).toString('hex');

        // Hash it and update user
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await userModel.updateUser(user.id, { password_hash: passwordHash });

        // Send email with new password
        const { previewUrl } = await sendPasswordResetEmail(user.email, newPassword);

        res.status(200).json({
            message: 'If an account with that email exists, we have sent a new password.',
            previewUrl
        });
    } catch (error) {
        console.error('forgotPassword error:', error);
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
};

export const logout = (req, res) => {
    res
        .clearCookie('access_token', { path: '/' })
        .clearCookie('refresh_token', { path: '/' })
        .status(200)
        .json({ message: 'Logged out successfully' });
};

export const refresh = async (req, res) => {
    try {
        const token = req.cookies?.refresh_token;
        if (!token) {
            return res.status(401).json({ error: 'No refresh token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await userModel.findUserById({ id: decoded.id });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { accessToken, refreshToken } = generateTokens(user.id);

        res
            .cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: ACCESS_TOKEN_MAX_AGE })
            .cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: REFRESH_TOKEN_MAX_AGE })
            .status(200)
            .json({ user: { id: user.id, name: user.name, email: user.email, profile_picture: user.profile_picture } });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await userModel.findUserById({ id: req.user.id });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
};

export const updateMe = async (req, res) => {
    try {
        const { name, email, password, profile_picture } = req.body;

        // Validate
        if (!name && !email && !password && profile_picture === undefined) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        const updateData = {};
        if (name) updateData.name = name;

        if (email) {
            const existing = await userModel.findUserByEmail({ email });
            if (existing && existing.id !== req.user.id) {
                return res.status(409).json({ error: 'Email already in use' });
            }
            updateData.email = email;
        }

        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 12);
        }

        if (profile_picture !== undefined) {
            updateData.profile_picture = profile_picture;
        }

        const user = await userModel.updateUser(req.user.id, updateData);
        res.status(200).json({ user: { id: user.id, name: user.name, email: user.email, profile_picture: user.profile_picture } });
    } catch (error) {
        console.error('updateMe error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

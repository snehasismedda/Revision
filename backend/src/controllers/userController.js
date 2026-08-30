import * as userModel from '../models/userModel.js';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.getUsers();
        res.status(200).json({ users });
    } catch (error) {
        console.error('[getAllUsers]', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }
        
        // Simple implementation reusing logic
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await userModel.createUser({ name, email, passwordHash });
        res.status(201).json({ user });
    } catch (error) {
        console.error('[createUser]', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const updateUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        const user = await userModel.updateUser(id, { name, email });
        res.status(200).json({ user });
    } catch (error) {
        console.error('[updateUserByAdmin]', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await userModel.softDeleteUser({ id });
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('[deleteUser]', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

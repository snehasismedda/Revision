import * as systemPromptModel from '../models/systemPromptModel.js';

export const getPrompts = async (req, res) => {
    try {
        const userId = req.user.id;
        const prompts = await systemPromptModel.getSystemPromptsByUser(userId);
        res.status(200).json(prompts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createPrompt = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, prompt, isDefault, version } = req.body;
        const newPrompt = await systemPromptModel.createSystemPrompt(userId, name, prompt, isDefault, version);
        res.status(201).json(newPrompt);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePrompt = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updated = await systemPromptModel.updateSystemPrompt(id, userId, req.body);
        res.status(200).json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deletePrompt = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await systemPromptModel.deleteSystemPrompt(id, userId);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

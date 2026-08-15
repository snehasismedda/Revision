import * as todoModel from '../models/todoModel.js';

// ==================== TODOS ====================

export const listTodos = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const result = await todoModel.getTodos(subjectId, userId);
        res.status(200).json(result);
    } catch (error) {
        console.error('[todoController.listTodos]', error);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
};

export const createTodo = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const { title } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const todo = await todoModel.createTodo(subjectId, userId, req.body);
        res.status(201).json({ todo });
    } catch (error) {
        console.error('[todoController.createTodo]', error);
        res.status(500).json({ error: 'Failed to create todo' });
    }
};

export const updateTodo = async (req, res) => {
    try {
        const { subjectId, todoId } = req.params;
        const userId = req.user.id;

        const todo = await todoModel.updateTodo(todoId, subjectId, userId, req.body);
        res.status(200).json({ todo });
    } catch (error) {
        console.error('[todoController.updateTodo]', error);
        res.status(500).json({ error: error.message || 'Failed to update todo' });
    }
};

export const toggleTodoStatus = async (req, res) => {
    try {
        const { subjectId, todoId } = req.params;
        const userId = req.user.id;
        const { status } = req.body;

        if (!['completed', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "completed" or "pending"' });
        }

        const result = await todoModel.toggleTodoStatus(todoId, subjectId, userId, status);
        res.status(200).json(result);
    } catch (error) {
        console.error('[todoController.toggleTodoStatus]', error);
        res.status(500).json({ error: error.message || 'Failed to toggle status' });
    }
};

export const deleteTodo = async (req, res) => {
    try {
        const { subjectId, todoId } = req.params;
        const userId = req.user.id;

        await todoModel.deleteTodo(todoId, subjectId, userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[todoController.deleteTodo]', error);
        res.status(500).json({ error: 'Failed to delete todo' });
    }
};

// ==================== GROUPS ====================

export const listGroups = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const groups = await todoModel.getGroups(subjectId, userId);
        res.status(200).json({ groups });
    } catch (error) {
        console.error('[todoController.listGroups]', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
};

export const createGroup = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const userId = req.user.id;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        const group = await todoModel.createGroup(subjectId, userId, req.body);
        res.status(201).json({ group });
    } catch (error) {
        console.error('[todoController.createGroup]', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
};

export const updateGroup = async (req, res) => {
    try {
        const { subjectId, groupId } = req.params;
        const userId = req.user.id;

        const group = await todoModel.updateGroup(groupId, subjectId, userId, req.body);
        res.status(200).json({ group });
    } catch (error) {
        console.error('[todoController.updateGroup]', error);
        res.status(500).json({ error: 'Failed to update group' });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { subjectId, groupId } = req.params;
        const userId = req.user.id;

        await todoModel.deleteGroup(groupId, subjectId, userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[todoController.deleteGroup]', error);
        res.status(500).json({ error: 'Failed to delete group' });
    }
};

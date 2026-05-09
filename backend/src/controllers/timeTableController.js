import * as TimeTableModel from '../models/timeTableModel.js';

export const createTimeTable = async (req, res) => {
    try {
        const { name, type, data, is_active } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        
        const timeTable = await TimeTableModel.createTimeTable({
            user_id: req.user.id,
            name,
            type,
            data: data || {},
            is_active: is_active || false
        });
        
        res.status(201).json(timeTable);
    } catch (error) {
        console.error('Error creating time table:', error);
        res.status(500).json({ error: 'Failed to create time table' });
    }
};

export const getTimeTables = async (req, res) => {
    try {
        const timeTables = await TimeTableModel.getTimeTables(req.user.id);
        res.json(timeTables);
    } catch (error) {
        console.error('Error fetching time tables:', error);
        res.status(500).json({ error: 'Failed to fetch time tables' });
    }
};

export const getTimeTableById = async (req, res) => {
    try {
        const timeTable = await TimeTableModel.getTimeTableById(req.params.id, req.user.id);
        if (!timeTable) {
            return res.status(404).json({ error: 'Time table not found' });
        }
        res.json(timeTable);
    } catch (error) {
        console.error('Error fetching time table:', error);
        res.status(500).json({ error: 'Failed to fetch time table' });
    }
};

export const updateTimeTable = async (req, res) => {
    try {
        const { name, type, data, is_active } = req.body;
        const timeTable = await TimeTableModel.updateTimeTable(req.params.id, req.user.id, {
            ...(name && { name }),
            ...(type && { type }),
            ...(data && { data }),
            ...(is_active !== undefined && { is_active })
        });
        
        if (!timeTable) {
            return res.status(404).json({ error: 'Time table not found' });
        }
        res.json(timeTable);
    } catch (error) {
        console.error('Error updating time table:', error);
        res.status(500).json({ error: 'Failed to update time table' });
    }
};

export const deleteTimeTable = async (req, res) => {
    try {
        const timeTable = await TimeTableModel.deleteTimeTable(req.params.id, req.user.id);
        if (!timeTable) {
            return res.status(404).json({ error: 'Time table not found' });
        }
        res.json({ message: 'Time table deleted successfully' });
    } catch (error) {
        console.error('Error deleting time table:', error);
        res.status(500).json({ error: 'Failed to delete time table' });
    }
};

export const setActiveTimeTable = async (req, res) => {
    try {
        const timeTable = await TimeTableModel.setActiveTimeTable(req.params.id, req.user.id);
        if (!timeTable) return res.status(404).json({ error: 'Time table not found' });
        res.json(timeTable);
    } catch (error) {
        console.error('Error setting active time table:', error);
        res.status(500).json({ error: 'Failed to set active time table' });
    }
};

export const toggleActiveTimeTable = async (req, res) => {
    try {
        const timeTable = await TimeTableModel.toggleActiveTimeTable(req.params.id, req.user.id);
        if (!timeTable) return res.status(404).json({ error: 'Time table not found' });
        res.json(timeTable);
    } catch (error) {
        console.error('Error toggling active time table:', error);
        res.status(500).json({ error: 'Failed to toggle active time table' });
    }
};

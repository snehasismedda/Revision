import * as solutionModel from '../models/solutionModel.js';
import * as fileModel from '../models/fileModel.js';
import * as deletionService from '../services/deletionService.js';
import * as subjectModel from '../models/subjectModel.js';

export const getSolutionImage = async (req, res, next) => {
    try {
        const { subjectId, solutionId } = req.params;
        const solution = await solutionModel.getSolutionsBySubject(subjectId).then(solutions => solutions.find(s => s.id == solutionId));
        if (!solution || !solution.source_image_id) return res.status(404).json({ error: 'Image not found' });

        const file = await fileModel.getFileById(solution.source_image_id, subjectId);
        if (!file) return res.status(404).json({ error: 'Image content not found' });

        res.json({ content: file.data });
    } catch (error) {
        next(error);
    }
};

export const getSolutions = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const solutions = await solutionModel.getSolutionsBySubject(subjectId);
        res.json({ solutions });
    } catch (error) {
        next(error);
    }
};

export const createSolution = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const { questionId, title, content, sourceImageId: existingSourceImageId, sourceImageContent } = req.body;

        let finalContent = content;
        let finalTitle = title;
        let sourceImageId = existingSourceImageId;

        if (sourceImageContent && !sourceImageId) {
            const savedImage = await fileModel.createFile(subjectId, sourceImageContent);
            sourceImageId = savedImage.id;
        }

        // Title and content are now non-mandatory
        const solution = await solutionModel.createSolution(subjectId, questionId, finalTitle || '', finalContent || '', sourceImageId);
        await subjectModel.touchSubject(subjectId);
        res.status(201).json({ solution });
    } catch (error) {
        next(error);
    }
};

export const deleteSolution = async (req, res, next) => {
    try {
        const { subjectId, solutionId } = req.params;
        const { solutionIds } = req.body;

        const ids = solutionIds && Array.isArray(solutionIds) ? solutionIds : [solutionId];

        if (ids.length === 0 || !ids[0]) {
            return res.status(400).json({ error: 'No solution IDs provided' });
        }

        await solutionModel.softDeleteSolutions(ids, subjectId);
        await deletionService.deleteSolutionsCascade(ids, subjectId);
        
        res.json({ message: 'Solutions deleted successfully', deletedCount: ids.length });
    } catch (error) {
        next(error);
    }
};


export const updateSolution = async (req, res, next) => {
    try {
        const { subjectId, solutionId } = req.params;
        const { title, content, sourceImageContent } = req.body;

        const updateData = {
            title: title || '',
            content: content || ''
        };

        if (sourceImageContent) {
            const savedImage = await fileModel.createFile(subjectId, sourceImageContent);
            updateData.source_image_id = savedImage.id;
        }

        const solution = await solutionModel.updateSolution(solutionId, subjectId, updateData);
        if (!solution) {
            return res.status(404).json({ error: 'Solution not found' });
        }

        await subjectModel.touchSubject(subjectId);
        res.json({ solution });
    } catch (error) {
        next(error);
    }
};

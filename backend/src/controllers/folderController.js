import * as folderModel from '../models/folderModel.js';
import * as fileModel from '../models/fileModel.js';

const ensureDefaultFolders = async (subjectId) => {
    if (!subjectId) return;
    const defaults = ['Questions', 'Solutions'];
    for (const name of defaults) {
        const existing = await folderModel.getSystemFolderByName(subjectId, name);
        if (!existing) {
            await folderModel.createFolder({ 
                name, 
                subjectId, 
                isSystem: true 
            });
        }
    }
};

export const getFolders = async (req, res) => {
    try {
        const { subjectId, testSeriesId, parentId } = req.query;
        if (!subjectId && !testSeriesId) {
            return res.status(400).json({ error: 'subjectId or testSeriesId is required' });
        }

        // Auto-ensure default folders for subjects at root
        if (subjectId && (parentId === 'null' || parentId === null || parentId === undefined)) {
            await ensureDefaultFolders(subjectId);
        }

        const folders = await folderModel.getFoldersByScope(subjectId, testSeriesId, parentId);
        res.status(200).json({ folders });
    } catch (error) {
        console.error('[getFolders]', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
};

export const getFolderContents = async (req, res) => {
    try {
        const { subjectId, testSeriesId, folderId, limit, offset } = req.query;
        if (!subjectId && !testSeriesId) {
            return res.status(400).json({ error: 'subjectId or testSeriesId is required' });
        }

        // Auto-ensure default folders for subjects at root
        if (subjectId && (folderId === 'null' || folderId === null || folderId === undefined)) {
            await ensureDefaultFolders(subjectId);
        }

        // Fetch folders at this level
        const folders = await folderModel.getFoldersByScope(subjectId, testSeriesId, folderId);

        // Fetch files at this level
        let files = [];
        if (subjectId) {
            files = await fileModel.getFilesBySubject(
                subjectId, 
                limit ? parseInt(limit, 10) : undefined, 
                offset ? parseInt(offset, 10) : undefined, 
                null, 
                true, 
                folderId
            );
        } else if (testSeriesId) {
            files = await fileModel.getFilesByTestSeries(
                testSeriesId, 
                limit ? parseInt(limit, 10) : undefined, 
                offset ? parseInt(offset, 10) : undefined, 
                null, 
                true, 
                folderId
            );
        }

        res.status(200).json({ folders, files });
    } catch (error) {
        console.error('[getFolderContents]', error);
        res.status(500).json({ error: 'Failed to fetch folder contents' });
    }
};

export const createFolder = async (req, res) => {
    try {
        const { name, parentId, subjectId, testSeriesId } = req.body;
        if (!name || (!subjectId && !testSeriesId)) {
            return res.status(400).json({ error: 'name and either subjectId or testSeriesId are required' });
        }
        const folder = await folderModel.createFolder({ name, parentId, subjectId, testSeriesId });
        res.status(201).json({ folder });
    } catch (error) {
        console.error('[createFolder]', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
};

export const renameFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subjectId, testSeriesId } = req.body;
        
        if (!name) return res.status(400).json({ error: 'name is required' });

        const folderToRename = await folderModel.getFolderById(id, subjectId, testSeriesId);
        if (folderToRename?.is_system) {
            return res.status(403).json({ error: 'System folders cannot be renamed' });
        }

        const [folder] = await folderModel.renameFolder(id, name, subjectId, testSeriesId);
        if(!folder) return res.status(404).json({ error: 'Folder not found' });
        
        res.status(200).json({ folder });
    } catch (error) {
        console.error('[renameFolder]', error);
        res.status(500).json({ error: 'Failed to rename folder' });
    }
}

export const deleteFolder = async (req, res) => {
    try {
         const { id } = req.params;
         const { subjectId, testSeriesId, deleteFiles } = req.body; // deleteFiles boolean
         
         const folderToDelete = await folderModel.getFolderById(id, subjectId, testSeriesId);
         if (folderToDelete?.is_system) {
             return res.status(403).json({ error: 'System folders cannot be deleted' });
         }

         const allFolderIds = await folderModel.getSubfolderIds(id);

         if(deleteFiles) {
             // Recursive delete files in this folder and all subfolders
             for (const folderId of allFolderIds) {
                 await fileModel.softDeleteFilesByFolderId(folderId, subjectId, testSeriesId);
             }
         } else {
             // Orphan the files (move to root) for this folder and all subfolders
             for (const folderId of allFolderIds) {
                 await fileModel.setFileFolder(null, folderId, subjectId, testSeriesId);
             }
         }

         // Mark all folders in hierarchy as deleted
         await folderModel.softDeleteFoldersBatch(allFolderIds, subjectId, testSeriesId);
         
         res.status(200).json({ success: true });
    } catch (error) {
        console.error('[deleteFolder]', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
}

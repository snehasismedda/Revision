import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Target, ArrowLeft, Plus, Calendar, Search, LayoutGrid, List, FileText, Image as ImageIcon, MoreVertical, Download, CheckCircle, Pencil, Layers, Save, Trash, X, Table, Folder, FolderPlus, MoreHorizontal, File, Lock } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const FileExplorer = ({
    files = [],
    folders = [],
    scopeId,
    scopeType = 'series', // 'series' or 'subject'
    onFileClick,
    onFileUpload,
    onFilesChange,
    onFoldersChange,
    foldersApi,
    filesApi,
    loading = false,
    onNavigate,
    // Optional controlled selection props
    isSelectionMode: propIsSelectionMode,
    setIsSelectionMode: propSetIsSelectionMode,
    selectedIds: propSelectedIds,
    setSelectedIds: propSetSelectedIds
}) => {
    const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
    const [viewMode, setViewMode] = useState('grid'); // grid | list
    const [sortBy, setSortBy] = useState('date-desc');
    const [searchQuery, setSearchQuery] = useState('');

    // Selection state (internal if not controlled)
    const [internalSelectedIds, setInternalSelectedIds] = useState(new Set());
    const [internalIsSelectionMode, setInternalIsSelectionMode] = useState(false);

    // Use controlled props if provided, otherwise fallback to internal state
    const selectedIds = propSelectedIds !== undefined ? propSelectedIds : internalSelectedIds;
    const setSelectedIds = propSetSelectedIds !== undefined ? propSetSelectedIds : setInternalSelectedIds;
    const isSelectionMode = propIsSelectionMode !== undefined ? propIsSelectionMode : internalIsSelectionMode;
    const setIsSelectionMode = propSetIsSelectionMode !== undefined ? propSetIsSelectionMode : setInternalIsSelectionMode;

    // UI state
    const [activeDropdown, setActiveDropdown] = useState(null); // { id, type: 'file'|'folder' }

    // Modals
    const [createFolderModal, setCreateFolderModal] = useState({ open: false, name: '' });
    const [renameModal, setRenameModal] = useState({ open: false, id: null, type: null, name: '' });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, type: null, multiple: false });
    const [folderDeleteCascadeModal, setFolderDeleteCascadeModal] = useState({ open: false, folder: null });

    // Click outside handler for dropdowns
    const dropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Derived data
    const breadcrumbs = useMemo(() => {
        const crumbs = [{ id: null, name: 'Root' }];
        let curr = currentFolderId;
        const temp = [];
        // prevent infinite loops just in case
        let safety = 0;
        while (curr && safety < 100) {
            const f = folders.find(f => f.id === curr);
            if (f) {
                temp.unshift({ id: f.id, name: f.name });
                curr = f.parent_id;
            } else {
                curr = null;
            }
            safety++;
        }
        return [...crumbs, ...temp];
    }, [currentFolderId, folders]);

    const displayItems = useMemo(() => {
        let fList = files.map(f => ({ ...f, _isFolder: false }));
        let dList = folders.map(f => ({ ...f, _isFolder: true }));

        // Filter by Search if active (global search)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            fList = fList.filter(f =>
                f.file_name?.toLowerCase().includes(q) ||
                f.file_type?.toLowerCase().includes(q)
            );
            dList = dList.filter(d =>
                d.name.toLowerCase().includes(q)
            );
        } else {
            // Filter by Current Folder
            fList = fList.filter(f => (f.folder_id || null) === currentFolderId);
            dList = dList.filter(d => (d.parent_id || null) === currentFolderId && !d.is_deleted);
        }

        // IMPORTANT: Always filter by scope to avoid cumulative folders from context showing up
        const sId = String(scopeId);
        if (scopeType === 'subject') {
            dList = dList.filter(d => String(d.subject_id) === sId);
            fList = fList.filter(f => String(f.subject_id) === sId);
        } else {
            dList = dList.filter(d => String(d.test_series_id) === sId);
            fList = fList.filter(f => String(f.test_series_id) === sId);
        }

        let combined = [...dList, ...fList];

        // Sort
        combined.sort((a, b) => {
            // Folders always first unless sorting strictly by name globally?
            // Keep folders first usually
            if (a._isFolder && !b._isFolder) return -1;
            if (!a._isFolder && b._isFolder) return 1;

            const nameA = a._isFolder ? a.name : (a.file_name || '');
            const nameB = b._isFolder ? b.name : (b.file_name || '');
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);

            switch (sortBy) {
                case 'name-asc': return nameA.localeCompare(nameB);
                case 'name-desc': return nameB.localeCompare(nameA);
                case 'date-asc': return dateA - dateB;
                case 'date-desc': return dateB - dateA;
                case 'type':
                    if (a._isFolder && b._isFolder) return nameA.localeCompare(nameB);
                    return (a.file_type || '').localeCompare(b.file_type || '');
                default: return 0;
            }
        });

        return combined;
    }, [files, folders, currentFolderId, searchQuery, sortBy]);

    // Handlers
    const handleNavigate = (folderId) => {
        setCurrentFolderId(folderId);
        setSearchQuery('');
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        if (onNavigate) onNavigate(folderId);
    };

    const handleAction = useCallback((action, item) => {
        setActiveDropdown(null);
        if (action === 'rename') {
            setRenameModal({ 
                open: true, 
                id: item.id, 
                type: item._isFolder ? 'folder' : 'file', 
                name: item._isFolder ? item.name : (item.file_name || '') 
            });
        }
        else if (action === 'delete') {
            if (item._isFolder) {
                setFolderDeleteCascadeModal({ open: true, folder: item });
                // Also set basic delete modal info for handleDelete to consume
                setDeleteModal({ open: false, id: item.id, type: 'folder', multiple: false });
            } else {
                setDeleteModal({ open: true, id: item.id, type: 'file', multiple: false });
            }
        }
        else if (action === 'select') {
            setIsSelectionMode(true);
            setSelectedIds(new Set([item.id]));
        }
        else if (action === 'download') {
            handleDownloadItem(item);
        }
    }, [setActiveDropdown, setRenameModal, setFolderDeleteCascadeModal, setDeleteModal, setIsSelectionMode, setSelectedIds]);

    const handleDownloadItem = async (item) => {
        if (!item._isFolder) {
            const link = document.createElement('a');
            link.href = item.data;
            link.download = item.file_name || `file_${item.id}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        const toastId = toast.loading(`Preparing "${item.name}" for download...`);
        try {
            const zip = new JSZip();
            const folderMap = new Map(folders.map(f => [f.id, f]));
            const descendants = new Set();
            const queue = [item.id];
            
            while (queue.length > 0) {
                const currentId = queue.shift();
                descendants.add(currentId);
                const children = folders.filter(f => f.parent_id === currentId);
                children.forEach(f => queue.push(f.id));
            }

            const targetFiles = files.filter(f => descendants.has(f.folder_id));
            const getPathInZip = (fId) => {
                const pieces = [];
                let curr = folderMap.get(fId);
                while (curr && descendants.has(curr.id)) {
                    pieces.unshift(curr.name);
                    if (curr.id === item.id) break;
                    curr = folderMap.get(curr.parent_id);
                }
                return pieces.join('/');
            };

            for (const f of targetFiles) {
                const path = getPathInZip(f.folder_id);
                const fileName = f.file_name || `file_${f.id}.${f.file_type || 'bin'}`;
                const fullPath = path ? `${path}/${fileName}` : fileName;
                try {
                    const response = await fetch(f.data);
                    const blob = await response.blob();
                    zip.file(fullPath, blob);
                } catch (err) {
                    console.error(`Failed to fetch file: ${f.id}`, err);
                }
            }

            for (const fId of descendants) {
                const path = getPathInZip(fId);
                if (path) zip.folder(path);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${item.name}.zip`);
            toast.success('Download started', { id: toastId });
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Failed to create ZIP', { id: toastId });
        }
    };

    const handleBulkDownload = async () => {
        if (selectedIds.size === 0) return;
        const toastId = toast.loading('Preparing items for download...');
        try {
            const zip = new JSZip();
            const folderMap = new Map(folders.map(f => [f.id, f]));
            const selectedSet = new Set(selectedIds);
            
            const selectedFiles = files.filter(f => selectedSet.has(f.id));
            const selectedFolders = folders.filter(f => selectedSet.has(f.id));

            for (const f of selectedFiles) {
                try {
                    const response = await fetch(f.data);
                    const blob = await response.blob();
                    zip.file(f.file_name || `file_${f.id}`, blob);
                } catch (err) {
                    console.error(`Failed: ${f.id}`, err);
                }
            }

            for (const folder of selectedFolders) {
                const descendants = new Set();
                const queue = [folder.id];
                while (queue.length > 0) {
                    const currentId = queue.shift();
                    descendants.add(currentId);
                    folders.filter(f => f.parent_id === currentId).forEach(f => queue.push(f.id));
                }

                const targetFiles = files.filter(f => descendants.has(f.folder_id));
                const getRelativePath = (fId) => {
                    const pieces = [folder.name];
                    let curr = folderMap.get(fId);
                    const subPieces = [];
                    while (curr && descendants.has(curr.id) && curr.id !== folder.id) {
                        subPieces.unshift(curr.name);
                        curr = folderMap.get(curr.parent_id);
                    }
                    return [...pieces, ...subPieces].join('/');
                };

                for (const f of targetFiles) {
                    const path = getRelativePath(f.folder_id);
                    const fileName = f.file_name || `file_${f.id}.${f.file_type || 'bin'}`;
                    try {
                        const response = await fetch(f.data);
                        const blob = await response.blob();
                        zip.file(`${path}/${fileName}`, blob);
                    } catch (err) {
                        console.error(`Failed: ${f.id}`, err);
                    }
                }
                for (const fId of descendants) zip.folder(getRelativePath(fId));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `Selection_${new Date().getTime()}.zip`);
            toast.success('Download started', { id: toastId });
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Failed to create ZIP', { id: toastId });
        }
    };

    const handleCreateFolder = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!createFolderModal.name.trim()) return;
        const toastId = toast.loading('Creating folder...');
        try {
            const payload = {
                name: createFolderModal.name,
                parentId: currentFolderId,
            };
            if (scopeType === 'series') payload.testSeriesId = scopeId;
            else payload.subjectId = scopeId;

            const res = await foldersApi.create(payload);
            onFoldersChange([...folders, res.folder]);
            setCreateFolderModal({ open: false, name: '' });
            toast.success('Folder created', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to create folder', { id: toastId });
        }
    };

    const handleRename = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const { id, type, name } = renameModal;
        if (!name.trim()) return;
        const toastId = toast.loading('Renaming...');
        try {
            if (type === 'folder') {
                const res = await foldersApi.rename(id, { name });
                onFoldersChange(folders.map(f => f.id === id ? res.folder : f));
            } else {
                const payload = { fileName: name };
                const res = await (scopeType === 'series'
                    ? filesApi.update(id, payload, null, scopeId)
                    : filesApi.update(id, payload, scopeId, null));
                onFilesChange(files.map(f => f.id === id ? res.file : f));
            }
            setRenameModal({ open: false, id: null, type: null, name: '' });
            toast.success('Renamed successfully', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to rename', { id: toastId });
        }
    };

    const handleDelete = async (deleteFilesCascade) => {
        const { id, type, multiple } = deleteModal;
        const toastId = toast.loading('Deleting...');
        try {
            console.log(`[FileExplorer] Attempting to delete: ${type || 'multiple'}, id: ${id}, multiple: ${multiple}`);
            if (multiple) {
                // Bulk delete files (folders not supported in bulk yet)
                for (const fid of Array.from(selectedIds)) {
                    const f = files.find(x => x.id === fid);
                    if (f) {
                        await (scopeType === 'series'
                            ? filesApi.delete(fid, null, scopeId)
                            : filesApi.delete(fid, scopeId, null));
                    }
                }
                onFilesChange(files.filter(f => !selectedIds.has(String(f.id))));
                setSelectedIds(new Set());
                setIsSelectionMode(false);
            } else if (type === 'folder') {
                const payload = { deleteFiles: deleteFilesCascade };
                if (scopeType === 'series') payload.testSeriesId = scopeId;
                else payload.subjectId = scopeId;

                await foldersApi.delete(id, payload);

                if (deleteFilesCascade) {
                    // Keep files that are NOT in the deleted folder
                    onFilesChange(files.filter(f => String(f.folder_id) !== String(id)));
                } else {
                    // Orphan files (move to root) for files in this folder
                    onFilesChange(files.map(f => String(f.folder_id) === String(id) ? { ...f, folder_id: null } : f));
                }
                onFoldersChange(folders.filter(f => String(f.id) !== String(id)));
            } else {
                // Single file delete
                await (scopeType === 'series'
                    ? filesApi.delete(id, null, scopeId)
                    : filesApi.delete(id, scopeId, null));
                onFilesChange(files.filter(f => String(f.id) !== String(id)));
            }

            setDeleteModal({ open: false, id: null, type: null, multiple: false });
            setFolderDeleteCascadeModal({ open: false, folder: null });
            toast.success('Deleted', { id: toastId });
        } catch (err) {
            console.error('[FileExplorer Delete Error]', err);
            toast.error('Failed to delete', { id: toastId });
        }
    };

    const handleDragDrop = async (fileId, newFolderId) => {
        const toastId = toast.loading('Moving...');
        try {
            const payload = { folderId: newFolderId };
            const res = await (scopeType === 'series'
                ? filesApi.update(fileId, payload, null, scopeId)
                : filesApi.update(fileId, payload, scopeId, null));
            onFilesChange(files.map(f => f.id === fileId ? res.file : f));
            toast.success('Moved', { id: toastId });
        } catch (err) {
            toast.error('Failed to move', { id: toastId });
        }
    }

    const toggleSelection = (e, id) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            if (next.size === 0) setIsSelectionMode(false);
            return next;
        });
    };



    return (
        <div className="flex flex-col h-[70vh] min-h-[600px] border border-border rounded-2xl bg-surface overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
                <div className="flex items-center gap-4 flex-1">
                    {/* Navigation */}
                    <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border">
                        <button
                            disabled={!currentFolderId && !searchQuery}
                            onClick={() => {
                                if (searchQuery) setSearchQuery('');
                                else if (breadcrumbs.length > 1) handleNavigate(breadcrumbs[breadcrumbs.length - 2].id);
                            }}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex items-center text-[13px] font-medium hidden md:flex">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb.id || 'root'}>
                                {idx > 0 && <span className="mx-2 text-text-muted">/</span>}
                                <button
                                    onClick={() => handleNavigate(crumb.id)}
                                    className={`hover:underline transition-colors ${idx === breadcrumbs.length - 1 ? 'text-text font-bold' : 'text-text-muted hover:text-text'}`}
                                >
                                    {crumb.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-1 justify-end">
                    {/* Search */}
                    <div className="relative group max-w-[240px] w-full hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-indigo-400" />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface-3 border border-border rounded-xl pl-9 pr-4 py-2 text-[13px] text-text focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-text-muted"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"><X size={14} /></button>
                        )}
                    </div>

                    <div className="w-px h-6 bg-surface-3 mx-1" />

                    {/* Actions */}
                    <button
                        onClick={() => setCreateFolderModal({ open: true, name: '' })}
                        className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 transition-all cursor-pointer border border-transparent hover:border-border"
                        title="New Folder"
                    >
                        <FolderPlus className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onFileUpload(currentFolderId)}
                        className="flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:text-text hover:bg-indigo-500/20 group"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Upload</span>
                    </button>
                </div>
            </div>

            {/* Sub-toolbar (Views & Sort) */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-2/50">
                <div className="flex items-center flex-1 gap-4">
                    {isSelectionMode ? (
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] font-bold text-indigo-400 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> {selectedIds.size} Selected
                            </span>
                            <button onClick={() => {
                                const currIds = new Set(displayItems.filter(i => !i._isFolder).map(i => i.id));
                                if (selectedIds.size === currIds.size) setSelectedIds(new Set());
                                else setSelectedIds(currIds);
                            }} className="text-[12px] text-text-muted hover:text-text underline">
                                Select All Files
                            </button>
                            <div className="w-px h-4 bg-surface-3 mx-2" />
                            <button onClick={() => setDeleteModal({ open: true, multiple: true })} className="text-[12px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1">
                                <Trash className="w-3.5 h-3.5" /> Delete
                            </button>
                            <div className="w-px h-4 bg-surface-3 mx-2" />
                            <button onClick={handleBulkDownload} className="text-[12px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="text-[12px] text-text-muted hover:text-text ml-2">Cancel</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-[12px] text-text-muted">
                            <span>Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="bg-transparent text-text font-medium focus:outline-none cursor-pointer"
                            >
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="type">Type</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center bg-surface-2 p-1 rounded-lg border border-border">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-surface-3 text-text shadow-sm' : 'text-text-muted hover:text-text'}`}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-surface-3 text-text shadow-sm' : 'text-text-muted hover:text-text'}`}>
                        <List className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative"
                onClick={() => {
                    setActiveDropdown(null);
                }}
            >
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                    </div>
                ) : displayItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted">
                        <Folder className="w-16 h-16 opacity-20 mb-4" />
                        <p className="text-[14px] font-medium text-text mb-1">This folder is empty</p>
                        <p className="text-[12px]">Upload files or create subfolders to get started</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {displayItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                folders={folders}
                                isSelected={selectedIds.has(item.id)}
                                isSelectionMode={isSelectionMode}
                                activeDropdown={activeDropdown}
                                onToggleSelect={(e) => toggleSelection(e, item.id)}
                                onClick={(e) => {
                                    if (isSelectionMode && !item._isFolder) {
                                        toggleSelection(e, item.id);
                                    } else if (item._isFolder) {
                                        handleNavigate(item.id);
                                    } else {
                                        onFileClick(item);
                                    }
                                }}
                                onMenuClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown?.id === item.id ? null : { id: item.id, type: item._isFolder ? 'folder' : 'file', item }); }}
                                onAction={(action) => handleAction(action, item)}
                                onDrop={(fileId) => handleDragDrop(fileId, item.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="border border-border rounded-xl bg-surface-2">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-surface-2">
                                    <th className="w-10 px-4 py-3"><div className="w-3 h-3" /></th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider hidden sm:table-cell">Date Modified</th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider hidden md:table-cell">Type</th>
                                    <th className="w-20 px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.map(item => (
                                    <ItemRow
                                        key={item.id}
                                        item={item}
                                        folders={folders}
                                        isSelected={selectedIds.has(item.id)}
                                        isSelectionMode={isSelectionMode}
                                        activeDropdown={activeDropdown}
                                        onToggleSelect={(e) => toggleSelection(e, item.id)}
                                        onClick={(e) => {
                                            if (isSelectionMode && !item._isFolder) {
                                                toggleSelection(e, item.id);
                                            } else if (item._isFolder) {
                                                handleNavigate(item.id);
                                            } else {
                                                onFileClick(item);
                                            }
                                        }}
                                        onMenuClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown?.id === item.id ? null : { id: item.id, type: item._isFolder ? 'folder' : 'file', item }); }}
                                        onAction={(action) => handleAction(action, item)}
                                        onDrop={(fileId) => handleDragDrop(fileId, item.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 border-t border-border bg-surface-2 text-[11px] text-text-muted font-medium flex justify-between">
                <div>
                    {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
                    {searchQuery && ` found for "${searchQuery}"`}
                </div>
                <div>
                    {selectedIds.size > 0 && `${selectedIds.size} selected`}
                </div>
            </div>


            {/* Modals */}
            <ConfirmDialog 
                isOpen={createFolderModal.open} 
                title="New Folder" 
                type="primary"
                icon={FolderPlus}
                confirmText="Create Folder" 
                onConfirm={handleCreateFolder} 
                onCancel={() => setCreateFolderModal({ open: false, name: '' })}
            >
                <div className="w-full mt-4">
                    <input 
                        autoFocus 
                        type="text" 
                        value={createFolderModal.name} 
                        onChange={e => setCreateFolderModal({ ...createFolderModal, name: e.target.value })} 
                        placeholder="e.g. Session Notes" 
                        className="w-full bg-surface-2 border border-border-hover rounded-xl px-4 py-3.5 text-text text-[14px] focus:outline-none focus:border-primary/50 transition-all" 
                        onKeyDown={e => e.key === 'Enter' && handleCreateFolder(e)} 
                    />
                </div>
            </ConfirmDialog>

            <ConfirmDialog 
                isOpen={renameModal.open} 
                title={renameModal.type === 'folder' ? 'Rename Folder' : 'Rename File'} 
                type="primary"
                icon={Pencil}
                confirmText="Save" 
                onConfirm={handleRename} 
                onCancel={() => setRenameModal({ open: false, id: null, type: null, name: '' })}
            >
                <input autoFocus type="text" value={renameModal.name} onChange={e => setRenameModal({ ...renameModal, name: e.target.value })} className="w-full mt-4 bg-surface-2 border border-border-hover rounded-lg px-4 py-2 text-text focus:outline-none focus:border-indigo-500/50" onKeyDown={e => e.key === 'Enter' && handleRename(e)} />
            </ConfirmDialog>
 
            <ConfirmDialog 
                isOpen={deleteModal.open} 
                title={deleteModal.multiple ? `Delete ${selectedIds.size} Items` : (deleteModal.type === 'folder' ? 'Delete Folder' : 'Delete File')} 
                confirmText="Delete" 
                danger 
                message={deleteModal.multiple ? `Are you sure you want to delete the ${selectedIds.size} selected items?` : `Are you sure you want to delete this ${deleteModal.type}?`} 
                onConfirm={() => handleDelete(false)} 
                onCancel={() => setDeleteModal({ open: false })} 
            />

            <ConfirmDialog isOpen={folderDeleteCascadeModal.open} title={`Delete "${folderDeleteCascadeModal.folder?.name}"`} confirmText="Delete Folder" danger onConfirm={() => handleDelete(true)} onCancel={() => setFolderDeleteCascadeModal({ open: false, folder: null })}>
                <div className="mt-4 space-y-4">
                    <p className="text-[13px] text-text">What should happen to the files inside this folder?</p>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => { handleDelete(true); }} className="w-full text-left px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all font-medium text-[13px]">
                            Delete folder AND all files inside
                        </button>
                        <button onClick={() => { handleDelete(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-surface-2 border border-border-hover text-text hover:bg-surface-3 transition-all font-medium text-[13px]">
                            Keep files, just move them to root
                        </button>
                    </div>
                </div>
            </ConfirmDialog>

        </div>
    );
};


// ------ Subcomponents ------

const ItemCard = ({ item, folders, isSelected, isSelectionMode, activeDropdown, onToggleSelect, onClick, onMenuClick, onAction, onDrop }) => {
    const isFolder = item._isFolder;

    return (
        <div
            onClick={onClick}
            draggable={!isFolder}
            onDragStart={(e) => {
                if (!isFolder) {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.effectAllowed = 'move';
                }
            }}
            onDragOver={(e) => {
                if (isFolder) e.preventDefault();
            }}
            onDrop={(e) => {
                if (isFolder) {
                    e.preventDefault();
                    const fileId = e.dataTransfer.getData('text/plain');
                    if (fileId && fileId !== item.id) onDrop(fileId);
                }
            }}
            className={`group relative aspect-square rounded-xl bg-surface transition-all cursor-pointer border user-select-none flex flex-col hover:bg-surface-2
                ${isSelectionMode && isSelected ? 'border-indigo-500/50 ring-2 ring-indigo-500/20 bg-indigo-500/10' : 'border-border hover:border-border-hover'}
                ${activeDropdown?.id === item.id ? 'z-[100] border-indigo-500/40 shadow-2xl' : 'z-10'}
            `}
        >
            {/* Context/Select Overlay */}
            <div className="absolute top-2 left-2 z-20">
                {isSelectionMode ? (
                    <div onClick={onToggleSelect} className={`w-5 h-5 rounded-md border flex flex-col items-center justify-center transition-colors shadow-xl ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/30 bg-surface-2/40 backdrop-blur-sm'}`}>
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-text" />}
                    </div>
                ) : !isFolder ? (
                    <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border backdrop-blur-md shadow-lg
                        ${item.file_type === 'pdf' ? 'bg-rose-500/20 text-rose-600 [.light_&]:text-rose-700 border-rose-500/30' :
                            item.file_type === 'xlsx' ? 'bg-emerald-500/20 text-emerald-600 [.light_&]:text-emerald-700 border-emerald-500/30' :
                                item.file_type === 'doc' ? 'bg-blue-500/20 text-blue-600 [.light_&]:text-blue-700 border-blue-500/30' :
                                    item.file_type === 'html' ? 'bg-orange-500/20 text-orange-600 [.light_&]:text-orange-700 border-orange-500/30' :
                                        'bg-indigo-500/20 text-indigo-600 [.light_&]:text-indigo-700 border-indigo-500/30'}`}>
                        {item.file_type || 'IMG'}
                    </div>
                ) : null}
            </div>

            {/* Content Preview */}
            <div className="flex-1 overflow-hidden rounded-t-xl relative flex items-center justify-center p-4">
                {isFolder ? (
                    <div className="relative">
                        <Folder className="w-16 h-16 text-indigo-400/80 group-hover:scale-105 transition-transform duration-300" strokeWidth={1} style={{ fill: 'currentColor' }} />
                        {item.is_system && (
                            <div className="absolute -bottom-1 -right-1 bg-surface p-1 rounded-full border border-border-hover text-indigo-400 shadow-xl">
                                <Lock className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                ) : item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.file_name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" draggable={false} />
                ) : item.file_type === 'image' ? (
                    <ImageIcon className="w-12 h-12 text-text/10" />
                ) : (
                    <div className={`p-4 rounded-xl shadow-lg transform group-hover:scale-105 transition-transform ${item.file_type === 'pdf' ? 'bg-rose-500/20 text-rose-600 [.light_&]:text-rose-700' : item.file_type === 'xlsx' ? 'bg-emerald-500/20 text-emerald-600 [.light_&]:text-emerald-700' : item.file_type === 'html' ? 'bg-orange-500/20 text-orange-600 [.light_&]:text-orange-700' : 'bg-blue-500/20 text-blue-600 [.light_&]:text-blue-700'}`}>
                        {item.file_type === 'xlsx' ? <Table size={32} /> : <FileText size={32} />}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={`px-3 py-2 border-t bg-surface-2 border-border rounded-b-xl flex items-center justify-between gap-2 z-10 ${isSelectionMode && isSelected ? 'bg-transparent border-transparent' : ''}`}>
                <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-medium truncate ${isFolder ? 'text-indigo-400 [.light_&]:text-indigo-700 font-semibold' : 'text-text'}`}>
                        {isFolder ? item.name : item.file_name || 'Untitled'}
                    </p>
                </div>

                {!isSelectionMode && (
                    <div className="relative shrink-0">
                        <button onClick={onMenuClick} className={`p-1 rounded hover:bg-surface-3 text-text-muted hover:text-text transition-colors ${activeDropdown?.id === item.id ? 'bg-surface-3 text-text' : ''}`}>
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {activeDropdown?.id === item.id && (
                            <ContextMenu 
                                type={isFolder ? 'folder' : 'file'} 
                                item={item} 
                                onAction={onAction} 
                                isParentSystem={!isFolder && folders.find(f => f.id === item.folder_id)?.is_system}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ItemRow = ({ item, folders, isSelected, isSelectionMode, activeDropdown, onToggleSelect, onClick, onMenuClick, onAction, onDrop }) => {
    const isFolder = item._isFolder;

    return (
        <tr
            onClick={onClick}
            draggable={!isFolder}
            onDragStart={(e) => {
                if (!isFolder) e.dataTransfer.setData('text/plain', item.id);
            }}
            onDragOver={(e) => isFolder && e.preventDefault()}
            onDrop={(e) => {
                if (isFolder) {
                    e.preventDefault();
                    const fileId = e.dataTransfer.getData('text/plain');
                    if (fileId && fileId !== item.id) onDrop(fileId);
                }
            }}
            className={`border-b border-border transition-colors cursor-pointer group hover:bg-surface-2 relative
                ${isSelectionMode && isSelected ? 'bg-indigo-500/10' : ''}
                ${activeDropdown?.id === item.id ? 'z-[60] bg-surface-2' : 'z-0'}
            `}
        >
            <td className="px-4 py-3" onClick={isSelectionMode ? onToggleSelect : undefined}>
                {isSelectionMode ? (
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-text" />}
                    </div>
                ) : (
                    <div className="relative inline-block">
                        {isFolder ? <Folder className="w-4 h-4 text-indigo-500 [.light_&]:text-indigo-600" style={{ fill: 'currentColor', fillOpacity: 0.2 }} /> :
                            item.file_type === 'pdf' ? <FileText className="w-4 h-4 text-rose-500 [.light_&]:text-rose-600" /> :
                                item.file_type === 'xlsx' ? <Table className="w-4 h-4 text-emerald-500 [.light_&]:text-emerald-600" /> :
                                    item.file_type === 'image' ? <ImageIcon className="w-4 h-4 text-amber-500 [.light_&]:text-amber-600" /> :
                                        item.file_type === 'html' ? <FileText className="w-4 h-4 text-orange-500 [.light_&]:text-orange-600" /> :
                                            <File className="w-4 h-4 text-blue-500 [.light_&]:text-blue-600" />
                        }
                        {item.is_system && (
                            <div className="absolute -bottom-1.5 -right-1.5 bg-surface rounded-full p-0.5 border border-border-hover">
                                <Lock className="w-2 h-2 text-indigo-400" />
                            </div>
                        )}
                    </div>
                )}
            </td>
            <td className="px-4 py-3 min-w-[200px]">
                <p className={`text-[13px] font-medium truncate max-w-[300px] ${isFolder ? 'text-text font-semibold' : 'text-text'}`}>
                    {isFolder ? item.name : item.file_name || 'Untitled'}
                </p>
            </td>
            <td className="px-4 py-3 text-[12px] text-text-muted hidden sm:table-cell">
                {new Date(item.created_at).toLocaleDateString()}
            </td>
            <td className="px-4 py-3 text-[12px] text-text-muted uppercase tracking-wide hidden md:table-cell">
                {isFolder ? 'Folder' : (item.file_type || 'IMG')}
            </td>
            <td className="px-4 py-3 text-right relative">
                {!isSelectionMode && (
                    <>
                        <button onClick={onMenuClick} className={`p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-text transition-colors opacity-0 group-hover:opacity-100 ${activeDropdown?.id === item.id ? 'opacity-100 bg-surface-3 text-text' : ''}`}>
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {activeDropdown?.id === item.id && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-50">
                                <ContextMenu 
                                    type={isFolder ? 'folder' : 'file'} 
                                    item={item} 
                                    onAction={onAction} 
                                    alignRight 
                                    isParentSystem={!isFolder && folders.find(f => f.id === item.folder_id)?.is_system}
                                />
                            </div>
                        )}
                    </>
                )}
            </td>
        </tr>
    );
}

const ContextMenu = ({ type, item, onAction, alignRight, isParentSystem }) => {
    const isProtected = item.is_system || isParentSystem;

    return (
        <div className={`absolute ${alignRight ? 'right-0 top-full mt-1' : 'right-0 top-full mt-2'} w-40 bg-surface-2 border border-border-hover rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100`} onClick={(e) => e.stopPropagation()}>
            {!item._isFolder && (
                <button onClick={() => onAction('select')} className="w-full text-left px-3.5 py-2 text-[12px] text-text hover:bg-surface-3 hover:text-text flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Select
                </button>
            )}
            {!isProtected && (
                <button onClick={() => onAction('rename')} className="w-full text-left px-3.5 py-2 text-[12px] text-text hover:bg-surface-3 hover:text-text flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5 text-emerald-400" /> Rename
                </button>
            )}
            <button onClick={() => onAction('download')} className="w-full text-left px-3.5 py-2 text-[12px] text-text hover:bg-surface-3 hover:text-text flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-indigo-400" /> Download
            </button>
            {!isProtected && <div className="h-px bg-surface-3 my-1.5 mx-2" />}
            {!isProtected && (
                <button onClick={() => onAction('delete')} className="w-full text-left px-3.5 py-2 text-[12px] text-rose-400 hover:bg-rose-500/10 flex items-center gap-2">
                    <Trash className="w-3.5 h-3.5" /> Delete
                </button>
            )}
        </div>
    );
};

export default FileExplorer;

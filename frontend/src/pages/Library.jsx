import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';
import { filesApi } from '../api/index.js';
import { useSubjects } from '../context/SubjectContext.jsx';
import { useFiles } from '../context/FileContext.jsx';
import { Clock, LayoutGrid, Layers, PlusCircle, Search, X, History, Activity, Maximize2, Link as LinkIcon, ChevronDown, FileText, MoreHorizontal, MoreVertical, CheckCircle, Pencil, Trash2, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import AddFileModal from '../components/modals/AddFileModal.jsx';
import TimeTraveler from '../components/TimeTraveler.jsx';
import ViewNoteModal from '../components/modals/ViewNoteModal.jsx';
import FileViewerModal from '../components/modals/FileViewerModal.jsx';
import ModalPortal from '../components/ModalPortal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate } from '../utils/dateUtils';

const Library = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 20;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('all');
    const [viewMode, setViewMode] = useState('type'); // 'type' or 'timeline'
    const { subjects, loadSubjects } = useSubjects();
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showTimeTraveler, setShowTimeTraveler] = useState(false);
    const { getFileData } = useFiles();
    const [isFileViewerMinimized, setIsFileViewerMinimized] = useState(false);

    // Context Action States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [activeFileDropdown, setActiveFileDropdown] = useState(null);
    const [confirmDeleteFile, setConfirmDeleteFile] = useState({ open: false, items: [] });
    const [editingFile, setEditingFile] = useState(null);
    const [editingFileName, setEditingFileName] = useState('');

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.dropdown-trigger') && !e.target.closest('.dropdown-menu')) {
                setActiveFileDropdown(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleSelection = (fileId) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(fileId)) newSet.delete(fileId);
        else newSet.add(fileId);
        setSelectedItems(newSet);
        if (newSet.size === 0) setIsSelectionMode(false);
    };

    const handleDeleteFile = async () => {
        const items = confirmDeleteFile.items || [];
        if (items.length === 0) return;
        try {
            await Promise.all(items.map(file => filesApi.delete(file.subject_id, file.id)));
            const itemIds = new Set(items.map(f => f.id));
            setFiles(prev => prev.filter(f => !itemIds.has(f.id)));

            if (isSelectionMode) {
                const newSelected = new Set(selectedItems);
                itemIds.forEach(id => newSelected.delete(id));
                setSelectedItems(newSelected);
                if (newSelected.size === 0) setIsSelectionMode(false);
            }

            toast.success(items.length > 1 ? `Successfully deleted ${items.length} files` : 'File deleted successfully');
        } catch {
            toast.error(items.length > 1 ? 'Failed to delete some files' : 'Failed to delete file');
        } finally {
            setConfirmDeleteFile({ open: false, items: [] });
        }
    };
    const handleDownloadSelected = async () => {
        const selectedFilesList = files.filter(f => selectedItems.has(f.id));
        if (selectedFilesList.length === 0) return;

        const toastId = toast.loading(`Preparing zip of ${selectedFilesList.length} files...`);
        try {
            const JSZip = (await import('jszip')).default;
            const { saveAs } = await import('file-saver');

            const zip = new JSZip();

            for (const file of selectedFilesList) {
                const folderName = file.subject_name || 'Uncategorized';

                let fileWithData = file;
                if (!file.data) {
                    toast.loading(`Fetching data for ${file.file_name || file.id}...`, { id: toastId });
                    fileWithData = await getFileData(file.subject_id, file.id);
                }

                let content = fileWithData.data;
                if (content.startsWith('http')) {
                    const response = await fetch(content);
                    content = await response.blob();
                } else if (content.startsWith('data:')) {
                    content = content.split(',')[1];
                }

                const ext = file.file_type || 'jpg';
                const baseName = file.file_name || `material_${file.id}`;
                const finalName = baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;

                zip.folder(folderName).file(finalName, content, { base64: typeof content === 'string' });
            }

            toast.loading('Compressing files...', { id: toastId });
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            saveAs(zipBlob, `Library_Export_${new Date().toISOString().split('T')[0]}.zip`);

            toast.success('Download complete!', { id: toastId });
            setIsSelectionMode(false);
            setSelectedItems(new Set());
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to create zip file', { id: toastId });
        }
    };

    const handleFileClick = async (file) => {
        try {
            if (!file.data) {
                const toastId = toast.loading('Fetching file content...');
                const fullFile = await getFileData(file.subject_id, file.id);
                toast.dismiss(toastId);
                setSelectedFile(fullFile);
            } else {
                setSelectedFile(file);
            }
        } catch (err) {
            console.error('Failed to open file:', err);
        }
    };

    const handleRenameSubmit = async (e) => {
        e.preventDefault();
        const file = editingFile;
        if (!file) return;
        try {
            await filesApi.update(file.subject_id, file.id, { fileName: editingFileName });
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, file_name: editingFileName } : f));
            setEditingFile(null);
            toast.success('File renamed successfully');
        } catch {
            toast.error('Failed to rename file');
        }
    };

    const isMounted = React.useRef(false);

    useEffect(() => {
        if (!isMounted.current) {
            loadImages(true);
            loadSubjects();
            isMounted.current = true;
        }
    }, [loadSubjects]);

    // Handle pagination specifically
    useEffect(() => {
        if (page > 0) {
            loadImages(false);
        }
    }, [page]);

    const loadImages = async (isFirstLoad) => {
        if (isFirstLoad) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await filesApi.list(LIMIT, page * LIMIT, null, true);
            const newFiles = res.files || [];

            setHasMore(newFiles.length === LIMIT);

            if (isFirstLoad) {
                setFiles(newFiles);
            } else {
                setFiles(prev => [...prev, ...newFiles]);
            }
        } catch {
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleImageSaved = () => {
        if (page === 0) loadImages(true);
        else setPage(0);
    };

    const observer = React.useRef();
    const lastImageElementRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        }, {
            rootMargin: '400px', // Pre-load when 400px from viewport
            threshold: 0
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const matchesSubject = selectedSubjectId === 'all' || file.subject_id?.toString() === selectedSubjectId;
            if (!matchesSubject) return false;
            if (!searchQuery) return true;

            const itemDate = new Date(file.created_at);
            const query = searchQuery.toLowerCase().trim();
            const fullMonth = itemDate.toLocaleString('default', { month: 'long' }).toLowerCase();
            const shortMonth = itemDate.toLocaleString('default', { month: 'short' }).toLowerCase();

            // 1. TimeTraveler Multi-Filter Format (years:2024|months:january|days:2024-03-15)
            if (query.includes('years:') || query.includes('months:') || query.includes('days:') || (query.startsWith('range:') && query.includes(','))) {
                const parts = query.split('|');
                let matchesAll = true;

                parts.forEach(p => {
                    const [key, val] = p.split(':');
                    if (!val) return;

                    if (key === 'years') {
                        const years = val.split(',').map(v => parseInt(v));
                        if (!years.includes(itemDate.getFullYear())) matchesAll = false;
                    }
                    if (key === 'months') {
                        const months = val.split(',').map(m => m.trim());
                        if (!months.includes(fullMonth) && !months.includes(shortMonth)) matchesAll = false;
                    }
                    if (key === 'days') {
                        const days = val.split(',');
                        // calculate local date string ignoring timezone offset
                        const localDateStr = new Date(itemDate.getTime() - (itemDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        if (!days.includes(localDateStr)) matchesAll = false;
                    }
                    if (key === 'range') {
                        const [s, e] = val.split(',');
                        if (s && e) {
                            const start = new Date(s);
                            const end = new Date(e);
                            end.setHours(23, 59, 59, 999);
                            if (itemDate < start || itemDate > end) matchesAll = false;
                        }
                    }
                });

                return matchesAll;
            }

            // 2. Specific Date Check (e.g. "4/8/2026")
            if (query.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                return itemDate.toLocaleDateString() === query;
            }

            // 3. Month-Wise Check (e.g. "April")
            if (query === fullMonth || query === shortMonth) return true;

            // 4. Year-Wise Check (e.g. "2024")
            if (query === itemDate.getFullYear().toString()) return true;

            // 5. Old Range Format Fallback (Format: "range:YYYY-MM-DDtoYYYY-MM-DD")
            if (query.startsWith('range:') && query.includes('to')) {
                const parts = query.replace('range:', '').split('to');
                if (parts.length === 2) {
                    const start = new Date(parts[0]);
                    const end = new Date(parts[1]);
                    end.setHours(23, 59, 59, 999);
                    return itemDate >= start && itemDate <= end;
                }
            }

            // 6. Fallback Text Search (Filename, Subject, etc.)
            return fullMonth.includes(query) ||
                itemDate.toLocaleDateString().includes(query) ||
                file.file_name?.toLowerCase().includes(query) ||
                file.subject_name?.toLowerCase().includes(query);
        });
    }, [files, searchQuery, selectedSubjectId]);

    // Grouping logic (Timeline View)
    const groupFilesByDate = (filesArray) => {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        filesArray.forEach(file => {
            const date = new Date(file.created_at);
            date.setHours(0, 0, 0, 0);

            let groupName = '';
            if (date.getTime() === today.getTime()) groupName = 'Today';
            else if (date.getTime() === yesterday.getTime()) groupName = 'Yesterday';
            else if (date.getTime() >= lastWeek.getTime()) groupName = 'Last 7 Days';
            else groupName = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(file);
        });

        return Object.entries(groups);
    };

    // Grouping logic (Type View)
    const groupFilesByType = (filesArray) => {
        const groups = {};

        filesArray.forEach(file => {
            const rawType = (file.file_type || 'file').toLowerCase();
            let groupName = 'Other';

            if (rawType.match(/image|png|jpg|jpeg|webp|gif/)) {
                groupName = 'Images';
            } else if (rawType === 'pdf') {
                groupName = 'PDFs';
            } else if (rawType.match(/doc|docx|txt|rtf/)) {
                groupName = 'Documents';
            } else if (rawType.match(/xlsx|xls|csv/)) {
                groupName = 'Spreadsheets';
            } else {
                // Capitalize the first letter for a clean heading (e.g. mp4 -> Mp4)
                groupName = rawType.charAt(0).toUpperCase() + rawType.slice(1);
            }

            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(file);
        });

        // Alphabetical sort of group names, but keeping specific types at the top
        return Object.entries(groups).sort((a, b) => {
            const priority = { 'Images': 1, 'PDFs': 2, 'Documents': 3, 'Spreadsheets': 4 };
            const aPrio = priority[a[0]] || 99;
            const bPrio = priority[b[0]] || 99;
            
            if (aPrio !== bPrio) return aPrio - bPrio;
            return a[0].localeCompare(b[0]);
        });
    };

    const groupedFiles = viewMode === 'timeline'
        ? groupFilesByDate(filteredFiles)
        : groupFilesByType(filteredFiles);

    const handlePrev = useCallback(async () => {
        if (!selectedFile) return;
        const idx = filteredFiles.findIndex(f => f.id === selectedFile.id);
        if (idx > 0) handleFileClick(filteredFiles[idx - 1]);
    }, [selectedFile, filteredFiles]);

    const handleNext = useCallback(async () => {
        if (!selectedFile) return;
        const idx = files.findIndex(f => f.id === selectedFile.id);
        
        if (idx === files.length - 1 && hasMore) {
            setPage(prev => prev + 1);
            // The useEffect for page will trigger loadImages(false)
            // But we need to wait for it or trigger it here to open the next file immediately
            toast.loading('Loading more files...', { duration: 1000 });
            return;
        }

        if (idx < files.length - 1) handleFileClick(files[idx + 1]);
    }, [selectedFile, files, hasMore, handleFileClick]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedFile) return;
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') setSelectedFile(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFile, handlePrev, handleNext]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto animate-pulse px-4 md:px-0">
                <div className="h-10 bg-surface-2 rounded-lg w-48 mb-8" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <div key={i} className="aspect-square bg-surface-2 rounded-xl border border-white/[0.06]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto pb-20 px-4 md:px-0">
            <div className="flex flex-col gap-6 mb-10">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-5 h-5 text-primary" />
                            <span className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase">Resource Hub</span>
                        </div>
                        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Library Gallery</h1>
                        <p className="text-slate-500 text-sm mt-1">{files.length} items archived</p>
                    </div>

                    {!isSelectionMode ? (
                        <div className="flex flex-col sm:flex-row sm:items-center items-stretch gap-3 md:gap-4 w-full xl:w-auto">

                            <div className="flex items-center gap-0 bg-primary/10 rounded-xl border border-primary/20 transition-all hover:bg-primary/20 shrink-0">
                                <button
                                    onClick={() => setShowTimeTraveler(true)}
                                    className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Filter</span>
                                </button>
                                {searchQuery && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchQuery('');
                                        }}
                                        className="h-[38px] px-3 flex items-center justify-center rounded-r-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-l border-primary/20 transition-colors"
                                        title="Clear Filters"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center bg-surface-2/60 p-0.5 rounded-xl border border-white/[0.06] shrink-0">
                                <div className="relative group">
                                    <button
                                        onClick={() => setViewMode('type')}
                                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'type' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="Type View"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 text-[9px] font-bold text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 uppercase tracking-widest shadow-xl">
                                        Type
                                    </div>
                                </div>
                                <div className="relative group">
                                    <button
                                        onClick={() => setViewMode('timeline')}
                                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'timeline' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="Timeline View"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 text-[9px] font-bold text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 uppercase tracking-widest shadow-xl">
                                        Timeline
                                    </div>
                                </div>
                            </div>

                            <div className="relative group min-w-[140px] flex-1 sm:flex-none">
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full bg-surface-2/60 border border-white/[0.06] hover:border-white/10 text-slate-300 rounded-xl px-4 py-2.5 shadow-sm text-[11px] font-bold tracking-wide uppercase focus:outline-none focus:border-primary/40 focus:bg-surface-3 transition-all appearance-none cursor-pointer pr-8"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(148, 163, 184, 1)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.5rem center',
                                        backgroundSize: '1em'
                                    }}
                                >
                                    <option value="all">ALL SUBJECTS</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id.toString()}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
                            >
                                <PlusCircle className="w-4 h-4" /> <span>Upload</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center h-[50px] bg-[#121214]/80 border border-white/[0.08] rounded-2xl px-2 shadow-[0_8px_30px_rgb(0,0,0,0.6)] transition-all animate-in fade-in zoom-in-95 duration-300 w-full xl:w-auto">
                            <div className="flex items-center pl-3 pr-2">
                                <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[12px] font-bold mr-2">
                                    {selectedItems.size}
                                </div>
                                <span className="text-[13px] text-slate-300 font-medium hidden sm:inline">selected</span>
                            </div>

                            <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                            <button
                                onClick={() => {
                                    if (selectedItems.size === files.length) setSelectedItems(new Set());
                                    else setSelectedItems(new Set(files.map(f => f.id)));
                                }}
                                className="text-[12px] font-medium text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                {selectedItems.size > 0 && selectedItems.size === files.length ? 'Clear' : 'Select All'}
                            </button>

                            {(() => {
                                const selectedFilesList = files.filter(f => selectedItems.has(f.id));
                                const hasLinked = selectedFilesList.some(f => f.linked_question_id || f.linked_note_id);
                                return (
                                    <>
                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>
                                        <button
                                            onClick={handleDownloadSelected}
                                            disabled={selectedItems.size === 0}
                                            title="Download Selected"
                                            className={`text-[12px] font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${selectedItems.size === 0 ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-emerald-400 hover:text-white hover:bg-emerald-500/20 cursor-pointer'}`}
                                        >
                                            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteFile({ open: true, items: selectedFilesList })}
                                            disabled={selectedItems.size === 0 || hasLinked}
                                            title={hasLinked ? 'Cannot delete because some selected files are linked' : 'Delete Selected'}
                                            className={`text-[12px] font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${selectedItems.size === 0 || hasLinked ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-rose-400 hover:text-white hover:bg-rose-500/20 cursor-pointer'}`}
                                        >
                                            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
                                        </button>
                                    </>
                                );
                            })()}

                            <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                            <button
                                onClick={() => {
                                    setIsSelectionMode(false);
                                    setSelectedItems(new Set());
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[12px] font-medium"
                                title="Exit Selection Mode"
                            >
                                <X className="w-4 h-4" /> <span className="hidden sm:inline">Cancel</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {filteredFiles.length === 0 ? (
                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-primary/20 w-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 pulse-ring">
                        <Layers className="w-10 h-10 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No files found</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                        {searchQuery || selectedSubjectId !== 'all'
                            ? "We couldn't find any resources matching your current filters. Try resetting them."
                            : "Your captured materials will appear here once you upload them."}
                    </p>
                    <button
                        onClick={() => {
                            if (searchQuery || selectedSubjectId !== 'all') {
                                setSearchQuery('');
                                setSelectedSubjectId('all');
                            } else {
                                setShowAddModal(true);
                            }
                        }}
                        className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>{searchQuery || selectedSubjectId !== 'all' ? "Reset Filters" : "Upload First Material"}</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedFiles.map(([dateGroup, groupFiles]) => (
                        <div key={dateGroup} className="relative">
                            <div className="sticky top-0 z-30 pt-4 pb-6 bg-surface mb-2">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
                                        {dateGroup}
                                        <span className="text-[11px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{groupFiles.length}</span>
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {groupFiles.map((file) => {
                                    const isLastElement = file.id === files[files.length - 1]?.id;
                                    const hasLink = file.linked_question_id || file.linked_note_id;

                                    return (
                                        <div
                                            key={file.id}
                                            ref={isLastElement ? lastImageElementRef : null}
                                            className={`group relative aspect-square rounded-xl bg-surface-2 transition-all duration-300 cursor-pointer shadow-lg active:scale-[0.98] fade-in border ${isSelectionMode
                                                    ? (selectedItems.has(file.id) ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-500/10 scale-95 opacity-90' : 'border-white/[0.04] scale-100 opacity-100')
                                                    : (activeFileDropdown === file.id ? 'border-primary/40 shadow-xl z-[40]' : 'border-white/[0.04] hover:border-primary/40 hover:shadow-primary/5')
                                                }`}
                                            onClick={() => {
                                                if (isSelectionMode) {
                                                    toggleSelection(file.id);
                                                    return;
                                                }
                                                handleFileClick(file);
                                            }}
                                            style={{ animationDelay: `${(groupFiles.indexOf(file) % 10) * 0.05}s` }}
                                        >
                                            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                                {file.thumbnail ? (
                                                    <img
                                                        src={file.thumbnail}
                                                        alt={file.file_name || file.subject_name}
                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                                        loading="lazy"
                                                    />
                                                ) : file.data ? (
                                                    <img
                                                        src={file.data}
                                                        alt={file.file_name || file.subject_name}
                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-3 to-surface-2 transition-all duration-500 text-slate-300">
                                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                            {file.file_type === 'pdf' ? <FileText className="w-7 h-7 text-rose-400" /> :
                                                             file.file_type === 'xlsx' ? <Layers className="w-7 h-7 text-emerald-400" /> :
                                                             file.file_type === 'doc' ? <FileText className="w-7 h-7 text-blue-400" /> :
                                                             <ImageIcon className="w-7 h-7 text-indigo-400" />}
                                                        </div>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{file.file_type || 'Image'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Indicators */}
                                            {hasLink && (
                                                <div className="absolute top-2 left-2 flex gap-1 z-20">
                                                    {file.linked_question_id && (
                                                        <div className="p-1.5 rounded-lg bg-indigo-500/80 text-white border border-white/10 shadow-lg" title="Linked to Question">
                                                            <Activity className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    {file.linked_note_id && (
                                                        <div className="p-1.5 rounded-lg bg-emerald-500/80 text-white border border-white/10 shadow-lg" title="Linked to Note">
                                                            <FileText className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Selection Indicator */}
                                            {isSelectionMode && (
                                                <div className="absolute top-3 right-3 z-30">
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedItems.has(file.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/30 bg-black/40 backdrop-blur-sm'}`}>
                                                        {selectedItems.has(file.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Persistent Info Overlay */}
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 z-10 transition-colors group-hover:bg-black/20">
                                                <div className="flex items-center justify-between mb-1.5 relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/subjects/${file.subject_id}`);
                                                        }}
                                                        className="text-[10px] font-bold text-primary uppercase tracking-wider hover:text-primary-light transition-colors cursor-pointer text-left"
                                                    >
                                                        {file.subject_name}
                                                    </button>

                                                    <div className={`flex items-center gap-1 transition-opacity ${activeFileDropdown === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        {!isSelectionMode && hasLink && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const tab = file.linked_question_id ? 'questions' : 'notes';
                                                                    const contentId = file.linked_question_id || file.linked_note_id;
                                                                    navigate(`/subjects/${file.subject_id}?tab=${tab}&id=${contentId}`);
                                                                }}
                                                                className="p-1 px-[5px] bg-primary/20 hover:bg-primary text-white rounded-lg border border-primary/30 transition-all cursor-pointer"
                                                                title={file.linked_question_id ? "View Question" : "View Note"}
                                                            >
                                                                <LinkIcon className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[11px] font-semibold text-white truncate flex-1 leading-tight mb-0.5">
                                                        {file.file_name || formatDate(file.created_at, { day: 'numeric', month: 'short' })}
                                                    </p>
                                                    {!isSelectionMode && (
                                                        <div 
                                                            className={`relative shrink-0 transition-opacity dropdown-trigger ${activeFileDropdown === file.id ? 'opacity-100 z-50' : 'opacity-0 group-hover:opacity-100 z-20'}`} 
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Use native stopImmediatePropagation to prevent document listener from firing
                                                                    e.nativeEvent.stopImmediatePropagation();
                                                                    setActiveFileDropdown(activeFileDropdown === file.id ? null : file.id);
                                                                }}
                                                                className={`p-1 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${activeFileDropdown === file.id ? 'bg-primary border-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white/80 border-white/10 backdrop-blur-sm'}`}
                                                                title="More Options"
                                                            >
                                                                <MoreVertical className="w-3.5 h-3.5" />
                                                            </button>
                                                            {activeFileDropdown === file.id && (
                                                                <div className="absolute right-0 top-full mt-1.5 w-40 bg-[#121214]/98 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100] backdrop-blur-xl dropdown-menu" onClick={e => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => { setIsSelectionMode(true); setSelectedItems(new Set([file.id])); setActiveFileDropdown(null); }}
                                                                        className="w-full flex items-center justify-start gap-2.5 px-3.5 py-2 text-[12px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                                                    >
                                                                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Select
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingFile(file);
                                                                            setEditingFileName(file.file_name || formatDate(file.created_at, { day: 'numeric', month: 'short' }) || '');
                                                                            setActiveFileDropdown(null);
                                                                        }}
                                                                        className="w-full flex items-center justify-start gap-2.5 px-3.5 py-2 text-[12px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5 text-emerald-400" /> Rename
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmDeleteFile({ open: true, items: [file] });
                                                                            setActiveFileDropdown(null);
                                                                        }}
                                                                        disabled={hasLink}
                                                                        className={`w-full flex items-center justify-start gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-all ${hasLink ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer'}`}
                                                                        title={hasLink ? 'Cannot delete linked file' : ''}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AddFileModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onFileSaved={handleImageSaved}
            />

            {loadingMore && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-12 pb-10">
                    {[...Array(5)].map((_, i) => (
                        <div key={`skeleton-${i}`} className="aspect-square rounded-xl bg-surface-2/40 border border-white/[0.04] animate-pulse overflow-hidden">
                            <div className="w-full h-full bg-primary/5" />
                        </div>
                    ))}
                </div>
            )}

            {selectedFile && (
                <FileViewerModal
                    key={selectedFile.id}
                    isOpen={true}
                    onClose={() => {
                        setSelectedFile(null);
                        setIsFileViewerMinimized(false);
                    }}
                    file={selectedFile}
                    allFiles={filteredFiles}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onSelect={handleFileClick}
                    isMinimized={isFileViewerMinimized}
                    onMinimize={setIsFileViewerMinimized}
                    onDelete={async (deletedFile) => {
                        await filesApi.delete(deletedFile.subject_id, deletedFile.id);
                        setFiles(prev => prev.filter(f => f.id !== deletedFile.id));
                        setSelectedFile(null);
                        setIsFileViewerMinimized(false);
                        toast.success("File deleted successfully");
                    }}
                    onNavigateToLinkedContent={(file) => {
                        if (file.linked_question_id || file.linked_note_id) {
                            const tab = file.linked_question_id ? 'questions' : 'notes';
                            const contentId = file.linked_question_id || file.linked_note_id;
                            navigate(`/subjects/${file.subject_id}?tab=${tab}&id=${contentId}`);
                        }
                    }}
                />
            )}

            <TimeTraveler
                isOpen={showTimeTraveler}
                onClose={() => setShowTimeTraveler(false)}
                initialQuery={searchQuery}
                onApply={(query) => {
                    setSearchQuery(query);
                }}
            />

            <ConfirmDialog
                isOpen={confirmDeleteFile.open}
                onCancel={() => setConfirmDeleteFile({ open: false, items: [] })}
                onConfirm={handleDeleteFile}
                title={confirmDeleteFile.items?.length > 1 ? "Delete Files" : "Delete File"}
                message={`Are you sure you want to delete ${confirmDeleteFile.items?.length > 1 ? `these ${confirmDeleteFile.items.length} files` : 'this file'}? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />

            {editingFile && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setEditingFile(null)} />
                        <div className="relative w-full max-w-sm rounded-2xl bg-[#12121c] border border-white/10 shadow-2xl p-6 px-7 animate-in fade-in zoom-in-95">
                            <button onClick={() => setEditingFile(null)} className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                            <h3 className="text-xl font-heading font-semibold text-white mb-5 tracking-tight">Rename File</h3>
                            <form onSubmit={handleRenameSubmit}>
                                <input
                                    autoFocus
                                    type="text"
                                    value={editingFileName}
                                    onChange={(e) => setEditingFileName(e.target.value)}
                                    className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all mb-6 placeholder:text-slate-600"
                                    placeholder="Enter new file name..."
                                />
                                <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-5 -mx-7 px-7 mb-[-12px]">
                                    <button type="button" onClick={() => setEditingFile(null)} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-center border border-transparent">Cancel</button>
                                    <button type="submit" disabled={!editingFileName.trim() || editingFileName === editingFile.file_name} className="px-5 py-2.5 rounded-xl text-[13px] font-semibold btn-primary shadow-lg hover:shadow-[0_6px_24px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed">Save Name</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}

        </div>
    );
};

export default Library;

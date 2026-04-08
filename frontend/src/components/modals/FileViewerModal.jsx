import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    X, ZoomIn, ZoomOut, Download, FileText,
    Image as ImageIcon, Table as TableIcon, Link as LinkIcon,
    ChevronLeft, ChevronRight, Loader2,
    RefreshCw, Sun, Moon, PanelLeft, List,
    ChevronDown, Hash, Eye, EyeOff, Minimize2, Maximize2, Trash2
} from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

const FileViewerModal = ({
    isOpen,
    onClose,
    file,
    onPrev,
    onNext,
    allFiles = [],
    onNavigateToLinkedContent,
    onSelect,
    isMinimized = false,
    onMinimize,
    onDelete
}) => {

    const [renderType, setRenderType] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [excelSheets, setExcelSheets] = useState([]);
    const [activeSheet, setActiveSheet] = useState(0);
    const [wordHtml, setWordHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLightMode, setIsLightMode] = useState(localStorage.getItem('theme') !== 'dark');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isFileListOpen, setIsFileListOpen] = useState(false);
    const [fileListSearch, setFileListSearch] = useState('');
    const mountedRef = useRef(true);
    const listRef = useRef(null);

    const fileIndex = useMemo(() => {
        if (!allFiles || !file) return 0;
        return allFiles.findIndex(f => f.id === file.id);
    }, [allFiles, file]);

    const processFile = useCallback(async (currentFile) => {
        if (!currentFile?.data) {
            if (mountedRef.current) {
                setError('File data is missing or corrupted.');
                setLoading(false);
            }
            return;
        }

        const type = currentFile.file_type?.toLowerCase() || 'image';
        if (mountedRef.current) setRenderType(type);

        try {
            if (type === 'xlsx' || type === 'xls' || type === 'csv') {
                const response = await fetch(currentFile.data);
                if (!response.ok) throw new Error('Failed to fetch file data');
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                if (mountedRef.current) {
                    setExcelSheets(workbook.SheetNames);
                    setActiveSheet(0);

                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    setExcelData(json);
                }
            } else if (type === 'doc' || type === 'docx') {
                const response = await fetch(currentFile.data);
                if (!response.ok) throw new Error('Failed to fetch document');
                const arrayBuffer = await response.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                if (mountedRef.current) setWordHtml(result.value);
            }
        } catch (err) {
            console.error('Error processing file:', err);
            if (mountedRef.current) setError(`Error processing ${type.toUpperCase()} file: ${err.message}`);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (listRef.current && !listRef.current.contains(event.target)) {
                setIsFileListOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        if (file) {
            setLoading(true);
            setError(null);
            setExcelData(null);
            setExcelSheets([]);
            setWordHtml('');
            processFile(file);
        }

        return () => {
            mountedRef.current = false;
        };
    }, [file, processFile]);

    const handleSheetChange = async (idx) => {
        if (!file || !file.data) return;
        if (mountedRef.current) setActiveSheet(idx);
        const response = await fetch(file.data);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[idx]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (mountedRef.current) setExcelData(json);
    };

    const handleDownload = () => {
        if (!file) return;
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.file_name || `material_${file.id}.${file.file_type || 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    const toggleTheme = () => {
        const nextMode = !isLightMode;
        setIsLightMode(nextMode);
        localStorage.setItem('theme', nextMode ? 'light' : 'dark');
    };



    return (
        <ModalPortal>
            {/* Minimized Floating EyeIcon */}
            {isMinimized && (
                <div className="fixed bottom-10 right-10 z-[200] animate-in slide-in-from-bottom-5 duration-300">
                    <div className={`flex items-center gap-1 p-1 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all
                        ${isLightMode 
                            ? 'bg-white/90 border-slate-200 shadow-indigo-100/50' 
                            : 'bg-[#1a1a2e]/90 border-white/10 shadow-black/60'}`}
                    >
                        <button
                            onClick={() => onMinimize && onMinimize(false)}
                            className={`p-3 rounded-xl transition-all active:scale-90 cursor-pointer group flex items-center justify-center
                                ${isLightMode ? 'hover:bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-500/10 text-indigo-400'}`}
                            title="Restore Viewer"
                        >
                            <div className="relative">
                                <EyeOff size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-[#1a1a2e]" />
                            </div>
                        </button>

                        <div className={`w-px h-6 mx-0.5 ${isLightMode ? 'bg-slate-200' : 'bg-white/10'}`} />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onClose) onClose();
                            }}
                            className={`p-3 rounded-xl transition-all active:scale-90 cursor-pointer group flex items-center justify-center
                                ${isLightMode ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-500' : 'hover:bg-rose-500/10 text-slate-500 hover:text-rose-400'}`}
                            title="Close Viewer"
                        >
                            <X size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[110] flex flex-col overflow-hidden font-sans transition-all duration-500
                    ${isMinimized ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}
                    ${isLightMode ? 'bg-[#f8f9fa] text-slate-900' : 'bg-[#12121a] text-white'}`}>

                {/* Modern Compact Header */}
                <div className={`flex items-center justify-between px-5 py-2.5 border-b shrink-0 backdrop-blur-md relative z-50 transition-colors duration-300
                        ${isLightMode ? 'bg-white/80 border-slate-200' : 'bg-[#12121a]/40 border-white/[0.04]'}`}>

                    <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-2 rounded-lg border transition-all
                                ${renderType === 'image' ? (isLightMode ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20') :
                                renderType === 'pdf' ? (isLightMode ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-rose-500/10 text-rose-400 border-rose-500/20') :
                                    renderType === 'xlsx' ? (isLightMode ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20') :
                                        (isLightMode ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}`}
                        >
                            {renderType === 'image' && <ImageIcon size={20} strokeWidth={2.5} />}
                            {renderType === 'pdf' && <FileText size={20} strokeWidth={2.5} />}
                            {renderType === 'xlsx' && <TableIcon size={20} strokeWidth={2.5} />}
                            {(renderType === 'doc' || renderType === 'docx') && <FileText size={20} strokeWidth={2.5} />}
                        </div>
                        <div className="min-w-0">
                            <h3 className={`font-semibold truncate text-[14px] transition-colors duration-300
                                    ${isLightMode ? 'text-slate-800' : 'text-slate-100'}`}>
                                {file?.file_name || (file?.created_at ? new Date(file.created_at).toLocaleDateString() : 'Document')}
                            </h3>
                            <div className={`flex items-center text-[11px] mt-0.5
                                    ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span className="uppercase tracking-wider">{renderType}</span>
                                {file?.subject_name && (
                                    <>
                                        <span className="mx-2 opacity-30">•</span>
                                        <span className="truncate">{file.subject_name}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Outline Sidebar Toggle (DOC/DOCX) */}
                        {(renderType === 'doc' || renderType === 'docx') && (
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className={`p-2 rounded-lg border transition-all cursor-pointer hidden lg:flex
                                        ${isLightMode ? (isSidebarOpen ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-slate-100' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200') : (isSidebarOpen ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-white/[0.08]' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.08]')}`}
                                title="Toggle Outline"
                            >
                                <PanelLeft size={16} />
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-lg border transition-all cursor-pointer mr-2
                                    ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.08]'}`}
                        >
                            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>

                        {(onPrev || onNext) && (
                            <div className="flex items-center gap-1 mr-2 bg-black/5 dark:bg-white/5 p-1 rounded-lg relative">
                                <button
                                    onClick={onPrev}
                                    disabled={!onPrev}
                                    className={`p-1.5 rounded-md transition-all ${onPrev ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                                            ${isLightMode ? 'text-slate-700 hover:bg-white shadow-sm' : 'text-slate-300 hover:bg-white/10'}`}
                                    title="Previous File"
                                >
                                    <ChevronLeft size={16} strokeWidth={2.5} />
                                </button>

                                {(allFiles?.length || 0) > 1 && (
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setIsFileListOpen(!isFileListOpen);
                                                setFileListSearch('');
                                            }}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-all rounded-lg border cursor-pointer
                                                    ${isFileListOpen
                                                    ? (isLightMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40')
                                                    : (isLightMode ? 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20')}`}
                                        >
                                            <List size={14} />
                                            <span className="text-[12px] font-bold">List</span>
                                            <span className={`text-[10px] opacity-60 font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>{allFiles.length}</span>
                                            <ChevronDown size={12} strokeWidth={3} className={`transition-transform duration-200 ${isFileListOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Files Dropdown - ViewNoteModal Style */}
                                        {isFileListOpen && (
                                            <div
                                                ref={listRef}
                                                className={`absolute top-full right-0 mt-2 w-80 max-h-[480px] rounded-xl shadow-2xl border overflow-hidden flex flex-col z-[100] animate-in fade-in slide-in-from-top-2 duration-200
                                                        ${isLightMode ? 'bg-white border-slate-200 shadow-slate-300/40' : 'bg-[#13131f] border-white/10 shadow-black/70'}`}
                                            >
                                                {/* Header */}
                                                <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                                                    <div className="flex items-center gap-2 text-indigo-500">
                                                        <List size={14} className="opacity-80" />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">All Files</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isLightMode ? 'bg-slate-200 text-slate-500' : 'bg-white/10 text-slate-400'}`}>{allFiles.length}</span>
                                                    </div>
                                                </div>

                                                {/* Search */}
                                                <div className={`px-3 py-2.5 border-b shrink-0 ${isLightMode ? 'border-slate-100' : 'border-white/[0.04]'}`}>
                                                    <div className="relative">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Search files..."
                                                            value={fileListSearch}
                                                            onChange={e => setFileListSearch(e.target.value)}
                                                            className={`w-full text-[12px] rounded-lg px-8 py-2 outline-none border transition-all font-medium
                                                                ${isLightMode
                                                                    ? 'bg-slate-50 border-slate-200 focus:border-slate-300 text-slate-700 placeholder:text-slate-400'
                                                                    : 'bg-white/[0.04] border-white/[0.07] focus:border-white/20 text-white placeholder:text-slate-600'}`}
                                                        />
                                                        <Hash className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLightMode ? 'text-slate-400' : 'text-slate-600'}`} />
                                                    </div>
                                                </div>

                                                {/* List */}
                                                <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 min-h-[100px]">
                                                    {allFiles
                                                        .filter(f => (f.file_name || '').toLowerCase().includes(fileListSearch.toLowerCase()) || (f.subject_name || '').toLowerCase().includes(fileListSearch.toLowerCase()))
                                                        .map((f, i) => {
                                                            const isActive = f.id === file.id;
                                                            return (
                                                                <button
                                                                    key={f.id}
                                                                    onClick={() => {
                                                                        if (onSelect) {
                                                                            onSelect(f);
                                                                        }
                                                                        setIsFileListOpen(false);
                                                                        setFileListSearch('');
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all cursor-pointer group
                                                                            ${isActive
                                                                            ? (isLightMode ? 'bg-indigo-50 text-indigo-600 border-l-[3px] border-indigo-500 pl-[9px]' : 'bg-indigo-500/10 text-indigo-400 border-l-[3px] border-indigo-500 pl-[9px]')
                                                                            : (isLightMode ? 'hover:bg-slate-50 text-slate-700 border-l-[3px] border-transparent pl-[9px]' : 'hover:bg-white/5 text-slate-300 border-l-[3px] border-transparent pl-[9px]')}`}
                                                                >
                                                                    <span className={`text-[10px] font-black w-5 shrink-0 text-center tabular-nums 
                                                                            ${isActive ? 'text-indigo-500' : (isLightMode ? 'text-slate-400' : 'text-slate-600')}`}>
                                                                        {i + 1}
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className={`text-[12px] font-semibold truncate leading-tight ${isActive ? 'font-bold' : ''}`}>
                                                                            {f.file_name || (f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Document')}
                                                                        </div>
                                                                        <div className="text-[10px] opacity-50 truncate mt-0.5">
                                                                            {f.subject_name || 'No Subject'} • {f.file_type || 'File'}
                                                                        </div>
                                                                    </div>
                                                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                                                                </button>
                                                            );
                                                        })}
                                                    {allFiles.filter(f => (f.file_name || '').toLowerCase().includes(fileListSearch.toLowerCase()) || (f.subject_name || '').toLowerCase().includes(fileListSearch.toLowerCase())).length === 0 && (
                                                        <div className="py-8 text-center">
                                                            <p className={`text-[11px] font-bold ${isLightMode ? 'text-slate-400' : 'text-slate-600'}`}>No matches found</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer Nav */}
                                                {(onPrev || onNext) && (
                                                    <div className={`flex items-center justify-between px-3 py-2.5 border-t shrink-0 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'}`}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                                                            disabled={!onPrev}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                                                    ${!onPrev ? 'opacity-30 cursor-not-allowed' : (isLightMode ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-slate-300')}`}
                                                        >
                                                            <ChevronLeft size={13} strokeWidth={2.5} /> Prev
                                                        </button>
                                                        <span className={`text-[10px] font-bold tabular-nums ${isLightMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                                            {fileIndex + 1} / {allFiles.length}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                                                            disabled={!onNext}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                                                    ${!onNext ? 'opacity-30 cursor-not-allowed' : (isLightMode ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-white/10 text-slate-300')}`}
                                                        >
                                                            Next <ChevronRight size={13} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={onNext}
                                    disabled={!onNext}
                                    className={`p-1.5 rounded-md transition-all ${onNext ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                                            ${isLightMode ? 'text-slate-700 hover:bg-white shadow-sm' : 'text-slate-300 hover:bg-white/10'}`}
                                    title="Next File"
                                >
                                    <ChevronRight size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                        {(file?.linked_question_id || file?.linked_note_id) && (
                            <button
                                onClick={() => {
                                    if (onNavigateToLinkedContent) onNavigateToLinkedContent(file);
                                    if (onMinimize) onMinimize(true);
                                }}
                                className={`p-1.5 rounded-lg transition-all flex items-center gap-2 group cursor-pointer border mr-2
                                        ${isLightMode ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20'}`}
                                title="View Linked Content"
                            >
                                <LinkIcon size={16} strokeWidth={2} />
                            </button>
                        )}
                        


                        <div className="w-px h-5 bg-white/[0.08] mx-1" />
                        
                        {onMinimize && (
                            <button
                                onClick={() => onMinimize(true)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer mr-1
                                        ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.08]'}`}
                                title="Quick View (Minimize)"
                            >
                                <Eye size={17} strokeWidth={2.5} />
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all cursor-pointer group border border-rose-500/20 hover:border-rose-500/40"
                        >
                            <X size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area - Full Bleed */}
                <div className={`flex-1 relative flex items-center justify-center overflow-hidden transition-colors
                        ${isLightMode ? 'bg-[#f1f3f5]' : 'bg-[#0a0a0f]'}`}>
                    {loading ? (
                        <div className="flex flex-col items-center gap-5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
                                <Loader2 size={48} className="text-primary animate-spin relative z-10" strokeWidth={2.5} />
                            </div>
                            <span className="text-slate-400 font-black uppercase tracking-[0.3em] text-[12px] animate-pulse">Initializing Viewer</span>
                        </div>
                    ) : error ? (
                        <div className="text-center p-12 max-w-sm glass-card border-rose-500/20 bg-rose-500/[0.02]">
                            <div className="w-20 h-20 bg-rose-500/10 text-rose-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-rose-500/20">
                                <X size={40} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-white font-bold text-lg mb-2">Error Loading Object</h4>
                            <p className="text-slate-500 text-[13px] leading-relaxed mb-6">{error}</p>
                            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all border border-white/10">Try Refresh</button>
                        </div>
                    ) : (
                        <>
                            {/* Center Viewer */}
                            <div className={`w-full h-full flex items-center justify-center ${renderType === 'image' ? 'p-0' : 'px-3 sm:px-5 lg:px-8'}`}>
                                {renderType === 'image' && (
                                    <TransformWrapper
                                        key={file.id}
                                        initialScale={1}
                                        minScale={0.5}
                                        maxScale={6}
                                        centerOnInit
                                    >
                                        {({ zoomIn, zoomOut, resetTransform, state }) => (
                                            <div className="relative w-full h-full flex flex-col">
                                                {/* Floating Bottom Control Bar */}
                                                <div className={`absolute left-1/2 -translate-x-1/2 bottom-8 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-colors duration-300
                                                        ${isLightMode ? 'bg-white/90 border-slate-200' : 'bg-[#1a1a24]/90 border-white/10'}`}>
                                                    <div className={`px-4 py-1.5 flex items-center justify-center min-w-[4.5rem] text-[13px] font-medium
                                                            ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                                                        {Math.round(state.scale * 100)}%
                                                    </div>
                                                    <div className={`w-px h-5 ${isLightMode ? 'bg-slate-200' : 'bg-white/10'} mx-0.5`} />
                                                    <button onClick={() => zoomOut()} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'}`} title="Zoom Out"><ZoomOut size={18} strokeWidth={2} /></button>
                                                    <button onClick={() => zoomIn()} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'}`} title="Zoom In"><ZoomIn size={18} strokeWidth={2} /></button>
                                                    <button onClick={() => resetTransform()} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'}`} title="Reset Zoom"><RefreshCw size={18} strokeWidth={2} /></button>
                                                    <div className={`w-px h-5 ${isLightMode ? 'bg-slate-200' : 'bg-white/10'} mx-0.5`} />
                                                    <button onClick={handleDownload} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-500/20 text-indigo-400'}`} title="Download">
                                                        <Download size={18} strokeWidth={2} />
                                                    </button>
                                                </div>
                                                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                                    <img
                                                        src={file.data}
                                                        className="max-w-[95vw] max-h-[90vh] object-contain rounded-md"
                                                        alt={file.file_name || 'Preview'}
                                                    />
                                                </TransformComponent>
                                            </div>
                                        )}
                                    </TransformWrapper>
                                )}

                                {renderType === 'pdf' && (
                                    <div className={`w-full h-full flex items-center justify-center p-0`}>
                                        <iframe
                                            src={`${file.data}#view=FitH&toolbar=1`}
                                            className="w-full h-full border-0 rounded-none shadow-2xl"
                                            title={file.file_name || 'PDF Preview'}
                                        />
                                    </div>
                                )}

                                {renderType === 'xlsx' && (
                                    <div className={`w-full h-full flex flex-col overflow-hidden relative rounded-xl border shadow-lg transition-colors duration-300
                                            ${isLightMode ? 'bg-white border-slate-300/80 shadow-slate-200/50' : 'bg-[#1a1a24] border-white/[0.08] shadow-black/50'}`}>
                                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                                            <table className="w-full border-collapse">
                                                <thead className="sticky top-0 z-10">
                                                    {excelData && excelData.length > 0 && (
                                                        <tr className={`border-b transition-colors duration-300 ${isLightMode ? 'bg-slate-100 border-slate-300' : 'bg-[#2a2a35] border-white/20'}`}>
                                                            <th className={`px-3 py-2 text-center w-12 text-xs font-semibold border-r sticky left-0 z-20 transition-colors
                                                                    ${isLightMode ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-[#2a2a35] text-slate-400 border-white/20'}`}></th>
                                                            {excelData[0].map((cell, ci) => (
                                                                <th key={ci} className={`px-4 py-2 text-left text-xs font-semibold border-r transition-colors
                                                                        ${isLightMode ? 'text-slate-600 border-slate-300' : 'text-slate-300 border-white/20'}`}>
                                                                    {cell || String.fromCharCode(65 + (ci % 26))}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    )}
                                                </thead>
                                                <tbody>
                                                    {excelData && excelData.slice(1).map((row, ri) => (
                                                        <tr key={ri} className={`border-b transition-colors
                                                                ${isLightMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#1a1a24]'}`}>
                                                            <td className={`px-3 py-2 text-center text-xs font-medium border-r sticky left-0 z-10 transition-colors
                                                                    ${isLightMode ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-[#21212b] text-slate-500 border-white/10'}`}>{ri + 1}</td>
                                                            {row.map((cell, ci) => (
                                                                <td key={ci} className={`px-4 py-2 text-sm border-r whitespace-nowrap transition-colors
                                                                        ${isLightMode ? 'text-slate-700 border-slate-200' : 'text-slate-300 border-white/10'}`}>
                                                                    {cell === null || cell === undefined || cell === '' ? <span className="opacity-0">—</span> : String(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Bottom Sheet Tabs */}
                                        {excelSheets.length > 0 && (
                                            <div className={`flex items-center gap-1 overflow-x-auto px-2 border-t shrink-0 transition-colors duration-300
                                                    ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-[#2a2a35] border-white/10'}`}>
                                                {excelSheets.map((name, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleSheetChange(i)}
                                                        className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer
                                                                ${activeSheet === i
                                                                ? (isLightMode ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-emerald-500 text-emerald-400 bg-[#1a1a24]')
                                                                : (isLightMode ? 'border-transparent text-slate-600 hover:bg-slate-200' : 'border-transparent text-slate-400 hover:bg-white/5')}`}
                                                    >
                                                        {name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(renderType === 'doc' || renderType === 'docx') && (
                                    <div className={`w-full h-full flex overflow-hidden rounded-xl border shadow-lg transition-colors duration-300
                                            ${isLightMode ? 'bg-white border-slate-300/80 shadow-slate-200/50' : 'bg-[#111116] border-white/[0.08] shadow-black/50'}`}>

                                        {/* Doc Sidebar - Table of Contents */}
                                        <div className={`hidden lg:flex flex-col border-r shrink-0 overflow-y-auto custom-scrollbar transition-all duration-300
                                                ${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}
                                                ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#21212b] border-white/10'}`}>

                                            <div className="flex-1 py-4 px-2 space-y-0.5">
                                                {(() => {
                                                    const parser = new DOMParser();
                                                    const doc = parser.parseFromString(wordHtml, 'text/html');
                                                    const headers = Array.from(doc.querySelectorAll('h1, h2, h3'));

                                                    if (headers.length === 0) {
                                                        return <div className={`p-4 text-center text-xs ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>No outline entries</div>;
                                                    }

                                                    return headers.map((h, i) => {
                                                        const level = parseInt(h.tagName.substring(1));
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    const el = document.getElementById(`doc-header-${i}`);
                                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                }}
                                                                className={`w-full text-left px-3 py-1.5 rounded-sm transition-all group cursor-pointer
                                                                        ${isLightMode ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'}
                                                                        ${level === 1 ? 'mt-2 pl-3' : level === 2 ? 'pl-6' : 'pl-9'}`}
                                                            >
                                                                <span className={`block truncate text-xs transition-colors
                                                                        ${level === 1 ? `font-semibold ${isLightMode ? 'text-slate-700 group-hover:text-black' : 'text-slate-200 group-hover:text-white'}` : `font-medium ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}`}>
                                                                    {h.textContent}
                                                                </span>
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>

                                        {/* Main Document Content */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth bg-white">
                                            <div className="w-full p-6 lg:p-12 text-black select-text docx-renderer-v4 relative max-w-none">
                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: (() => {
                                                            try {
                                                                if (!wordHtml) return '';
                                                                const parser = new DOMParser();
                                                                const doc = parser.parseFromString(wordHtml, 'text/html');
                                                                const headers = Array.from(doc.querySelectorAll('h1, h2, h3'));
                                                                headers.forEach((h, i) => {
                                                                    h.setAttribute('id', `doc-header-${i}`);
                                                                    h.setAttribute('class', 'scroll-mt-12');
                                                                });
                                                                return doc.body.innerHTML;
                                                            } catch (e) {
                                                                return wordHtml || '';
                                                            }
                                                        })()
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                        .docx-renderer-v4 h1 { font-size: 2.5em; font-weight: 800; margin-bottom: 0.6em; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.4em; letter-spacing: -0.03em; scroll-margin-top: 2rem; }
                        .docx-renderer-v4 h2 { font-size: 1.8em; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: #1e293b; letter-spacing: -0.02em; scroll-margin-top: 2rem; }
                        .docx-renderer-v4 h3 { font-size: 1.3em; font-weight: 700; margin-top: 1.25em; margin-bottom: 0.4em; color: #334155; scroll-margin-top: 2rem; }
                        .docx-renderer-v4 p { margin-bottom: 1.4em; font-size: 17px; line-height: 1.8; color: #334155; }
                        .docx-renderer-v4 ul, .docx-renderer-v4 ol { margin-bottom: 1.5em; padding-left: 1.5em; }
                        .docx-renderer-v4 li { margin-bottom: 0.5em; font-size: 17px; }
                        .docx-renderer-v4 table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2.5em 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fafafa; }
                        .docx-renderer-v4 th, .docx-renderer-v4 td { border: 1px solid #e2e8f0; padding: 1.25em; text-align: left; }
                        .docx-renderer-v4 th { background-color: #f1f5f9; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; color: #475569; }
                        
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
                        
                        @keyframes fade-in {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        .fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

                        @keyframes slide-in-top {
                            from { opacity: 0; transform: translateY(-8px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-in.slide-in-from-top-2 {
                            animation: slide-in-top 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                        }
                    `}} />
            </div>
        </ModalPortal>
    );
};

export default FileViewerModal;

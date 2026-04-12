import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Target, ArrowLeft, Plus, Calendar, Activity, TrendingUp, TrendingDown, BookOpen, Trash2, Edit2, ChevronRight, ChevronDown, X, Brain, CheckCircle2, BarChart3, Notebook, BarChart2, Search, History, Clock, LayoutGrid, List, FileText, Image as ImageIcon, MoreVertical, Download, CheckCircle, Pencil, Layers, Save, Trash, FileDown, Eye, Maximize2, PlusCircle, RefreshCw, Filter, Link as LinkIcon, Table, LibraryBig } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

import * as testSeriesApi from '../api/testSeriesApi';
import * as testsApi from '../api/testsApi';
import { filesApi, foldersApi } from '../api/index';
import { useTestSeries } from '../context/TestSeriesContext.jsx';
import { useTopics } from '../context/TopicContext.jsx';
import { useQuickView } from '../context/QuickViewContext.jsx';
import { useFiles } from '../context/FileContext.jsx';
import { useFolders } from '../context/FolderContext.jsx';
import CreateTestModal from '../components/modals/CreateTestModal';
import AddFileModal from '../components/modals/AddFileModal';
import FileViewerModal from '../components/modals/FileViewerModal';
import FileExplorer from '../components/FileExplorer.jsx';
import TimeTraveler from '../components/TimeTraveler';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import toast from 'react-hot-toast';

import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Cell, Legend
} from 'recharts';

import ModalPortal from '../components/ModalPortal.jsx';

// ── colour helpers ────────────────────────────────────────────────────────────
const accColor = (v) => v >= 75 ? '#34d399' : v >= 50 ? '#fbbf24' : '#f87171';
const accPill = (v) => v >= 75
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : v >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#13132a]/95 border border-white/10 rounded-xl p-3 shadow-2xl text-[13px] min-w-[140px]">
            <p className="text-slate-500 mb-1.5 text-[11px] font-medium uppercase tracking-wider">{payload[0]?.payload?.date || label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-slate-400 font-medium">{p.name}:</span>
                    <span style={{ color: p.color }} className="font-bold">
                        {p.value}{p.name.includes('Acc') || p.name === 'Accuracy' || p.name === 'Target' ? '%' : ''}
                    </span>
                </div>
            ))}
        </div>
    );
};


const TestSeriesDetail = () => {
    const { seriesId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { seriesDetails, detailLoading, loadSeriesDetail, updateTestsInSeries } = useTestSeries();
    const { loadTopics } = useTopics();

    // Derived from global state
    const cached = seriesDetails[seriesId];
    const series = cached?.series || null;
    const tests = cached?.tests || [];
    const loading = detailLoading[seriesId] && !series;

    const [activeTab, setActiveTab] = useState('tests');

    const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState(null);

    // Library State
    const [files, setFiles] = useState([]);
    const { 
        folders, 
        fetchFolders, 
        fetchFolderContents,
        setFolders, 
        addFolderToList, 
        updateFolderInList, 
        removeFolderFromList 
    } = useFolders();
    const [filePage, setFilePage] = useState(0);
    const [hasMoreFiles, setHasMoreFiles] = useState(true);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [uploadFolderId, setUploadFolderId] = useState(null);
    const [showFileModal, setShowFileModal] = useState(false);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [libraryViewMode, setLibraryViewMode] = useState('categorywise'); // categorywise, datewise
    const [showTimeTraveler, setShowTimeTraveler] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [loadedTabs, setLoadedTabs] = useState(new Set());
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const { openItem, minimize: globalMinimize } = useQuickView();
    const { getFileData, clearFileCacheMany } = useFiles();
    const [viewingFile, setViewingFile] = useState(null);

    const observer = useRef();
    const lastFileElementRef = useCallback(node => {
        if (loadingFiles) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreFiles) {
                setFilePage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingFiles, hasMoreFiles]);




    const loadData = useCallback(async (force = false) => {
        if (seriesId) {
            await loadSeriesDetail(seriesId, force);
        }
    }, [seriesId, loadSeriesDetail]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Pre-load topics for all subjects in this series
    useEffect(() => {
        if (series?.subjects) {
            series.subjects.forEach(sub => loadTopics(sub.id));
        }
    }, [series?.subjects, loadTopics]);

    // Fetch Library Contents (Consolidated)
    const loadLibrary = useCallback(async (page = 0, folderId = null) => {
        if (!seriesId) return;
        setLoadingFiles(true);
        try {
            const res = await fetchFolderContents(seriesId, 'series', folderId, 50, page * 50);
            if (page === 0) setFiles(res.files || []);
            else setFiles(prev => [...prev, ...(res.files || [])]);
            setHasMoreFiles((res.files || []).length === 50);
        } catch (err) {
            toast.error("Failed to load library");
        } finally {
            setLoadingFiles(false);
        }
    }, [seriesId, fetchFolderContents]);

    const loadFiles = loadLibrary; 


    useEffect(() => {
        if (activeTab === 'library') {
            const isFirstLoad = !loadedTabs.has('library');
            if (isFirstLoad) {
                // Initial load: Fetch root only (folderId: null)
                loadLibrary(0, null);
                setLoadedTabs(prev => new Set(prev).add('library'));
            } else if (filePage > 0) {
                loadLibrary(filePage, currentFolderId);
            }
        }
    }, [activeTab, filePage, loadLibrary, seriesId, loadedTabs, currentFolderId]);

    const handleFileSaved = (newFile) => {
        setFiles(prev => [newFile.file, ...prev]);
    };

    const handleFileClick = (file) => {
        setViewingFile(file);
    };

    const handleNextFile = () => {
        if (!viewingFile) return;
        const idx = files.findIndex(f => f.id === viewingFile.id);
        if (idx < files.length - 1) setViewingFile(files[idx + 1]);
    };

    const handlePrevFile = () => {
        if (!viewingFile) return;
        const idx = files.findIndex(f => f.id === viewingFile.id);
        if (idx > 0) setViewingFile(files[idx - 1]);
    };


    const groupedLibraryItems = useMemo(() => {
        // Advanced Multi-Scope Filtering Logic
        const filtered = files.filter(file => {
            if (!fileSearchQuery) return true;

            const itemDate = new Date(file.created_at);
            const query = fileSearchQuery.toLowerCase().trim();

            // Handle Structured Queries from TimeTraveler
            if (query.includes(':') || query.includes('|')) {
                const criteria = { years: [], months: [], days: [], range: null };
                const parts = query.split('|');
                parts.forEach(p => {
                    const [key, val] = p.split(':');
                    if (!val) return;
                    if (key === 'years') criteria.years = val.split(',').map(v => parseInt(v));
                    if (key === 'months') criteria.months = val.split(',').map(m => m.toLowerCase());
                    if (key === 'days') criteria.days = val.split(',');
                    if (key === 'range') {
                        const [s, e] = val.split(',');
                        criteria.range = { start: new Date(s), end: new Date(e) };
                        if (criteria.range.end) criteria.range.end.setHours(23, 59, 59, 999);
                    }
                });

                const itemYear = itemDate.getFullYear();
                const itemMonthLong = itemDate.toLocaleString('default', { month: 'long' }).toLowerCase();
                const itemMonthShort = itemDate.toLocaleString('default', { month: 'short' }).toLowerCase();
                const itemDateStr = itemDate.toISOString().split('T')[0];

                const yearMatch = criteria.years.length === 0 || criteria.years.includes(itemYear);
                const monthMatch = criteria.months.length === 0 || criteria.months.includes(itemMonthLong) || criteria.months.includes(itemMonthShort);
                const dayMatch = criteria.days.length === 0 || criteria.days.includes(itemDateStr);
                const rangeMatch = !criteria.range || (itemDate >= criteria.range.start && itemDate <= criteria.range.end);

                return yearMatch && monthMatch && dayMatch && rangeMatch;
            }

            // Fallback for simple search (legacy or manual)
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
                        // Local date string for comparison
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

            // 3. Month/Year Wise or Fallback Search
            return query === fullMonth ||
                query === shortMonth ||
                query === itemDate.getFullYear().toString() ||
                fullMonth.includes(query) ||
                itemDate.toLocaleDateString().includes(query) ||
                file.file_name?.toLowerCase().includes(query);
        });

        if (libraryViewMode === 'datewise') {
            const groups = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            filtered.forEach(file => {
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

            return Object.entries(groups).map(([title, items]) => ({
                title,
                items,
                date: new Date(items[0].created_at)
            })).sort((a, b) => b.date - a.date);
        } else {
            // Typewise
            const groups = {};
            filtered.forEach(file => {
                const rawType = (file.file_type || 'file').toLowerCase();
                let groupName = 'Other';

                if (rawType.match(/image|png|jpg|jpeg|webp|gif/)) groupName = 'Images';
                else if (rawType === 'pdf') groupName = 'PDFs';
                else if (rawType.match(/doc|docx|txt|rtf/)) groupName = 'Documents';
                else if (rawType.match(/xlsx|xls|csv/)) groupName = 'Spreadsheets';
                else groupName = rawType.charAt(0).toUpperCase() + rawType.slice(1);

                if (!groups[groupName]) groups[groupName] = [];
                groups[groupName].push(file);
            });

            return Object.entries(groups).sort((a, b) => {
                const priority = { 'Images': 1, 'PDFs': 2, 'Documents': 3, 'Spreadsheets': 4 };
                const aPrio = priority[a[0]] || 99;
                const bPrio = priority[b[0]] || 99;
                if (aPrio !== bPrio) return aPrio - bPrio;
                return a[0].localeCompare(b[0]);
            }).map(([title, items]) => ({ title, items }));
        }
    }, [files, fileSearchQuery, libraryViewMode]);


    const handleDeleteTest = async (e, testId) => {
        e.stopPropagation();
        setTestToDelete(testId);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDeleteTest = async () => {
        if (!testToDelete) return;
        try {
            await testsApi.deleteTest(seriesId, testToDelete);
            toast.success('Test deleted');
            // Refresh details in context
            loadData(true);
        } catch (error) {
            toast.error('Failed to delete test');
        } finally {
            setIsConfirmDeleteOpen(false);
            setTestToDelete(null);
        }
    };


    const handleEditTest = (e, test) => {
        e.stopPropagation();
        setEditingTest(test);
        setIsCreateTestModalOpen(true);
    };

    const handleModalClose = () => {
        setIsCreateTestModalOpen(false);
        setEditingTest(null);
    };


    if (loading) {
        return (
            <div className="fade-in max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-surface-2 animate-pulse rounded" />
                        <div className="h-8 w-48 bg-surface-2 animate-pulse rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass p-8 animate-pulse h-[160px] rounded-xl border-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    if (!series) return null;

    return (
        <div className="fade-in max-w-6xl mx-auto">
            <div className="relative mb-6">
                {/* Background ambient effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-24 bg-pink-500/5 blur-[70px] -z-10 rounded-full opacity-60" />

                <div className="flex items-center justify-between gap-6 py-2 px-1">
                    {/* Left: Back */}
                    <div className="flex-1 flex justify-start">
                        <button
                            onClick={() => navigate('/tests')}
                            className="flex items-center gap-2 text-[12.5px] font-bold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] pl-2.5 pr-4 py-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.1] group/back backdrop-blur-md whitespace-nowrap cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-0.5 transition-transform" />
                            <span>Back</span>
                        </button>
                    </div>

                    {/* Center: Title (Maximum focus) */}
                    <div className="flex-[4] text-center min-w-0">
                        <h1 className="text-[28px] md:text-[38px] lg:text-[46px] font-heading font-black text-white tracking-tighter leading-none truncate drop-shadow-2xl selection:bg-pink-500/30 py-1">
                            {series.name}
                        </h1>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-1 flex justify-end gap-3">
                        <button
                            onClick={() => navigate(`/tests/${seriesId}/insights`)}
                            className="flex items-center gap-2.5 text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-purple-500/10 bg-purple-500/5 text-purple-400 hover:text-white hover:bg-purple-500/20 hover:border-purple-500/30 group/insights shadow-lg shadow-purple-500/5 backdrop-blur-sm whitespace-nowrap"
                        >
                            <BarChart3 className="w-3.5 h-3.5 text-purple-400 group-hover/insights:scale-110 transition-transform" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Insights</span>
                        </button>
                    </div>
                </div>

                {/* Description below title */}
                {series.description && (
                    <div className="max-w-2xl mx-auto mt-2 pb-1 text-center">
                        <p className="text-slate-400/80 text-[13px] md:text-[14px] font-medium leading-relaxed truncate px-4">
                            {series.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Divider and section Heading */}
            <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.06] to-transparent mb-4" />

            <div className="flex items-center gap-4 mb-10 mt-6 border-b border-white/[0.06]">
                <button
                    onClick={() => setActiveTab('tests')}
                    className={`pb-5 px-4 text-[16px] font-black transition-all relative cursor-pointer ${activeTab === 'tests' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <div className="flex items-center gap-3">
                        <Notebook className="w-5 h-5" />
                        <span>Tests</span>
                        <span className="text-[11px] bg-white/5 px-2 py-0.5 rounded-full border border-white/10 font-bold">{tests.length}</span>
                    </div>
                    {activeTab === 'tests' && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-pink-500 rounded-t-full shadow-[0_-4px_12px_rgba(236,72,153,0.5)] fade-in" />}
                </button>
                <div className="w-px h-6 bg-white/[0.08] mb-5 shrink-0" />
                <button
                    onClick={() => setActiveTab('library')}
                    className={`pb-5 px-4 text-[16px] font-black transition-all relative cursor-pointer ${activeTab === 'library' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <div className="flex items-center gap-3">
                        <LibraryBig className="w-5 h-5" />
                        <span>Library</span>
                    </div>
                    {activeTab === 'library' && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-500 rounded-t-full shadow-[0_-4px_12px_rgba(99,102,241,0.5)] fade-in" />}
                </button>
            </div>

            {activeTab === 'tests' && (
                <div className="fade-in">
                    <div className="flex items-center justify-between mb-8 border-b border-white/[0.08] pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/10 shadow-lg shadow-pink-500/5">
                                <Notebook className="w-5 h-5 text-pink-400" />
                            </div>
                            <h2 className="text-[20px] font-heading font-bold text-white tracking-tight">All Tests</h2>
                        </div>
                        <button
                            onClick={() => setIsCreateTestModalOpen(true)}
                            className="flex items-center gap-2 text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-pink-500/20 bg-pink-500/10 text-pink-400 hover:text-white hover:bg-pink-500/20 group shadow-lg shadow-pink-500/5"
                        >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                            <span>Create Test</span>
                        </button>
                    </div>

                    {/* Tests Content */}
                    <div>
                        {tests.length === 0 ? (
                            <div className="glass-panel rounded-xl p-16 text-center border-dashed border-pink-500/20 max-w-xl mx-auto relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                <div className="w-20 h-20 mx-auto bg-pink-500/10 rounded-full flex items-center justify-center mb-6 border border-pink-500/20 pulse-ring">
                                    <Calendar className="w-10 h-10 text-pink-400" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No tests yet</h3>
                                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                                    Schedule your first test to start tracking scores against the subjects in this series.
                                </p>
                                <button
                                    onClick={() => setIsCreateTestModalOpen(true)}
                                    className="btn-primary-pink flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add First Test</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-12">
                                {tests.map(test => (
                                    <div
                                        key={test.id}
                                        onClick={() => navigate(`/tests/${seriesId}/test/${test.id}/analytics`)}
                                        className="glass-card glass p-6 cursor-pointer group flex flex-col justify-between transition-all hover:border-pink-500/30 min-h-[160px] relative active:scale-[0.99]"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-[17px] font-heading font-semibold text-slate-100 transition-colors truncate tracking-tight leading-tight mb-2">
                                                    {test.name.toUpperCase()}
                                                </h2>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500/60 shadow-[0_0_8px_rgba(236,72,153,0.4)]" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                            {test.subjects?.length || 0} Subjects
                                                        </span>
                                                    </div>
                                                    <div className="h-3 w-px bg-white/10" />
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3 text-slate-600" />
                                                        <span className="text-[10px] font-bold text-slate-600">
                                                            {new Date(test.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <button
                                                    onClick={(e) => handleEditTest(e, test)}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-pink-400 transition-colors"
                                                    title="Edit Test"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteTest(e, test.id)}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
                                                    title="Delete Test"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center gap-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/tests/${seriesId}/test/${test.id}`); }}
                                                className="flex-1 h-10 px-3 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-white border border-pink-500/10 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Scores
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/tests/${seriesId}/test/${test.id}/analytics`); }}
                                                className="flex-1 h-10 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/10 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all"
                                            >
                                                <BarChart3 className="w-3.5 h-3.5" />
                                                Analytics
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'library' && (
                <div className="fade-in pb-12">
                    <FileExplorer 
                        files={files}
                        folders={folders}
                        scopeId={seriesId}
                        scopeType="series"
                        onFilesChange={setFiles}
                        onFoldersChange={setFolders}
                        onFileUpload={(fId) => {
                            setUploadFolderId(fId);
                            setShowFileModal(true);
                        }}
                        onNavigate={(folderId) => {
                            setCurrentFolderId(folderId);
                            setFilePage(0);
                            loadLibrary(0, folderId);
                        }}
                        isSelectionMode={isSelectionMode}
                        setIsSelectionMode={setIsSelectionMode}
                        selectedIds={selectedItems}
                        setSelectedIds={setSelectedItems}
                        onFileClick={setViewingFile}
                        foldersApi={foldersApi}
                        filesApi={filesApi}
                    />
                </div>
            )}



            {/* Modals & Dialogs */}
            <CreateTestModal
                isOpen={isCreateTestModalOpen}
                onClose={handleModalClose}
                onSuccess={() => loadData(true)}
                seriesId={seriesId}
                seriesSubjects={series.subjects || []}
                initialData={editingTest}
            />



            <ConfirmDialog
                isOpen={isConfirmDeleteOpen}
                title="Delete Test?"
                message="Are you sure you want to delete this test? Scores will be lost, but global subject sessions will remain intact."
                onConfirm={confirmDeleteTest}
                onCancel={() => {
                    setIsConfirmDeleteOpen(false);
                    setTestToDelete(null);
                }}
                confirmText="Delete Test"
            />

            <AddFileModal
                isOpen={showFileModal}
                onClose={() => setShowFileModal(false)}
                seriesId={seriesId}
                onFileSaved={handleFileSaved}
                folders={folders}
                initialFolderId={uploadFolderId}
                isLibrary={true}
            />

            {viewingFile && (
                <FileViewerModal
                    isOpen={!!viewingFile}
                    onClose={() => setViewingFile(null)}
                    onMinimize={() => {
                        globalMinimize({
                            type: 'file',
                            id: viewingFile.id,
                            data: viewingFile,
                            title: viewingFile.file_name || 'Untitled File',
                            typeLabel: viewingFile.file_type?.toUpperCase() || 'FILE',
                            props: {
                                onNext: handleNextFile,
                                onPrev: handlePrevFile
                            }
                        });
                        setViewingFile(null);
                    }}
                    file={viewingFile}
                    allFiles={files}
                    onPrev={handlePrevFile}
                    onNext={handleNextFile}
                    onSelect={handleFileClick}
                    onDelete={async (deletedFile) => {
                        await filesApi.delete(deletedFile.id, null, seriesId);
                        setFiles(prev => (prev || []).filter(f => f.id !== deletedFile.id));
                        clearFileCacheMany([deletedFile.id]);
                        setViewingFile(null);
                        toast.success("File deleted successfully");
                    }}
                />
            )}


            {showTimeTraveler && (
                <TimeTraveler
                    isOpen={showTimeTraveler}
                    onClose={() => setShowTimeTraveler(false)}
                    onApply={(val) => setFileSearchQuery(val)}
                />
            )}
        </div>
    );
};


export default TestSeriesDetail;


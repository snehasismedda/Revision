import React, { useEffect, useState, useMemo, useRef } from 'react';

import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { sessionsApi, questionsApi, notesApi, filesApi, aiApi, revisionApi, solutionsApi } from '../api/index.js';
import { useTopics } from '../context/TopicContext.jsx';
import { useSubjects } from '../context/SubjectContext.jsx';
import TopicTree from '../components/TopicTree.jsx';
import SessionCard from '../components/SessionCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import RichTextRenderer from '../components/RichTextRenderer.jsx';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import unidecode from 'unidecode';
import autoTable from 'jspdf-autotable';
import { marked } from 'marked';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import { ArrowLeft, PlusCircle, BarChart3, Wand2, BookOpen, Activity, ListChecks, FileText, Image as ImageIcon, Layers, Trash2, ChevronDown, Pencil, Hash, Search, X, Link2 as LinkIcon, Maximize2, Minimize2, LayoutGrid, List, CheckCircle, Download, ClipboardList, RotateCcw, Clock, RefreshCw, Notebook, MoreHorizontal, MoreVertical, History, Loader2 } from 'lucide-react';

import ManageSyllabusModal from '../components/modals/ManageSyllabusModal.jsx';
import AddQuestionModal from '../components/modals/AddQuestionModal.jsx';
import EditQuestionModal from '../components/modals/EditQuestionModal.jsx';
import AddNoteModal from '../components/modals/AddNoteModal.jsx';
import ViewNoteModal from '../components/modals/ViewNoteModal.jsx';
import CreateSessionModal from '../components/modals/CreateSessionModal.jsx';
import EditSessionModal from '../components/modals/EditSessionModal.jsx';
import EditNoteModal from '../components/modals/EditNoteModal.jsx';
import AddFileModal from '../components/modals/AddFileModal.jsx';
import TimeTraveler from '../components/TimeTraveler.jsx';
import CreateRevisionSessionModal from '../components/modals/CreateRevisionSessionModal.jsx';
import EditRevisionSessionModal from '../components/modals/EditRevisionSessionModal.jsx';
import AddSolutionModal from '../components/modals/AddSolutionModal.jsx';
import ViewSolutionModal from '../components/modals/ViewSolutionModal.jsx';
import EditSolutionModal from '../components/modals/EditSolutionModal.jsx';
import FileViewerModal from '../components/modals/FileViewerModal.jsx';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

const preprocessMarkdown = (text) => {
    if (!text) return '';
    return text
        // Handle escaped block brackets: \[ ... \] or \\[ ... \\]
        .replace(/\\\\\[/g, '\n$$\n')
        .replace(/\\\\\]/g, '\n$$\n')
        .replace(/\\\[/g, '\n$$\n')
        .replace(/\\\]/g, '\n$$\n')
        // Handle escaped inline brackets: \( ... \) or \\( ... \\)
        .replace(/\\\\\(*/g, '$')
        .replace(/\\\\\)* /g, '$')
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        // Handle back-to-back block math or sloppy delimiters
        .replace(/\$\$\$\$/g, '$$\n$$')
        .replace(/\$ \$/g, '$$')
        // Ensure standard double dollars have newlines if they are likely blocks
        .replace(/([^\n])\$\$/g, '$1\n$$')
        .replace(/\$\$([^\n])/g, '$$\n$1')
        // Fix common quirk
        .replace(/\\bottom([a-zA-Z])/g, '\\bot $1')
        .replace(/\\bottom/g, '\\bot')
        // Ensure single newlines become double newlines to prevent text collapsing horizontally
        .replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
};


const SubjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const { subjects, statsMap, isLoaded: subjectsLoaded, loadSubjects, refreshStats, setSelectedSubjectId } = useSubjects();

    // Sync global selected subject when viewing details
    useEffect(() => {
        if (id) {
            setSelectedSubjectId(id);
        }
    }, [id, setSelectedSubjectId]);

    const { topicsBySubject, loadTopics } = useTopics();

    // Derived from global state
    const topics = topicsBySubject[id] || [];
    const subject = subjects.find(s => s.id === id);
    const overview = statsMap[id];
    const loading = !subjectsLoaded || !subject || !overview;
    const [sessions, setSessions] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [notes, setNotes] = useState([]);
    const [files, setFiles] = useState([]);
    const [solutions, setSolutions] = useState([]);
    const [loadedTabs, setLoadedTabs] = useState(new Set());
    const [tabLoading, setTabLoading] = useState(false);

    // Pagination for files (Library)
    const [filePage, setFilePage] = useState(0);
    const [loadingMoreFiles, setLoadingMoreFiles] = useState(false);
    const [hasMoreFiles, setHasMoreFiles] = useState(true);
    const FILE_LIMIT = 20;

    // Pagination for notes
    const [notePage, setNotePage] = useState(0);
    const [loadingMoreNotes, setLoadingMoreNotes] = useState(false);
    const [hasMoreNotes, setHasMoreNotes] = useState(true);
    const NOTE_LIMIT = 12;

    const [activeTab, setActiveTab] = useState('topics');
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showFileModal, setShowFileModal] = useState(false);
    const [showSolutionModal, setShowSolutionModal] = useState(false);
    const [activeFileDropdown, setActiveFileDropdown] = useState(null);
    const [viewingNote, setViewingNote] = useState(null);
    const [viewingFile, setViewingFile] = useState(null);
    const [isFileViewerMinimized, setIsFileViewerMinimized] = useState(false);
    const [viewingSolution, setViewingSolution] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [selectedQuestionIdForNote, setSelectedQuestionIdForNote] = useState(null);
    const [selectedQuestionIdForSolution, setSelectedQuestionIdForSolution] = useState(null);
    const [noteStack, setNoteStack] = useState([]); // Stack for parent note navigation
    const [addToNoteData, setAddToNoteData] = useState(null); // { selectedText, parentNoteId }

    const [generatingAINoteId, setGeneratingAINoteId] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [confirmDeleteSession, setConfirmDeleteSession] = useState({ open: false, session: null });
    const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState({ open: false, questionId: null });
    const [confirmDeleteNote, setConfirmDeleteNote] = useState({ open: false, note: null });
    const [confirmDeleteFile, setConfirmDeleteFile] = useState({ open: false, items: [] });
    const [renameFileData, setRenameFileData] = useState({ open: false, file: null, name: '' });
    const [editingSession, setEditingSession] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editingSolution, setEditingSolution] = useState(null);
    const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
    const [showEditSolutionModal, setShowEditSolutionModal] = useState(false);
    const [fetchingImageId, setFetchingImageId] = useState(null);
    const [fetchingNoteContentId, setFetchingNoteContentId] = useState(null);
    const [fetchedImages, setFetchedImages] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    const [solutionSearchQuery, setSolutionSearchQuery] = useState('');
    const [selectedNoteTag, setSelectedNoteTag] = useState('');
    const [sessionSearchQuery, setSessionSearchQuery] = useState('');
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [topicsDefaultExpanded, setTopicsDefaultExpanded] = useState(true);
    const [treeKey, setTreeKey] = useState(0);
    const [sessionsViewMode, setSessionsViewMode] = useState('grid'); // 'grid' or 'list'
    const [notesViewMode, setNotesViewMode] = useState('grid'); // 'grid' or 'list'
    const [solutionsViewMode, setSolutionsViewMode] = useState('grid');
    const [libraryViewMode, setLibraryViewMode] = useState('datewise'); // 'datewise' or 'categorywise'

    const [showTimeTraveler, setShowTimeTraveler] = useState(false);

    // Revision tracker state
    const [revisionSessions, setRevisionSessions] = useState([]);
    const [togglingTopicId, setTogglingTopicId] = useState(null);
    const [expandedRevisionGroups, setExpandedRevisionGroups] = useState({});
    const [activeRevisionSessionId, setActiveRevisionSessionId] = useState(null);
    const [showCreateRevisionSession, setShowCreateRevisionSession] = useState(false);
    const [editingRevisionSession, setEditingRevisionSession] = useState(null);
    const [confirmDeleteRevisionSession, setConfirmDeleteRevisionSession] = useState({ open: false, sessionId: null });


    // Toggle state for grouped questions
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // PDF Export / Selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showExportMenu, setShowExportMenu] = useState(false);

    const [confirmBulkDelete, setConfirmBulkDelete] = useState({ open: false, type: null, count: 0 });
    const [isDownloadingSyllabus, setIsDownloadingSyllabus] = useState(false);
    const [activeNoteDropdown, setActiveNoteDropdown] = useState(null);
    const [activeQuestionDropdown, setActiveQuestionDropdown] = useState(null);
    const [highlightedNoteId, setHighlightedNoteId] = useState(null);
    const noteDropdownRef = useRef(null);
    const questionDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeNoteDropdown && noteDropdownRef.current && !noteDropdownRef.current.contains(event.target)) {
                setActiveNoteDropdown(null);
            }
            if (activeQuestionDropdown && questionDropdownRef.current && !questionDropdownRef.current.contains(event.target)) {
                setActiveQuestionDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeNoteDropdown, activeQuestionDropdown]);

    useEffect(() => {
        setIsSelectionMode(false);
        setSelectedItems(new Set());
        setShowExportMenu(false);
    }, [activeTab]);

    const ensureNotesContent = async (noteIds) => {
        if (!noteIds || noteIds.length === 0) return;

        const idsToFetch = noteIds.filter(iid => {
            const n = notes.find(note => note.id === iid);
            return !n || !n.content;
        });

        if (idsToFetch.length === 0) return notes;

        try {
            const res = await notesApi.getBatch(id, idsToFetch);
            if (res.notes && Array.isArray(res.notes)) {
                // Construct updated array immediately for the caller to use (since setNotes is async)
                const nextNotes = [...notes];
                res.notes.forEach(newNote => {
                    const idx = nextNotes.findIndex(nn => nn.id === newNote.id);
                    if (idx !== -1) {
                        nextNotes[idx] = { ...nextNotes[idx], ...newNote };
                    } else {
                        nextNotes.push(newNote);
                    }
                });

                // Still update global state for future use
                setNotes(nextNotes);
                return nextNotes;
            }
        } catch (error) {
            console.error('Failed to fetch missing notes content:', error);
            throw new Error('Some notes could not be fully loaded for export.');
        }
        return notes;
    };

    const parsedNotes = useMemo(() => {
        return notes.map(n => {
            let parsedTags = n.tags || [];
            if (typeof parsedTags === 'string') {
                try { parsedTags = JSON.parse(parsedTags); } catch { parsedTags = []; }
            }
            if (!Array.isArray(parsedTags)) parsedTags = [];
            return { ...n, parsedTags };
        });
    }, [notes]);

    const filteredNotes = useMemo(() => {
        const query = (noteSearchQuery || '').toLowerCase();
        return parsedNotes.filter(n => {
            const matchesSearch = n.title?.toLowerCase().includes(query) || (n.content && n.content.toLowerCase().includes(query));
            const matchesTag = selectedNoteTag ? n.parsedTags.includes(selectedNoteTag) : true;
            return matchesSearch && matchesTag;
        });
    }, [parsedNotes, noteSearchQuery, selectedNoteTag]);

    const filteredSessions = useMemo(() => {
        const query = (sessionSearchQuery || '').toLowerCase();
        return sessions.filter(s =>
            (s.title || s.name || '')?.toLowerCase().includes(query) ||
            s.notes?.toLowerCase().includes(query)
        );
    }, [sessions, sessionSearchQuery]);

    const filteredSolutions = useMemo(() => {
        if (!solutionSearchQuery.trim()) return solutions;
        const q = solutionSearchQuery.toLowerCase();
        return solutions.filter(s =>
            s.title?.toLowerCase().includes(q) ||
            s.content?.toLowerCase().includes(q)
        );
    }, [solutions, solutionSearchQuery]);

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

    const handleSelectAll = () => {
        if (activeTab === 'questions') {
            const visibleQuestions = groupedQuestions.flatMap(g => g.questions);
            if (selectedItems.size === visibleQuestions.length && visibleQuestions.length > 0) {
                // If all currently visible are already selected, deselect them all
                setSelectedItems(new Set());
            } else {
                // Otherwise, select exactly the visible list
                setSelectedItems(new Set(visibleQuestions.map(q => q.id)));
            }
        } else if (activeTab === 'notes') {
            const visibleNotes = filteredNotes;

            if (selectedItems.size === visibleNotes.length && visibleNotes.length > 0) {
                setSelectedItems(new Set());
            } else {
                setSelectedItems(new Set(visibleNotes.map(n => n.id)));
            }
        }
    };

    const handleBulkDeleteConfirm = async () => {
        const { type } = confirmBulkDelete;
        const isNotes = type === 'notes';
        const api = isNotes ? notesApi : questionsApi;
        const itemsToDelete = Array.from(selectedItems);

        const loadingToast = toast.loading(`Deleting ${itemsToDelete.length} ${isNotes ? 'note(s)' : 'question(s)'}...`);
        try {
            await Promise.all(itemsToDelete.map(itemId => api.delete(id, itemId)));

            if (isNotes) {
                setNotes(prev => prev.filter(n => !selectedItems.has(n.id)));
            } else {
                setQuestions(prev => prev.filter(q => !selectedItems.has(q.id)));
            }

            setSelectedItems(new Set());
            setIsSelectionMode(false);
            setConfirmBulkDelete({ open: false, type: null, count: 0 });
            toast.success(`Deleted ${itemsToDelete.length} ${isNotes ? 'note(s)' : 'question(s)'}`, { id: loadingToast });
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete some items', { id: loadingToast });
        }
    };

    const handleDownloadSyllabus = async () => {
        setIsDownloadingSyllabus(true);
        const loadingToast = toast.loading('Generating Syllabus PDF...');

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const margin = 18;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const contentWidth = pageWidth - margin * 2;

            let y = margin;

            // ── Cover / document title ──
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            const titleText = sanitizeForPDF(subject?.name || 'Syllabus');
            doc.text(titleText, margin, y);
            y += 10;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 120);
            doc.text(`Syllabus  ·  ${new Date().toLocaleDateString()}`, margin, y);
            doc.setTextColor(0, 0, 0);
            y += 3;

            // Thick decorative line under cover
            doc.setDrawColor(80, 80, 200);
            doc.setLineWidth(1.2);
            doc.line(margin, y, margin + contentWidth, y);
            doc.setLineWidth(0.3);
            y += 12;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Topics', margin, y);
            y += 8;

            // Render topics recursively
            let currentNumbering = [];
            const renderTopic = (topic, depth) => {
                if (depth > 0) {
                    currentNumbering[depth - 1] = (currentNumbering[depth - 1] || 0) + 1;
                    currentNumbering = currentNumbering.slice(0, depth);
                }

                const sizes = { 0: 12, 1: 11, 2: 10, 3: 10 };
                const fs = sizes[depth] || 10;

                doc.setFont('helvetica', depth === 0 ? 'bold' : 'normal');
                doc.setFontSize(fs);

                const indent = margin + (depth * 6);

                let prefix = '';
                if (depth > 0) {
                    prefix = currentNumbering.join('.') + '. ';
                }

                if (y + 6 > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }

                doc.text(sanitizeForPDF(prefix + topic.name), indent, y);
                y += 6;

                if (topic.children && topic.children.length > 0) {
                    // Reset numbering for children
                    if (currentNumbering.length <= depth) {
                        currentNumbering.push(0);
                    } else {
                        currentNumbering[depth] = 0;
                    }

                    topic.children.forEach(child => renderTopic(child, depth + 1));
                }
            };

            if (topics && topics.length > 0) {
                topics.forEach(topic => {
                    currentNumbering = []; // Reset sub-topic numbering per main topic
                    renderTopic(topic, 0);
                    y += 4; // Add some spacing between main topics
                });
            } else {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(10);
                doc.text('No topics added to syllabus yet.', margin, y);
            }

            // ── Page numbers ──
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 170);
                doc.text(
                    `${sanitizeForPDF(subject?.name || 'Syllabus')}  ·  Page ${p} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' }
                );
                doc.setTextColor(0, 0, 0);
            }

            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const fileName = `${subject?.name || 'Subject'}_Syllabus_${timestamp}.pdf`.replace(/\s+/g, '_');
            doc.save(fileName);

            toast.success('Syllabus PDF generated successfully!', { id: loadingToast, duration: 4000 });
        } catch (error) {
            console.error('Syllabus PDF Export Error:', error);
            toast.error(`Failed to generate Syllabus PDF: ${error.message || String(error)}`, {
                id: loadingToast,
                duration: 6000
            });
        } finally {
            setIsDownloadingSyllabus(false);
        }
    };

    // ─── Markdown → PDF renderer (marked + jspdf-autotable) ────────────────

    // LaTeX math cleanup (for display in plain-text PDF)
    const stripLatexMath = (str) => {
        if (!str) return '';
        return str
            // Remove delimiters but keep content for simple math/currency
            .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
            .replace(/\$([^$\n]+)\$/g, '$1')
            .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
            .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
            .replace(/\\rightarrow/g, '->')
            .replace(/\\leftarrow/g, '<-')
            .replace(/\\leftrightarrow/g, '<->')
            .replace(/\\neq/g, '!=')
            .replace(/\\leq/g, '<=')
            .replace(/\\geq/g, '>=')
            .replace(/\\land/g, '∧')
            .replace(/\\lor/g, '∨')
            .replace(/\\neg/g, '¬')
            .replace(/\\exists/g, '∃')
            .replace(/\\forall/g, '∀')
            .replace(/\\in\b/g, '∈')
            .replace(/\\notin/g, '∉')
            .replace(/\\subset/g, '⊂')
            .replace(/\\infty/g, '∞')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\theta/g, 'θ')
            .replace(/\\pi\b/g, 'π')
            .replace(/\\sigma/g, 'σ')
            .replace(/\\lambda/g, 'λ')
            .replace(/\\mu/g, 'μ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\omega/g, 'ω')
            .replace(/\\cdot/g, '·')
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷')
            .replace(/\\pm/g, '±')
            .replace(/\\approx/g, '≈')
            .replace(/\\equiv/g, '≡')
            .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)')
            .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
            .replace(/  +/g, ' ')
            .trim();
    };

    // Flatten a marked inline token tree into styled segments [{text, bold, italic, code}]
    const flattenInlineTokens = (tokens) => {
        if (!tokens) return [];
        const segs = [];
        for (const t of tokens) {
            if (t.type === 'text' || t.type === 'escape') {
                const raw = stripLatexMath(t.text || t.raw || '');
                if (raw) segs.push({ text: raw, bold: false, italic: false, code: false });
            } else if (t.type === 'strong') {
                for (const s of flattenInlineTokens(t.tokens)) segs.push({ ...s, bold: true });
            } else if (t.type === 'em') {
                for (const s of flattenInlineTokens(t.tokens)) segs.push({ ...s, italic: true });
            } else if (t.type === 'codespan') {
                segs.push({ text: t.text || '', bold: false, italic: false, code: true });
            } else if (t.type === 'link') {
                // Show link text only, not the URL
                for (const s of flattenInlineTokens(t.tokens)) segs.push(s);
            } else if (t.type === 'image') {
                // skip images in text flow
            } else if (t.type === 'br') {
                segs.push({ text: ' ', bold: false, italic: false, code: false });
            } else if (t.raw) {
                const raw = stripLatexMath(t.raw);
                if (raw) segs.push({ text: raw, bold: false, italic: false, code: false });
            }
        }
        return segs;
    };

    // Plain text from inline tokens (for headings, table cells, etc.)
    const inlineToPlain = (tokens) =>
        flattenInlineTokens(tokens || []).map(s => s.text).join('');

    // Flatten a marked list item's tokens — handles nested lists too
    const flattenListItems = (items, indent = 0) => {
        const result = [];
        for (const item of items) {
            result.push({
                segments: flattenInlineTokens(item.tokens?.[0]?.tokens || item.tokens || []),
                indent,
                ordered: false, // set by caller
                num: 0,
            });
            // Nested list
            for (const sub of (item.tokens || [])) {
                if (sub.type === 'list') {
                    const nested = flattenListItems(sub.items, indent + 1);
                    result.push(...nested);
                }
            }
        }
        return result;
    };

    // Convert complex unicode (like boxes, arrows) to standard ASCII for jsPDF (WinAnsi fallback)
    const sanitizeForPDF = (text) => {
        if (!text) return '';

        // Manually replace specific symbols that `unidecode` fails to map correctly (returns '[?]')
        let processed = text
            .replace(/[\u20B9\u20A8\u20B4]/g, '!!RUPEE!!')
            .replace(/\u2212/g, '!!MINUS!!'); // Mathematical minus

        // Unidecode natively handles quotes, ellipses, en/em dashes, multiply/divide, etc.
        let sanitized = unidecode(processed);

        // Replace marker back with ASCII-safe Rupee representation
        // Also map Math Minus to an en-dash (\u2013). WinAnsi perfectly supports en-dashes,
        // and it visually preserves the longer minus sign without unidecode crushing it to a tiny hyphen.
        return sanitized
            .replace(/!!RUPEE!!/g, 'Rs. ')
            .replace(/!!MINUS!!/g, '\u2013');
    };

    // Use marked.lexer() to parse markdown into a block token array,
    // then normalise to a simpler format our renderer understands.
    const tokenizeMarkdown = (raw) => {
        if (!raw) return [];
        raw = sanitizeForPDF(raw);
        let blockTokens;
        try {
            blockTokens = marked.lexer(raw);
        } catch {
            return [{ type: 'paragraph', segments: [{ text: raw, bold: false, italic: false, code: false }] }];
        }

        const tokens = [];

        const walk = (list) => {
            for (const t of list) {
                if (t.type === 'heading') {
                    tokens.push({ type: 'heading', level: t.depth, text: inlineToPlain(t.tokens) });

                } else if (t.type === 'paragraph') {
                    const segs = flattenInlineTokens(t.tokens || []);
                    if (segs.length > 0) tokens.push({ type: 'paragraph', segments: segs });

                } else if (t.type === 'list') {
                    const items = flattenListItems(t.items);
                    tokens.push({
                        type: t.ordered ? 'ol' : 'ul',
                        items: items.map((it, idx) => ({
                            ...it,
                            ordered: t.ordered,
                            num: idx + 1,
                        })),
                    });

                } else if (t.type === 'table') {
                    const header = (t.header || []).map(h => inlineToPlain(h.tokens));
                    const rows = (t.rows || []).map(row =>
                        row.map(cell => inlineToPlain(cell.tokens))
                    );
                    tokens.push({ type: 'table', header, rows });

                } else if (t.type === 'code') {
                    tokens.push({ type: 'code', lang: t.lang || '', content: t.text || '' });

                } else if (t.type === 'blockquote') {
                    // Flatten blockquote to paragraph segments
                    const inner = [];
                    for (const bt of (t.tokens || [])) {
                        if (bt.type === 'paragraph') inner.push(...flattenInlineTokens(bt.tokens || []));
                    }
                    if (inner.length > 0) tokens.push({ type: 'blockquote', segments: inner });

                } else if (t.type === 'hr') {
                    tokens.push({ type: 'hr' });

                } else if (t.type === 'space') {
                    // intentionally ignored
                }
            }
        };

        walk(blockTokens);
        return tokens;
    };

    // Render normalised tokens to a jsPDF document.
    // INVARIANT: y = TOP of the next block at all times.
    const renderTokensToPDF = (doc, tokens, startY, margin, contentWidth, pageHeight) => {
        let y = startY; // y = TOP of next block
        const PT_TO_MM = 0.352778; // 1 pt → mm

        const ensureSpace = (needed) => {
            if (y + needed > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };

        // Render inline-styled segments on one text line.
        // `baseline` is the jsPDF text y coordinate (font baseline, not top).
        const renderInlineLine = (segments, x, baseline, fontSize) => {
            let curX = x;
            doc.setFontSize(fontSize);
            for (const seg of segments) {
                const style = seg.bold && seg.italic ? 'bolditalic' : seg.bold ? 'bold' : seg.italic ? 'italic' : 'normal';
                doc.setFont(seg.code ? 'courier' : 'helvetica', style);
                doc.setFontSize(fontSize);
                doc.text(seg.text, curX, baseline);
                curX += doc.getTextWidth(seg.text);
            }
        };

        // Word-wrap inline segments to fit within maxWidth mm.
        const wrapInlineSegments = (segments, maxWidth, fontSize) => {
            const lines = [[]];
            let lineWidth = 0;
            doc.setFontSize(fontSize);
            for (const seg of segments) {
                const style = seg.bold && seg.italic ? 'bolditalic' : seg.bold ? 'bold' : seg.italic ? 'italic' : 'normal';
                doc.setFont(seg.code ? 'courier' : 'helvetica', style);
                doc.setFontSize(fontSize);
                const words = seg.text.split(' ');
                for (let wi = 0; wi < words.length; wi++) {
                    const word = wi < words.length - 1 ? words[wi] + ' ' : words[wi];
                    const wordW = doc.getTextWidth(word);
                    if (lineWidth + wordW > maxWidth && lineWidth > 0) {
                        lines.push([]);
                        lineWidth = 0;
                    }
                    lines[lines.length - 1].push({ ...seg, text: word });
                    lineWidth += wordW;
                }
            }
            return lines;
        };

        for (const token of tokens) {
            if (token.type === 'heading') {
                const sizes = { 1: 18, 2: 15, 3: 13, 4: 12, 5: 11, 6: 10 };
                const fs = sizes[token.level] || 12;
                const fsMm = fs * PT_TO_MM;
                const lineH = fsMm + 3;   // line slot height
                const topPad = token.level <= 2 ? 6 : 3;
                const botPad = token.level <= 2 ? 4 : 2;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(fs);
                const wrapped = doc.splitTextToSize(token.text, contentWidth);
                ensureSpace(topPad + wrapped.length * lineH + botPad);
                y += topPad;
                for (const wline of wrapped) {
                    ensureSpace(lineH);
                    const baseline = y + lineH * 0.72; // baseline inside slot
                    doc.text(wline, margin, baseline);
                    if (token.level <= 2) {
                        const lineW = Math.min(doc.getTextWidth(wline), contentWidth);
                        doc.setDrawColor(180, 180, 180);
                        doc.setLineWidth(0.3);
                        doc.line(margin, y + lineH - 0.5, margin + lineW, y + lineH - 0.5);
                    }
                    y += lineH;
                }
                y += botPad;

            } else if (token.type === 'paragraph') {
                const fs = 10.5;
                const lineH = fs * PT_TO_MM + 2.5;
                const wrappedLines = wrapInlineSegments(token.segments, contentWidth, fs);
                for (const wline of wrappedLines) {
                    ensureSpace(lineH);
                    renderInlineLine(wline, margin, y + lineH * 0.76, fs);
                    y += lineH;
                }
                y += 3;

            } else if (token.type === 'ul' || token.type === 'ol') {
                const fs = 10.5;
                const lineH = fs * PT_TO_MM + 2.5;
                for (const item of token.items) {
                    const xIndent = margin + item.indent * 7;
                    const label = token.type === 'ol' ? `${item.num}.` : (item.indent === 0 ? '\u2022' : '\u25E6');
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(fs);
                    const labelW = doc.getTextWidth(label);
                    const textX = xIndent + labelW + 1.5;
                    const availW = margin + contentWidth - textX;
                    const wrappedLines = wrapInlineSegments(item.segments, availW, fs);
                    ensureSpace(wrappedLines.length * lineH + 0.5);
                    doc.text(label, xIndent, y + lineH * 0.76);
                    for (let li = 0; li < wrappedLines.length; li++) {
                        ensureSpace(lineH);
                        renderInlineLine(wrappedLines[li], textX, y + lineH * 0.76, fs);
                        y += lineH;
                    }
                }
                y += 2;

            } else if (token.type === 'blockquote') {
                // y = TOP of the blockquote block
                const fs = 10;
                const lineH = fs * PT_TO_MM + 2.5;
                const quoteX = margin + 5.5;
                const quoteW = contentWidth - 5.5;
                const wrappedLines = wrapInlineSegments(token.segments, quoteW, fs);
                const blockH = wrappedLines.length * lineH + 2;
                ensureSpace(blockH + 3);
                // Left accent bar: from y (top) to y+blockH (bottom)
                doc.setDrawColor(150, 150, 200);
                doc.setLineWidth(1.2);
                doc.line(margin + 0.6, y, margin + 0.6, y + blockH);
                doc.setTextColor(80, 80, 110);
                for (const wline of wrappedLines) {
                    ensureSpace(lineH);
                    renderInlineLine(wline, quoteX, y + lineH * 0.76, fs);
                    y += lineH;
                }
                doc.setTextColor(0, 0, 0);
                y += 4;

            } else if (token.type === 'code') {
                // y = TOP of the code block
                const fs = 9;
                const lineH = fs * PT_TO_MM + 2;
                const codeLines = token.content.split('\n');
                doc.setFont('courier', 'normal');
                doc.setFontSize(fs);
                // Pre-calculate total wrapped line count for block height
                let totalLines = 0;
                for (const cl of codeLines) {
                    totalLines += doc.splitTextToSize(cl || ' ', contentWidth - 6).length;
                }
                const blockH = totalLines * lineH + 5;
                ensureSpace(blockH + 2);
                // Draw background rect from y (top of block) downward
                doc.setFillColor(240, 240, 245);
                doc.setDrawColor(200, 200, 210);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, y, contentWidth, blockH, 2, 2, 'FD');
                doc.setTextColor(40, 40, 80);
                y += 2.5; // inner top padding before text starts
                for (const cl of codeLines) {
                    const wlines = doc.splitTextToSize(cl || ' ', contentWidth - 6);
                    for (const wl of wlines) {
                        ensureSpace(lineH);
                        doc.text(wl, margin + 3, y + lineH * 0.76);
                        y += lineH;
                    }
                }
                doc.setTextColor(0, 0, 0);
                y += 4;

            } else if (token.type === 'table') {
                // Use jspdf-autotable for perfect table layout with auto column widths
                const { header, rows } = token;
                if ((!header || !header.length) && (!rows || !rows.length)) continue;

                autoTable(doc, {
                    startY: y,
                    margin: { left: margin, right: margin },
                    head: header && header.length > 0 ? [header] : undefined,
                    body: rows || [],
                    styles: {
                        font: 'helvetica',
                        fontSize: 9.5,
                        cellPadding: 2,
                        overflow: 'linebreak',
                        lineColor: [195, 195, 215],
                        lineWidth: 0.2,
                    },
                    headStyles: {
                        fillColor: [225, 225, 245],
                        textColor: [30, 30, 100],
                        fontStyle: 'bold',
                        lineColor: [140, 140, 200],
                        lineWidth: 0.4,
                    },
                    alternateRowStyles: {
                        fillColor: [248, 248, 252],
                    },
                    bodyStyles: {
                        textColor: [40, 40, 40],
                    },
                    tableLineColor: [155, 155, 195],
                    tableLineWidth: 0.5,
                    didDrawPage: () => {
                        // keep y in sync if autotable spills to a new page
                    },
                });

                // Move y past the table that autoTable just drew
                y = doc.lastAutoTable.finalY + 5;

            } else if (token.type === 'hr') {
                ensureSpace(6);
                y += 2;
                doc.setDrawColor(180, 180, 190);
                doc.setLineWidth(0.4);
                doc.line(margin, y, margin + contentWidth, y);
                y += 4;
            }
        }

        return y;
    };

    const handleDownloadSelected = async () => {
        if (selectedItems.size === 0) return;
        const loadingToast = toast.loading('Generating PDF...');

        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const margin = 18;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const contentWidth = pageWidth - margin * 2;

            let y = margin;

            // ── Cover / document title ──
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            const titleText = sanitizeForPDF(subject?.name || 'Export');
            doc.text(titleText, margin, y);
            y += 10;

            const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 120);
            doc.text(`${tabLabel} Export  ·  ${new Date().toLocaleDateString()}`, margin, y);
            doc.setTextColor(0, 0, 0);
            y += 3;

            // Thick decorative line under cover
            doc.setDrawColor(80, 80, 200);
            doc.setLineWidth(1.2);
            doc.line(margin, y, margin + contentWidth, y);
            doc.setLineWidth(0.3);
            y += 8;

            const itemIds = Array.from(selectedItems);
            let items = [];
            if (activeTab === 'notes') {
                const updatedNotes = await ensureNotesContent(itemIds);
                items = itemIds.map(iid => updatedNotes.find(n => n.id === iid)).filter(Boolean);
            } else {
                items = itemIds.map(iid => questions.find(q => q.id === iid)).filter(Boolean);
            }

            const printedSourceIds = new Set();

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                const itemType = activeTab === 'notes' ? 'Note' : 'Question';
                const itemTitle = activeTab === 'notes' && item.title
                    ? sanitizeForPDF(`${itemType} ${i + 1}: ${item.title}`)
                    : `${itemType} ${i + 1}`;

                // ── Source image (if any) ──
                const imgId = item.id;
                const sourceImgId = item.source_image_id || item.linked_question_id || item.linked_note_id;

                let shouldPrintImage = false;
                if (sourceImgId) {
                    if (!printedSourceIds.has(sourceImgId)) {
                        shouldPrintImage = true;
                        printedSourceIds.add(sourceImgId);
                    }
                } else if (activeTab === 'notes' || item.type === 'image') {
                    shouldPrintImage = true;
                }

                if (shouldPrintImage) {
                    let imgData = fetchedImages[imgId] || fetchedImages[sourceImgId];
                    if (!imgData) {
                        try {
                            const res = activeTab === 'notes'
                                ? await notesApi.getImage(id, imgId)
                                : await questionsApi.getImage(id, imgId);
                            if (res?.content) {
                                imgData = res.content;
                                fetchedImages[sourceImgId || imgId] = res.content;
                            }
                        } catch { /* no image */ }
                    }
                    if (imgData) {
                        try {
                            const imgProps = doc.getImageProperties(imgData);
                            const pxToMm = 0.264583;
                            const aspectRatio = imgProps.width / imgProps.height;
                            const maxW = contentWidth * 0.75;
                            let fw = Math.min(imgProps.width * pxToMm, maxW);
                            let fh = fw / aspectRatio;
                            if (fh > pageHeight - margin * 2.5) {
                                fh = pageHeight - margin * 2.5;
                                fw = fh * aspectRatio;
                            }
                            const xOff = margin + (contentWidth - fw) / 2;
                            if (y + fh > pageHeight - margin) { doc.addPage(); y = margin; }
                            let fmt = 'PNG';
                            if (imgData.startsWith('data:image/')) {
                                const m = imgData.match(/data:image\/([a-zA-Z]+);/);
                                if (m?.[1]) {
                                    fmt = m[1].toUpperCase();
                                    if (fmt === 'JPG') fmt = 'JPEG';
                                    if (fmt === 'SVG+XML') fmt = 'SVG';
                                }
                            }
                            doc.addImage(imgData, fmt, xOff, y, fw, fh);
                            y += fh + 8;
                        } catch (e) { console.warn('Image skip:', e); }
                    }
                }

                // ── Item title heading ──
                const badgeH = 9; // total height of badge box in mm
                if (y + badgeH + 2 > pageHeight - margin) { doc.addPage(); y = margin; }
                doc.setFillColor(245, 245, 255);
                doc.setDrawColor(160, 160, 210);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, y, contentWidth, badgeH, 1.5, 1.5, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 120);
                doc.text(itemTitle, margin + 3, y + badgeH * 0.72);
                doc.setTextColor(0, 0, 0);
                y += badgeH + 2;

                // ── Markdown content ──
                const rawContent = item.content || '';
                const tokens = tokenizeMarkdown(rawContent);
                y = renderTokensToPDF(doc, tokens, y, margin, contentWidth, pageHeight);

                // ── Divider between items ──
                if (i < items.length - 1) {
                    if (y + 12 > pageHeight - margin) {
                        doc.addPage();
                        y = margin;
                    } else {
                        y += 4;
                        doc.setDrawColor(200, 200, 215);
                        doc.setLineWidth(0.5);
                        doc.line(margin, y, margin + contentWidth, y);
                        y += 8;
                    }
                }
            }

            // ── Page numbers ──
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 170);
                doc.text(
                    `${sanitizeForPDF(subject?.name || 'Export')}  ·  ${tabLabel}  ·  Page ${p} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' }
                );
                doc.setTextColor(0, 0, 0);
            }

            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const fileName = `${subject?.name || 'Export'}_${activeTab}_${timestamp}.pdf`.replace(/\s+/g, '_');
            doc.save(fileName);

            setIsSelectionMode(false);
            setSelectedItems(new Set());
            toast.success('PDF generated successfully!', { id: loadingToast, duration: 4000 });

        } catch (error) {
            console.error('PDF Export Error:', error);
            toast.error(`Failed to generate PDF: ${error.message || String(error)}`, {
                id: loadingToast,
                duration: 6000
            });
        }
    };



    const handleDownloadWordSelected = async () => {
        if (selectedItems.size === 0) return;
        const loadingToast = toast.loading('Generating Word document...');

        try {
            const itemIds = Array.from(selectedItems);

            if (activeTab === 'library') {
                const zip = new JSZip();
                const usedNames = new Map();

                selectedItems.forEach(id => {
                    const f = files.find(file => file.id === id);
                    if (f && f.data) {
                        let baseName = f.file_name || 'file';
                        let ext = '';
                        const lastDot = baseName.lastIndexOf('.');
                        if (lastDot !== -1) {
                            ext = baseName.substring(lastDot);
                            baseName = baseName.substring(0, lastDot);
                        } else {
                            const typeMap = { 'image': '.jpg', 'pdf': '.pdf', 'doc': '.docx', 'xlsx': '.xlsx' };
                            ext = typeMap[f.file_type] || '';
                        }

                        let finalName = `${baseName}${ext}`;
                        if (usedNames.has(finalName)) {
                            const count = usedNames.get(finalName) + 1;
                            usedNames.set(finalName, count);
                            finalName = `${baseName}_${count}${ext}`;
                        } else {
                            usedNames.set(finalName, 1);
                        }

                        const base64Content = f.data.split(',')[1];
                        zip.file(finalName, base64Content, { base64: true });
                    }
                });

                const content = await zip.generateAsync({ type: 'blob' });
                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
                const zipFileName = `${subject?.name || 'Library'}_Export_${timestamp}.zip`.replace(/\s+/g, '_');
                saveAs(content, zipFileName);

                setIsSelectionMode(false);
                setSelectedItems(new Set());
                toast.success('Library items exported as Zip!', { id: loadingToast });
                return;
            }

            let items = [];
            if (activeTab === 'notes') {
                const updatedNotes = await ensureNotesContent(itemIds);
                items = itemIds.map(iid => updatedNotes.find(n => n.id === iid)).filter(Boolean);
            } else {
                items = itemIds.map(iid => questions.find(q => q.id === iid)).filter(Boolean);
            }

            const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
            // We will parse the raw Markdown to plain paragraphs and headings, as DOCX JS builder does not consume raw HTML directly
            // For a lightweight reliable converter without bringing in an entire HTML parse tree:

            const docChildren = [
                new Paragraph({
                    text: `${sanitizeForPDF(subject?.name || 'Export')} - ${tabLabel} Export`,
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: `Generated on ${new Date().toLocaleDateString()}`,
                    style: "wellSpaced"
                }),
                new Paragraph({ text: "" }), // Spacing
            ];

            const printedSourceIds = new Set();

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemType = activeTab === 'notes' ? 'Note' : 'Question';
                const itemTitle = activeTab === 'notes' && item.title
                    ? sanitizeForPDF(`${itemType} ${i + 1}: ${item.title}`)
                    : `${itemType} ${i + 1}`;

                docChildren.push(
                    new Paragraph({
                        text: itemTitle,
                        heading: HeadingLevel.HEADING_2,
                    })
                );

                // Try fetching / parsing the image to pass as ArrayBuffer to docx
                const imgId = item.id;
                const sourceImgId = item.source_image_id || item.linked_question_id || item.linked_note_id;
                let shouldPrintImage = false;

                if (sourceImgId) {
                    if (!printedSourceIds.has(sourceImgId)) {
                        shouldPrintImage = true;
                        printedSourceIds.add(sourceImgId);
                    }
                } else if (activeTab === 'notes' || item.type === 'image') {
                    shouldPrintImage = true;
                }

                if (shouldPrintImage) {
                    let imgData = fetchedImages[imgId] || fetchedImages[sourceImgId];
                    if (!imgData) {
                        try {
                            const res = activeTab === 'notes'
                                ? await notesApi.getImage(id, imgId)
                                : await questionsApi.getImage(id, imgId);
                            if (res?.content) {
                                imgData = res.content;
                                fetchedImages[sourceImgId || imgId] = res.content;
                            }
                        } catch { /* no image */ }
                    }
                    if (imgData) {
                        try {
                            // Extract Base64 cleanly for docx parser
                            const base64Data = imgData.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                            const uint8Array = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));

                            docChildren.push(
                                new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: uint8Array,
                                            transformation: {
                                                width: 500,
                                                height: 300,
                                            },
                                        }),
                                    ],
                                })
                            );
                        } catch (e) {
                            console.warn("Could not parse image buffer for Docx", e);
                        }
                    }
                }

                // ── Markdown content ──
                const rawContent = item.content || '';
                const tokens = tokenizeMarkdown(rawContent);

                for (const token of tokens) {
                    if (token.type === 'heading') {
                        const headingMap = {
                            1: HeadingLevel.HEADING_1,
                            2: HeadingLevel.HEADING_2,
                            3: HeadingLevel.HEADING_3,
                            4: HeadingLevel.HEADING_4,
                            5: HeadingLevel.HEADING_5,
                            6: HeadingLevel.HEADING_6,
                        };
                        docChildren.push(new Paragraph({
                            text: token.text,
                            heading: headingMap[token.level] || HeadingLevel.HEADING_6,
                            spacing: { before: 240, after: 120 }
                        }));
                    } else if (token.type === 'paragraph' || token.type === 'blockquote') {
                        if (!token.segments || token.segments.length === 0) continue;
                        docChildren.push(new Paragraph({
                            children: token.segments.map(seg => new TextRun({
                                text: seg.text || "",
                                bold: seg.bold,
                                italics: seg.italic,
                                font: seg.code ? "Courier" : undefined,
                            })),
                            spacing: { before: 120, after: 120 },
                            indent: token.type === 'blockquote' ? { left: 720 } : undefined
                        }));
                    } else if (token.type === 'ul' || token.type === 'ol') {
                        for (const li of token.items) {
                            const prefix = token.type === 'ol' ? `${li.num}. ` : '• ';
                            docChildren.push(new Paragraph({
                                indent: { left: (li.indent + 1) * 720, hanging: 360 },
                                children: [
                                    new TextRun({ text: prefix }),
                                    ...(li.segments || []).map(seg => new TextRun({
                                        text: seg.text || "",
                                        bold: seg.bold,
                                        italics: seg.italic,
                                        font: seg.code ? "Courier" : undefined,
                                    }))
                                ],
                                spacing: { before: 60, after: 60 }
                            }));
                        }
                    } else if (token.type === 'code') {
                        const lines = (token.content || '').split('\n');
                        for (const line of lines) {
                            docChildren.push(new Paragraph({
                                children: [new TextRun({ text: line, font: "Courier" })],
                                spacing: { before: 0, after: 0 },
                                indent: { left: 360 }
                            }));
                        }
                        docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));
                    } else if (token.type === 'table') {
                        const allRows = [];
                        if (token.header && token.header.length > 0) allRows.push(token.header);
                        if (token.rows && token.rows.length > 0) allRows.push(...token.rows);

                        if (allRows.length > 0) {
                            docChildren.push(new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: allRows.map(row =>
                                    new TableRow({
                                        children: row.map(cell =>
                                            new TableCell({
                                                children: [new Paragraph({ text: cell || "" })],
                                            })
                                        )
                                    })
                                )
                            }));
                            docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));
                        }
                    } else if (token.type === 'hr') {
                        docChildren.push(new Paragraph({
                            text: "--------------------------------------------------",
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 120, after: 120 }
                        }));
                    }
                }

                docChildren.push(new Paragraph({ text: "", spacing: { after: 240 } })); // Spacing between items
            }

            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: docChildren,
                    },
                ],
            });

            const blob = await Packer.toBlob(doc);
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            const fileName = `${subject?.name || 'Export'}_${activeTab}_${timestamp}.docx`.replace(/\s+/g, '_');
            saveAs(blob, fileName);

            setIsSelectionMode(false);
            setSelectedItems(new Set());
            toast.success('Word document generated successfully!', { id: loadingToast, duration: 4000 });

        } catch (error) {
            console.error('Word Export Error:', error);
            toast.error(`Failed to generate Word document: ${error.message || String(error)}`, {
                id: loadingToast,
                duration: 6000
            });
        }
    };

    const handleDownloadMarkdownSelected = async () => {
        if (selectedItems.size === 0) return;
        const loadingToast = toast.loading('Generating Markdown...');

        try {
            const itemIds = Array.from(selectedItems);

            if (activeTab === 'notes') {
                await ensureNotesContent(itemIds);
            }

            if (activeTab === 'library') {
                const zip = new JSZip();
                const usedNames = new Map();

                selectedItems.forEach(id => {
                    const f = files.find(file => file.id === id);
                    if (f && f.data) {
                        let baseName = f.file_name || 'file';
                        let ext = '';
                        const lastDot = baseName.lastIndexOf('.');
                        if (lastDot !== -1) {
                            ext = baseName.substring(lastDot);
                            baseName = baseName.substring(0, lastDot);
                        } else {
                            const typeMap = { 'image': '.jpg', 'pdf': '.pdf', 'doc': '.docx', 'xlsx': '.xlsx' };
                            ext = typeMap[f.file_type] || '';
                        }

                        let finalName = `${baseName}${ext}`;
                        if (usedNames.has(finalName)) {
                            const count = usedNames.get(finalName) + 1;
                            usedNames.set(finalName, count);
                            finalName = `${baseName}_${count}${ext}`;
                        } else {
                            usedNames.set(finalName, 1);
                        }

                        const base64Content = f.data.split(',')[1];
                        zip.file(finalName, base64Content, { base64: true });
                    }
                });

                const content = await zip.generateAsync({ type: 'blob' });
                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
                const zipFileName = `${subject?.name || 'Library'}_Export_${timestamp}.zip`.replace(/\s+/g, '_');
                saveAs(content, zipFileName);

                setIsSelectionMode(false);
                setSelectedItems(new Set());
                toast.success('Library items exported as Zip!', { id: loadingToast });
                return;
            }

            let items = [];
            if (activeTab === 'notes') {
                const updatedNotes = await ensureNotesContent(itemIds);
                items = itemIds.map(iid => updatedNotes.find(n => n.id === iid)).filter(Boolean);
            } else {
                items = itemIds.map(iid => questions.find(q => q.id === iid)).filter(Boolean);
            }

            const itemType = activeTab === 'notes' ? 'Note' : 'Question';

            if (items.length === 1) {
                // Download single MD file
                const item = items[0];
                const content = item.content || '';
                const title = item.title ? sanitizeForPDF(item.title) : `${itemType}`;
                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
                const fileName = `${title}_${timestamp}.md`.replace(/\s+/g, '_');
                saveAs(blob, fileName);
            } else {
                // Download Zip of MD files
                const zip = new JSZip();
                const folderName = `${subject?.name || 'Export'}_${activeTab}`;
                const folder = zip.folder(folderName);

                items.forEach((item, index) => {
                    const content = item.content || '';
                    const title = item.title ? sanitizeForPDF(item.title) : `${itemType}_${index + 1}`;
                    folder.file(`${title}.md`.replace(/\s+/g, '_'), content);
                });

                const content = await zip.generateAsync({ type: 'blob' });
                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
                saveAs(content, `${folderName}_${timestamp}.zip`.replace(/\s+/g, '_'));
            }

            setIsSelectionMode(false);
            setSelectedItems(new Set());
            toast.success('Markdown generated successfully!', { id: loadingToast, duration: 4000 });

        } catch (error) {
            console.error('Markdown Export Error:', error);
            toast.error(`Failed to generate Markdown: ${error.message || String(error)}`, {
                id: loadingToast,
                duration: 6000
            });
        }
    };

    useEffect(() => {
        if (filePage === 0) return; // handled by initial load
        const loadMore = async () => {
            setLoadingMoreFiles(true);
            try {
                const res = await filesApi.listBySubject(id, FILE_LIMIT, filePage * FILE_LIMIT);
                const newFiles = res.images || res.files || [];
                setHasMoreFiles(newFiles.length === FILE_LIMIT);
                setFiles(prev => [...prev, ...newFiles]);
            } catch {
                toast.error('Failed to load more library items');
            } finally {
                setLoadingMoreFiles(false);
            }
        };
        loadMore();
    }, [id, filePage]);

    useEffect(() => {
        if (notePage === 0) return;
        const loadMore = async () => {
            setLoadingMoreNotes(true);
            try {
                const res = await notesApi.list(id, NOTE_LIMIT, notePage * NOTE_LIMIT);
                const newNotes = res.notes || [];
                setHasMoreNotes(newNotes.length === NOTE_LIMIT);
                setNotes(prev => [...prev, ...newNotes]);
            } catch {
                toast.error('Failed to load more notes');
            } finally {
                setLoadingMoreNotes(false);
            }
        };
        loadMore();
    }, [id, notePage]);

    const fetchTabData = async (tab) => {
        if (loadedTabs.has(tab) || !id) return;
        setTabLoading(true);
        try {
            switch (tab) {
                case 'topics':
                    await loadTopics(id);
                    break;
                case 'sessions': {
                    const sesRes = await sessionsApi.list(id);
                    setSessions(sesRes.sessions);
                    break;
                }
                case 'questions': {
                    // Proactively fetch notes and solutions when questions tab is clicked to ensure icons/badges are accurate
                    const [qsRes, nRes, solRes] = await Promise.all([
                        questionsApi.list(id),
                        notesApi.list(id, NOTE_LIMIT, 0).catch(() => ({ notes: [] })),
                        solutionsApi.list(id).catch(() => ({ solutions: [] }))
                    ]);
                    setQuestions(qsRes.questions || []);
                    setNotes(nRes.notes || []);
                    setSolutions(solRes.solutions || []);
                    setHasMoreNotes((nRes.notes || []).length === NOTE_LIMIT);
                    setNotePage(0);
                    // Mark notes and solutions as loaded so their tabs don't refetch
                    setLoadedTabs(prev => new Set(prev).add('notes').add('solutions'));
                    break;
                }
                case 'notes': {
                    const notesRes = await notesApi.list(id, NOTE_LIMIT, 0);
                    const initialNotes = notesRes.notes || [];
                    setNotes(initialNotes);
                    setHasMoreNotes(initialNotes.length === NOTE_LIMIT);
                    setNotePage(0);
                    break;
                }
                case 'solutions': {
                    const solutionsRes = await solutionsApi.list(id);
                    setSolutions(solutionsRes.solutions || []);
                    break;
                }
                case 'revision': {
                    const revRes = await revisionApi.listSessions(id).catch(() => ({ sessions: [] }));
                    setRevisionSessions(revRes.sessions || []);
                    break;
                }
                case 'library': {
                    // We only load page 0 initially when the tab is clicked
                    const fileRes = await filesApi.listBySubject(id, FILE_LIMIT, 0);
                    const initialFiles = fileRes.images || fileRes.files || [];
                    setFiles(initialFiles);
                    setHasMoreFiles(initialFiles.length === FILE_LIMIT);
                    setFilePage(0);
                    break;
                }
                default:
                    break;
            }
            setLoadedTabs(prev => new Set(prev).add(tab));
        } catch (error) {
            console.error(`Failed to load ${tab}:`, error);
            toast.error(`Failed to load ${tab} data`);
        } finally {
            setTabLoading(false);
        }
    };

    // Trigger data fetch when tab changes
    useEffect(() => {
        if (!loading && id) {
            fetchTabData(activeTab);
        }
    }, [activeTab, id, loading]);

    // Update tab-related counts in overview when items are added/deleted manually, but only if that tab has been loaded
    // Removed redundant stats refresh effect as it's handled in loadBaseData

    const fileObserver = React.useRef();
    const lastFileElementRef = React.useCallback(node => {
        if (loading || loadingMoreFiles) return;
        if (fileObserver.current) fileObserver.current.disconnect();
        fileObserver.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreFiles) {
                setFilePage(prevPage => prevPage + 1);
            }
        }, {
            rootMargin: '400px',
            threshold: 0
        });
        if (node) fileObserver.current.observe(node);
    }, [loading, loadingMoreFiles, hasMoreFiles]);

    useEffect(() => {
        const loadBaseData = async () => {
            if (!id) return;

            try {
                // 1. Ensure subjects are loaded
                if (!subjectsLoaded) {
                    await loadSubjects();
                }

                // 2. Ensure specific subject analytics are available
                // We rely on the global context to have fetched these during loadSubjects
                // but if for some reason they are missing, we could fetch here.
                // However, the user explicitly wants to avoid this call.
                if (!statsMap[id] && subjectsLoaded) {
                    await refreshStats([id]);
                }
            } catch (error) {
                console.error("Failed to load subject base data:", error);
                // If it really fails, we might want to navigate away, 
                // but let's just stop loading for now.
            } finally {
                // Derived state handles loading
            }
        };

        loadBaseData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, subjectsLoaded]); // Only rerun if ID changes or we need to trigger initial load


    // Handle deep linking from query params
    useEffect(() => {
        if (loading) return;

        const tab = searchParams.get('tab');
        const contentId = searchParams.get('id') || searchParams.get('questionId') || searchParams.get('noteId');

        if (tab) {
            setActiveTab(tab);

            // If it's a question or note, we might need a small delay to ensure the tab's content is rendered
            if (contentId) {
                setTimeout(() => {
                    if (tab === 'questions') {
                        navigateToQuestion(contentId);
                    } else if (tab === 'notes') {
                        const note = notes.find(n => n.id.toString() === contentId.toString());
                        if (note) {
                            setViewingNote(note);
                            if (note.source_image_id) handleFetchNoteImage(note.id);
                        }
                    }
                }, 300);
            }
        }
    }, [loading, searchParams, notes]);

    // handleTopicDeleted removed as it was unused and causing lint errors

    const handleQuestionAdded = (newQuestions) => {
        // newQuestions is always an array (may contain 1 or more)
        setQuestions((prev) => [...newQuestions, ...prev]);
        refreshStats([id]);
    };

    const handleQuestionUpdated = (updatedQ) => {
        setQuestions(prev => prev.map(q => q.id === updatedQ.id ? { ...q, ...updatedQ } : q));
        refreshStats([id]);
    };

    const handleNoteAdded = (newNote) => {
        setNotes((prev) => [newNote, ...prev]);
        refreshStats([id]);
    };

    const handleNoteUpdated = (updatedNote) => {
        setNotes((prev) => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
        if (viewingNote?.id === updatedNote.id) setViewingNote(updatedNote);
        refreshStats([id]);
    };

    const handleSolutionAdded = (newSolution) => {
        setSolutions((prev) => [newSolution, ...prev]);
    };

    const handleRevisionToggle = async (sessionId, topicId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

        // Optimistic update
        setRevisionSessions(prev => prev.map(session => {
            if (session.id !== sessionId) return session;
            return {
                ...session,
                topics: session.topics.map(t =>
                    t.topicId === topicId ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : null } : t
                )
            };
        }));
        setTogglingTopicId(topicId);

        try {
            const updated = await revisionApi.toggleStatus(id, sessionId, topicId, newStatus);
            refreshStats([id]);
            setRevisionSessions(prev => prev.map(session => {
                if (session.id !== sessionId) return session;
                return {
                    ...session,
                    topics: session.topics.map(t =>
                        t.topicId === topicId ? { ...t, ...updated } : t
                    )
                };
            }));
        } catch {
            // Revert on failure
            setRevisionSessions(prev => prev.map(session => {
                if (session.id !== sessionId) return session;
                return {
                    ...session,
                    topics: session.topics.map(t =>
                        t.topicId === topicId ? { ...t, status: currentStatus } : t
                    )
                };
            }));
            toast.error('Failed to update revision status');
        } finally {
            setTogglingTopicId(null);
        }
    };

    const handleCreateRevisionSession = async (data) => {
        try {
            await revisionApi.createSession(id, data.name, data.topicIds);
            const loadRes = await revisionApi.listSessions(id); // Reload to get full nested data
            setRevisionSessions(loadRes.sessions || []);
            setShowCreateRevisionSession(false);
            toast.success('Revision session created');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create revision session');
        }
    };

    const handleEditRevisionSession = async (data) => {
        try {
            await revisionApi.updateSession(id, data.sessionId, data.name, data.topicIds);
            const loadRes = await revisionApi.listSessions(id); // Reload to get full nested data
            setRevisionSessions(loadRes.sessions || []);
            setEditingRevisionSession(null);
            toast.success('Revision session updated');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update revision session');
        }
    };

    const handleDeleteRevisionSession = async (sessionId) => {
        try {
            await revisionApi.deleteSession(id, sessionId);
            setRevisionSessions(prev => prev.filter(s => s.id !== sessionId));
            setConfirmDeleteRevisionSession({ open: false, sessionId: null });
            toast.success('Revision session deleted');
            refreshStats([id]);
        } catch {
            toast.error('Failed to delete session');
        }
    };

    const handleFileAdded = (newRes) => {
        if (newRes.note) {
            setNotes(prev => [newRes.note, ...prev]);
        } else if (newRes.questions) {
            // newRes.questions is an array
            setQuestions(prev => [...newRes.questions, ...prev]);
        }

        // Refetch files to be thorough
        const refreshFiles = async () => {
            setFilePage(0);
            const res = await filesApi.listBySubject(id, FILE_LIMIT, 0);
            const newFiles = res.images || res.files || [];
            setFiles(newFiles);
            setHasMoreFiles(newFiles.length === FILE_LIMIT);
        };
        refreshFiles();
        refreshStats([id]);
    };

    const handleSessionCreated = (newSession) => {
        setSessions((prev) => [newSession, ...prev]);
        refreshStats([id]);
        navigate(`/subjects/${id}/sessions/${newSession.id}`);
    };

    // ─── Session CRUD handlers ───────────────────────────────
    const handleDeleteSession = async () => {
        const session = confirmDeleteSession.session;
        if (!session) return;
        const loadingToast = toast.loading(`Deleting "${session.title}"...`);
        try {
            await sessionsApi.delete(id, session.id);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
            toast.success(`Session deleted`, { id: loadingToast });
            refreshStats([id]);
        } catch {
            toast.error('Failed to delete session', { id: loadingToast });
        }
    };



    // ─── Question Handlers ───────────────────────────────

    const handleFetchImage = async (questionId) => {
        // Check if we already have the image (or a sibling's image) cached
        const question = questions.find(q => q.id === questionId);
        const sourceId = question?.source_image_id || questionId;

        // If the source image is already cached, reuse it
        if (fetchedImages[sourceId]) {
            setFetchedImages((prev) => ({ ...prev, [questionId]: prev[sourceId] }));
            return;
        }

        try {
            setFetchingImageId(questionId);
            const res = await questionsApi.getImage(id, questionId);
            if (res.content) {
                // Cache the image under both the question's own ID and source ID
                setFetchedImages((prev) => ({
                    ...prev,
                    [questionId]: res.content,
                    [sourceId]: res.content,
                }));
            }
        } catch {
            toast.error('Failed to load image');
        } finally {
            setFetchingImageId(null);
        }
    };

    const handleHideImage = (questionId) => {
        const question = questions.find(q => q.id === questionId);
        const sourceId = question?.source_image_id || questionId;
        setFetchedImages(prev => {
            const next = { ...prev };
            delete next[questionId];
            delete next[sourceId];
            return next;
        });
    };

    const handleOpenNote = async (note, addToStack = false) => {
        if (isSelectionMode && !addToStack) {
            const next = new Set(selectedItems);
            if (next.has(note.id)) next.delete(note.id);
            else next.add(note.id);
            setSelectedItems(next);
            return;
        }

        let fullNote = note;
        if (!note.content) {
            setFetchingNoteContentId(note.id);
            try {
                const res = await notesApi.get(id, note.id);
                fullNote = res.notes?.[0] || note;

                // Sync with current notes state
                if (fullNote.content) {
                    setNotes(prev => prev.map(n => n.id === fullNote.id ? { ...n, content: fullNote.content } : n));
                }
            } catch (error) {
                console.error('Failed to load note content:', error);
                toast.error('Failed to load note content');
                return;
            } finally {
                setFetchingNoteContentId(null);
            }
        }

        if (addToStack && viewingNote) {
            setNoteStack(prev => [...prev, viewingNote]);
        }
        setViewingNote(fullNote);
        if (fullNote.source_image_id) handleFetchNoteImage(fullNote.id);
    };

    const handleEditNote = async (note) => {
        let fullNote = note;
        if (!note.content) {
            setFetchingNoteContentId(note.id);
            try {
                const res = await notesApi.get(id, note.id);
                fullNote = res.notes?.[0] || note;
                if (fullNote.content) {
                    setNotes(prev => prev.map(n => n.id === fullNote.id ? { ...n, content: fullNote.content } : n));
                }
            } catch (error) {
                console.error('Failed to load note content for editing:', error);
                toast.error('Failed to load note for editing');
                return;
            } finally {
                setFetchingNoteContentId(null);
            }
        }
        setEditingNote(fullNote);
    };

    const handleFetchNoteImage = async (noteId) => {
        if (fetchedImages[`note-${noteId}`]) return;
        try {
            setFetchingImageId(`note-${noteId}`);
            const res = await notesApi.getImage(id, noteId);
            if (res.content) {
                setFetchedImages((prev) => ({ ...prev, [`note-${noteId}`]: res.content }));
            }
        } catch {
            toast.error('Failed to load note image');
        } finally {
            setFetchingImageId(null);
        }
    };

    const handleFetchSolutionImage = async (solutionId) => {
        if (fetchedImages[`solution-${solutionId}`]) return;
        try {
            setFetchingImageId(`solution-${solutionId}`);
            const res = await solutionsApi.getImage(id, solutionId);
            if (res.content) {
                setFetchedImages((prev) => ({ ...prev, [`solution-${solutionId}`]: res.content }));
            }
        } catch {
            toast.error('Failed to load solution image');
        } finally {
            setFetchingImageId(null);
        }
    };

    const handleOpenEditSolution = (solution) => {
        setEditingSolution(solution);
        setShowEditSolutionModal(true);
    };

    const handleEditSolutionUpdated = (updated) => {
        setSolutions(prev => prev.map(s => s.id === updated.id ? updated : s));

        // Clear old image cache for this solution so it reloads if viewing/next time
        setFetchedImages(prev => {
            const next = { ...prev };
            delete next[`solution-${updated.id}`];
            return next;
        });

        if (viewingSolution && viewingSolution.id === updated.id) {
            setViewingSolution(updated);
            if (updated.source_image_id) {
                handleFetchSolutionImage(updated.id);
            }
        }
    };
    const handlePrevFile = () => {
        if (!viewingNote || !viewingNote.id?.toString().startsWith('img-')) return;
        const currentId = viewingNote.source_image_id;
        const idx = files.findIndex(img => img.id === currentId);
        if (idx > 0) {
            const img = files[idx - 1];
            const fakeNote = {
                id: `img-${img.id}`,
                title: `${img.file_type ? img.file_type.toUpperCase() : 'Image'} File`,
                content: 'Original captured material.',
                source_image_id: img.id,
                created_at: img.created_at,
                file_type: img.file_type
            };
            setFetchedImages(prev => ({ ...prev, [`note-img-${img.id}`]: img.data }));
            setViewingNote(fakeNote);
        }
    };

    const handleNextFile = () => {
        if (!viewingNote || !viewingNote.id?.toString().startsWith('img-')) return;
        const currentId = viewingNote.source_image_id;
        const idx = files.findIndex(img => img.id === currentId);
        if (idx < files.length - 1) {
            const img = files[idx + 1];
            const fakeNote = {
                id: `img-${img.id}`,
                title: `${img.file_type ? img.file_type.toUpperCase() : 'Image'} File`,
                content: 'Original captured material.',
                source_image_id: img.id,
                created_at: img.created_at,
                file_type: img.file_type
            };
            setFetchedImages(prev => ({ ...prev, [`note-img-${img.id}`]: img.data }));
            setViewingNote(fakeNote);
        }
    };

    const handlePrevNote = () => {
        if (!viewingNote || viewingNote.id?.toString().startsWith('img-')) return;

        const filtered = filteredNotes;

        const idx = filtered.findIndex(n => n.id === viewingNote.id);
        if (idx > 0) {
            handleOpenNote(filtered[idx - 1]);
        }
    };

    const handleNextNote = () => {
        if (!viewingNote || viewingNote.id?.toString().startsWith('img-')) return;

        const filtered = filteredNotes;

        const idx = filtered.findIndex(n => n.id === viewingNote.id);
        if (idx < filtered.length - 1) {
            handleOpenNote(filtered[idx + 1]);
        }
    };

    const handleDeleteQuestion = async () => {
        const questionId = confirmDeleteQuestion.questionId;
        if (!questionId) return;
        const loadingToast = toast.loading('Deleting question...');
        try {
            await questionsApi.delete(id, questionId);
            setQuestions((prev) => prev.filter((q) => q.id !== questionId));
            toast.success('Question deleted', { id: loadingToast });
            refreshStats([id]);
        } catch {
            toast.error('Failed to delete', { id: loadingToast });
        } finally {
            setConfirmDeleteQuestion({ open: false, questionId: null });
        }
    };

    const handleDeleteNote = async () => {
        const item = confirmDeleteNote.note;
        if (!item) return;
        const isSolution = item.isSolution;
        const api = isSolution ? solutionsApi : notesApi;
        const typeLabel = isSolution ? 'solution' : 'note';

        const loadingToast = toast.loading(`Deleting ${typeLabel}...`);
        try {
            await api.delete(id, item.id);
            if (isSolution) {
                setSolutions((prev) => prev.filter((s) => s.id !== item.id));
            } else {
                setNotes((prev) => prev.filter((n) => n.id !== item.id));
            }
            toast.success(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} deleted`, { id: loadingToast });
            refreshStats([id]);
        } catch {
            toast.error(`Failed to delete ${typeLabel}`, { id: loadingToast });
        } finally {
            setConfirmDeleteNote({ open: false, note: null });
        }
    };

    const handleRenameFile = async () => {
        if (!renameFileData.file || !renameFileData.name.trim()) return;
        const loadingToast = toast.loading('Renaming file...');
        try {
            await filesApi.update(id, renameFileData.file.id, { fileName: renameFileData.name.trim() });
            setFiles(prev => prev.map(f => f.id === renameFileData.file.id ? { ...f, file_name: renameFileData.name.trim() } : f));
            toast.success("File renamed", { id: loadingToast });
            setRenameFileData({ open: false, file: null, name: '' });
        } catch (error) {
            toast.error(error.message || "Failed to rename file", { id: loadingToast });
        }
    };

    const navigateToQuestion = (questionId) => {
        setActiveTab('questions');
        setTimeout(() => {
            let el = document.getElementById(`question-${questionId}`);
            if (!el) {
                // If the element is hidden inside a collapsed group, expand it
                const group = groupedQuestions.find(g => g.questions.some(q => q.id === questionId));
                if (group && !expandedGroups[group.rootId]) {
                    setExpandedGroups(prev => ({ ...prev, [group.rootId]: true }));
                }
            }

            setTimeout(() => {
                el = document.getElementById(`question-${questionId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Premium highlight effect
                    el.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    el.style.ring = '4px';
                    el.style.ringColor = 'rgb(139, 92, 246)'; // indigo-500
                    el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-slate-900', 'scale-[1.01]', 'z-50');

                    setTimeout(() => {
                        el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-slate-900', 'scale-[1.01]', 'z-50');
                    }, 2500);
                }
            }, 100);
        }, 100);
    };

    const handleGenerateAINote = async (questionId) => {
        // If an AI note exists for this question, just navigate to it
        const existingNote = notes.find(n => n.question_id == questionId && n.title?.startsWith('AI Note'));
        if (existingNote) {
            setActiveTab('notes');
            // Slight delay for the tab to switch before highlighting
            setTimeout(() => {
                setHighlightedNoteId(existingNote.id);
                const el = document.getElementById(`note-${existingNote.id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);

            setTimeout(() => {
                setHighlightedNoteId(null);
            }, 3500);
            return;
        }

        setGeneratingAINoteId(questionId);
        const loadingToast = toast.loading('Generating AI note...');
        try {
            const res = await notesApi.create(id, { questionId });
            setNotes((prev) => [res.note, ...prev]);
            toast.success('AI Note generated!', { id: loadingToast });
            refreshStats([id]);
        } catch (error) {
            toast.error(error.message || 'Failed to generate AI note', { id: loadingToast });
        } finally {
            setGeneratingAINoteId(null);
        }
    };

    // Group questions by source
    const groupedQuestions = React.useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = !query ? questions : questions.filter(q => {
            let qTags = q.tags || [];
            if (typeof qTags === 'string') {
                try { qTags = JSON.parse(qTags); } catch { qTags = []; }
            }
            if (!Array.isArray(qTags)) qTags = [];

            return qTags.some(tag => tag.toLowerCase().includes(query)) ||
                q.content?.toLowerCase().includes(query);
        });

        const groups = {};
        filtered.forEach(q => {
            const rootId = q.parent_id || q.source_image_id || q.id;
            if (!groups[rootId]) groups[rootId] = [];

            // Pre-parse tags here so we don't do it in the render loop
            let parsedTags = q.tags || [];
            if (typeof parsedTags === 'string') {
                try { parsedTags = JSON.parse(parsedTags); } catch { parsedTags = []; }
            }
            if (!Array.isArray(parsedTags)) parsedTags = [];

            groups[rootId].push({ ...q, parsedTags });
        });

        Object.keys(groups).forEach(rootId => {
            groups[rootId].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });

        return Object.entries(groups).map(([rootId, qs]) => {
            const parent = qs.find(q => q.content === null);
            const actionableQs = qs.filter(q => q.content !== null);
            const isGroup = actionableQs.length > 1 || (parent && parent.formatted_content?.questions?.length > 1);

            return {
                rootId,
                parent,
                questions: actionableQs,
                isGroup,
                newestAt: new Date(Math.max(...qs.map(q => new Date(q.created_at))))
            };
        }).sort((a, b) => b.newestAt - a.newestAt);
    }, [questions, searchQuery]);

    const allNoteTags = useMemo(() => Array.from(new Set(notes.flatMap(n => {
        let t = Array.isArray(n.tags) ? n.tags : (n.parsedTags || []);
        if (t.length === 0 && typeof n.tags === 'string') {
            try { t = JSON.parse(n.tags); } catch { t = []; }
        }
        return Array.isArray(t) ? t : [];
    }))).sort(), [notes]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto animate-pulse">
                {/* Skeleton Header Navigation */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-24 h-9 bg-surface-2 rounded-lg border border-white/[0.06]" />
                </div>

                {/* Skeleton Subject Header */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="h-8 bg-surface-2 rounded-lg w-1/3 mb-3" />
                            <div className="h-4 bg-surface-2 rounded-lg w-2/3" />
                        </div>
                        <div className="w-32 h-10 bg-surface-2 rounded-lg md:mt-1" />
                    </div>
                </div>

                {/* Skeleton Gradient separator */}
                <div className="h-px bg-white/[0.08] mb-8" />

                {/* Skeleton Tabs Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex gap-1 p-1 bg-surface-2/50 rounded-xl border border-white/[0.06] w-fit">
                        <div className="w-32 h-10 bg-surface-3/50 rounded-lg" />
                        <div className="w-32 h-10 bg-surface-3/50 rounded-lg" />
                        <div className="w-32 h-10 bg-surface-3/50 rounded-lg" />
                    </div>
                    <div className="w-36 h-10 bg-surface-2 rounded-lg" />
                </div>

                {/* Skeleton Main Content Area */}
                <div className="flex flex-col gap-5">
                    <div className="h-8 bg-surface-2 rounded-lg w-24 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="h-48 bg-surface-2/40 rounded-2xl border border-white/[0.06]" />
                        <div className="h-48 bg-surface-2/40 rounded-2xl border border-white/[0.06]" />
                        <div className="h-48 bg-surface-2/40 rounded-2xl border border-white/[0.06]" />
                    </div>
                </div>
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6">
                    <X className="w-10 h-10 text-rose-500/70" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Subject not found</h2>
                <p className="text-slate-400 mb-8">The subject you're looking for doesn't exist or you don't have access.</p>
                <Link to="/subjects" className="btn-primary px-8 py-3 rounded-xl">Back to Subjects</Link>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto">
            {/* Confirm Delete Session */}
            <ConfirmDialog
                isOpen={confirmDeleteSession.open}
                title="Delete Session"
                message={`Are you sure you want to delete "${confirmDeleteSession.session?.title}" ? This will also remove all entries in this session.`}
                onConfirm={handleDeleteSession}
                onCancel={() => setConfirmDeleteSession({ open: false, session: null })}
            />

            {/* Confirm Delete Question */}
            <ConfirmDialog
                isOpen={confirmDeleteQuestion.open}
                title="Delete Question"
                message="Are you sure you want to delete this question? This action cannot be undone."
                onConfirm={handleDeleteQuestion}
                onCancel={() => setConfirmDeleteQuestion({ open: false, questionId: null })}
            />

            {/* Confirm Delete Note */}
            <ConfirmDialog
                isOpen={confirmDeleteNote.open}
                title={confirmDeleteNote.note?.isSolution ? "Delete Solution" : "Delete Note"}
                message={`Are you sure you want to delete "${confirmDeleteNote.note?.title}"? This action cannot be undone.`}
                onConfirm={handleDeleteNote}
                onCancel={() => setConfirmDeleteNote({ open: false, note: null })}
                danger
            />

            <ConfirmDialog
                isOpen={confirmBulkDelete.open}
                title={`Delete ${confirmBulkDelete.count} ${confirmBulkDelete.type === 'notes' ? 'Note(s)' : 'Question(s)'}`}
                message={`Are you sure you want to permanently delete these ${confirmBulkDelete.count} selected ${confirmBulkDelete.type}? This action cannot be undone.`}
                onConfirm={handleBulkDeleteConfirm}
                onCancel={() => setConfirmBulkDelete({ open: false, type: null, count: 0 })}
                confirmText={`Delete ${confirmBulkDelete.count} Items`}
                requireInput={true}
                expectedInput="CONFIRM"
            />

            {showTopicModal && (
                <ManageSyllabusModal
                    isOpen={true}
                    onClose={() => setShowTopicModal(false)}
                    subjectId={id}
                    topics={topics}
                />
            )}

            {showQuestionModal && (
                <AddQuestionModal
                    isOpen={true}
                    onClose={() => setShowQuestionModal(false)}
                    subjectId={id}
                    onQuestionAdded={handleQuestionAdded}
                    topics={topics}
                />
            )}

            {showFileModal && (
                <AddFileModal
                    isOpen={true}
                    onClose={() => setShowFileModal(false)}
                    subjectId={id}
                    onFileSaved={handleFileAdded}
                />
            )}

            {(showNoteModal || !!addToNoteData) && (
                <AddNoteModal
                    isOpen={true}
                    onClose={() => {
                        setShowNoteModal(false);
                        setSelectedQuestionIdForNote(null);
                        setAddToNoteData(null);
                    }}
                    subjectId={id}
                    onNoteAdded={(newNote) => {
                        handleNoteAdded(newNote);
                        // If this was a child note from "Add to Note", open it with back-nav
                        if (addToNoteData) {
                            if (viewingNote) {
                                setNoteStack(prev => [...prev, viewingNote]);
                            }
                            setViewingNote(newNote);
                            setAddToNoteData(null);
                        }
                    }}
                    questionId={selectedQuestionIdForNote}
                    initialTitle={addToNoteData ? `Note: ${addToNoteData.selectedText.substring(0, 60)}${addToNoteData.selectedText.length > 60 ? '...' : ''} ` : ''}
                    initialContent={addToNoteData ? `> ${addToNoteData.selectedText.replace(/\n/g, '\n> ')} \n\n` : ''}
                    parentNoteId={addToNoteData?.parentNoteId || null}
                />
            )}

            {showSessionModal && (
                <CreateSessionModal
                    isOpen={true}
                    onClose={() => setShowSessionModal(false)}
                    subjectId={id}
                    onSessionCreated={handleSessionCreated}
                />
            )}

            <EditSessionModal
                isOpen={!!editingSession}
                onClose={() => setEditingSession(null)}
                subjectId={id}
                session={editingSession}
                onSessionUpdated={(updated) => {
                    setSessions((prev) =>
                        prev.map((s) =>
                            s.id === updated.id
                                ? { ...s, title: updated.title, notes: updated.notes, sessionDate: updated.session_date }
                                : s
                        )
                    );
                }}
            />

            {(!!viewingNote && !editingNote) && (
                <ViewNoteModal
                    isOpen={true}
                    onClose={() => {
                        if (noteStack.length > 0) {
                            // Pop the parent note from the stack
                            const parentNote = noteStack[noteStack.length - 1];
                            setNoteStack(prev => prev.slice(0, -1));
                            setViewingNote(parentNote);
                        } else {
                            setViewingNote(null);
                        }
                    }}
                    note={viewingNote}
                    onNavigateToQuestion={navigateToQuestion}
                    sourceImage={viewingNote ? fetchedImages[`note-${viewingNote.id}`] : null}
                    isFetchingImage={fetchingImageId === (viewingNote ? `note-${viewingNote.id}` : null)}
                    onEdit={setEditingNote}
                    onPrev={viewingNote?.id?.toString().startsWith('img-') ? handlePrevFile : handlePrevNote}
                    onNext={viewingNote?.id?.toString().startsWith('img-') ? handleNextFile : handleNextNote}
                    onAddToNote={(selectedText) => {
                        setAddToNoteData({
                            selectedText,
                            parentNoteId: viewingNote?.id || null,
                        });
                    }}
                    parentNoteTitle={noteStack.length > 0 ? noteStack[noteStack.length - 1]?.title : null}
                    childNotes={viewingNote ? notes.filter(n => n.parent_note_id === viewingNote.id) : []}
                    onOpenChildNote={(childNote) => {
                        handleOpenNote(childNote, true);
                    }}
                    onUpdateNoteContent={async (noteId, newContent) => {
                        try {
                            const existingNote = notes.find(n => n.id === noteId) || viewingNote;
                            await notesApi.update(id, noteId, { title: existingNote?.title || '', content: newContent });
                            // Update local state
                            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: newContent } : n));
                            if (viewingNote?.id === noteId) {
                                setViewingNote(prev => ({ ...prev, content: newContent }));
                            }
                            toast.success('Note updated');
                        } catch {
                            toast.error('Failed to update note');
                        }
                    }}
                    onAIEditSection={async (selectedText, instruction, onChunk) => {
                        try {
                            const fullContent = viewingNote?.content || '';
                            const selectionIndex = fullContent.indexOf(selectedText);
                            const BUFFER = 500;
                            let contentBefore = '';
                            let contentAfter = '';
                            if (selectionIndex >= 0) {
                                const beforeStart = Math.max(0, selectionIndex - BUFFER);
                                contentBefore = fullContent.substring(beforeStart, selectionIndex);
                                const afterEnd = Math.min(fullContent.length, selectionIndex + selectedText.length + BUFFER);
                                contentAfter = fullContent.substring(selectionIndex + selectedText.length, afterEnd);
                            }

                            // Use streaming API
                            await aiApi.editSectionStream({
                                selectedText,
                                instruction,
                                noteTitle: viewingNote?.title || '',
                                contentBefore,
                                contentAfter,
                            }, onChunk);
                        } catch (error) {
                            toast.error('AI edit failed');
                            throw error;
                        }
                    }}
                    allNotes={filteredNotes}
                    onNavigateToNote={(n) => {
                        handleOpenNote(n);
                    }}
                />
            )}

            <EditNoteModal
                isOpen={!!editingNote}
                onClose={() => setEditingNote(null)}
                subjectId={id}
                note={editingNote}
                onNoteUpdated={handleNoteUpdated}
            />


            <EditQuestionModal
                isOpen={showEditQuestionModal}
                onClose={() => {
                    setShowEditQuestionModal(false);
                    setEditingQuestion(null);
                }}
                subjectId={id}
                question={editingQuestion}
                topics={topics}
                onQuestionUpdated={handleQuestionUpdated}
            />

            <div className="relative mb-6">
                {/* Background ambient effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-24 bg-primary/5 blur-[70px] -z-10 rounded-full opacity-60" />

                <div className="flex items-center justify-between gap-6 py-2 px-1">
                    {/* Left: Back */}
                    <div className="flex-1 flex justify-start">
                        <Link
                            to="/subjects"
                            className="flex items-center gap-2 text-[12.5px] font-bold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] pl-2.5 pr-4 py-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.1] group/back backdrop-blur-md whitespace-nowrap"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-0.5 transition-transform" />
                            <span>Back</span>
                        </Link>
                    </div>

                    {/* Center: Title (Maximum focus) */}
                    <div className="flex-[4] text-center min-w-0">
                        <h1 className="text-[28px] md:text-[38px] lg:text-[46px] font-heading font-black text-white tracking-tighter leading-none truncate drop-shadow-2xl selection:bg-primary/30 py-1">
                            {subject?.name}
                        </h1>
                    </div>

                    {/* Right: Analytics */}
                    <div className="flex-1 flex justify-end">
                        <Link
                            to={`/subjects/${id}/reports`}
                            className="flex items-center gap-2.5 text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-indigo-500/10 bg-indigo-500/5 text-indigo-400 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/30 group/anal shadow-lg shadow-indigo-500/5 backdrop-blur-sm whitespace-nowrap"
                        >
                            <BarChart3 className="w-3.5 h-3.5 text-indigo-400 group-hover/anal:scale-110 transition-transform" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Analytics</span>
                            <span className="sm:hidden">Insights</span>
                        </Link>
                    </div>
                </div>

                {/* Optional small description below to keep the row height minimal */}
                {subject?.description && (
                    <div className="max-w-2xl mx-auto mt-2 pb-1 text-center">
                        <p className="text-slate-400/80 text-[13px] md:text-[14px] font-medium leading-relaxed truncate px-4">
                            {subject.description}
                        </p>
                    </div>
                )}
            </div>





            {/* Controls (Sub-Nav + Action) — Glass background wrapper */}
            <div className="relative p-2 rounded-2xl bg-surface-2/80 border border-white/[0.04] mb-8 ring-1 ring-white/[0.02]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-50">
                    {/* Segmented Tabs */}
                    <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar max-w-full" >
                        {
                            ['topics', 'sessions', 'questions', 'notes', 'solutions', 'revision', 'library'].map((tab) => {
                                let count;
                                switch (tab) {
                                    case 'topics': count = overview?.totalTopics ?? topics.length; break;
                                    case 'sessions': count = overview?.totalSessions ?? sessions.length; break;
                                    case 'questions': count = overview?.availableQuestions ?? questions.length; break;
                                    case 'notes': count = overview?.totalNotes ?? notes.length; break;
                                    case 'solutions': count = overview?.totalSolutions ?? solutions.length; break;
                                    case 'library': count = overview?.total_files ?? overview?.totalFiles ?? files?.length ?? 0; break;
                                    case 'revision': count = overview?.totalRevisionSessions ?? revisionSessions.length; break;
                                }
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-[13px] font-bold capitalize transition-all duration-300 cursor-pointer whitespace-nowrap
                                            ${activeTab === tab
                                                ? 'bg-primary text-white shadow-[0_4px_16px_rgba(139,92,246,0.4)] scale-[1.02]'
                                                : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        {tab}

                                        <span className={`min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-black leading-none
                                            ${activeTab === tab
                                                ? 'bg-white/20 text-white'
                                                : 'bg-white/[0.06] text-slate-500'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })
                        }
                    </div >

                    {/* Action Bar — same row height as tabs */}
                    < div className="flex items-center gap-3" >
                        {activeTab === 'sessions' && (
                            <button
                                onClick={() => setShowSessionModal(true)}
                                className="bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>New Session</span>
                            </button>
                        )}

                        {
                            activeTab === 'questions' && (
                                <button
                                    onClick={() => setShowQuestionModal(true)}
                                    className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                >
                                    <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                    <span>Add Question</span>
                                </button>
                            )
                        }

                        {
                            activeTab === 'notes' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setNotesViewMode(notesViewMode === 'grid' ? 'list' : 'grid')}
                                        className="bg-white/[0.03] text-slate-400 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white p-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
                                        title={`Switch to ${notesViewMode === 'grid' ? 'List' : 'Grid'} View`}
                                    >
                                        {notesViewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => setShowNoteModal(true)}
                                        className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                    >
                                        <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                        <span>Add Note</span>
                                    </button>
                                </div>
                            )
                        }

                        {
                            activeTab === 'library' && (
                                <button
                                    onClick={() => setShowFileModal(true)}
                                    className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                >
                                    <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                    <span>Add File</span>
                                </button>
                            )
                        }

                        {
                            activeTab === 'topics' && (
                                <button
                                    onClick={() => setShowTopicModal(true)}
                                    className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                >
                                    <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                    <span>Manage Syllabus</span>
                                </button>
                            )
                        }

                        {
                            activeTab === 'revision' && (
                                <button
                                    onClick={() => setShowCreateRevisionSession(true)}
                                    className="bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                >
                                    <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                    <span>New Session</span>
                                </button>
                            )
                        }
                    </div >
                </div >
            </div >

            {/* Main Content Area */}
            {tabLoading && !loadedTabs.has(activeTab) ? (
                <div className="fade-in space-y-6">
                    <div className="h-12 w-full bg-white/[0.04] rounded-xl animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-48 bg-white/[0.04] rounded-2xl animate-pulse" />
                        ))}
                    </div>
                </div>
            ) : (
                <>

                    {activeTab === 'topics' && (
                        <div className="fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Syllabus</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={handleDownloadSyllabus}
                                        disabled={isDownloadingSyllabus}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Download Syllabus as PDF"
                                    >
                                        {isDownloadingSyllabus ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Download className="w-3.5 h-3.5" />
                                        )}
                                        <span>Export PDF</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTopicsDefaultExpanded(true);
                                            setTreeKey(prev => prev + 1);
                                        }}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-primary hover:bg-primary/10 border border-white/5 transition-all cursor-pointer uppercase tracking-wider"
                                        title="Expand all"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                        <span>Expand All</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setTopicsDefaultExpanded(false);
                                            setTreeKey(prev => prev + 1);
                                        }}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer uppercase tracking-wider"
                                        title="Collapse all"
                                    >
                                        <Minimize2 className="w-3.5 h-3.5" />
                                        <span>Collapse All</span>
                                    </button>
                                </div>
                            </div>
                            {topics.length === 0 ? (
                                <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5">
                                        <BookOpen className="w-10 h-10 text-indigo-500/70" />
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No topics yet</h3>
                                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                        Build your syllabus by adding topics and subtopics to organize your study material.
                                    </p>
                                    <button
                                        onClick={() => setShowTopicModal(true)}
                                        className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer font-semibold"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        <span>Manage Syllabus</span>
                                    </button>
                                </div>
                            ) : (
                                <TopicTree
                                    key={treeKey}
                                    topics={topics}
                                    subjectId={id}
                                    defaultExpanded={topicsDefaultExpanded}
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'sessions' && (
                        <div className="fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Study Sessions</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group flex-1 sm:min-w-[280px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={sessionSearchQuery}
                                            onChange={(e) => setSessionSearchQuery(e.target.value)}
                                            placeholder="Search sessions..."
                                            className="w-full bg-surface-2/50 border border-white/[0.1] rounded-xl py-2 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 focus:bg-surface-2 transition-all"
                                        />
                                        {sessionSearchQuery && (
                                            <button
                                                onClick={() => setSessionSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex bg-surface-2/50 p-1 rounded-xl border border-white/[0.06] shrink-0">
                                        <button
                                            onClick={() => setSessionsViewMode('grid')}
                                            className={`p-1.5 rounded-lg transition-all ${sessionsViewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                            title="Grid View"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setSessionsViewMode('list')}
                                            className={`p-1.5 rounded-lg transition-all ${sessionsViewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                            title="List View"
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>


                            {sessions.length === 0 ? (
                                <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5">
                                        <Activity className="w-10 h-10 text-violet-500/70" />
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No learning sessions</h3>
                                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                        You haven't recorded any sessions for this subject yet. Start a session to log your correct and incorrect topics.
                                    </p>
                                    <button
                                        onClick={() => setShowSessionModal(true)}
                                        className="bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer font-semibold"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        <span>Record First Session</span>
                                    </button>
                                </div>
                            ) : (
                                <div className={`grid gap-5 ${sessionsViewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                    {(() => {
                                        if (filteredSessions.length === 0 && sessions.length > 0) {
                                            return (
                                                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center glass-panel rounded-2xl border-dashed border-white/10">
                                                    <Search className="w-8 h-8 text-slate-600 mb-3" />
                                                    <p className="text-slate-400 font-medium">No sessions match your search</p>
                                                    <button onClick={() => setSessionSearchQuery('')} className="mt-2 text-indigo-400 text-sm hover:underline">Clear search</button>
                                                </div>
                                            );
                                        }

                                        return filteredSessions.map((s) => (
                                            <SessionCard
                                                key={s.id}
                                                session={s}
                                                subjectId={id}
                                                viewMode={sessionsViewMode}
                                                onDelete={(session) => setConfirmDeleteSession({ open: true, session })}
                                                onEdit={(session) => setEditingSession(session)}
                                            />

                                        ));
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div className="fade-in">
                            {/* Header for Questions */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Question Bank</h3>
                                </div>
                                {isSelectionMode ? (
                                    <div className="flex items-center h-[50px] bg-[#1a1a1e] border border-white/[0.12] rounded-2xl px-2 shadow-[0_12px_40px_rgba(0,0,0,0.8)] transition-all animate-in fade-in zoom-in-95 duration-300 w-full sm:w-auto relative z-[999]">
                                        <div className="flex items-center pl-3 pr-2 border-r border-white/[0.08] mr-2">
                                            <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-[12px] font-bold mr-2">
                                                {selectedItems.size}
                                            </div>
                                            <span className="text-[13px] text-slate-300 font-medium hidden sm:inline">selected</span>
                                        </div>

                                        <button
                                            onClick={handleSelectAll}
                                            className="text-[12px] font-medium text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                        >
                                            {selectedItems.size > 0 && selectedItems.size === groupedQuestions.flatMap(g => g.questions).length ? 'Clear' : 'Select All'}
                                        </button>

                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                                        <div className="flex items-center gap-1 relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                                                disabled={selectedItems.size === 0}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${showExportMenu ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="text-[12px] font-medium hidden md:inline">Export</span>
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showExportMenu && selectedItems.size > 0 && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute top-full right-0 mt-3 w-60 bg-[#1e1e22] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-3 z-[1000] backdrop-blur-2xl transition-all p-2 space-y-1 block"
                                                >
                                                    <div className="px-3 py-2 border-b border-white/5 mb-1.5 leading-none">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Select Export Format</span>
                                                    </div>
                                                    <button
                                                        onClick={() => { handleDownloadSelected(); setShowExportMenu(false); }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                            </div>
                                                            <span>PDF Document</span>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                    <button
                                                        onClick={() => { handleDownloadWordSelected(); setShowExportMenu(false); }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                                                <FileText className="w-4 h-4 text-emerald-400" />
                                                            </div>
                                                            <span>Word Document</span>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                    <button
                                                        onClick={() => { handleDownloadMarkdownSelected(); setShowExportMenu(false); }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                                                <FileText className="w-4 h-4 text-orange-400" />
                                                            </div>
                                                            <span>Markdown File</span>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setConfirmBulkDelete({ open: true, type: 'questions', count: selectedItems.size });
                                            }}
                                            disabled={selectedItems.size === 0}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="text-[12px] font-medium hidden md:inline">Delete</span>
                                        </button>

                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                                        <button
                                            onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); }}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                            title="Cancel Selection"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative group w-full sm:min-w-[300px] sm:w-auto">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search content or tags..."
                                            className="w-full sm:w-[300px] bg-surface-2/50 border border-white/[0.1] rounded-xl py-2 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 focus:bg-surface-2 transition-all"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-6 items-start">
                                {/* Form moved to Modal */}

                                {/* Questions List (Full Width) */}
                                <div className="w-full">
                                    {questions.length === 0 ? (
                                        <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                            <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 rotate-3">
                                                <ListChecks className="w-10 h-10 text-indigo-500/70" />
                                            </div>
                                            <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">Your question bank is empty</h3>
                                            <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                                Start adding questions from your books or notes. AI will automatically format them for better readability.
                                            </p>
                                            <button
                                                onClick={() => setShowQuestionModal(true)}
                                                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer font-semibold"
                                            >
                                                <PlusCircle className="w-4 h-4" />
                                                <span>Add Your First Question</span>
                                            </button>
                                        </div>
                                    ) : groupedQuestions.length === 0 ? (
                                        <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4 border border-white/5">
                                                <Search className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-1">No matching questions</h4>
                                            <p className="text-slate-500 text-sm">Try adjusting your search query or tags</p>
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
                                            >
                                                Clear Search
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-7">
                                            {groupedQuestions.map((group) => {
                                                const isExpanded = expandedGroups[group.rootId];
                                                const rootQ = group.questions[0] || group.parent;
                                                if (!rootQ) return null;

                                                if (!group.isGroup) {
                                                    const q = rootQ;
                                                    const existingAINote = notes.find(n => n.question_id === q.id && n.title?.startsWith('AI Note'));
                                                    return (
                                                        <div
                                                            key={q.id}
                                                            id={`question-${q.id}`}
                                                            className={`question-card group relative transition-all overflow-visible ${activeQuestionDropdown === q.id ? 'border-indigo-500/40 shadow-xl' : ''} ${isSelectionMode ? (selectedItems.has(q.id) ? 'ring-2 ring-indigo-500 cursor-pointer bg-indigo-500/5' : 'cursor-pointer hover:bg-white/[0.02]') : ''}`}
                                                            onClick={() => {
                                                                if (isSelectionMode) {
                                                                    const next = new Set(selectedItems);
                                                                    if (next.has(q.id)) next.delete(q.id);
                                                                    else next.add(q.id);
                                                                    setSelectedItems(next);
                                                                }
                                                            }}
                                                        >
                                                            {isSelectionMode && (
                                                                <div className="absolute top-4 right-4 z-20">
                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedItems.has(q.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 bg-surface-3/50'}`}>
                                                                        {selectedItems.has(q.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Card Header — question number + metadata */}
                                                            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                                                                <span className="text-[15px] font-heading font-bold text-primary tracking-tight">
                                                                    Q
                                                                </span>
                                                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-3/80 text-slate-300 rounded-md text-[12px] font-semibold border border-white/5">
                                                                    {q.type === 'image' ? <ImageIcon className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-emerald-400" />}
                                                                    {q.type === 'image' ? 'Image' : 'Text'}
                                                                </span>
                                                                <div className="flex items-center gap-1 ml-auto relative" ref={activeQuestionDropdown === q.id ? questionDropdownRef : null}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveQuestionDropdown(activeQuestionDropdown === q.id ? null : q.id);
                                                                        }}
                                                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeQuestionDropdown === q.id ? 'bg-white/10 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                                                        title="More Options"
                                                                    >
                                                                        <MoreVertical className="w-4.5 h-4.5" />
                                                                    </button>

                                                                    {activeQuestionDropdown === q.id && (
                                                                        <div
                                                                            className="absolute right-0 top-full mt-2 w-44 glass rounded-xl border border-white/10 shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setIsSelectionMode(true);
                                                                                    setSelectedItems(new Set([q.id]));
                                                                                    setActiveQuestionDropdown(null);
                                                                                }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                            >
                                                                                <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                                                                                <span>Select Question</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveQuestionDropdown(null);
                                                                                    setEditingQuestion(q);
                                                                                    setShowEditQuestionModal(true);
                                                                                }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                            >
                                                                                <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                                                                                <span>Edit Question</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveQuestionDropdown(null);
                                                                                    setSelectedQuestionIdForNote(q.id);
                                                                                    setShowNoteModal(true);
                                                                                }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                            >
                                                                                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                                                                <span>Manual Note</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveQuestionDropdown(null);
                                                                                    const existingRes = solutions.find(s => s.question_id === q.id);
                                                                                    if (existingRes) {
                                                                                        setViewingSolution(existingRes);
                                                                                        if (existingRes.source_image_id) handleFetchSolutionImage(existingRes.id);
                                                                                    } else {
                                                                                        setSelectedQuestionIdForSolution(q.id);
                                                                                        setShowSolutionModal(true);
                                                                                    }
                                                                                }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                            >
                                                                                <ListChecks className="w-3.5 h-3.5 text-blue-400" />
                                                                                <span>{solutions.some(s => s.question_id === q.id) ? "View Solution" : "Add Solution"}</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveQuestionDropdown(null);
                                                                                    handleGenerateAINote(q.id);
                                                                                }}
                                                                                disabled={generatingAINoteId === q.id}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                                                                            >
                                                                                {generatingAINoteId === q.id ? (
                                                                                    <div className="w-3.5 h-3.5 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                                ) : existingAINote ? (
                                                                                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                                                                                ) : (
                                                                                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                                                                                )}
                                                                                <span>{existingAINote ? "View AI Note" : "AI Note"}</span>
                                                                            </button>
                                                                            <div className="h-px bg-white/5 my-1" />
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveQuestionDropdown(null);
                                                                                    setConfirmDeleteQuestion({ open: true, questionId: q.id });
                                                                                }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                                                <span>Delete Question</span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Card Body — question content */}
                                                            <div className="prose prose-invert prose-lg max-w-none text-slate-200 text-[15px] leading-[1.7]">
                                                                {q.formatted_content && q.formatted_content.root ? (
                                                                    <RichTextRenderer content={q.formatted_content} />
                                                                ) : (
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                                        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                                                    >
                                                                        {preprocessMarkdown(q.content)}
                                                                    </ReactMarkdown>
                                                                )}
                                                            </div>

                                                            {/* Tags display */}
                                                            {q.parsedTags && q.parsedTags.length > 0 && (
                                                                <div className="mt-4 flex flex-wrap gap-2">
                                                                    {q.parsedTags.map((tag, idx) => (
                                                                        <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                            <Hash className="w-2.5 h-2.5" />
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {q.type === 'image' && (
                                                                <div className="mt-5 relative group/img-container w-fit">
                                                                    {fetchedImages[q.id] || fetchedImages[q.source_image_id] ? (
                                                                        <div className="relative">
                                                                            <div className="rounded-xl overflow-hidden border border-white/10 inline-block bg-black/40 group/img relative">
                                                                                <img
                                                                                    src={fetchedImages[q.id] || fetchedImages[q.source_image_id]}
                                                                                    alt="Original Question"
                                                                                    className="max-h-80 object-contain transition-all group-hover/img:opacity-50"
                                                                                />
                                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                                                                    <span className="bg-black/60 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-white/10">
                                                                                        Original Attachment
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => handleHideImage(q.id)}
                                                                                className="absolute -top-2 -right-2 p-1.5 bg-slate-800/90 text-slate-400 hover:text-white rounded-full border border-white/10 shadow-lg opacity-0 group-hover/img-container:opacity-100 transition-all cursor-pointer z-10"
                                                                                title="Hide Image"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleFetchImage(q.id)}
                                                                            disabled={fetchingImageId === q.id}
                                                                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold bg-surface-3/80 text-slate-300 hover:text-white hover:bg-surface-3 transition-all border border-white/5 shadow-sm disabled:opacity-50 cursor-pointer"
                                                                        >
                                                                            {fetchingImageId === q.id ? (
                                                                                <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                            ) : (
                                                                                <ImageIcon className="w-4 h-4 text-indigo-400" />
                                                                            )}
                                                                            <span>
                                                                                {fetchingImageId === q.id ? 'Loading...' : 'Show Source Image'}
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}


                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={group.rootId} className="flex flex-col gap-3">
                                                        {/* Group Header */}
                                                        <div
                                                            onClick={() => toggleGroup(group.rootId)}
                                                            className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-white/[0.06] cursor-pointer hover:bg-surface-3 transition-colors group/header"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                                    {rootQ.type === 'image' ? <ImageIcon className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-emerald-400" />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-3">
                                                                        <h4 className="text-[15px] font-heading font-bold text-white tracking-tight">
                                                                            {rootQ.type === 'image' ? 'Image' : 'Text'} Collection
                                                                        </h4>
                                                                        <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                                            {group.questions.length} Items
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[12px] text-slate-500 mt-0.5">
                                                                        Uploaded {new Date(group.newestAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg bg-white/[0.03] text-slate-500 group-hover/header:text-white transition-all ${isExpanded ? 'rotate-180' : ''}`}>
                                                                    <ChevronDown className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Group Content */}
                                                        {isExpanded && (
                                                            <div className="flex flex-col gap-5 pl-8 border-l-2 border-white/[0.06] mt-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {group.questions.map((q, qidx) => {
                                                                    const existingAINote = notes.find(n => n.question_id === q.id && n.title?.startsWith('AI Note'));
                                                                    return (
                                                                        <div
                                                                            key={q.id}
                                                                            id={`question-${q.id}`}
                                                                            className={`question-card group relative transition-all overflow-visible ${activeQuestionDropdown === q.id ? 'border-indigo-500/40 shadow-xl' : ''} ${isSelectionMode ? (selectedItems.has(q.id) ? 'ring-2 ring-indigo-500 cursor-pointer bg-indigo-500/5' : 'cursor-pointer hover:bg-white/[0.02]') : ''}`}
                                                                            onClick={() => {
                                                                                if (isSelectionMode) {
                                                                                    const next = new Set(selectedItems);
                                                                                    if (next.has(q.id)) next.delete(q.id);
                                                                                    else next.add(q.id);
                                                                                    setSelectedItems(next);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isSelectionMode && (
                                                                                <div className="absolute top-4 right-4 z-20">
                                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedItems.has(q.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 bg-surface-3/50'}`}>
                                                                                        {selectedItems.has(q.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {/* Card Header — question number + metadata */}
                                                                            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06]">
                                                                                <span className="text-[15px] font-heading font-bold text-primary tracking-tight">
                                                                                    #{qidx + 1}
                                                                                </span>
                                                                                <span className="text-[12px] text-slate-500 ml-auto font-medium">
                                                                                    {new Date(q.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                                </span>

                                                                                <div className="flex items-center gap-1 ml-2 relative" ref={activeQuestionDropdown === q.id ? questionDropdownRef : null}>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setActiveQuestionDropdown(activeQuestionDropdown === q.id ? null : q.id);
                                                                                        }}
                                                                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${activeQuestionDropdown === q.id ? 'bg-white/10 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100'}`}
                                                                                        title="More Options"
                                                                                    >
                                                                                        <MoreVertical className="w-4.5 h-4.5" />
                                                                                    </button>

                                                                                    {activeQuestionDropdown === q.id && (
                                                                                        <div
                                                                                            className="absolute right-0 top-full mt-2 w-44 glass rounded-xl border border-white/10 shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        >
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setIsSelectionMode(true);
                                                                                                    setSelectedItems(new Set([q.id]));
                                                                                                    setActiveQuestionDropdown(null);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                                            >
                                                                                                <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                                                                                                <span>Select Question</span>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveQuestionDropdown(null);
                                                                                                    setEditingQuestion(q);
                                                                                                    setShowEditQuestionModal(true);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                                            >
                                                                                                <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                                                                                                <span>Edit Question</span>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveQuestionDropdown(null);
                                                                                                    setSelectedQuestionIdForNote(q.id);
                                                                                                    setShowNoteModal(true);
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                                            >
                                                                                                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                                                                                <span>Manual Note</span>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveQuestionDropdown(null);
                                                                                                    const existingRes = solutions.find(s => s.question_id === q.id);
                                                                                                    if (existingRes) {
                                                                                                        setViewingSolution(existingRes);
                                                                                                        if (existingRes.source_image_id) handleFetchSolutionImage(existingRes.id);
                                                                                                    } else {
                                                                                                        setSelectedQuestionIdForSolution(q.id);
                                                                                                        setShowSolutionModal(true);
                                                                                                    }
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                                            >
                                                                                                <ListChecks className="w-3.5 h-3.5 text-blue-400" />
                                                                                                <span>{solutions.some(s => s.question_id === q.id) ? "View Solution" : "Add Solution"}</span>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveQuestionDropdown(null);
                                                                                                    handleGenerateAINote(q.id);
                                                                                                }}
                                                                                                disabled={generatingAINoteId === q.id}
                                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                                                                                            >
                                                                                                {generatingAINoteId === q.id ? (
                                                                                                    <div className="w-3.5 h-3.5 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                                                ) : existingAINote ? (
                                                                                                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                                                                                                ) : (
                                                                                                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                                                                                                )}
                                                                                                <span>{existingAINote ? "View AI Note" : "AI Note"}</span>
                                                                                            </button>
                                                                                            <div className="h-px bg-white/5 my-1" />
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveQuestionDropdown(null);
                                                                                                    setConfirmDeleteQuestion({ open: true, questionId: q.id });
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                                                                <span>Delete Question</span>
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Card Body — question content */}
                                                                            <div className="prose prose-invert prose-lg max-w-none text-slate-200 text-[15px] leading-[1.7]">
                                                                                {q.formatted_content && q.formatted_content.root ? (
                                                                                    <RichTextRenderer content={q.formatted_content} />
                                                                                ) : (
                                                                                    <ReactMarkdown
                                                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                                                        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                                                                    >
                                                                                        {preprocessMarkdown(q.content)}
                                                                                    </ReactMarkdown>
                                                                                )}
                                                                            </div>

                                                                            {/* Tags display */}
                                                                            {q.parsedTags && q.parsedTags.length > 0 && (
                                                                                <div className="mt-4 flex flex-wrap gap-2">
                                                                                    {q.parsedTags.map((tag, idx) => (
                                                                                        <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                                            <Hash className="w-2.5 h-2.5" />
                                                                                            {tag}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {q.type === 'image' && qidx === 0 && (
                                                                                <div className="mt-5 relative group/img-container w-fit">
                                                                                    {fetchedImages[q.id] || fetchedImages[q.source_image_id] ? (
                                                                                        <div className="relative">
                                                                                            <div className="rounded-xl overflow-hidden border border-white/10 inline-block bg-black/40 group/img relative">
                                                                                                <img
                                                                                                    src={fetchedImages[q.id] || fetchedImages[q.source_image_id]}
                                                                                                    alt="Original Question"
                                                                                                    className="max-h-80 object-contain transition-all group-hover/img:opacity-50"
                                                                                                />
                                                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                                                                                    <span className="bg-black/60 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-white/10">
                                                                                                        Source Image
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => handleHideImage(q.id)}
                                                                                                className="absolute -top-2 -right-2 p-1.5 bg-slate-800/90 text-slate-400 hover:text-white rounded-full border border-white/10 shadow-lg opacity-0 group-hover/img-container:opacity-100 transition-all cursor-pointer z-10"
                                                                                                title="Hide Image"
                                                                                            >
                                                                                                <X className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => handleFetchImage(q.id)}
                                                                                            disabled={fetchingImageId === q.id}
                                                                                            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold bg-surface-3/80 text-slate-300 hover:text-white hover:bg-surface-3 transition-all border border-white/5 shadow-sm disabled:opacity-50 cursor-pointer"
                                                                                        >
                                                                                            {fetchingImageId === q.id ? (
                                                                                                <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                                            ) : (
                                                                                                <ImageIcon className="w-4 h-4 text-indigo-400" />
                                                                                            )}
                                                                                            <span>
                                                                                                {fetchingImageId === q.id ? 'Loading...' : 'Show Shared Source Image'}
                                                                                            </span>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}


                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Notes</h3>
                                </div>
                                {isSelectionMode ? (
                                    <div className="flex items-center h-[50px] bg-[#1a1a1e] border border-white/[0.12] rounded-2xl px-2 shadow-[0_12px_40px_rgba(0,0,0,0.8)] transition-all animate-in fade-in zoom-in-95 duration-300 w-full sm:w-auto relative z-[999]">
                                        <div className="flex items-center pl-3 pr-2 border-r border-white/[0.08] mr-2">
                                            <div className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[12px] font-bold mr-2">
                                                {selectedItems.size}
                                            </div>
                                            <span className="text-[13px] text-slate-300 font-medium hidden sm:inline">selected</span>
                                        </div>

                                        <button
                                            onClick={handleSelectAll}
                                            className="text-[12px] font-medium text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                        >
                                            {selectedItems.size > 0 && selectedItems.size === filteredNotes.length ? 'Clear' : 'Select All'}
                                        </button>

                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                                        <div className="flex items-center gap-1 relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
                                                disabled={selectedItems.size === 0}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${showExportMenu ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="text-[12px] font-medium hidden md:inline">Export</span>
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showExportMenu && selectedItems.size > 0 && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute top-full right-0 mt-3 w-60 bg-[#1e1e22] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-3 z-[1000] backdrop-blur-2xl transition-all p-2 space-y-1 block"
                                                >
                                                    <div className="px-3 py-2 border-b border-white/5 mb-1.5 leading-none">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Select Export Format</span>
                                                    </div>
                                                    <button
                                                        onClick={() => { handleDownloadSelected(); setShowExportMenu(false); }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                            </div>
                                                            <span>PDF Document</span>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                    <button
                                                        onClick={() => { handleDownloadWordSelected(); setShowExportMenu(false); }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                                                <FileText className="w-4 h-4 text-emerald-400" />
                                                            </div>
                                                            <span>Word Document</span>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                    <button
                                                        onClick={() => { handleDownloadMarkdownSelected(); setShowExportMenu(false); }}
                                                        className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer group"
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                                                <FileText className="w-4 h-4 text-orange-400" />
                                                            </div>
                                                            <span>Markdown File</span>
                                                        </div>
                                                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                setConfirmBulkDelete({ open: true, type: 'notes', count: selectedItems.size });
                                                setShowExportMenu(false);
                                            }}
                                            disabled={selectedItems.size === 0}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="text-[12px] font-medium hidden md:inline">Delete</span>
                                        </button>

                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                                        <button
                                            onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); setShowExportMenu(false); }}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                            title="Cancel Selection"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center items-stretch gap-3 w-full sm:w-auto">
                                        <div className="relative group flex-1 sm:min-w-[280px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                            <input
                                                type="text"
                                                value={noteSearchQuery}
                                                onChange={(e) => setNoteSearchQuery(e.target.value)}
                                                placeholder="Search notes..."
                                                className="w-full bg-surface-2/50 border border-white/[0.1] rounded-xl py-2 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 focus:bg-surface-2 transition-all"
                                            />
                                            {noteSearchQuery && (
                                                <button
                                                    onClick={() => setNoteSearchQuery('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {allNoteTags.length > 0 && (
                                                <div className="flex-1">
                                                    <select
                                                        value={selectedNoteTag}
                                                        onChange={(e) => setSelectedNoteTag(e.target.value)}
                                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-200 rounded-xl px-4 py-2 text-[13px] focus:outline-none focus:border-indigo-500/50 focus:bg-surface-2 transition-all appearance-none cursor-pointer pr-10 hover:border-white/[0.15]"
                                                        style={{
                                                            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(148, 163, 184, 1)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundPosition: 'right 0.75rem center',
                                                            backgroundSize: '1em'
                                                        }}
                                                    >
                                                        <option value="">All Tags</option>
                                                        {allNoteTags.map(tag => (
                                                            <option key={tag} value={tag}>{tag}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="flex bg-surface-2/50 p-1 rounded-xl border border-white/[0.06] shrink-0">
                                                <button
                                                    onClick={() => setNotesViewMode('grid')}
                                                    className={`p-1.5 rounded-lg transition-all ${notesViewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                                    title="Grid View"
                                                >
                                                    <LayoutGrid className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setNotesViewMode('list')}
                                                    className={`p-1.5 rounded-lg transition-all ${notesViewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                                    title="List View"
                                                >
                                                    <List className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div className="w-full">
                                {notes.length === 0 ? (
                                    <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 -rotate-3">
                                            <FileText className="w-10 h-10 text-emerald-500/70" />
                                        </div>
                                        <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No notes yet</h3>
                                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                            Add your first note to start building your knowledge base.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setSelectedQuestionIdForNote(null);
                                                setShowNoteModal(true);
                                            }}
                                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer font-semibold"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            <span>Add Your First Note</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`grid gap-5 ${notesViewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                        {(() => {
                                            const filtered = filteredNotes;

                                            if (filtered.length === 0 && notes.length > 0) {
                                                return (
                                                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center glass-panel rounded-2xl border-dashed border-white/10">
                                                        <Search className="w-8 h-8 text-slate-600 mb-3" />
                                                        <p className="text-slate-400 font-medium">No notes match your search</p>
                                                        <button onClick={() => setNoteSearchQuery('')} className="mt-2 text-indigo-400 text-sm hover:underline">Clear search</button>
                                                    </div>
                                                );
                                            }

                                            return filtered.map((note) => (
                                                <div
                                                    key={note.id}
                                                    id={`note-${note.id}`}
                                                    className={`glass-panel rounded-2xl border transition-all flex group relative ${highlightedNoteId == note.id ? 'ring-4 ring-emerald-500 scale-[1.02] shadow-[0_0_40px_rgba(16,185,129,0.5)] z-[100] border-emerald-400 opacity-100' : ''} ${notesViewMode === 'list' ? 'items-center py-4 px-6 gap-6' : 'flex-col p-6'} ${activeNoteDropdown === note.id ? 'border-emerald-500/40 shadow-xl' : ''} ${isSelectionMode ? (selectedItems.has(note.id) ? 'border-indigo-400 bg-indigo-500/10 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/[0.06] hover:border-white/[0.1] cursor-pointer') : 'border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.015] cursor-pointer'}`}
                                                    onClick={() => handleOpenNote(note)}
                                                >
                                                    {fetchingNoteContentId === note.id && (
                                                        <div className="note-fetching-overlay">
                                                            <div className="scanning-ray" />
                                                            <div className="fetching-pill">
                                                                Opening...
                                                            </div>
                                                        </div>
                                                    )}
                                                    {isSelectionMode && (
                                                        <div className="absolute top-3 right-3 z-30">
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedItems.has(note.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 bg-surface-3/50'}`}>
                                                                {selectedItems.has(note.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* List mode progress line/indicator */}
                                                    <div className={`flex flex-1 min-w-0 ${notesViewMode === 'list' ? 'items-center gap-6' : 'flex-col'}`}>
                                                        {/* Title & Icon Section */}
                                                        <div className={`flex items-start gap-4 relative z-10 ${notesViewMode === 'list' ? 'w-1/2 shrink-0' : 'mb-5'}`}>
                                                            <div className={`rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 shrink-0 shadow-lg ${notesViewMode === 'list' ? 'p-2' : 'p-3.5'}`}>
                                                                <FileText className={`${notesViewMode === 'list' ? 'w-5 h-5' : 'w-6 h-6'}`} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                    <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase opacity-80">
                                                                        {new Date(note.created_at).toLocaleDateString(undefined, {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </span>
                                                                    {note.question_id && (
                                                                        <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20 font-black uppercase tracking-widest">
                                                                            Linked
                                                                        </span>
                                                                    )}
                                                                    {note.source_image_id && (
                                                                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-black uppercase tracking-widest flex items-center gap-1">
                                                                            <ImageIcon className="w-2.5 h-2.5" />
                                                                            Media
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className={`font-heading font-bold text-white tracking-tight break-words group-hover:text-emerald-400 transition-colors ${notesViewMode === 'list' ? 'text-[16px]' : 'text-[18px]'}`}>
                                                                    {note.title}
                                                                </h4>

                                                                {notesViewMode === 'grid' && (() => {
                                                                    const nTags = Array.isArray(note.tags) ? note.tags : (note.parsedTags || []);
                                                                    if (!nTags || nTags.length === 0) return null;
                                                                    return (
                                                                        <div className="flex flex-wrap gap-1.5 mt-4">
                                                                            {nTags.slice(0, 3).map((tag, idx) => (
                                                                                <span key={idx} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/[0.03] text-slate-400 border border-white/[0.06] uppercase tracking-wider">
                                                                                    {tag}
                                                                                </span>
                                                                            ))}
                                                                            {nTags.length > 3 && (
                                                                                <span className="text-[9px] font-bold text-slate-600 px-1">+{nTags.length - 3}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>

                                                        {/* Secondary Indicators (List Mode Only) */}
                                                        {notesViewMode === 'list' && (
                                                            <div className="flex items-center gap-3 ml-auto mr-8">
                                                                {(() => {
                                                                    const nTags = Array.isArray(note.tags) ? note.tags : (note.parsedTags || []);
                                                                    return nTags.slice(0, 2).map((tag, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/[0.03] text-slate-500 border border-white/[0.06] uppercase tracking-wider">
                                                                            {tag}
                                                                        </span>
                                                                    ));
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions Section */}
                                                    <div className={`flex items-center relative z-10 ${notesViewMode === 'list' ? 'shrink-0 py-0 border-l border-white/[0.06] pl-5 ml-2 gap-4' : 'w-full pt-3 border-t border-white/[0.06] mt-auto justify-between'}`}>
                                                        {notesViewMode === 'grid' && (
                                                            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                                                                {note.question_id && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigateToQuestion(note.question_id);
                                                                        }}
                                                                        className="flex items-center gap-1 hover:text-indigo-400 transition-colors cursor-pointer text-[12px] shrink-0"
                                                                        title="Go to Source Question"
                                                                    >
                                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                                        <span>Source</span>
                                                                    </button>
                                                                )}
                                                                {(() => {
                                                                    const nTags = Array.isArray(note.tags) ? note.tags : (note.parsedTags || []);
                                                                    if (!nTags || nTags.length === 0) return null;
                                                                    return (
                                                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pr-2 w-full" style={{ maskImage: 'linear-gradient(to right, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)' }}>
                                                                            {nTags.map((tag, idx) => (
                                                                                <span key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider whitespace-nowrap">
                                                                                    {tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        <div className={`flex items-center gap-1 shrink-0 ${notesViewMode === 'list' ? 'flex-col sm:flex-row' : 'opacity-0 group-hover:opacity-100 transition-all'}`} ref={activeNoteDropdown === note.id ? noteDropdownRef : null}>
                                                            {notesViewMode === 'list' && note.question_id && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigateToQuestion(note.question_id);
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-all cursor-pointer"
                                                                    title="Go to Source Question"
                                                                >
                                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveNoteDropdown(activeNoteDropdown === note.id ? null : note.id);
                                                                    }}
                                                                    className={`p-1.5 rounded-md transition-all cursor-pointer ${activeNoteDropdown === note.id ? 'bg-white/10 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                                                    title="More Options"
                                                                >
                                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                                </button>

                                                                {activeNoteDropdown === note.id && (
                                                                    <div
                                                                        className="absolute right-0 bottom-full mb-2 w-36 glass rounded-xl border border-white/10 shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setIsSelectionMode(true);
                                                                                setSelectedItems(new Set([note.id]));
                                                                                setActiveNoteDropdown(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                        >
                                                                            <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                                                                            <span>Select</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveNoteDropdown(null);
                                                                                handleEditNote(note);
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                                                                        >
                                                                            <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                                                                            <span>Edit Note</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveNoteDropdown(null);
                                                                                setConfirmDeleteNote({ open: true, note });
                                                                            }}
                                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                                            <span>Delete Note</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ));
                                        })()}

                                        {hasMoreNotes && !noteSearchQuery && !selectedNoteTag && (
                                            <div className="col-span-full mt-12 flex justify-center">
                                                <button
                                                    onClick={() => setNotePage(prev => prev + 1)}
                                                    disabled={loadingMoreNotes}
                                                    className="group relative flex items-center gap-3 px-10 py-4 bg-surface-2/40 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl" />
                                                    {loadingMoreNotes ? (
                                                        <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                                                    )}
                                                    <span className="text-slate-300 group-hover:text-white font-semibold tracking-wide">
                                                        {loadingMoreNotes ? 'Loading Notes...' : 'Load More Notes'}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'solutions' && (
                        <div className="fade-in pb-12">
                            {/* Header & Search */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="w-6 h-6 text-blue-400" />
                                    <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Solutions Library</h3>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="relative group flex-1 sm:min-w-[280px]">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={solutionSearchQuery}
                                            onChange={(e) => setSolutionSearchQuery(e.target.value)}
                                            placeholder="Search solutions..."
                                            className="w-full bg-surface-2/50 border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-blue-500/40 focus:bg-surface-2 transition-all"
                                        />
                                    </div>
                                    <div className="flex bg-surface-2/80 p-1 rounded-xl border border-white/[0.06] shrink-0">
                                        <button
                                            onClick={() => setSolutionsViewMode('grid')}
                                            className={`p-1.5 rounded-lg transition-all ${solutionsViewMode === 'grid' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                            title="Grid View"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setSolutionsViewMode('list')}
                                            className={`p-1.5 rounded-lg transition-all ${solutionsViewMode === 'list' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                            title="List View"
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full">
                                {solutions.length === 0 ? (
                                    <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 rotate-3">
                                            <ListChecks className="w-10 h-10 text-blue-500/70" />
                                        </div>
                                        <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No solutions yet</h3>
                                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                            Add solutions to questions to keep track of your learning path.
                                        </p>
                                    </div>
                                ) : (
                                    <div className={`grid gap-5 ${solutionsViewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                                        {filteredSolutions.length === 0 ? (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center glass-panel rounded-2xl border-dashed border-white/10">
                                                <Search className="w-8 h-8 text-slate-600 mb-3" />
                                                <p className="text-slate-400 font-medium">No solutions match your search</p>
                                                <button onClick={() => setSolutionSearchQuery('')} className="mt-2 text-blue-400 text-sm hover:underline hover:text-blue-300 transition-colors">Clear search</button>
                                            </div>
                                        ) : (
                                            filteredSolutions.map((solution) => (
                                                <div
                                                    key={solution.id}
                                                    id={`solution-${solution.id}`}
                                                    className={`glass-panel rounded-xl border transition-all flex group relative overflow-hidden ${solutionsViewMode === 'list' ? 'items-center py-3 pr-5 pl-1' : 'flex-col p-5'} border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.02] cursor-pointer`}
                                                    onClick={() => {
                                                        setViewingSolution(solution);
                                                        if (solution.source_image_id) {
                                                            handleFetchSolutionImage(solution.id);
                                                        }
                                                    }}
                                                >
                                                    {/* List mode progress line/indicator */}
                                                    {solutionsViewMode === 'list' && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/40" />
                                                    )}

                                                    {/* Optional background glow */}

                                                    <div className={`flex flex-1 min-w-0 ${solutionsViewMode === 'list' ? 'items-center px-4 gap-6' : 'flex-col'}`}>
                                                        {/* Title Section */}
                                                        <div className={`flex items-start gap-3 relative z-10 ${solutionsViewMode === 'list' ? 'w-1/3 shrink-0' : 'mb-4'}`}>
                                                            <div className={`rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 ${solutionsViewMode === 'list' ? 'p-1.5' : 'p-2.5'}`}>
                                                                <ListChecks className={`${solutionsViewMode === 'list' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className={`font-heading font-bold text-white tracking-tight break-words truncate group-hover:text-blue-400 transition-colors ${solutionsViewMode === 'list' ? 'text-[14px]' : 'text-[15px]'}`}>
                                                                    {solution.title || 'Solution'}
                                                                </h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                                                        {new Date(solution.created_at).toLocaleDateString(undefined, {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: solutionsViewMode === 'grid' ? 'numeric' : undefined
                                                                        })}
                                                                    </span>
                                                                    {solutionsViewMode === 'list' && solution.question_id && (
                                                                        <>
                                                                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                                            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Question Link</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Content Section */}
                                                        {solutionsViewMode === 'grid' ? (
                                                            <div className="text-sm text-slate-300 leading-relaxed mb-4 relative z-10 overflow-hidden max-h-[140px] pointer-events-none [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
                                                                <div className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mt-0 prose-p:mb-2 prose-headings:font-bold prose-headings:text-white prose-headings:m-0 prose-headings:mb-1.5 prose-h1:text-[15px] prose-h2:text-[14px] prose-h3:text-[13px] prose-a:text-indigo-400 prose-code:text-slate-300 prose-code:bg-white/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm, remarkMath]}
                                                                        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                                                    >
                                                                        {preprocessMarkdown(solution.content || '')}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 min-w-0 relative z-10 hidden md:block">
                                                                <p className="text-[12px] text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity">
                                                                    {solution.content?.substring(0, 200).replace(/[#*`\n]/g, ' ')}...
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Source Image Link Section */}
                                                        {solution.source_image_id && (
                                                            <div className={`relative z-10 shrink-0 ${solutionsViewMode === 'list' ? 'mb-0' : 'mb-6'}`}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleFetchSolutionImage(solution.id);
                                                                        setViewingSolution(solution);
                                                                    }}
                                                                    disabled={fetchingImageId === `solution-${solution.id}`}
                                                                    className={`flex items-center gap-2 rounded-xl font-bold bg-white/[0.04] text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all border border-white/[0.08] disabled:opacity-50 cursor-pointer ${solutionsViewMode === 'list' ? 'p-2' : 'px-4 py-2 text-[12px]'}`}
                                                                    title="View Source Image"
                                                                >
                                                                    {fetchingImageId === `solution-${solution.id}` ? (
                                                                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                    ) : (
                                                                        <ImageIcon className={`${solutionsViewMode === 'list' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                                                    )}
                                                                    {solutionsViewMode === 'grid' && <span>Source Image</span>}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions Section */}
                                                    <div className={`flex items-center relative z-10 ${solutionsViewMode === 'list' ? 'shrink-0 py-0 border-l border-white/[0.06] pl-5 ml-2 gap-4' : 'w-full pt-3 border-t border-white/[0.06] mt-auto justify-between'}`}>
                                                        {solutionsViewMode === 'grid' && (
                                                            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                                                                {solution.question_id && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigateToQuestion(solution.question_id);
                                                                        }}
                                                                        className="flex items-center gap-1 hover:text-indigo-400 transition-colors cursor-pointer text-[12px] shrink-0"
                                                                        title="Go to Source Question"
                                                                    >
                                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                                        <span>Source</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className={`flex items-center gap-1 shrink-0 ${solutionsViewMode === 'list' ? 'flex-col sm:flex-row' : 'opacity-0 group-hover:opacity-100 transition-all'}`}>
                                                            {solutionsViewMode === 'list' && solution.question_id && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigateToQuestion(solution.question_id);
                                                                    }}
                                                                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-md transition-all cursor-pointer"
                                                                    title="Go to Source Question"
                                                                >
                                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEditSolution(solution);
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-all cursor-pointer"
                                                                title="Edit Solution"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteNote({ open: true, note: { ...solution, isSolution: true } });
                                                                }}
                                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all cursor-pointer"
                                                                title="Delete Solution"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'revision' && (() => {
                        const renderSession = (session) => {
                            const isExpanded = activeRevisionSessionId === session.id;
                            const totalTopics = session.topics?.length || 0;
                            const doneCount = session.topics?.filter(t => t.status === 'completed').length || 0;
                            const progressPct = totalTopics > 0 ? Math.round((doneCount / totalTopics) * 100) : 0;

                            return (
                                <div key={session.id} className="glass-panel rounded-2xl border border-white/[0.06] overflow-hidden mb-4">
                                    {/* Session Header */}
                                    <div
                                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-white/[0.02] ${isExpanded ? 'border-b border-white/[0.05] bg-white/[0.02]' : ''}`}
                                        onClick={() => setActiveRevisionSessionId(isExpanded ? null : session.id)}
                                    >
                                        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-base font-bold text-white tracking-tight">{session.name}</h4>
                                                    <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                                                        {new Date(session.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-[150px] h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ${progressPct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-violet-400'}`}
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-400">
                                                        {progressPct}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mr-4">
                                                <div className="flex items-center gap-2 bg-surface-2/80 px-3 py-1.5 rounded-lg border border-white/[0.05]">
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-xs font-bold text-white leading-tight">
                                                            <span className={doneCount === totalTopics ? 'text-emerald-400' : 'text-violet-400'}>{doneCount}</span>
                                                            <span className="text-slate-500 mx-1">/</span>
                                                            <span>{totalTopics}</span>
                                                        </span>
                                                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Topics Done</span>
                                                    </div>
                                                    <div className="w-1 h-8 rounded-full bg-white/[0.05]" />
                                                    {doneCount > 0 && doneCount === totalTopics ? (
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-slate-400 relative">
                                                            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                                                                <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                                <path className="text-violet-500" strokeDasharray={`${progressPct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingRevisionSession(session);
                                                }}
                                                className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                title="Edit Session"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteRevisionSession({ open: true, sessionId: session.id });
                                                }}
                                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Delete Session"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className={`p-2 rounded-lg text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-white' : ''}`}>
                                                <ChevronDown className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session Content (Topics) */}
                                    {isExpanded && (
                                        <div className="p-4 bg-surface-1/50">
                                            <div className="flex flex-col gap-2">
                                                {session.topics?.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic py-2">No topics in this session.</p>
                                                ) : (() => {
                                                    // Render topics
                                                    const allTopics = session.topics;
                                                    const allIds = new Set(allTopics.map(t => t.topicId));
                                                    const childrenOf = (parentId) => allTopics.filter(t => t.parentId === parentId);
                                                    // A topic is a "root" to display if it has no parent, OR its parent wasn't added to the session.
                                                    const allRoots = allTopics.filter(t => !t.parentId || !allIds.has(t.parentId));

                                                    const renderTopicRow = (item) => {
                                                        const isDone = item.status === 'completed';
                                                        const isToggling = togglingTopicId === item.topicId;
                                                        const children = childrenOf(item.topicId);
                                                        const hasChildren = children.length > 0;
                                                        const isGrpExpanded = expandedRevisionGroups[`${session.id}_${item.topicId}`] !== false;

                                                        if (hasChildren) {
                                                            const childDone = children.filter(c => c.status === 'completed').length;
                                                            return (
                                                                <div key={item.topicId} className="flex flex-col">
                                                                    <div
                                                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer group
                                                                    ${isDone ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-surface-2/50 border-white/[0.06]'}
                                                                    hover:border-white/[0.12]`}
                                                                        onClick={() => setExpandedRevisionGroups(prev => ({ ...prev, [`${session.id}_${item.topicId}`]: !isGrpExpanded }))}
                                                                    >
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleRevisionToggle(session.id, item.topicId, item.status); }}
                                                                            disabled={isToggling}
                                                                            className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer
                                                                        ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-emerald-500/60 bg-transparent'}
                                                                        ${isToggling ? 'opacity-50' : ''}`}
                                                                        >
                                                                            {isToggling
                                                                                ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                                : isDone && <CheckCircle className="w-3.5 h-3.5" />
                                                                            }
                                                                        </button>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className={`font-semibold text-[14px] ${isDone ? 'text-white' : 'text-slate-200'}`}>
                                                                                {item.topicName}
                                                                            </span>
                                                                            <span className="ml-2 text-[11px] text-slate-500">{childDone}/{children.length} done</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <div className={`p-1 rounded text-slate-500 transition-transform ${isGrpExpanded ? 'rotate-180' : ''}`}>
                                                                                <ChevronDown className="w-4 h-4" />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {isGrpExpanded && (
                                                                        <div className="ml-6 border-l-2 border-white/[0.06] pl-3 flex flex-col gap-1.5 mt-1.5 mb-1">
                                                                            {children.map(child => renderTopicRow(child))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={item.topicId}
                                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group
                                                            ${isDone ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-surface-2/40 border-white/[0.05] hover:border-white/[0.1]'}`}
                                                            >
                                                                <button
                                                                    onClick={() => handleRevisionToggle(session.id, item.topicId, item.status)}
                                                                    disabled={isToggling}
                                                                    className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer
                                                                ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-emerald-500/60 bg-transparent'}
                                                                ${isToggling ? 'opacity-50' : ''}`}
                                                                >
                                                                    {isToggling
                                                                        ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                        : isDone && <CheckCircle className="w-3.5 h-3.5" />
                                                                    }
                                                                </button>
                                                                <span className={`flex-1 text-[13px] font-medium transition-colors ${isDone ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-200'}`}>
                                                                    {item.topicName}
                                                                </span>
                                                                <div className="flex items-center gap-2 shrink-0 ml-auto">
                                                                    {item.completedAt && (
                                                                        <span className="text-[10px] text-slate-600 font-medium hidden md:block">
                                                                            {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    };

                                                    return allRoots.map(item => renderTopicRow(item));
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        };

                        return (
                            <div className="fade-in">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-6 h-6 text-indigo-400" />
                                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Revision Tracker</h3>
                                    </div>
                                </div>

                                {revisionSessions.length === 0 ? (
                                    <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5">
                                            <RefreshCw className="w-10 h-10 text-violet-500/70" />
                                        </div>
                                        <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No revision sessions</h3>
                                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                            Create a targeted session of specific topics from the syllabus to start your revision.
                                        </p>
                                        <button
                                            onClick={() => setShowCreateRevisionSession(true)}
                                            className="bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/40 flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer font-semibold"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            <span>Create Revision Session</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {revisionSessions.map(renderSession)}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'library' && (
                        <div className="fade-in pb-12 px-1">
                            {/* Header for Library */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-6 h-6 text-indigo-400" />
                                    <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Resource Library</h3>
                                </div>
                                {isSelectionMode ? (
                                    <div className="flex items-center h-[50px] bg-[#121214]/80 border border-white/[0.08] rounded-2xl px-2 shadow-[0_8px_30px_rgb(0,0,0,0.6)] transition-all animate-in fade-in zoom-in-95 duration-300 w-full sm:w-auto">
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

                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                                        <button
                                            onClick={async () => {
                                                const loadingToast = toast.loading('Creating Zip...');
                                                try {
                                                    const zip = new JSZip();
                                                    const usedNames = new Map();

                                                    selectedItems.forEach(id => {
                                                        const f = files.find(file => file.id === id);
                                                        if (f && f.data) {
                                                            let baseName = f.file_name || 'file';
                                                            let ext = '';
                                                            const lastDot = baseName.lastIndexOf('.');
                                                            if (lastDot !== -1) {
                                                                ext = baseName.substring(lastDot);
                                                                baseName = baseName.substring(0, lastDot);
                                                            } else {
                                                                const typeMap = { 'image': '.jpg', 'pdf': '.pdf', 'doc': '.docx', 'xlsx': '.xlsx' };
                                                                ext = typeMap[f.file_type] || '';
                                                            }

                                                            let finalName = `${baseName}${ext}`;
                                                            if (usedNames.has(finalName)) {
                                                                const count = usedNames.get(finalName) + 1;
                                                                usedNames.set(finalName, count);
                                                                finalName = `${baseName}_${count}${ext}`;
                                                            } else {
                                                                usedNames.set(finalName, 1);
                                                            }

                                                            const base64Content = f.data.split(',')[1];
                                                            zip.file(finalName, base64Content, { base64: true });
                                                        }
                                                    });

                                                    const content = await zip.generateAsync({ type: 'blob' });
                                                    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
                                                    const zipFileName = `${subject?.name || 'Library'}_Export_${timestamp}.zip`.replace(/\s+/g, '_');
                                                    saveAs(content, zipFileName);

                                                    setIsSelectionMode(false);
                                                    setSelectedItems(new Set());
                                                    toast.success('Zip downloaded!', { id: loadingToast });
                                                } catch (err) {
                                                    console.error('Zip download error:', err);
                                                    toast.error('Failed to create Zip', { id: loadingToast });
                                                }
                                            }}
                                            disabled={selectedItems.size === 0}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${selectedItems.size === 0 ? 'text-slate-600 cursor-not-allowed opacity-50' : 'text-emerald-400 hover:text-white hover:bg-emerald-500/20'}`}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="text-[12px] font-medium hidden md:inline">Download</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setConfirmDeleteFile({ open: true, items: Array.from(selectedItems).map(id => files.find(f => f.id === id)).filter(Boolean) });
                                            }}
                                            disabled={selectedItems.size === 0}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="text-[12px] font-medium hidden md:inline">Delete</span>
                                        </button>

                                        <div className="w-px h-6 bg-white/[0.08] mx-2"></div>

                                        <button
                                            onClick={() => {
                                                setIsSelectionMode(false);
                                                setSelectedItems(new Set());
                                            }}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                            title="Cancel Selection"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] shrink-0">
                                        <div className="flex items-center bg-white/[0.02] rounded-lg p-0.5">
                                            <div className="relative group">
                                                <button
                                                    onClick={() => setLibraryViewMode('categorywise')}
                                                    className={`p-1.5 rounded-lg transition-all ${libraryViewMode === 'categorywise' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                                    title="Type View"
                                                >
                                                    <LayoutGrid className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#121214] border border-white/10 text-[9px] font-bold text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 uppercase tracking-widest shadow-xl">
                                                    Type
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <button
                                                    onClick={() => setLibraryViewMode('datewise')}
                                                    className={`p-1.5 rounded-lg transition-all ${libraryViewMode === 'datewise' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                                    title="Timeline View"
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#121214] border border-white/10 text-[9px] font-bold text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 uppercase tracking-widest shadow-xl">
                                                    Timeline
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-px h-4 bg-white/10 mx-1" />

                                        <div className="flex items-center gap-0 shrink-0">
                                            <button
                                                onClick={() => setShowTimeTraveler(true)}
                                                className={`px-3 py-1.5 ${fileSearchQuery ? 'rounded-l-lg' : 'rounded-lg'} text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${fileSearchQuery ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border-r-indigo-500/10 hover:bg-indigo-500/30' : 'text-slate-500 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
                                            >
                                                <History className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">Filter</span>
                                            </button>
                                            {fileSearchQuery && (
                                                <button
                                                    onClick={() => setFileSearchQuery('')}
                                                    className="h-[28px] px-2 flex items-center justify-center rounded-r-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-indigo-500/30 border-l-0 hover:border-rose-500/30 transition-colors"
                                                    title="Clear Filters"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {files.length === 0 ? (
                                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-primary/20 w-full relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 pulse-ring">
                                        <Layers className="w-10 h-10 text-primary" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No resources yet</h3>
                                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                                        Upload documents, diagrams, textbook snippets, or handwritten notes. They'll be saved here for easy reference.
                                    </p>
                                    <button
                                        onClick={() => setShowFileModal(true)}
                                        className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        <span>Upload Your First File</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {groupedLibraryItems.map((group, gIdx) => (
                                        <div key={group.title} className="relative">
                                            <div className="sticky top-0 z-30 pt-4 pb-6 bg-surface mb-2">
                                                <div className="flex items-center gap-4">
                                                    <h2 className="text-xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
                                                        {group.title}
                                                        <span className="text-[11px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{group.items.length}</span>
                                                    </h2>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                {group.items.map((file, index) => {
                                                    const isGlobalLast = gIdx === groupedLibraryItems.length - 1 && index === group.items.length - 1;
                                                    const hasLink = file.linked_question_id || file.linked_note_id;

                                                    return (
                                                        <div
                                                            key={file.id}
                                                            ref={isGlobalLast ? lastFileElementRef : null}
                                                            className={`group relative aspect-square rounded-xl bg-surface-2 transition-all duration-300 cursor-pointer shadow-lg active:scale-[0.98] fade-in border ${isSelectionMode
                                                                ? (selectedItems.has(file.id) ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-500/10 scale-95 opacity-90' : 'border-white/[0.04] scale-100 opacity-100')
                                                                : (activeFileDropdown === file.id ? 'border-primary/40 shadow-xl' : 'border-white/[0.04] hover:border-primary/40 hover:shadow-primary/5')
                                                                }`}
                                                            onClick={() => {
                                                                if (isSelectionMode) {
                                                                    const newSelected = new Set(selectedItems);
                                                                    if (newSelected.has(file.id)) newSelected.delete(file.id);
                                                                    else newSelected.add(file.id);
                                                                    setSelectedItems(newSelected);
                                                                    return;
                                                                }
                                                                if (activeFileDropdown === file.id) setActiveFileDropdown(null);
                                                                else setViewingFile(file);
                                                            }}
                                                            style={{ animationDelay: `${(index % 10) * 0.05}s` }}
                                                        >
                                                            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                                                {file.file_type === 'image' || !file.file_type ? (
                                                                    <img
                                                                        src={file.data}
                                                                        alt={file.file_name}
                                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-3 opacity-90 group-hover:opacity-100 transition-all duration-500 text-slate-300">
                                                                        <FileText className="w-12 h-12 mb-2 text-primary" />
                                                                        <span className="text-xs uppercase font-bold text-slate-400">{file.file_type} File</span>
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

                                                            {/* Standard Identical Overlay from Library.jsx */}
                                                            <div className={`absolute inset-0 rounded-xl bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-all duration-300 flex flex-col justify-end p-4 ${isSelectionMode || activeFileDropdown === file.id ? 'opacity-100 bg-black/30' : 'opacity-0 group-hover:opacity-100'}`}>
                                                                <div className="flex items-center justify-between mb-1.5 relative">
                                                                    <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                                        {subject?.name}
                                                                    </div>

                                                                    {!isSelectionMode && hasLink && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (file.linked_question_id) navigateToQuestion(file.linked_question_id);
                                                                                else if (file.linked_note_id) {
                                                                                    const note = notes.find(n => n.id === file.linked_note_id);
                                                                                    if (note) {
                                                                                        setViewingNote(note);
                                                                                        if (note.source_image_id) handleFetchNoteImage(note.id);
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="p-1 px-[5px] bg-primary/20 hover:bg-primary text-white rounded-lg border border-primary/30 transition-all cursor-pointer"
                                                                            title="View Linked Content"
                                                                        >
                                                                            <LinkIcon className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-[11px] font-semibold text-white truncate flex-1">
                                                                        {file.file_name || new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </p>

                                                                    {!isSelectionMode && (
                                                                        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveFileDropdown(activeFileDropdown === file.id ? null : file.id);
                                                                                }}
                                                                                className={`p-1 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${activeFileDropdown === file.id ? 'bg-primary border-primary text-white' : 'bg-black/40 hover:bg-black/60 text-white/80 border-white/10 backdrop-blur-sm'}`}
                                                                                title="More Options"
                                                                            >
                                                                                <MoreVertical className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            {activeFileDropdown === file.id && (
                                                                                <div className="absolute right-0 bottom-full mb-2 w-36 bg-[#121214]/95 border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.6)] py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 backdrop-blur-xl" onClick={e => e.stopPropagation()}>
                                                                                    <button
                                                                                        onClick={() => { setIsSelectionMode(true); setSelectedItems(new Set([file.id])); setActiveFileDropdown(null); }}
                                                                                        className="w-full flex items-center justify-start gap-2.5 px-3.5 py-2 text-[12px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                                                                    >
                                                                                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" /> Select
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setActiveFileDropdown(null);
                                                                                            setRenameFileData({ open: true, file, name: file.file_name || '' });
                                                                                        }}
                                                                                        className="w-full flex items-center justify-start gap-2.5 px-3.5 py-2 text-[12px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                                                                    >
                                                                                        <Pencil className="w-3.5 h-3.5 text-emerald-400" /> Rename
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setActiveFileDropdown(null);
                                                                                            setConfirmDeleteFile({ open: true, items: [file] });
                                                                                        }}
                                                                                        className="w-full flex items-center justify-start gap-2.5 px-3.5 py-2 text-[12px] font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
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

                            {loadingMoreFiles && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mt-5">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={`skeleton-${i}`} className="aspect-square rounded-2xl bg-surface-2/40 border border-white/[0.04] animate-pulse overflow-hidden">
                                            <div className="w-full h-full bg-indigo-500/5" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <CreateRevisionSessionModal
                isOpen={showCreateRevisionSession}
                onClose={() => setShowCreateRevisionSession(false)}
                onSubmit={handleCreateRevisionSession}
                topics={topics}
            />

            <EditRevisionSessionModal
                isOpen={!!editingRevisionSession}
                onClose={() => setEditingRevisionSession(null)}
                onSubmit={handleEditRevisionSession}
                session={editingRevisionSession}
                topics={topics}
            />

            <ConfirmDialog
                isOpen={confirmDeleteRevisionSession.open}
                title="Delete Revision Session"
                message="Are you sure you want to delete this revision session? This will remove all revision tracking history for this session. This action cannot be undone."
                onConfirm={() => handleDeleteRevisionSession(confirmDeleteRevisionSession.sessionId)}
                onCancel={() => setConfirmDeleteRevisionSession({ open: false, sessionId: null })}
                confirmText="Delete Session"
                danger
            />

            <ConfirmDialog
                isOpen={confirmDeleteFile.open}
                title={`Delete ${confirmDeleteFile.items.length > 1 ? `${confirmDeleteFile.items.length} Files` : 'File'}`}
                message={`Are you sure you want to delete ${confirmDeleteFile.items.length > 1 ? 'these files' : 'this file'}? This action cannot be undone.`}
                onConfirm={async () => {
                    try {
                        for (const file of confirmDeleteFile.items) {
                            await filesApi.delete(id, file.id);
                        }
                        const deletedIds = new Set(confirmDeleteFile.items.map(f => f.id));
                        setFiles(prev => prev.filter(f => !deletedIds.has(f.id)));
                        setSelectedItems(prev => {
                            const next = new Set(prev);
                            deletedIds.forEach(id => next.delete(id));
                            return next;
                        });
                        if (selectedItems.size === confirmDeleteFile.items.length) setIsSelectionMode(false);
                        setConfirmDeleteFile({ open: false, items: [] });
                        toast.success("File(s) deleted");
                    } catch {
                        toast.error("Failed to delete files");
                    }
                }}
                onCancel={() => setConfirmDeleteFile({ open: false, items: [] })}
                confirmText="Delete"
                danger
            />

            <AddSolutionModal
                isOpen={showSolutionModal}
                onClose={() => {
                    setShowSolutionModal(false);
                    setSelectedQuestionIdForSolution(null);
                }}
                subjectId={id}
                questionId={selectedQuestionIdForSolution}
                onSolutionAdded={handleSolutionAdded}
            />

            {viewingSolution && (
                <ViewSolutionModal
                    isOpen={true}
                    onClose={() => setViewingSolution(null)}
                    solution={viewingSolution}
                    sourceImage={viewingSolution ? fetchedImages[`solution-${viewingSolution.id}`] : null}
                    isFetchingImage={fetchingImageId === (viewingSolution ? `solution-${viewingSolution.id}` : null)}
                    onEdit={handleOpenEditSolution}
                />
            )}

            {viewingFile && (
                <FileViewerModal
                    key={viewingFile.id}
                    isOpen={true}
                    onClose={() => {
                        setViewingFile(null);
                        setIsFileViewerMinimized(false);
                    }}
                    file={viewingFile}
                    allFiles={files}
                    onPrev={() => {
                        const idx = (files || []).findIndex(f => f.id === viewingFile.id);
                        if (idx > 0) setViewingFile(files[idx - 1]);
                    }}
                    onNext={() => {
                        const idx = (files || []).findIndex(f => f.id === viewingFile.id);
                        if (idx >= 0 && idx < (files || []).length - 1) setViewingFile(files[idx + 1]);
                    }}
                    onSelect={(file) => setViewingFile(file)}
                    isMinimized={isFileViewerMinimized}
                    onMinimize={setIsFileViewerMinimized}
                    onDelete={async (deletedFile) => {
                        await filesApi.delete(deletedFile.subject_id, deletedFile.id);
                        setFiles(prev => (prev || []).filter(f => f.id !== deletedFile.id));
                        setViewingFile(null);
                        setIsFileViewerMinimized(false);
                        toast.success("File deleted successfully");
                    }}
                    onNavigateToLinkedContent={(file) => {
                        if (file.linked_question_id) {
                            navigateToQuestion(file.linked_question_id);
                        } else if (file.linked_note_id) {
                            const note = notes.find(n => n.id === file.linked_note_id);
                            if (note) {
                                setViewingNote(note);
                                if (note.source_image_id) handleFetchNoteImage(note.id);
                            }
                        }
                    }}
                />
            )}


            <EditSolutionModal
                isOpen={showEditSolutionModal}
                onClose={() => {
                    setShowEditSolutionModal(false);
                    setEditingSolution(null);
                }}
                subjectId={id}
                solution={editingSolution}
                onSolutionUpdated={handleEditSolutionUpdated}
            />

            <TimeTraveler
                isOpen={showTimeTraveler}
                onClose={() => setShowTimeTraveler(false)}
                onApply={(val) => setFileSearchQuery(val)}
            />

            <ConfirmDialog
                isOpen={renameFileData.open}
                title="Rename File"
                message="Enter a new identity for this material."
                confirmText="Save Name"
                type="primary"
                onConfirm={handleRenameFile}
                onCancel={() => setRenameFileData({ open: false, file: null, name: '' })}
            >
                <div className="w-full mt-4">
                    <input
                        autoFocus
                        type="text"
                        value={renameFileData.name}
                        onChange={(e) => setRenameFileData(prev => ({ ...prev, name: e.target.value }))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameFile();
                        }}
                        className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-[14px] focus:outline-none focus:border-primary/50 transition-all"
                        placeholder="e.g. Biology Session 1"
                    />
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default SubjectDetail;

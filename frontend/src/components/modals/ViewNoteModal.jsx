import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, FileText, Link2 as LinkIcon, Pencil, ChevronLeft, ChevronRight, List, Copy, PanelLeftClose, PanelLeftOpen, Plus, ArrowLeft, Wand2, Check, XCircle, Loader2, Sun, Moon, Settings, Type, Palette, Trash2, Edit3, Maximize2, Minimize2, ExternalLink, Hash, Image as ImageIcon, Sparkles, RefreshCw, Type as TypeIcon, Layout, Eye, EyeOff } from 'lucide-react';
import { authApi, notesApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

import ModalPortal from '../ModalPortal.jsx';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Syntax Highlighting imports
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const preprocessMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\\\\\[/g, '\n$$\n')
        .replace(/\\\\\]/g, '\n$$\n')
        .replace(/\\\[/g, '\n$$\n')
        .replace(/\\\]/g, '\n$$\n')
        .replace(/\\\\\(*/g, '$')
        .replace(/\\\\\)* /g, '$')
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\$\$\$\$/g, '$$\n$$')
        .replace(/\$ \$/g, '$$')
        .replace(/([^\n])\$\$/g, '$1\n$$')
        .replace(/\$\$([^\n])/g, '$$\n$1')
        .replace(/\\bottom([a-zA-Z])/g, '\\bot $1')
        .replace(/\\bottom/g, '\\bot');
};



/* ================================================================
   TOC Sidebar Styles (inline to keep it self-contained)
   ================================================================ */
const getSidebarStyles = (isLightMode, primaryColor) => ({
    container: {
        width: '260px',
        minWidth: '260px',
        borderRight: isLightMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)',
        background: isLightMode ? '#ffffff' : '#12121a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    },
    containerCollapsed: {
        width: '0px',
        minWidth: '0px',
        opacity: 0,
        overflow: 'hidden',
    },
    header: {
        padding: '16px 18px 12px',
        borderBottom: isLightMode ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
    },
    headerIcon: {
        color: primaryColor,
        opacity: 0.8,
    },
    headerTitle: {
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: isLightMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)',
        fontFamily: "'Outfit', sans-serif",
    },
    list: {
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
    },
    item: (level, isActive) => ({
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: `6px ${14 + (level - 1) * 14}px`,
        paddingRight: '14px',
        cursor: 'pointer',
        fontSize: level === 1 ? '13px' : level === 2 ? '12.5px' : '12px',
        fontWeight: level === 1 ? 600 : level === 2 ? 500 : 400,
        color: isActive
            ? primaryColor
            : level === 1
                ? (isLightMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)')
                : level === 2
                    ? (isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)')
                    : (isLightMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)'),
        lineHeight: '1.5',
        borderLeft: isActive ? `2px solid ${primaryColor}` : '2px solid transparent',
        background: isActive ? `${primaryColor}0f` : 'transparent',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        fontFamily: "'Inter', sans-serif",
    }),
    itemHover: {
        background: isLightMode ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)',
        color: isLightMode ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.85)',
    },
    dot: (level, isActive) => ({
        width: '5px',
        height: '5px',
        minWidth: '5px',
        borderRadius: '50%',
        marginTop: '7px',
        background: isActive
            ? primaryColor
            : level === 1
                ? (isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)')
                : (isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'),
        transition: 'background 0.2s ease',
    }),
    emptyState: {
        padding: '24px 18px',
        textAlign: 'center',
        color: isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)',
        fontSize: '12px',
        fontStyle: 'italic',
    },
});

/** TOC Sidebar Item */
const TocItem = React.memo(({ heading, isActive, onClick, sidebarStyles }) => {
    const [hovered, setHovered] = useState(false);
    const style = {
        ...sidebarStyles.item(heading.level, isActive),
        ...(hovered && !isActive ? sidebarStyles.itemHover : {}),
    };

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={style}
            title={heading.text}
            className="w-full text-left border-none bg-transparent block relative group"
        >
            <div className={`absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full transition-all duration-300
                ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'}`}
                style={{ backgroundColor: style.color }} />
            <span style={sidebarStyles.dot(heading.level, isActive)} className="inline-block align-top mr-2" />
            <span className={`inline-block max-w-[calc(100%-15px)] break-words transition-transform duration-200 ${hovered && !isActive ? 'translate-x-1' : ''}`}>
                {heading.text}
            </span>
        </button>
    );
});

// Enhanced Code Block with Language Detection and Copy Button
// ----------------------------------------------------------------
// Enhanced Code Block with Language Detection, Syntax Highlighting and Copy Button
// ----------------------------------------------------------------
const SimpleCodeBlock = React.memo(({ children, isLightMode, fontSize = 20, primaryColor, className }) => {
    const [copied, setCopied] = useState(false);

    // Extract language from className (e.g., 'language-javascript' -> 'javascript')
    const languageMatch = useMemo(() => {
        if (!className) return 'text';
        const match = /language-(\w+)/.exec(className);
        return match ? match[1] : 'text';
    }, [className]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    // ChatGPT-like code theme styling
    const customStyle = {
        margin: 0,
        padding: '1.5rem',
        fontSize: `${fontSize}px`,
        lineHeight: '1.6',
        backgroundColor: 'transparent',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
    };

    return (
        <div className={`relative group/code my-8 rounded-2xl border overflow-hidden transition-all duration-500 shadow-xl
            ${isLightMode
                ? 'bg-[#fdfdfd] border-slate-200/60 shadow-slate-200/30'
                : 'bg-[#0f0f1b] border-white/[0.06] shadow-black/40'}`}>

            {/* Header / Meta bar */}
            <div className={`flex items-center justify-between px-6 py-3 border-b transition-colors duration-300
                ${isLightMode ? 'bg-[#f1f3f7] border-slate-200/60' : 'bg-white/[0.03] border-white/[0.05]'}`}>
                <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5 mr-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-slate-300' : 'bg-white/10'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-slate-300' : 'bg-white/10'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-slate-300' : 'bg-white/10'}`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] font-heading
                        ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {languageMatch || 'CODE'}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2 group/btn
                        ${isLightMode
                            ? 'hover:bg-slate-200/60 text-slate-600'
                            : 'hover:bg-white/10 text-slate-300'}`}
                    style={copied ? { color: primaryColor, backgroundColor: `${primaryColor}15` } : {}}
                >
                    {copied ? (
                        <>
                            <Check size={12} strokeWidth={3} style={{ color: primaryColor }} className="animate-in zoom-in-50 duration-300" />
                            <span style={{ color: primaryColor }} className="text-[10px] font-bold">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} className="group-hover/btn:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold">Copy code</span>
                        </>
                    )}
                </button>
            </div>

            <div className="relative overflow-hidden group/pre">
                <SyntaxHighlighter
                    language={languageMatch}
                    style={isLightMode ? oneLight : oneDark}
                    customStyle={customStyle}
                    codeTagProps={{
                        style: {
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                        }
                    }}
                    PreTag="div"
                    className="custom-scrollbar"
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
        </div>
    );
});

// Premium Callout / Alert Component
// ----------------------------------------------------------------
const MarkdownCallout = React.memo(({ type, children, isLightMode, primaryColor }) => {
    const config = useMemo(() => {
        const types = {
            note: { icon: <Settings size={16} />, color: '#3b82f6', label: 'Note', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
            tip: { icon: <Wand2 size={16} />, color: '#10b981', label: 'Tip', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
            important: { icon: <FileText size={16} />, color: '#8b5cf6', label: 'Important', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
            warning: { icon: <Settings size={16} />, color: '#f59e0b', label: 'Warning', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
            caution: { icon: <XCircle size={16} />, color: '#ef4444', label: 'Caution', bg: 'bg-red-500/10', border: 'border-red-500/30' },
        };
        return types[type.toLowerCase()] || types.note;
    }, [type]);

    return (
        <div className={`my-6 p-4 rounded-xl border-l-[3.5px] border ${config.bg} ${config.border} shadow-sm overflow-hidden`}>
            <div className="flex items-center gap-2 mb-2 font-bold text-[11px] uppercase tracking-widest" style={{ color: config.color }}>
                {config.icon}
                {config.label}
            </div>
            <div className={`text-[14px] leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                {children}
            </div>
        </div>
    );
});

// Memoized linked note button to prevent re-renders on hover
const LinkedNoteButton = React.memo(({ child, isLightMode, onSafeAction, onOpenChildNote, primaryColor }) => {
    const baseStyle = useMemo(() => ({
        color: isLightMode ? `${primaryColor}d9` : `${primaryColor}bf`,
        background: 'transparent',
        border: '1px solid transparent',
    }), [isLightMode, primaryColor]);

    const [isHovered, setIsHovered] = useState(false);

    const hoverStyle = useMemo(() => ({
        color: primaryColor,
        background: isLightMode ? `${primaryColor}0a` : `${primaryColor}14`,
        borderColor: `${primaryColor}26`,
        transform: 'translateX(4px)',
    }), [primaryColor, isLightMode]);

    return (
        <button
            onClick={() => onSafeAction(() => onOpenChildNote && onOpenChildNote(child))}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-xl text-[12.5px] font-medium transition-all cursor-pointer group relative overflow-hidden"
            style={isHovered ? hoverStyle : baseStyle}
            title={child.title || 'Untitled Note'}
        >
            <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${isHovered ? '' : (isLightMode ? 'bg-slate-100' : 'bg-white/5')}`}
                style={isHovered ? { backgroundColor: `${primaryColor}20` } : {}}>
                <FileText size={13} className="opacity-70" />
            </div>
            <span className="truncate flex-1 font-semibold">{child.title || 'Untitled Note'}</span>
            <ChevronRight size={12} className={`shrink-0 transition-all ${isHovered ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0'}`} />
        </button>
    );
});


// ----------------------------------------------------------------
// Visual Table Editor Panel (proper component so hooks are legal)
// ----------------------------------------------------------------
const parseMarkdownTable = (md) => {
    const lines = md.trim().split('\n').map(l => l.trim());
    return lines
        .filter(l => l.startsWith('|'))
        .filter(l => !l.split('|').slice(1).every(c => /^[:\-\s]+$/.test(c))) // skip separator
        .map(l => l.split('|').slice(1, -1).map(c => c.trim()));
};

const serializeMarkdownTable = (rows) => {
    if (!rows || rows.length === 0) return '';
    const colCount = Math.max(...rows.map(r => r.length));
    const colWidths = Array.from({ length: colCount }, (_, ci) =>
        Math.max(...rows.map(r => (r[ci] || '').length), 3)
    );
    const fmtRow = (row) =>
        '| ' + Array.from({ length: colCount }, (_, ci) =>
            (row[ci] || '').padEnd(colWidths[ci])
        ).join(' | ') + ' |';
    const sep = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';
    return [fmtRow(rows[0]), sep, ...rows.slice(1).map(fmtRow)].join('\n');
};

const isMdTable = (text) => {
    if (!text) return false;
    const lines = text.trim().split('\n').map(l => l.trim());
    return lines.length >= 2 &&
        lines.filter(l => l.startsWith('|')).length >= 2 &&
        lines.some(l => l.split('|').slice(1).every(c => /^[:\-\s]+$/.test(c)));
};

const TableEditPanel = ({ editOriginalText, editText, setEditText, editPosition, handleCancelEdit, handleSaveEdit, isLightMode, primaryColor }) => {
    const isTable = isMdTable(editOriginalText);
    const [tableData, setTableData] = useState(() =>
        isTable ? parseMarkdownTable(editOriginalText) : []
    );

    useEffect(() => {
        if (isTable && tableData.length > 0) {
            setEditText(serializeMarkdownTable(tableData));
        }
    }, [tableData, isTable, setEditText]);

    return (
        <div
            className="absolute z-[100] w-[95%] max-w-[640px] rounded-xl border overflow-hidden shadow-2xl"
            style={{
                left: `${Math.max(16, editPosition.x)}px`,
                top: `${editPosition.y + 8}px`,
                transform: 'translateX(-50%)',
                background: isLightMode ? '#ffffff' : '#1a1a2e',
                borderColor: `${primaryColor}33`,
                boxShadow: isLightMode ? '0 4px 20px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.5)',
            }}
        >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: primaryColor }}>
                    <Pencil className="w-3.5 h-3.5" />
                    {isTable ? '✦ Edit Table' : 'Editing Selection'}
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={handleCancelEdit} className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-md hover:bg-white/[0.06] transition-all cursor-pointer">Cancel</button>
                    <button onClick={handleSaveEdit} className="text-[11px] font-bold px-3 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5" style={{ color: primaryColor, backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}33` }}>
                        <Check className="w-3 h-3" /> Save
                    </button>
                </div>
            </div>

            {isTable && tableData.length > 0 ? (
                <div className="overflow-x-auto px-3 py-3">
                    <table className="w-full border-collapse">
                        <tbody>
                            {tableData.map((row, ri) => (
                                <tr key={ri} style={{ background: ri === 0 ? `${primaryColor}14` : 'transparent' }}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="border border-white/[0.1] p-0">
                                            <input
                                                type="text"
                                                value={cell}
                                                onChange={(e) => {
                                                    setTableData(prev =>
                                                        prev.map((r, rr) =>
                                                            rr === ri ? r.map((c, cc) => cc === ci ? e.target.value : c) : r
                                                        )
                                                    );
                                                }}
                                                className={`w-full bg-transparent px-3 py-2 text-[12px] focus:outline-none transition-colors ${ri === 0 ? 'text-white font-bold' : 'text-slate-300'
                                                    }`}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="text-[10px] text-slate-600 mt-2 px-1 italic">Header row highlighted. Edit cells directly — saves as Markdown table.</div>
                </div>
            ) : (
                <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-transparent text-slate-200 text-[13px] font-mono px-4 py-3 resize-none focus:outline-none leading-relaxed"
                    rows={Math.min(Math.max(editText.split('\n').length + 1, 4), 12)}
                    autoFocus
                />
            )}
        </div>
    );
};


const ViewNoteModal = ({ 
    isOpen, 
    onClose, 
    note, 
    subjectId, 
    onNavigateToQuestion, 
    sourceImage, 
    isFetchingImage, 
    onEdit, 
    onPrev, 
    onNext, 
    onAddToNote, 
    parentNoteTitle, 
    onUpdateNoteContent, 
    onAIEditSection, 
    childNotes, 
    onOpenChildNote, 
    allNotes = [], 
    onNavigateToNote,
    isMinimized,
    onMinimize
}) => {

    const { user, updatePreferences } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [noteImages, setNoteImages] = useState([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [isFullscreen] = useState(true);
    const [isLightMode, setIsLightMode] = useState(localStorage.getItem('theme') !== 'dark');
    const [fontSize, setFontSize] = useState(user?.preferences?.font_size || 17);
    const [codeFontSize, setCodeFontSize] = useState(user?.preferences?.code_font_size || 20);
    const [lineHeight, setLineHeight] = useState(Number(user?.preferences?.line_height) || 1.6);
    const [primaryColorLight, setPrimaryColorLight] = useState(user?.preferences?.primary_color_light || '#10b981'); // Emerald-500
    const [primaryColorDark, setPrimaryColorDark] = useState(user?.preferences?.primary_color_dark || '#34d399');  // Emerald-400
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const [showNotesList, setShowNotesList] = useState(false);
    const [notesListSearch, setNotesListSearch] = useState('');
    const notesListRef = useRef(null);

    // Close notes list on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notesListRef.current && !notesListRef.current.contains(e.target)) setShowNotesList(false);
        };
        if (showNotesList) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showNotesList]);

    const activePrimaryColor = isLightMode ? primaryColorLight : primaryColorDark;

    // Sync local state if preferences change globally
    useEffect(() => {
        if (user?.preferences) {
            setFontSize(user.preferences.font_size || 17);
            setCodeFontSize(user.preferences.code_font_size || 20);
            setLineHeight(Number(user.preferences.line_height) || 1.6);
            setPrimaryColorLight(user.preferences.primary_color_light || '#10b981');
            setPrimaryColorDark(user.preferences.primary_color_dark || '#34d399');
        }
    }, [user?.preferences]);

    const handleUpdateSettings = async (type, val) => {
        let updateBody = {
            font_size: fontSize,
            code_font_size: codeFontSize,
            line_height: lineHeight,
            primary_color_light: primaryColorLight,
            primary_color_dark: primaryColorDark
        };

        if (type === 'font') { setFontSize(val); updateBody.font_size = val; }
        else if (type === 'code') { setCodeFontSize(val); updateBody.code_font_size = val; }
        else if (type === 'line') { setLineHeight(val); updateBody.line_height = val; }
        else if (type === 'color_light') { setPrimaryColorLight(val); updateBody.primary_color_light = val; }
        else if (type === 'color_dark') { setPrimaryColorDark(val); updateBody.primary_color_dark = val; }

        setIsSavingSettings(true);
        try {
            await updatePreferences(updateBody);
        } catch (err) {
            console.error('Error saving preferences:', err);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const [activeHeadingId, setActiveHeadingId] = useState(null);
    const [headings, setHeadings] = useState([]);
    const contentRef = useRef(null);

    // Text selection toolbar state
    const [selectionTooltip, setSelectionTooltip] = useState(null); // { x, y, text }
    const tooltipRef = useRef(null);

    // Inline edit state
    const [editMode, setEditMode] = useState(null); // null | 'edit' | 'ai-instruction' | 'ai-preview'
    const [editText, setEditText] = useState('');
    const [editOriginalText, setEditOriginalText] = useState('');
    const [editPosition, setEditPosition] = useState({ x: 0, y: 0 }); // position for floating panel
    const [aiInstruction, setAiInstruction] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const handleSafeAction = useCallback((action) => {
        if (editMode) {
            if (!window.confirm("You have unsaved edits. Are you sure you want to discard them?")) {
                return;
            }
        }
        if (action) action();
    }, [editMode]);

    const lastFetchedNoteIdRef = useRef(null);

    useEffect(() => {
        if (isOpen && note?.id && (subjectId || note?.subject_id)) {
            // Prevent double-fetching if this note's images were just loaded
            if (lastFetchedNoteIdRef.current === note.id) return;
            
            const fetchImages = async () => {
                setLoadingImages(true);
                lastFetchedNoteIdRef.current = note.id;
                try {
                    const data = await notesApi.getImages(subjectId || note.subject_id, note.id);
                    setNoteImages(data.images || []);
                } catch (err) {
                    console.error('Failed to fetch note images:', err);
                    lastFetchedNoteIdRef.current = null; // Reset on error to allow retry
                } finally {
                    setLoadingImages(false);
                }
            };
            fetchImages();
        } else if (!isOpen) {
            setNoteImages([]);
            lastFetchedNoteIdRef.current = null;
        }
    }, [isOpen, note?.id, subjectId, note?.subject_id]);

    const processedContent = useMemo(() => {
        const rawText = note?.content || '';
        let text = rawText;
        
        // 1. Replace image placeholders [[IMG_N | params]] with standard markdown image tags
        if (noteImages && noteImages.length > 0) {
            noteImages.forEach(img => {
                const ref = img.referenceId;
                const data = img.data;
                if (ref && data) {
                    // Match [[IMG_XXXX]] or [[IMG_XXXX | right | small]]
                    const regex = new RegExp(`\\[\\[\\s*${ref}\\s*(?:\\|\\s*([^\\]]+))?\\s*\\]\\]`, 'gi');
                    
                    text = text.replace(regex, (match, params) => {
                        // Encode parameters into the alt text: "IMG_XXXX:right:small"
                        const encodedAlt = params 
                            ? `${ref}:${params.trim().replace(/\s*\|\s*/g, ':')}`
                            : ref;
                        return `\n\n![${encodedAlt}](${data})\n\n`;
                    });
                }
            });
        }
        
        // 2. Run standard markdown preprocessing
        return preprocessMarkdown(text);
    }, [note?.content, noteImages]);
    const hasHeadings = headings.length > 0;
    const hasLinkedNotes = childNotes && childNotes.length > 0;

    // Memoize sidebar styles to avoid recalculating on every render
    const sidebarStyles = useMemo(() => getSidebarStyles(isLightMode, activePrimaryColor), [isLightMode, activePrimaryColor]);
    const sidebarContainerStyle = useMemo(() => {
        const base = sidebarOpen ? sidebarStyles.container : { ...sidebarStyles.container, ...sidebarStyles.containerCollapsed };
        return {
            ...base,
            willChange: 'transform, opacity'
        };
    }, [sidebarOpen, sidebarStyles]);
    const sidebarBoxShadow = useMemo(() => {
        if (!sidebarOpen) return 'none';
        return isLightMode ? '2px 0 12px rgba(0,0,0,0.05)' : '2px 0 12px rgba(0,0,0,0.3)';
    }, [sidebarOpen, isLightMode]);
    const sidebarBgColor = useMemo(() => isLightMode ? '#f1f3f6' : '#1e1e2d', [isLightMode]);

    // Helper to extract plain text from React children to check for Callout labels
    const extractText = (node) => {
        if (!node) return '';
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(extractText).join('');
        if (node.props && node.props.children) return extractText(node.props.children);
        return '';
    };

    // Memoize markdown components and plugins to prevent unnecessary re-renders
    const markdownComponents = useMemo(() => ({
        pre: ({ children }) => children, // Bypass default pre-container to prevent nesting and ensure true alignment
        table: ({ ...props }) => <div className="overflow-x-auto w-full my-8 rounded-xl border border-slate-200/20 shadow-sm"><table className="w-full text-left border-collapse min-w-[500px]" {...props} /></div>,
        thead: ({ ...props }) => <thead className={`${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`} {...props} />,
        th: ({ ...props }) => <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px] border-b border-white/5" {...props} />,
        td: ({ ...props }) => <td className="px-4 py-3 border-b border-white/5 text-[13px]" {...props} />,
        img: ({ ...props }) => {
            const altParts = (props.alt || '').split(':');
            const refId = altParts[0];
            const params = altParts.slice(1).map(p => p.toLowerCase().trim());
            
            const handleImageClick = (e) => {
                e.preventDefault();
                const src = props.src;
                if (!src) return;
                
                // For data URIs, convert to blob to avoid browser URL length limits or security blocks
                if (src.startsWith('data:')) {
                    const byteString = atob(src.split(',')[1]);
                    const mimeString = src.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                    // Optional: revoke after a while to save memory
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                } else {
                    window.open(src, '_blank');
                }
            };

            // Layout Logic
            const isRight = params.includes('right');
            const isLeft = params.includes('left');
            const isSmall = params.includes('small');
            const isLarge = params.includes('large');
            const isFull = params.includes('full');

            let widthClass = 'max-w-[85%]';
            if (isSmall) widthClass = 'max-w-[320px]';
            if (isLarge) widthClass = 'max-w-[95%]';
            if (isFull) widthClass = 'max-w-full';

            let alignClass = 'mx-auto';
            if (isRight) alignClass = 'ml-auto mr-0 sm:-mr-4';
            if (isLeft) alignClass = 'mr-auto ml-0 sm:-ml-4';

            return (
                <div className={`my-8 group relative flex flex-col ${alignClass} ${widthClass}`}>
                    <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-zoom-in ${isLightMode ? 'border-slate-200 shadow-sm bg-white hover:border-slate-400' : 'border-white/10 shadow-lg bg-black/20 hover:border-white/30'}`}
                         onClick={handleImageClick}>
                        
                        <img 
                            className="w-full h-auto block" 
                            {...props} 
                        />

                        {/* Lean Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center pointer-events-none">
                            <div className={`p-2.5 rounded-xl opacity-0 transition-opacity duration-300 ${isLightMode ? 'bg-white shadow-md border border-slate-200' : 'bg-slate-900 border border-white/10 shadow-xl'}`}>
                                <ExternalLink className={`w-4 h-4 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`} />
                            </div>
                        </div>

                        {/* Solid ID Badge */}
                        <div className={`absolute bottom-4 ${isRight ? 'left-4' : 'right-4'} z-20`}>
                            <div className={`px-3 py-1.5 rounded-lg border shadow-sm transition-all duration-300 ${isLightMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/20 text-white'}`}>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{refId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        },
        blockquote: ({ children, ...props }) => {
            const rawText = extractText(children);
            const alertMatch = rawText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

            if (alertMatch) {
                const type = alertMatch[1];
                // Strip the [!TYPE] marker from the content
                const cleanChildren = React.Children.map(children, child => {
                    if (typeof child === 'string') {
                        return child.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
                    }
                    if (child.props && typeof child.props.children === 'string') {
                        const newText = child.props.children.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
                        if (!newText) return null;
                        return React.cloneElement(child, { children: newText });
                    }
                    if (Array.isArray(child.props?.children)) {
                        const first = child.props.children[0];
                        if (typeof first === 'string') {
                            const newFirst = first.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
                            const newChildren = [...child.props.children];
                            if (!newFirst) newChildren.shift();
                            else newChildren[0] = newFirst;
                            return React.cloneElement(child, { children: newChildren });
                        }
                    }
                    return child;
                });

                return (
                    <MarkdownCallout type={type} isLightMode={isLightMode} primaryColor={activePrimaryColor}>
                        {cleanChildren}
                    </MarkdownCallout>
                );
            }
            return (
                <blockquote className={`my-6 pl-4 border-l-4 italic opacity-90 ${isLightMode ? 'border-slate-300' : 'border-white/10'}`} {...props}>
                    {children}
                </blockquote>
            );
        },
        code: ({ className, children, ...props }) => {
            // Robust detection for block vs inline code in ReactMarkdown v10
            const isBlock = /language-(\w+)/.exec(className || '') || String(children).includes('\n');

            return isBlock ? (
                <SimpleCodeBlock isLightMode={isLightMode} fontSize={codeFontSize} primaryColor={activePrimaryColor} className={className}>
                    {children}
                </SimpleCodeBlock>
            ) : (
                <code
                    className={`px-1.5 py-0.5 rounded-md text-[0.85em] font-bold font-mono border transition-colors select-all`}
                    style={{
                        backgroundColor: `${activePrimaryColor}15`,
                        color: activePrimaryColor,
                        borderColor: `${activePrimaryColor}25`
                    }}
                    {...props}
                >
                    {children}
                </code>
            );
        },
        a: ({ children, ...props }) => (
            <a
                {...props}
                className="font-bold underline decoration-2 underline-offset-4 transition-colors"
                style={{ color: activePrimaryColor, textDecorationColor: `${activePrimaryColor}40` }}
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
                {props.href?.startsWith('http') && <LinkIcon size={10} className="inline ml-1 mb-1 opacity-50" />}
            </a>
        )
    }), [isLightMode, codeFontSize, activePrimaryColor]);

    const markdownPlugins = useMemo(() => [remarkGfm, remarkMath], []);
    const markdownRehypePlugins = useMemo(() => [rehypeRaw, [rehypeKatex, { strict: false }]], []);

    // Build TOC by reading actual DOM headings after ReactMarkdown renders
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;
        const timer = setTimeout(() => {
            const els = container.querySelectorAll('h1, h2, h3');
            const toc = Array.from(els).map((el, i) => {
                const id = `toc-heading-${i}`;
                el.id = id;
                el.style.scrollMarginTop = '16px';
                return {
                    level: parseInt(el.tagName[1], 10),
                    text: el.textContent || `Heading ${i + 1}`,
                    id,
                };
            });
            setHeadings(toc);
        }, 50);
        return () => clearTimeout(timer);
    }, [processedContent]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editMode) return; // Don't navigate while editing
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
            if (e.key === 'ArrowRight' && onNext) onNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onPrev, onNext, onClose, editMode]);

    // Scroll spy (throttled for performance)
    useEffect(() => {
        const container = contentRef.current;
        if (!container || headings.length === 0) return;

        let rafId = null;

        const handleScroll = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const containerRect = container.getBoundingClientRect();
                let currentId = null;
                for (const h of headings) {
                    const el = document.getElementById(h.id);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        if (rect.top <= containerRect.top + containerRect.height * 0.4) {
                            currentId = h.id;
                        }
                    }
                }
                setActiveHeadingId(currentId);

                // Progress bar
                const scrollHeight = container.scrollHeight - container.clientHeight;
                setReadingProgress(scrollHeight > 0 ? (container.scrollTop / scrollHeight) * 100 : 0);

                lastScrollTop = container.scrollTop;
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [headings]);

    // Helper to extract the markdown snippet corresponding to the plain text selection
    const getMarkdownForSelection = useCallback((markdown, plainText) => {
        if (!plainText || !markdown) return plainText;
        try {
            const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tokens = plainText.trim().split(/\s+/);
            if (tokens.length === 0) return plainText;
            const regexPattern = tokens.map(escapeRegExp).join('[\\s\\S]{1,150}?');
            const regex = new RegExp(regexPattern, 'i');
            const match = markdown.match(regex);
            return match ? match[0] : plainText;
        } catch (err) {
            console.error('Error finding markdown selection', err);
            return plainText;
        }
    }, []);

    // Detect if selection is inside a rendered <table> and extract the full markdown table block
    const extractFullTableFromMarkdown = useCallback((markdown, selectionPlainText) => {
        if (!markdown || !selectionPlainText) return null;
        try {
            // Find all markdown table blocks in the note
            // A markdown table block = consecutive lines that start with |
            const lines = markdown.split('\n');
            const tableBlocks = [];
            let inTable = false;
            let tableStart = -1;
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (trimmed.startsWith('|')) {
                    if (!inTable) { inTable = true; tableStart = i; }
                } else {
                    if (inTable) {
                        tableBlocks.push(lines.slice(tableStart, i).join('\n'));
                        inTable = false;
                    }
                }
            }
            if (inTable) tableBlocks.push(lines.slice(tableStart).join('\n'));

            // Find which table block contains any word from the selection
            const selWords = selectionPlainText.trim().split(/\s+/).filter(w => w.length > 3);
            for (const block of tableBlocks) {
                const blockLower = block.toLowerCase();
                const matches = selWords.filter(w => blockLower.includes(w.toLowerCase()));
                if (matches.length > 0) return block;
            }
            return null;
        } catch {
            return null;
        }
    }, []);


    // Text selection handler
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleMouseUp = () => {
            if (editMode) return; // Don't show tooltip while in edit mode
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection?.toString().trim();

                if (selectedText && selectedText.length > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    // Check if selection is inside a rendered table cell
                    let node = range.commonAncestorContainer;
                    let insideTable = false;
                    while (node && node !== container) {
                        if (node.nodeName === 'TABLE') { insideTable = true; break; }
                        node = node.parentNode;
                    }

                    let rawMarkdown;
                    if (insideTable) {
                        // Expand selection to the full markdown table block
                        rawMarkdown =
                            extractFullTableFromMarkdown(note?.content || '', selectedText) ||
                            getMarkdownForSelection(note?.content || '', selectedText);
                    } else {
                        rawMarkdown = getMarkdownForSelection(note?.content || '', selectedText);
                    }

                    setSelectionTooltip({
                        x: rect.left + rect.width / 2 - containerRect.left,
                        y: rect.top - containerRect.top + container.scrollTop - 10,
                        text: rawMarkdown,
                    });
                } else {
                    setSelectionTooltip(null);
                }
            }, 10);
        };

        const handleMouseDown = (e) => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
                setSelectionTooltip(null);
            }
        };

        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mousedown', handleMouseDown);
        return () => {
            container.removeEventListener('mouseup', handleMouseUp);
            container.removeEventListener('mousedown', handleMouseDown);
        };
    }, [editMode, getMarkdownForSelection, extractFullTableFromMarkdown, note?.content]);

    // Clear all states when note changes
    useEffect(() => {
        setSelectionTooltip(null);
        setEditMode(null);
        setEditText('');
        setEditOriginalText('');
        setAiInstruction('');
        setAiResult('');
    }, [note?.id]);

    const scrollToHeading = useCallback((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveHeadingId(id);
        }
    }, []);

    // handleOpenOriginal removed as it was unused

    // --- Toolbar Actions ---
    const handleAddToNote = () => {
        if (selectionTooltip?.text && onAddToNote) {
            onAddToNote(selectionTooltip.text);
            setSelectionTooltip(null);
            window.getSelection()?.removeAllRanges();
        }
    };

    const handleStartEdit = () => {
        if (!selectionTooltip?.text) return;
        setEditOriginalText(selectionTooltip.text);
        setEditText(selectionTooltip.text);
        setEditPosition({ x: selectionTooltip.x, y: selectionTooltip.y });
        setEditMode('edit');
        setSelectionTooltip(null);
        window.getSelection()?.removeAllRanges();
    };

    const handleSaveEdit = () => {
        if (!editOriginalText || !onUpdateNoteContent) return;
        const newContent = (note.content || '').replace(editOriginalText, editText);
        onUpdateNoteContent(note.id, newContent);
        setEditMode(null);
        setEditText('');
        setEditOriginalText('');
    };

    const handleStartAIEdit = () => {
        if (!selectionTooltip?.text) return;
        setEditOriginalText(selectionTooltip.text);
        setAiInstruction('');
        setAiResult('');
        setEditPosition({ x: selectionTooltip.x, y: selectionTooltip.y });
        setEditMode('ai-instruction');
        setSelectionTooltip(null);
        window.getSelection()?.removeAllRanges();
    };

    const handleSubmitAIEdit = async () => {
        if (!editOriginalText || !aiInstruction.trim() || !onAIEditSection) return;
        setAiLoading(true);
        setEditMode('ai-preview');
        setAiResult(''); // Clear previous result
        try {
            // Updated to handle streaming via a callback
            await onAIEditSection(editOriginalText, aiInstruction, (chunk) => {
                setAiLoading(false); // Once chunks start coming, we're no longer "loading" initial state
                setAiResult(prev => prev + chunk);
            });
        } catch (error) {
            console.error('AI Edit stream error:', error);
            toast.error('AI edit failed');
            setAiResult('');
            setEditMode('ai-instruction');
        } finally {
            setAiLoading(false);
        }
    };

    const handleAcceptAIEdit = () => {
        if (!editOriginalText || !aiResult || !onUpdateNoteContent) return;
        const newContent = (note.content || '').replace(editOriginalText, aiResult);
        onUpdateNoteContent(note.id, newContent);
        setEditMode(null);
        setEditOriginalText('');
        setAiResult('');
        setAiInstruction('');
    };

    const handleCancelEdit = () => {
        setEditMode(null);
        setEditText('');
        setEditOriginalText('');
        setAiInstruction('');
        setAiResult('');
    };



    if (!isOpen || !note) return null;

    return (
        <ModalPortal>
            {/* Minimized Floating Restore Bar */}
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
                            title="Restore Note"
                        >
                            <div className="relative">
                                <EyeOff size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-[#1a1a2e]" />
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
                            title="Close Note"
                        >
                            <X size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[110] flex flex-col items-center justify-center overflow-hidden font-sans transition-all duration-500
                    ${isMinimized ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                
                <div className={`absolute inset-0 z-0 modal-backdrop fade-in transition-opacity duration-500 ${isLightMode ? 'bg-black/10' : 'bg-black/80'} ${isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    style={{ padding: isFullscreen ? '0' : 'undefined' }}
                />

                <div
                    className={`w-full flex flex-col z-10 ${isFullscreen ? 'h-[100dvh] sm:max-h-screen rounded-none border-none' : 'h-[95dvh] sm:h-auto sm:max-h-[85vh] rounded-t-[1.5rem] sm:rounded-2xl shadow-2xl sm:border'} overflow-hidden relative transition-all duration-300 transform`}
                    style={{
                        background: isLightMode ? '#f5f7fa' : '#161625',
                        borderColor: isLightMode ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                        maxWidth: isFullscreen ? 'none' : (hasHeadings ? '72rem' : '56rem'),
                        contain: 'layout paint style',
                        isolation: 'isolate'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b shrink-0 z-30 ${isLightMode ? 'bg-[#e5e7eb] border-slate-300/60 text-slate-900' : 'bg-[#161625] border-white/[0.05] text-white'}`}>
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2">
                            {/* LeetCode-style List button */}
                            <div className="relative hidden md:block" ref={notesListRef}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowNotesList(v => !v); setNotesListSearch(''); }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                                        showNotesList
                                            ? isLightMode ? 'bg-primary/10 text-primary border-primary/30' : 'bg-primary/20 text-primary border-primary/40'
                                            : isLightMode ? 'bg-white border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:border-primary/30 hover:text-primary'
                                    }`}
                                    title="All Notes"
                                >
                                    <List className="w-3.5 h-3.5" />
                                    <span>List</span>
                                    {allNotes.length > 0 && <span className="opacity-60 text-[10px] font-medium">{allNotes.length}</span>}
                                </button>

                                {showNotesList && (
                                    <div className={`absolute top-full left-0 mt-2 w-80 max-h-[480px] rounded-xl shadow-2xl border overflow-hidden flex flex-col z-[200] animate-in fade-in slide-in-from-top-2 duration-200
                                        ${isLightMode ? 'bg-white border-slate-200 shadow-slate-300/40' : 'bg-[#13131f] border-white/10 shadow-black/70'}`}>
                                        {/* Header */}
                                        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
                                            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <List size={13} style={{ color: activePrimaryColor }} />
                                                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: activePrimaryColor }}>All Notes</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                    isLightMode ? 'bg-slate-200 text-slate-500' : 'bg-white/10 text-slate-400'
                                                }`}>{allNotes.length}</span>
                                            </div>
                                        </div>
                                        {/* Search */}
                                        <div className={`px-3 py-2.5 border-b shrink-0 ${ isLightMode ? 'border-slate-100' : 'border-white/[0.04]' }`}>
                                            <div className="relative">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Search notes..."
                                                    value={notesListSearch}
                                                    onChange={e => setNotesListSearch(e.target.value)}
                                                    className={`w-full text-[12px] rounded-lg px-8 py-2 outline-none border transition-all font-medium
                                                        ${isLightMode
                                                            ? 'bg-slate-50 border-slate-200 focus:border-slate-300 text-slate-700 placeholder:text-slate-400'
                                                            : 'bg-white/[0.04] border-white/[0.07] focus:border-white/20 text-white placeholder:text-slate-600'}`}
                                                />
                                                <Hash className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${ isLightMode ? 'text-slate-400' : 'text-slate-600' }`} />
                                            </div>
                                        </div>
                                        {/* List */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                            {allNotes.length === 0 ? (
                                                <div className="py-10 text-center">
                                                    <FileText className={`w-8 h-8 mx-auto mb-2 opacity-20 ${ isLightMode ? 'text-slate-800' : 'text-white' }`} />
                                                    <p className={`text-[11px] font-bold uppercase tracking-widest ${ isLightMode ? 'text-slate-400' : 'text-slate-600' }`}>No notes</p>
                                                </div>
                                            ) : (
                                                allNotes
                                                    .filter(n => (n.title || '').toLowerCase().includes(notesListSearch.toLowerCase()))
                                                    .map((n, idx) => {
                                                        const isActive = n.id?.toString() === note?.id?.toString();
                                                        return (
                                                            <button
                                                                key={n.id}
                                                                onClick={() => {
                                                                    setShowNotesList(false);
                                                                    setNotesListSearch('');
                                                                    handleSafeAction(() => onNavigateToNote && onNavigateToNote(n));
                                                                }}
                                                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all cursor-pointer group/ni ${
                                                                    isActive
                                                                        ? (isLightMode ? 'bg-primary/10' : 'bg-primary/20')
                                                                        : (isLightMode ? 'hover:bg-slate-100' : 'hover:bg-white/[0.05]')
                                                                }`}
                                                                style={isActive ? { borderLeft: `3px solid ${activePrimaryColor}`, paddingLeft: '10px' } : { borderLeft: '3px solid transparent', paddingLeft: '10px' }}
                                                            >
                                                                <span className={`text-[10px] font-black w-5 shrink-0 text-center tabular-nums ${
                                                                    isActive ? '' : (isLightMode ? 'text-slate-400' : 'text-slate-600')
                                                                }`} style={isActive ? { color: activePrimaryColor } : {}}>{idx + 1}</span>
                                                                <span className={`text-[12px] font-semibold truncate flex-1 leading-snug ${
                                                                    isActive
                                                                        ? (isLightMode ? 'text-primary font-bold' : 'text-primary-light font-bold')
                                                                        : (isLightMode ? 'text-slate-700' : 'text-slate-300')
                                                                }`} style={isActive ? { color: activePrimaryColor } : {}}>
                                                                    {n.title || 'Untitled Note'}
                                                                </span>
                                                                {isActive && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activePrimaryColor }} />}
                                                            </button>
                                                        );
                                                    })
                                            )}
                                            {allNotes.length > 0 && allNotes.filter(n => (n.title || '').toLowerCase().includes(notesListSearch.toLowerCase())).length === 0 && (
                                                <div className="py-8 text-center">
                                                    <p className={`text-[11px] font-bold ${ isLightMode ? 'text-slate-400' : 'text-slate-600' }`}>No matches</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Footer nav */}
                                        {(onPrev || onNext) && (
                                            <div className={`flex items-center justify-between px-3 py-2.5 border-t shrink-0 ${
                                                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
                                            }`}>
                                                <button
                                                    onClick={() => { setShowNotesList(false); handleSafeAction(() => onPrev?.()); }}
                                                    disabled={!onPrev}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                                        !onPrev ? 'opacity-30 cursor-not-allowed' : (isLightMode ? 'hover:bg-slate-200 cursor-pointer text-slate-600' : 'hover:bg-white/10 cursor-pointer text-slate-400')
                                                    }`}
                                                >
                                                    <ChevronLeft size={13} /> Prev
                                                </button>
                                                <span className={`text-[10px] font-medium ${ isLightMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {allNotes.findIndex(n => n.id?.toString() === note?.id?.toString()) + 1} / {allNotes.length}
                                                </span>
                                                <button
                                                    onClick={() => { setShowNotesList(false); handleSafeAction(() => onNext?.()); }}
                                                    disabled={!onNext}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                                        !onNext ? 'opacity-30 cursor-not-allowed' : (isLightMode ? 'hover:bg-slate-200 cursor-pointer text-slate-600' : 'hover:bg-white/10 cursor-pointer text-slate-400')
                                                    }`}
                                                >
                                                    Next <ChevronRight size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {(onPrev || onNext) && (
                                <div className={`hidden md:flex items-center mr-1 rounded-lg border overflow-hidden ${isLightMode ? 'border-slate-300 bg-white' : 'border-white/[0.1] bg-white/[0.02]'}`}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSafeAction(() => onPrev?.()); }}
                                        disabled={!onPrev}
                                        className={`p-1.5 transition-all ${!onPrev ? 'opacity-30 cursor-not-allowed' : isLightMode ? 'hover:bg-slate-100 cursor-pointer' : 'hover:bg-white/[0.1] cursor-pointer'}`}
                                        title="Previous Note"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className={`w-[1px] h-4 ${isLightMode ? 'bg-slate-300' : 'bg-white/[0.1]'}`} />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSafeAction(() => onNext?.()); }}
                                        disabled={!onNext}
                                        className={`p-1.5 transition-all ${!onNext ? 'opacity-30 cursor-not-allowed' : isLightMode ? 'hover:bg-slate-100 cursor-pointer' : 'hover:bg-white/[0.1] cursor-pointer'}`}
                                        title="Next Note"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {/* Back to parent note button */}
                            {parentNoteTitle && (
                                <button
                                    onClick={() => handleSafeAction(onClose)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-amber-500 hover:bg-amber-500/10 transition-all border border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
                                    title={`Back to "${parentNoteTitle}"`}
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span className="max-w-[120px] truncate hidden sm:inline">Back</span>
                                </button>
                            )}
                            <div className="p-1.5 sm:p-2 rounded-xl shrink-0" style={{ backgroundColor: `${activePrimaryColor}15`, color: activePrimaryColor, border: `1px solid ${activePrimaryColor}30`, boxShadow: `0 0 10px ${activePrimaryColor}10` }}>
                                <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`text-[15px] sm:text-[16px] font-heading font-bold ${isLightMode ? 'text-slate-900' : 'text-white'} tracking-tight leading-snug truncate`}>
                                    {note.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 opacity-80">
                                    <span className={`text-[10px] sm:text-[11px] font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {formatDate(note.created_at)}
                                    </span>

                                </div>
                            </div>
                        </div>
                        {/* Control Panel Group */}
                        <div className="flex items-center shrink-0">
                            <div className={`flex items-center gap-1 p-1 rounded-xl ${isLightMode ? 'bg-slate-100/80 border border-slate-200/60' : 'bg-white/[0.03] border border-white/[0.05]'}`}>
                                {(hasHeadings || hasLinkedNotes) && (
                                    <button
                                        onClick={() => setSidebarOpen(prev => !prev)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors`}
                                        style={sidebarOpen ? { backgroundColor: activePrimaryColor, color: '#fff' } : { backgroundColor: `${activePrimaryColor}20`, color: activePrimaryColor }}
                                        title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                                    >
                                        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                                    </button>
                                )}
                                {note.question_id && onNavigateToQuestion && (
                                    <button
                                        onClick={() => handleSafeAction(() => {
                                            onClose();
                                            onNavigateToQuestion(note.question_id);
                                        })}
                                        className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors`}
                                        style={{ backgroundColor: `${activePrimaryColor}20`, color: activePrimaryColor }}
                                        title={note.is_note_link ? 'View Note' : 'View Question'}
                                    >
                                        <LinkIcon className="w-4 h-4" />
                                    </button>
                                )}
                                {onEdit && (
                                    <button
                                        onClick={() => handleSafeAction(() => {
                                            onEdit(note);
                                        })}
                                        className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors`}
                                        style={{ backgroundColor: `${activePrimaryColor}20`, color: activePrimaryColor }}
                                        title="Edit Note"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}

                                {((hasHeadings || hasLinkedNotes) || (note.question_id && onNavigateToQuestion) || onEdit) && (
                                    <div className={`w-[1px] h-4 mx-0.5 ${isLightMode ? 'bg-slate-300' : 'bg-white/[0.1]'}`} />
                                )}

                                <button
                                    onClick={() => setIsLightMode(!isLightMode)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isLightMode ? 'bg-white shadow-sm text-amber-500 hover:bg-amber-50' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}
                                    title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                                >
                                    {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </button>
                                <div className={`w-[1px] h-4 mx-0.5 ${isLightMode ? 'bg-slate-300' : 'bg-white/[0.1]'}`} />

                                <div className="relative">
                                    <button
                                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isSettingsOpen ? 'shadow-md ring-2 ring-white/10' : isLightMode ? 'bg-white shadow-sm text-slate-500 hover:bg-slate-50' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                        style={isSettingsOpen ? { backgroundColor: activePrimaryColor, color: '#fff' } : {}}
                                        title="Reading Settings"
                                    >
                                        {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                                    </button>

                                    {isSettingsOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[100]" onClick={() => setIsSettingsOpen(false)} />
                                            <div
                                                className={`absolute right-0 mt-2 w-[260px] p-4 rounded-xl border shadow-2xl z-[101] backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200
                                                    ${isLightMode ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-[#1a1a2e]/95 border-white/5 text-white'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${activePrimaryColor}15`, color: activePrimaryColor }}>
                                                        <Settings size={14} />
                                                    </div>
                                                    <span className="text-[12px] font-bold uppercase tracking-wider opacity-80">Reading Preferences</span>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Font Selection */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Type size={11} className="opacity-60" />
                                                            <span className="text-[11px] font-bold opacity-60 uppercase tracking-tight">Typography</span>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-medium opacity-80">Body Size</span>
                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${activePrimaryColor}15`, color: activePrimaryColor }}>{fontSize}px</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {[14, 16, 17, 18, 20].map(s => (
                                                                    <button
                                                                        key={s}
                                                                        onClick={() => handleUpdateSettings('font', s)}
                                                                        className={`flex-1 h-7 rounded-md text-[11px] font-bold transition-all
                                                                            ${fontSize === s ? 'text-white' : isLightMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/5 hover:bg-white/10'}`}
                                                                        style={fontSize === s ? { backgroundColor: activePrimaryColor, boxShadow: `0 4px 12px ${activePrimaryColor}30` } : {}}
                                                                    >
                                                                        {s === 17 ? 'N' : s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-medium opacity-80">Code Size</span>
                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${activePrimaryColor}15`, color: activePrimaryColor }}>{codeFontSize}px</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {[14, 15, 18, 20, 24].map(s => (
                                                                    <button
                                                                        key={s}
                                                                        onClick={() => handleUpdateSettings('code', s)}
                                                                        className={`flex-1 h-7 rounded-md text-[11px] font-bold transition-all
                                                                            ${codeFontSize === s ? 'text-white' : isLightMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/5 hover:bg-white/10'}`}
                                                                        style={codeFontSize === s ? { backgroundColor: activePrimaryColor, boxShadow: `0 4px 12px ${activePrimaryColor}30` } : {}}
                                                                    >
                                                                        {s === 15 ? 'N' : s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Gap Settings */}
                                                    <div className="space-y-3 pt-1 border-t border-white/5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold opacity-60 uppercase tracking-tight">Line Spacing</span>
                                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${activePrimaryColor}15`, color: activePrimaryColor }}>{lineHeight}x</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {[1.4, 1.6, 1.8, 2.0].map(s => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => handleUpdateSettings('line', s)}
                                                                    className={`flex-1 h-7 rounded-md text-[11px] font-bold transition-all
                                                                        ${lineHeight === s ? 'text-white' : isLightMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/5 hover:bg-white/10'}`}
                                                                    style={lineHeight === s ? { backgroundColor: activePrimaryColor, boxShadow: `0 4px 12px ${activePrimaryColor}30` } : {}}
                                                                >
                                                                    {s === 1.4 ? 'I' : s === 1.6 ? 'II' : s === 1.8 ? 'III' : 'IV'}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Color Palette */}
                                                    <div className="space-y-3 pt-1 border-t border-white/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Palette size={11} className="opacity-60" />
                                                            <span className="text-[11px] font-bold opacity-60 uppercase tracking-tight">Accent Color</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-1">
                                                            {[
                                                                { l: '#10b981', d: '#34d399', name: 'Emerald' },
                                                                { l: '#6366f1', d: '#818cf8', name: 'Indigo' },
                                                                { l: '#8b5cf6', d: '#a78bfa', name: 'Violet' },
                                                                { l: '#f59e0b', d: '#fbbf24', name: 'Amber' },
                                                                { l: '#f43f5e', d: '#fb7185', name: 'Rose' }
                                                            ].map(color => (
                                                                <button
                                                                    key={color.l}
                                                                    onClick={() => {
                                                                        handleUpdateSettings('color_light', color.l);
                                                                        handleUpdateSettings('color_dark', color.d);
                                                                    }}
                                                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center
                                                                        ${(isLightMode ? primaryColorLight === color.l : primaryColorDark === color.d) ? 'border-white ring-2 ring-violet-500/20 shadow-lg' : 'border-transparent'}`}
                                                                    style={{ backgroundColor: isLightMode ? color.l : color.d }}
                                                                >
                                                                    {(isLightMode ? primaryColorLight === color.l : primaryColorDark === color.d) && <Check size={12} className="text-white" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className={`w-[1px] h-4 mx-0.5 ${isLightMode ? 'bg-slate-300' : 'bg-white/[0.1]'}`} />

                                {onMinimize && (
                                    <button
                                        onClick={() => onMinimize(true)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isLightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'}`}
                                        title="Minimize Mode"
                                    >
                                        <Eye size={17} strokeWidth={2.5} />
                                    </button>
                                )}

                                <button
                                    onClick={() => handleSafeAction(onClose)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isLightMode ? 'text-slate-500 hover:bg-red-50 hover:text-red-500' : 'text-slate-400 hover:bg-red-500/20 hover:text-red-400'}`}
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reading Progress Bar (Fixed top) */}
                    <div className="w-full h-[3.5px] bg-transparent absolute left-0 z-40 transition-opacity duration-500 overflow-hidden pointer-events-none" style={{ top: '57px', opacity: readingProgress > 0 ? 1 : 0 }}>
                        <div
                            className="h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                            style={{
                                width: `${readingProgress}%`,
                                backgroundColor: activePrimaryColor,
                                boxShadow: `0 0 15px ${activePrimaryColor}60`
                            }}
                        />
                    </div>

                    {/* Body — Sidebar + Content */}
                    <div className="flex flex-1 overflow-hidden relative">

                        {/* Mobile Overlay Background for Sidebar */}
                        {(hasHeadings || hasLinkedNotes) && sidebarOpen && (
                            <div
                                className="md:hidden absolute inset-0 z-10 bg-black/50"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}

                        {/* TOC Sidebar */}
                        {(hasHeadings || hasLinkedNotes) && (
                            <div
                                className="absolute md:relative z-20 h-full flex flex-col md:flex"
                                style={{
                                    ...sidebarContainerStyle,
                                    boxShadow: sidebarBoxShadow,
                                    backgroundColor: sidebarBgColor
                                }}
                            >
                                {/* TOC headings */}
                                {hasHeadings && (
                                    <>
                                        <div style={sidebarStyles.header}>
                                            <List size={14} style={sidebarStyles.headerIcon} />
                                            <span style={sidebarStyles.headerTitle}>On This Page</span>
                                        </div>
                                        <div style={sidebarStyles.list} className="custom-scrollbar">
                                            {headings.map((h) => (
                                                <TocItem
                                                    key={h.id}
                                                    heading={h}
                                                    isActive={activeHeadingId === h.id}
                                                    onClick={() => scrollToHeading(h.id)}
                                                    sidebarStyles={sidebarStyles}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Linked Notes — always accessible in sidebar */}
                                {hasLinkedNotes && (
                                    <div style={{
                                        borderTop: hasHeadings ? `1px solid ${isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}` : 'none',
                                        flexShrink: 0,
                                    }}>
                                        <div style={{
                                            ...sidebarStyles.header,
                                            paddingBottom: '10px',
                                        }}>
                                            <LinkIcon size={13} style={{ color: '#a78bfa', opacity: 0.8 }} />
                                            <span style={sidebarStyles.headerTitle}>Linked Notes</span>
                                            <span style={{
                                                marginLeft: 'auto',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                color: `${activePrimaryColor}80`,
                                                background: `${activePrimaryColor}15`,
                                                padding: '1px 6px',
                                                borderRadius: '10px',
                                            }}>{childNotes.length}</span>
                                        </div>
                                        <div className="custom-scrollbar overflow-y-auto max-h-[300px] p-1.5 space-y-1">
                                            {childNotes.map(child => (
                                                <LinkedNoteButton
                                                    key={child.id}
                                                    child={child}
                                                    isLightMode={isLightMode}
                                                    onSafeAction={handleSafeAction}
                                                    onOpenChildNote={onOpenChildNote}
                                                    primaryColor={activePrimaryColor}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Content Body - Markdown Rendered */}
                        <div
                            ref={contentRef}
                            className="px-4 py-5 md:px-8 md:py-8 overflow-y-auto custom-scrollbar flex-1 relative w-full"
                            style={{ background: isLightMode ? '#fdfdfb' : '#1c1c28' }}
                        >
                            {/* Text Selection Toolbar */}
                            {selectionTooltip && !editMode && (
                                <div
                                    ref={tooltipRef}
                                    className="absolute z-[100]"
                                    style={{
                                        left: `${selectionTooltip.x}px`,
                                        top: `${selectionTooltip.y}px`,
                                        transform: 'translate(-50%, -100%)',
                                        animation: 'tooltipIn 0.15s ease-out',
                                    }}
                                >
                                    <div
                                        className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg border"
                                        style={{
                                            background: isLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 15, 25, 0.95)',
                                            borderColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                                            boxShadow: isLightMode ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 16px rgba(0,0,0,0.4)',
                                        }}
                                    >
                                        {onAddToNote && (
                                            <button
                                                onClick={handleAddToNote}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isLightMode ? 'hover:bg-black/[0.05] text-slate-700' : 'hover:bg-white/[0.08] text-[rgba(255,255,255,0.85)]'}`}
                                                title="Create a new note from selection"
                                            >
                                                <Plus className="w-3 h-3" style={{ color: activePrimaryColor }} />
                                                <span>Note</span>
                                            </button>
                                        )}
                                        {onUpdateNoteContent && (
                                            <>
                                                <div style={{ width: '1px', height: '16px', background: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)' }} />
                                                <button
                                                    onClick={handleStartEdit}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isLightMode ? 'hover:bg-black/[0.05] text-slate-700' : 'hover:bg-white/[0.08] text-[rgba(255,255,255,0.85)]'}`}
                                                    title="Edit this selection"
                                                >
                                                    <Pencil className="w-3 h-3" style={{ color: activePrimaryColor }} />
                                                    <span>Edit</span>
                                                </button>
                                            </>
                                        )}
                                        {onAIEditSection && (
                                            <>
                                                <div style={{ width: '1px', height: '16px', background: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)' }} />
                                                <button
                                                    onClick={handleStartAIEdit}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isLightMode ? 'hover:bg-black/[0.05] text-slate-700' : 'hover:bg-white/[0.08] text-[rgba(255,255,255,0.85)]'}`}
                                                    title="Edit with AI"
                                                >
                                                    <Wand2 className="w-3 h-3" style={{ color: activePrimaryColor }} />
                                                    <span>AI Edit</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: isLightMode ? '5px solid rgba(255, 255, 255, 0.95)' : '5px solid rgba(15, 15, 25, 0.95)', margin: '0 auto' }} />
                                    <style>{`@keyframes tooltipIn { from { opacity: 0; transform: translate(-50%, -90%); } to { opacity: 1; transform: translate(-50%, -100%); } }`}</style>
                                </div>
                            )}

                            {/* Floating Edit Panel — smart Table or Text */}
                            {editMode === 'edit' && (
                                <TableEditPanel
                                    editOriginalText={editOriginalText}
                                    editText={editText}
                                    setEditText={setEditText}
                                    editPosition={editPosition}
                                    handleCancelEdit={handleCancelEdit}
                                    handleSaveEdit={handleSaveEdit}
                                    isLightMode={isLightMode}
                                    primaryColor={activePrimaryColor}
                                />
                            )}

                            {/* Floating AI Edit — Instruction Input */}
                            {editMode === 'ai-instruction' && (
                                <div
                                    className="absolute z-[100] w-[90%] max-w-[480px] rounded-xl border overflow-hidden shadow-2xl"
                                    style={{
                                        left: `${Math.max(16, editPosition.x)}px`,
                                        top: `${editPosition.y + 8}px`,
                                        transform: 'translateX(-50%)',
                                        background: isLightMode ? '#ffffff' : '#1a1a2e',
                                        borderColor: `${activePrimaryColor}33`,
                                        boxShadow: isLightMode ? '0 4px 20px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: activePrimaryColor }}>
                                            <Wand2 className="w-3.5 h-3.5" /> AI Edit
                                        </span>
                                        <button onClick={handleCancelEdit} className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-md hover:bg-white/[0.06] transition-all cursor-pointer">Cancel</button>
                                    </div>
                                    <div className="px-4 py-3">
                                        <div className="text-[11px] text-slate-500 mb-2 font-medium">Selected text:</div>
                                        <div className="text-[12px] text-slate-300 bg-white/[0.03] rounded-lg px-3 py-2 mb-3 border border-white/[0.05] max-h-[80px] overflow-y-auto font-mono leading-relaxed">
                                            {editOriginalText.length > 200 ? editOriginalText.substring(0, 200) + '...' : editOriginalText}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mb-2 font-medium">What should AI change?</div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={aiInstruction}
                                                onChange={(e) => setAiInstruction(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && aiInstruction.trim()) handleSubmitAIEdit(); }}
                                                placeholder="e.g., Simplify this, add examples, fix errors..."
                                                className="flex-1 bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-1 transition-all"
                                                style={{ borderColor: `${activePrimaryColor}33` }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleSubmitAIEdit}
                                                disabled={!aiInstruction.trim()}
                                                className="px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                                                style={{ backgroundColor: `${activePrimaryColor}26`, color: activePrimaryColor, border: `1px solid ${activePrimaryColor}40` }}
                                            >
                                                <Wand2 className="w-3.5 h-3.5" /> Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Floating AI Edit — Preview Result */}
                            {editMode === 'ai-preview' && (
                                <div
                                    className="absolute z-[100] w-[90%] max-w-[520px] rounded-xl border overflow-hidden shadow-2xl"
                                    style={{
                                        left: `${Math.max(16, editPosition.x)}px`,
                                        top: `${editPosition.y + 8}px`,
                                        transform: 'translateX(-50%)',
                                        background: isLightMode ? '#ffffff' : '#1a1a2e',
                                        borderColor: `${activePrimaryColor}33`,
                                        boxShadow: isLightMode ? '0 4px 20px rgba(0,0,0,0.1)' : '0 8px 32px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: activePrimaryColor }}>
                                            <Wand2 className="w-3.5 h-3.5" /> AI Suggestion
                                        </span>
                                        {!aiLoading && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={handleCancelEdit} className="text-[11px] font-semibold text-red-400 hover:text-red-300 px-2.5 py-1 rounded-md hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                                <button onClick={handleAcceptAIEdit} className="text-[11px] font-bold px-3 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1.5" style={{ color: activePrimaryColor, backgroundColor: `${activePrimaryColor}10`, borderColor: `${activePrimaryColor}33` }}>
                                                    <Check className="w-3 h-3" /> Accept
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-3">
                                        {aiLoading ? (
                                            <div className="flex items-center justify-center gap-3 py-8">
                                                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                                <span className="text-[12px] text-violet-400 font-semibold">AI is processing...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="text-[10px] text-red-400/60 font-bold uppercase tracking-wider mb-1.5">Original</div>
                                                    <div className="text-[12px] text-red-300/70 bg-red-500/[0.04] rounded-lg px-3 py-2 border border-red-500/10 max-h-[100px] overflow-y-auto font-mono leading-relaxed line-through decoration-red-400/30">
                                                        {editOriginalText.length > 300 ? editOriginalText.substring(0, 300) + '...' : editOriginalText}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: `${activePrimaryColor}a0` }}>AI Result</div>
                                                    <div className="text-[12px] bg-white/[0.03] rounded-lg px-3 py-2 border max-h-[160px] overflow-y-auto font-mono leading-relaxed" style={{ color: activePrimaryColor, borderColor: `${activePrimaryColor}20` }}>
                                                        {aiResult}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Source Image Display */}
                            {(isFetchingImage || sourceImage) && (
                                <div className={`mb-10 rounded-2xl overflow-hidden ${isLightMode ? 'border-none bg-slate-100' : 'border border-white/[0.08] bg-black/40'} shadow-2xl relative group`}>
                                    {isFetchingImage ? (
                                        <div className={`aspect-video flex flex-col items-center justify-center gap-4 ${isLightMode ? 'bg-slate-50' : 'bg-surface-2/30'}`}>
                                            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: `${activePrimaryColor}33`, borderTopColor: activePrimaryColor }} />
                                            <span className="text-[11px] font-bold uppercase tracking-widest animate-pulse" style={{ color: activePrimaryColor }}>Loading Source Resource...</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            {note?.file_type && note?.file_type !== 'image' ? (
                                                <div className="w-full h-[500px] relative">
                                                    <iframe
                                                        src={sourceImage}
                                                        className="w-full h-full border-none bg-white"
                                                        title="Source Document"
                                                    />
                                                </div>
                                            ) : (
                                                <img
                                                    src={sourceImage}
                                                    alt="Source reference"
                                                    className="w-full max-h-[500px] object-contain mx-auto"
                                                />
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Original Source {note?.file_type !== 'image' ? 'File' : 'Image'}</span>
                                                <button
                                                    onClick={() => window.open(sourceImage, '_blank')}
                                                    className="text-[10px] font-bold hover:underline cursor-pointer bg-transparent border-none p-0"
                                                    style={{ color: activePrimaryColor }}
                                                >
                                                    Open Original
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={`prose prose-base sm:prose-lg max-w-none break-words sm:break-normal 
                                    prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight 
                                    prose-h1:text-[32px] sm:prose-h1:text-[42px] prose-h1:mb-10 prose-h1:mt-4 prose-h1:leading-tight
                                    prose-h2:text-[24px] sm:prose-h2:text-[28px] prose-h2:mb-6 prose-h2:mt-12 prose-h2:border-b prose-h2:pb-3 prose-h2:leading-snug
                                    prose-h3:text-[19px] sm:prose-h3:text-[22px] prose-h3:mb-4 prose-h3:mt-8 prose-h3:leading-snug
                                    prose-p:leading-relaxed prose-p:mb-6
                                    prose-ul:my-6 prose-ol:my-6 prose-li:my-2
                                    prose-strong:font-extrabold
                                    prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none
                                    prose-code:before:content-none prose-code:after:content-none
                                    prose-img:rounded-3xl
                                    ${isLightMode
                                    ? 'prose-slate text-slate-800 prose-p:text-slate-700/90 prose-headings:text-slate-900 prose-strong:text-slate-900'
                                    : 'prose-invert prose-p:text-slate-300/90 prose-headings:text-white prose-strong:text-white'}`}
                                style={{
                                    fontSize: `${fontSize}px`,
                                    lineHeight: lineHeight,
                                    '--tw-prose-invert-p-margin-bottom': `${lineHeight * 0.5}rem`,
                                    '--tw-prose-p-margin-bottom': `${lineHeight * 0.5}rem`,
                                    '--tw-prose-links': activePrimaryColor,
                                    '--tw-prose-invert-links': activePrimaryColor,
                                    '--tw-prose-counters': activePrimaryColor,
                                    '--tw-prose-bullets': activePrimaryColor,
                                }}>
                                <ReactMarkdown
                                    remarkPlugins={markdownPlugins}
                                    rehypePlugins={markdownRehypePlugins}
                                    components={markdownComponents}
                                    urlTransform={(url) => url}
                                >
                                    {processedContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Footer for Source Link */}
                    {note.question_id && onNavigateToQuestion && (
                        <div className={`md:hidden px-4 sm:px-6 py-4 border-t shrink-0 z-30 ${isLightMode ? 'bg-[#f8fafc] border-slate-200' : 'bg-surface-2 border-white/[0.06]'}`}>
                            <button
                                onClick={() => handleSafeAction(() => {
                                    onClose();
                                    onNavigateToQuestion(note.question_id);
                                })}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${isLightMode ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'}`}
                            >
                                <LinkIcon className="w-4 h-4" />
                                <span>View Source Question</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default ViewNoteModal;

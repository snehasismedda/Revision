import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, Link2 as LinkIcon, Pencil, ChevronLeft, ChevronRight, List, PanelLeftClose, PanelLeftOpen, Plus, ArrowLeft, Wand2, Check, XCircle, Loader2 } from 'lucide-react';

import ModalPortal from '../ModalPortal.jsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
const sidebarStyles = {
    container: {
        width: '260px',
        minWidth: '260px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(18,18,26,0.95) 0%, rgba(14,14,22,0.98) 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    },
    containerCollapsed: {
        width: '0px',
        minWidth: '0px',
        opacity: 0,
        overflow: 'hidden',
    },
    header: {
        padding: '16px 18px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
    },
    headerIcon: {
        color: '#8b5cf6',
        opacity: 0.8,
    },
    headerTitle: {
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.4)',
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
            ? '#a78bfa'
            : level === 1
                ? 'rgba(255,255,255,0.7)'
                : level === 2
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(255,255,255,0.4)',
        lineHeight: '1.5',
        borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
        background: isActive ? 'rgba(139,92,246,0.06)' : 'transparent',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        fontFamily: "'Inter', sans-serif",
    }),
    itemHover: {
        background: 'rgba(255,255,255,0.03)',
        color: 'rgba(255,255,255,0.85)',
    },
    dot: (level, isActive) => ({
        width: '5px',
        height: '5px',
        minWidth: '5px',
        borderRadius: '50%',
        marginTop: '7px',
        background: isActive
            ? '#8b5cf6'
            : level === 1
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(255,255,255,0.12)',
        transition: 'background 0.2s ease',
    }),
    emptyState: {
        padding: '24px 18px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.25)',
        fontSize: '12px',
        fontStyle: 'italic',
    },
};

/** TOC Sidebar Item */
const TocItem = ({ heading, isActive, onClick }) => {
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
            className="w-full text-left border-none bg-transparent"
        >
            <span style={sidebarStyles.dot(heading.level, isActive)} />
            <span className="truncate">{heading.text}</span>
        </button>
    );
};


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

const TableEditPanel = ({ editOriginalText, editText, setEditText, editPosition, handleCancelEdit, handleSaveEdit }) => {
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
            className="absolute z-[100] w-[95%] max-w-[640px] rounded-xl border border-blue-500/20 overflow-hidden shadow-2xl"
            style={{
                left: `${Math.max(16, editPosition.x)}px`,
                top: `${editPosition.y + 8}px`,
                transform: 'translateX(-50%)',
                background: 'rgba(20, 20, 35, 0.98)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
        >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5" />
                    {isTable ? '✦ Edit Table' : 'Editing Selection'}
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={handleCancelEdit} className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-md hover:bg-white/[0.06] transition-all cursor-pointer">Cancel</button>
                    <button onClick={handleSaveEdit} className="text-[11px] font-bold text-emerald-400 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5">
                        <Check className="w-3 h-3" /> Save
                    </button>
                </div>
            </div>

            {isTable && tableData.length > 0 ? (
                <div className="overflow-x-auto px-3 py-3">
                    <table className="w-full border-collapse">
                        <tbody>
                            {tableData.map((row, ri) => (
                                <tr key={ri} style={{ background: ri === 0 ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
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
                                                className={`w-full bg-transparent px-3 py-2 text-[12px] focus:outline-none transition-colors ${ri === 0 ? 'text-white font-bold focus:bg-blue-500/10' : 'text-slate-300 focus:bg-white/[0.04]'
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


const ViewNoteModal = ({ isOpen, onClose, note, onNavigateToQuestion, sourceImage, isFetchingImage, onEdit, onPrev, onNext, onAddToNote, parentNoteTitle, onUpdateNoteContent, onAIEditSection, childNotes, onOpenChildNote }) => {


    const [sidebarOpen, setSidebarOpen] = useState(true);
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

    const processedContent = preprocessMarkdown(note?.content || '');
    const hasHeadings = headings.length > 0;
    const hasLinkedNotes = childNotes && childNotes.length > 0;

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

    // Scroll spy
    useEffect(() => {
        const container = contentRef.current;
        if (!container || headings.length === 0) return;

        const handleScroll = () => {
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
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => container.removeEventListener('scroll', handleScroll);
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

    const handleOpenOriginal = () => {
        if (!sourceImage) return;
        try {
            const [metadata, base64Data] = sourceImage.split(',');
            const mimeMatch = metadata.match(/:(.*?);/);
            if (!mimeMatch) throw new Error('Invalid Data URI');
            const mimeType = mimeMatch[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
            console.error('Error opening original image:', error);
            const newWindow = window.open();
            newWindow.document.write(`<img src="${sourceImage}" style="max-width: 100%; height: auto;" />`);
        }
    };

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
        try {
            const result = await onAIEditSection(editOriginalText, aiInstruction);
            setAiResult(result);
        } catch {
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/[0.08]"
                    style={{ background: '#12121a', maxWidth: hasHeadings ? '72rem' : '56rem', transition: 'max-width 0.3s ease' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0 bg-surface-2/30 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            {/* Back to parent note button */}
                            {parentNoteTitle && (
                                <button
                                    onClick={onClose}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-all border border-amber-500/20 hover:border-amber-500/30 cursor-pointer mr-1"
                                    title={`Back to "${parentNoteTitle}"`}
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span className="max-w-[120px] truncate">Back</span>
                                </button>
                            )}
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[18px] font-heading font-bold text-white tracking-tight leading-snug">
                                    {note.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-1.5 opacity-80">
                                    <span className="text-[12px] font-medium text-slate-400">
                                        {new Date(note.created_at).toLocaleDateString(undefined, {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Toggle sidebar button — shown if headings or linked notes exist */}
                            {(hasHeadings || hasLinkedNotes) && (
                                <button
                                    onClick={() => setSidebarOpen(prev => !prev)}
                                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-all border border-transparent hover:border-purple-500/20 cursor-pointer"
                                    title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                                >
                                    {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                                    <span className="hidden lg:inline">{sidebarOpen ? 'Hide' : 'Show'}</span>
                                </button>
                            )}
                            {note.question_id && onNavigateToQuestion && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onNavigateToQuestion(note.question_id);
                                    }}
                                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all border border-transparent hover:border-indigo-500/20 cursor-pointer"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    <span>{note.is_note_link ? 'View Note' : 'View Question'}</span>
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onEdit(note);
                                    }}
                                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all border border-transparent hover:border-emerald-500/20"
                                >
                                    <Pencil className="w-4 h-4" />
                                    <span>Edit</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body — Sidebar + Content */}
                    <div className="flex flex-1 overflow-hidden">

                        {/* TOC Sidebar — desktop only */}
                        {(hasHeadings || hasLinkedNotes) && (
                            <div
                                className="hidden md:flex flex-col"
                                style={sidebarOpen ? sidebarStyles.container : { ...sidebarStyles.container, ...sidebarStyles.containerCollapsed }}
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
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Linked Notes — always accessible in sidebar */}
                                {hasLinkedNotes && (
                                    <div style={{
                                        borderTop: hasHeadings ? '1px solid rgba(255,255,255,0.05)' : 'none',
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
                                                color: 'rgba(167,139,250,0.5)',
                                                background: 'rgba(139,92,246,0.1)',
                                                padding: '1px 6px',
                                                borderRadius: '10px',
                                            }}>{childNotes.length}</span>
                                        </div>
                                        <div style={{ padding: '0 10px 12px' }}>
                                            {childNotes.map((child) => (
                                                <button
                                                    key={child.id}
                                                    onClick={() => onOpenChildNote && onOpenChildNote(child)}
                                                    className="w-full text-left flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer group"
                                                    style={{
                                                        color: 'rgba(167,139,250,0.75)',
                                                        background: 'transparent',
                                                        border: '1px solid transparent',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.color = '#a78bfa';
                                                        e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
                                                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.color = 'rgba(167,139,250,0.75)';
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = 'transparent';
                                                    }}
                                                    title={child.title || 'Untitled Note'}
                                                >
                                                    <FileText size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                                                    <span className="truncate flex-1">{child.title || 'Untitled Note'}</span>
                                                    <LinkIcon size={10} style={{ flexShrink: 0, opacity: 0.3 }} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Content Body - Markdown Rendered */}
                        <div
                            ref={contentRef}
                            className="px-6 py-6 md:px-8 md:py-8 overflow-y-auto custom-scrollbar flex-1 relative"
                            style={{ background: '#12121a' }}
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
                                            background: 'rgba(15, 15, 25, 0.95)',
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(20px)',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                                        }}
                                    >
                                        {onAddToNote && (
                                            <button
                                                onClick={handleAddToNote}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all hover:bg-white/[0.08]"
                                                style={{ color: 'rgba(255,255,255,0.85)' }}
                                                title="Create a new note from selection"
                                            >
                                                <Plus className="w-3 h-3 text-emerald-400" />
                                                <span>Note</span>
                                            </button>
                                        )}
                                        {onUpdateNoteContent && (
                                            <>
                                                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
                                                <button
                                                    onClick={handleStartEdit}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all hover:bg-white/[0.08]"
                                                    style={{ color: 'rgba(255,255,255,0.85)' }}
                                                    title="Edit this selection"
                                                >
                                                    <Pencil className="w-3 h-3 text-blue-400" />
                                                    <span>Edit</span>
                                                </button>
                                            </>
                                        )}
                                        {onAIEditSection && (
                                            <>
                                                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
                                                <button
                                                    onClick={handleStartAIEdit}
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all hover:bg-white/[0.08]"
                                                    style={{ color: 'rgba(255,255,255,0.85)' }}
                                                    title="Edit with AI"
                                                >
                                                    <Wand2 className="w-3 h-3 text-violet-400" />
                                                    <span>AI Edit</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(15, 15, 25, 0.95)', margin: '0 auto' }} />
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
                                />
                            )}

                            {/* Floating AI Edit — Instruction Input */}
                            {editMode === 'ai-instruction' && (
                                <div
                                    className="absolute z-[100] w-[90%] max-w-[480px] rounded-xl border border-violet-500/20 overflow-hidden shadow-2xl"
                                    style={{
                                        left: `${Math.max(16, editPosition.x)}px`,
                                        top: `${editPosition.y + 8}px`,
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(20, 20, 35, 0.98)',
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                                    }}
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                                        <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
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
                                                className="flex-1 bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:border-violet-400/40 focus:ring-1 focus:ring-violet-400/15 transition-all"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleSubmitAIEdit}
                                                disabled={!aiInstruction.trim()}
                                                className="px-4 py-2.5 rounded-lg text-[12px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
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
                                    className="absolute z-[100] w-[90%] max-w-[520px] rounded-xl border border-violet-500/20 overflow-hidden shadow-2xl"
                                    style={{
                                        left: `${Math.max(16, editPosition.x)}px`,
                                        top: `${editPosition.y + 8}px`,
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(20, 20, 35, 0.98)',
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                                    }}
                                >
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                                        <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                                            <Wand2 className="w-3.5 h-3.5" /> AI Suggestion
                                        </span>
                                        {!aiLoading && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={handleCancelEdit} className="text-[11px] font-semibold text-red-400 hover:text-red-300 px-2.5 py-1 rounded-md hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                                <button onClick={handleAcceptAIEdit} className="text-[11px] font-bold text-emerald-400 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5">
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
                                                    <div className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-wider mb-1.5">AI Result</div>
                                                    <div className="text-[12px] text-emerald-300 bg-emerald-500/[0.04] rounded-lg px-3 py-2 border border-emerald-500/10 max-h-[160px] overflow-y-auto font-mono leading-relaxed">
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
                                <div className="mb-10 rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 shadow-2xl relative group">
                                    {isFetchingImage ? (
                                        <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-surface-2/30">
                                            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Loading Source Image...</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img
                                                src={sourceImage}
                                                alt="Source reference"
                                                className="w-full max-h-[500px] object-contain mx-auto"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Original Source Image</span>
                                                <button
                                                    onClick={handleOpenOriginal}
                                                    className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer bg-transparent border-none p-0"
                                                >
                                                    Open Original
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="prose prose-invert prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-h1:text-[22px] prose-h2:text-[19px] prose-h3:text-[17px] prose-headings:mt-6 prose-headings:mb-3 prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-3 prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-strong:text-white prose-code:text-slate-300 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface-2 prose-pre:border prose-pre:border-white/[0.08] prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}

                                >
                                    {processedContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Footer for Source Link */}
                    {note.question_id && onNavigateToQuestion && (
                        <div className="md:hidden px-6 py-4 border-t border-white/[0.06] shrink-0 bg-surface-2/30 backdrop-blur-md">
                            <button
                                onClick={() => {
                                    onClose();
                                    onNavigateToQuestion(note.question_id);
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                            >
                                <LinkIcon className="w-4 h-4" />
                                <span>View Source Question</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Arrows for Gallery/Notes */}
                {onPrev && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrev();
                        }}
                        className="fixed left-6 md:left-12 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-surface-2/60 backdrop-blur-md text-white/50 border border-white/5 hover:bg-surface-2 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-2xl z-[60] group hidden md:flex"
                        title="Previous"
                    >
                        <ChevronLeft className="w-6 h-6 group-active:-translate-x-1 transition-transform" />
                    </button>
                )}

                {onNext && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNext();
                        }}
                        className="fixed right-6 md:right-12 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-surface-2/60 backdrop-blur-md text-white/50 border border-white/5 hover:bg-surface-2 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-2xl z-[60] group hidden md:flex"
                        title="Next"
                    >
                        <ChevronRight className="w-6 h-6 group-active:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>
        </ModalPortal>
    );
};

export default ViewNoteModal;

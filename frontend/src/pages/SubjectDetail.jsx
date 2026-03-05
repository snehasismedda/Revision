import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { subjectsApi, topicsApi, sessionsApi, questionsApi, notesApi, imagesApi, aiApi } from '../api/index.js';
import TopicTree from '../components/TopicTree.jsx';
import SessionCard from '../components/SessionCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import RichTextRenderer from '../components/RichTextRenderer.jsx';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { marked } from 'marked';
import { ArrowLeft, PlusCircle, BarChart3, Wand2, BookOpen, Activity, HelpCircle, FileText, Image as ImageIcon, Trash2, ChevronDown, Pencil, Hash, Search, X, Link2 as LinkIcon, Maximize2, Minimize2, LayoutGrid, List, CheckCircle, Download } from 'lucide-react';

import ManageSyllabusModal from '../components/modals/ManageSyllabusModal.jsx';
import AddQuestionModal from '../components/modals/AddQuestionModal.jsx';
import EditQuestionModal from '../components/modals/EditQuestionModal.jsx';
import AddNoteModal from '../components/modals/AddNoteModal.jsx';
import ViewNoteModal from '../components/modals/ViewNoteModal.jsx';
import CreateSessionModal from '../components/modals/CreateSessionModal.jsx';
import EditSessionModal from '../components/modals/EditSessionModal.jsx';
import EditNoteModal from '../components/modals/EditNoteModal.jsx';
import AddImageModal from '../components/modals/AddImageModal.jsx';

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
    const [subject, setSubject] = useState(null);
    const [topics, setTopics] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [notes, setNotes] = useState([]);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination for images
    const [imagePage, setImagePage] = useState(0);
    const [loadingMoreImages, setLoadingMoreImages] = useState(false);
    const [hasMoreImages, setHasMoreImages] = useState(true);
    const IMAGE_LIMIT = 20;
    const [activeTab, setActiveTab] = useState('topics');
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [viewingNote, setViewingNote] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [selectedQuestionIdForNote, setSelectedQuestionIdForNote] = useState(null);
    const [noteStack, setNoteStack] = useState([]); // Stack for parent note navigation
    const [addToNoteData, setAddToNoteData] = useState(null); // { selectedText, parentNoteId }

    const [generatingAINoteId, setGeneratingAINoteId] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [confirmDeleteSession, setConfirmDeleteSession] = useState({ open: false, session: null });
    const [confirmDeleteQuestion, setConfirmDeleteQuestion] = useState({ open: false, questionId: null });
    const [confirmDeleteNote, setConfirmDeleteNote] = useState({ open: false, note: null });
    const [editingSession, setEditingSession] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
    const [fetchingImageId, setFetchingImageId] = useState(null);
    const [fetchedImages, setFetchedImages] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [noteSearchQuery, setNoteSearchQuery] = useState('');
    const [sessionSearchQuery, setSessionSearchQuery] = useState('');
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [topicsDefaultExpanded, setTopicsDefaultExpanded] = useState(true);
    const [treeKey, setTreeKey] = useState(0);
    const [sessionsViewMode, setSessionsViewMode] = useState('grid'); // 'grid' or 'list'
    const [notesViewMode, setNotesViewMode] = useState('grid'); // 'grid' or 'list'


    // Toggle state for grouped questions
    const [expandedGroups, setExpandedGroups] = useState({});

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // PDF Export / Selection state
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());

    useEffect(() => {
        setIsSelectionMode(false);
        setSelectedItems(new Set());
    }, [activeTab]);

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
            const query = noteSearchQuery.toLowerCase();
            const visibleNotes = notes.filter(n =>
                n.title?.toLowerCase().includes(query) ||
                n.content?.toLowerCase().includes(query)
            );

            if (selectedItems.size === visibleNotes.length && visibleNotes.length > 0) {
                setSelectedItems(new Set());
            } else {
                setSelectedItems(new Set(visibleNotes.map(n => n.id)));
            }
        }
    };

    // ─── Markdown → PDF renderer (marked + jspdf-autotable) ────────────────

    // LaTeX math cleanup (for display in plain-text PDF)
    const stripLatexMath = (str) => {
        if (!str) return '';
        return str
            .replace(/\$\$[\s\S]*?\$\$/g, '[Math]')
            .replace(/\$[^$\n]+\$/g, '[Math]')
            .replace(/\\\[|\\\]/g, '[Math]')
            .replace(/\\\(|\\\)/g, '')
            .replace(/\\rightarrow/g, '->')
            .replace(/\\leftarrow/g, '<-')
            .replace(/\\leftrightarrow/g, '<->')
            .replace(/\\neq/g, '!=')
            .replace(/\\leq/g, '<=')
            .replace(/\\geq/g, '>=')
            .replace(/\\land/g, 'AND')
            .replace(/\\lor/g, 'OR')
            .replace(/\\neg/g, 'NOT')
            .replace(/\\exists/g, 'EXISTS')
            .replace(/\\forall/g, 'FORALL')
            .replace(/\\in\b/g, 'in')
            .replace(/\\notin/g, 'not in')
            .replace(/\\subset/g, 'subset of')
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
            .replace(/\\[a-zA-Z]+/g, '')
            .replace(/[{}]/g, '')
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

    // Use marked.lexer() to parse markdown into a block token array,
    // then normalise to a simpler format our renderer understands.
    const tokenizeMarkdown = (raw) => {
        if (!raw) return [];
        let blockTokens;
        try {
            blockTokens = marked.lexer(stripLatexMath(raw));
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
                    didDrawPage: (data) => {
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
            const titleText = subject?.name || 'Export';
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
                items = itemIds.map(iid => notes.find(n => n.id === iid)).filter(Boolean);
            } else {
                items = itemIds.map(iid => questions.find(q => q.id === iid)).filter(Boolean);
            }

            const printedSourceIds = new Set();

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                const itemType = activeTab === 'notes' ? 'Note' : 'Question';
                const itemTitle = activeTab === 'notes' && item.title
                    ? `${itemType} ${i + 1}: ${item.title}`
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
                    `${subject?.name || 'Export'}  ·  ${tabLabel}  ·  Page ${p} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' }
                );
                doc.setTextColor(0, 0, 0);
            }

            const fileName = `${subject?.name || 'Export'}_${activeTab}.pdf`.replace(/\s+/g, '_');
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

    // Load more images effect
    useEffect(() => {
        if (imagePage === 0) return; // handled by initial load
        const loadMore = async () => {
            setLoadingMoreImages(true);
            try {
                const res = await imagesApi.listBySubject(id, IMAGE_LIMIT, imagePage * IMAGE_LIMIT);
                const newImages = res.images || [];
                setHasMoreImages(newImages.length === IMAGE_LIMIT);
                setImages(prev => [...prev, ...newImages]);
            } catch {
                toast.error('Failed to load more images');
            } finally {
                setLoadingMoreImages(false);
            }
        };
        loadMore();
    }, [id, imagePage]);

    const imageObserver = React.useRef();
    const lastImageElementRef = React.useCallback(node => {
        if (loading || loadingMoreImages) return;
        if (imageObserver.current) imageObserver.current.disconnect();
        imageObserver.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreImages) {
                setImagePage(prevPage => prevPage + 1);
            }
        });
        if (node) imageObserver.current.observe(node);
    }, [loading, loadingMoreImages, hasMoreImages]);

    useEffect(() => {
        const load = async () => {
            try {
                const [subRes, topRes, sesRes, qsRes, notesRes, imgRes] = await Promise.all([
                    subjectsApi.get(id),
                    topicsApi.list(id),
                    sessionsApi.list(id),
                    questionsApi.list(id),
                    notesApi.list(id),
                    imagesApi.listBySubject(id, IMAGE_LIMIT, 0),
                ]);
                setSubject(subRes.subject);
                setTopics(topRes.topics);
                setSessions(sesRes.sessions);
                setQuestions(qsRes.questions || []);
                setNotes(notesRes.notes || []);

                const initialImages = imgRes.images || [];
                setImages(initialImages);
                setHasMoreImages(initialImages.length === IMAGE_LIMIT);
            } catch {
                navigate('/subjects');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, navigate]);

    const handleTopicDeleted = (topicId) => {
        const removeFromTree = (nodes) =>
            nodes
                .filter((n) => n.id !== topicId)
                .map((n) => ({ ...n, children: removeFromTree(n.children || []) }));
        setTopics((prev) => removeFromTree(prev));
    };

    const handleQuestionAdded = (newQuestions) => {
        // newQuestions is always an array (may contain 1 or more)
        setQuestions((prev) => [...newQuestions, ...prev]);
    };

    const handleQuestionUpdated = (updatedQ) => {
        setQuestions(prev => prev.map(q => q.id === updatedQ.id ? { ...q, ...updatedQ } : q));
    };

    const handleNoteAdded = (newNote) => {
        setNotes((prev) => [newNote, ...prev]);
    };

    const handleNoteUpdated = (updatedNote) => {
        setNotes((prev) => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
        if (viewingNote?.id === updatedNote.id) setViewingNote(updatedNote);
    };

    const handleImageAdded = (newRes) => {
        if (newRes.note) {
            setNotes(prev => [newRes.note, ...prev]);
        } else if (newRes.questions) {
            // newRes.questions is an array
            setQuestions(prev => [...newRes.questions, ...prev]);
        }

        // Refetch images to be thorough
        const refreshImages = async () => {
            setImagePage(0);
            const res = await imagesApi.listBySubject(id, IMAGE_LIMIT, 0);
            const newImages = res.images || [];
            setImages(newImages);
            setHasMoreImages(newImages.length === IMAGE_LIMIT);
        };
        refreshImages();
    };

    const handleSessionCreated = (newSession) => {
        setSessions((prev) => [newSession, ...prev]);
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
    const handlePrevImage = () => {
        if (!viewingNote || !viewingNote.id?.toString().startsWith('img-')) return;
        const currentId = viewingNote.source_image_id;
        const idx = images.findIndex(img => img.id === currentId);
        if (idx > 0) {
            const img = images[idx - 1];
            const fakeNote = {
                id: `img-${img.id}`,
                title: 'Source Image',
                content: 'Original captured material.',
                source_image_id: img.id,
                created_at: img.created_at
            };
            setFetchedImages(prev => ({ ...prev, [`note-img-${img.id}`]: img.data }));
            setViewingNote(fakeNote);
        }
    };

    const handleNextImage = () => {
        if (!viewingNote || !viewingNote.id?.toString().startsWith('img-')) return;
        const currentId = viewingNote.source_image_id;
        const idx = images.findIndex(img => img.id === currentId);
        if (idx < images.length - 1) {
            const img = images[idx + 1];
            const fakeNote = {
                id: `img-${img.id}`,
                title: 'Source Image',
                content: 'Original captured material.',
                source_image_id: img.id,
                created_at: img.created_at
            };
            setFetchedImages(prev => ({ ...prev, [`note-img-${img.id}`]: img.data }));
            setViewingNote(fakeNote);
        }
    };

    const handlePrevNote = () => {
        if (!viewingNote || viewingNote.id?.toString().startsWith('img-')) return;

        const filtered = notes.filter(n =>
            n.title?.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
            n.content?.toLowerCase().includes(noteSearchQuery.toLowerCase())
        );

        const idx = filtered.findIndex(n => n.id === viewingNote.id);
        if (idx > 0) {
            const nextNote = filtered[idx - 1];
            setViewingNote(nextNote);
            if (nextNote.source_image_id) {
                handleFetchNoteImage(nextNote.id);
            }
        }
    };

    const handleNextNote = () => {
        if (!viewingNote || viewingNote.id?.toString().startsWith('img-')) return;

        const filtered = notes.filter(n =>
            n.title?.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
            n.content?.toLowerCase().includes(noteSearchQuery.toLowerCase())
        );

        const idx = filtered.findIndex(n => n.id === viewingNote.id);
        if (idx < filtered.length - 1) {
            const nextNote = filtered[idx + 1];
            setViewingNote(nextNote);
            if (nextNote.source_image_id) {
                handleFetchNoteImage(nextNote.id);
            }
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
        } catch {
            toast.error('Failed to delete', { id: loadingToast });
        } finally {
            setConfirmDeleteQuestion({ open: false, questionId: null });
        }
    };

    const handleDeleteNote = async () => {
        const note = confirmDeleteNote.note;
        if (!note) return;
        const loadingToast = toast.loading('Deleting note...');
        try {
            await notesApi.delete(id, note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
            toast.success('Note deleted', { id: loadingToast });
        } catch {
            toast.error('Failed to delete note', { id: loadingToast });
        } finally {
            setConfirmDeleteNote({ open: false, note: null });
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
                    // Optional styling ping
                    el.style.transition = 'box-shadow 0.3s ease';
                    el.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)';
                    setTimeout(() => el.style.boxShadow = 'none', 2000);
                }
            }, 100);
        }, 100);
    };

    const handleGenerateAINote = async (questionId) => {
        // If an AI note exists for this question, just navigate to it
        const existingNote = notes.find(n => n.question_id === questionId && n.title?.startsWith('AI Note'));
        if (existingNote) {
            setActiveTab('notes');
            setTimeout(() => {
                const el = document.getElementById(`note-${existingNote.id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'box-shadow 0.3s ease';
                    el.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.5)';
                    setTimeout(() => el.style.boxShadow = 'none', 2000);
                }
            }, 100);
            return;
        }

        setGeneratingAINoteId(questionId);
        const loadingToast = toast.loading('Generating AI note...');
        try {
            const res = await notesApi.create(id, { questionId });
            setNotes((prev) => [res.note, ...prev]);
            toast.success('AI Note generated!', { id: loadingToast });
        } catch (error) {
            toast.error(error.message || 'Failed to generate AI note', { id: loadingToast });
        } finally {
            setGeneratingAINoteId(null);
        }
    };

    // Group questions by source
    const groupedQuestions = React.useMemo(() => {
        const filtered = !searchQuery.trim() ? questions : questions.filter(q => {
            const query = searchQuery.toLowerCase().trim();
            let qTags = [];
            try {
                qTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []);
            } catch {
                qTags = [];
            }
            return qTags.some(tag => tag.toLowerCase().includes(query)) ||
                q.content?.toLowerCase().includes(query);
        });

        const groups = {};
        // First pass: identify all potential roots and initialize groups
        filtered.forEach(q => {
            const rootId = q.parent_id || q.source_image_id || q.id;
            if (!groups[rootId]) {
                groups[rootId] = [];
            }
        });

        // Second pass: assign questions to groups
        filtered.forEach(q => {
            const rootId = q.parent_id || q.source_image_id || q.id;
            groups[rootId].push(q);
        });

        // Sort questions within groups by created_at ascending
        Object.keys(groups).forEach(rootId => {
            groups[rootId].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });

        // Convert to array of groups and sort by newest question in each group
        return Object.entries(groups).map(([rootId, qs]) => {
            const parent = qs.find(q => q.content === null);
            const actionableQs = qs.filter(q => q.content !== null);

            // A group exists if:
            // 1. More than 1 actionable question share a source ID
            // 2. OR a logical parent exists that extracted multiple questions
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

    return (
        <div className="fade-in max-w-6xl mx-auto">
            {/* Confirm Delete Session */}
            <ConfirmDialog
                isOpen={confirmDeleteSession.open}
                title="Delete Session"
                message={`Are you sure you want to delete "${confirmDeleteSession.session?.title}"? This will also remove all entries in this session.`}
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
                title="Delete Note"
                message={`Are you sure you want to delete "${confirmDeleteNote.note?.title}"? This action cannot be undone.`}
                onConfirm={handleDeleteNote}
                onCancel={() => setConfirmDeleteNote({ open: false, note: null })}
            />

            <ManageSyllabusModal
                isOpen={showTopicModal}
                onClose={() => setShowTopicModal(false)}
                subjectId={id}
                onTopicsUpdated={setTopics}
                topics={topics}
            />

            <AddQuestionModal
                isOpen={showQuestionModal}
                onClose={() => setShowQuestionModal(false)}
                subjectId={id}
                onQuestionAdded={handleQuestionAdded}
            />

            <AddImageModal
                isOpen={showImageModal}
                onClose={() => setShowImageModal(false)}
                subjectId={id}
                onImageSaved={handleImageAdded}
            />

            <AddNoteModal
                isOpen={showNoteModal || !!addToNoteData}
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
                initialTitle={addToNoteData ? `Note: ${addToNoteData.selectedText.substring(0, 60)}${addToNoteData.selectedText.length > 60 ? '...' : ''}` : ''}
                initialContent={addToNoteData ? `> ${addToNoteData.selectedText.replace(/\n/g, '\n> ')}\n\n` : ''}
                parentNoteId={addToNoteData?.parentNoteId || null}
            />

            <CreateSessionModal
                isOpen={showSessionModal}
                onClose={() => setShowSessionModal(false)}
                subjectId={id}
                onSessionCreated={handleSessionCreated}
            />

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

            <ViewNoteModal
                isOpen={!!viewingNote}
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
                onPrev={viewingNote?.id?.toString().startsWith('img-') ? handlePrevImage : handlePrevNote}
                onNext={viewingNote?.id?.toString().startsWith('img-') ? handleNextImage : handleNextNote}
                onAddToNote={(selectedText) => {
                    setAddToNoteData({
                        selectedText,
                        parentNoteId: viewingNote?.id || null,
                    });
                }}
                parentNoteTitle={noteStack.length > 0 ? noteStack[noteStack.length - 1]?.title : null}
                childNotes={viewingNote ? notes.filter(n => n.parent_note_id === viewingNote.id) : []}
                onOpenChildNote={(childNote) => {
                    if (viewingNote) {
                        setNoteStack(prev => [...prev, viewingNote]);
                    }
                    setViewingNote(childNote);
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
                onAIEditSection={async (selectedText, instruction) => {
                    try {
                        // Extract surrounding content for context (buffer ~500 chars each side)
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
                        const result = await aiApi.editSection({
                            selectedText,
                            instruction,
                            noteTitle: viewingNote?.title || '',
                            contentBefore,
                            contentAfter,
                        });
                        return result.editedText || '';
                    } catch {
                        toast.error('AI edit failed');
                        throw new Error('AI edit failed');
                    }
                }}
            />

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

            {/* Header Navigation */}
            <div className="flex items-center gap-3 mb-4">
                <Link
                    to="/subjects"
                    className="flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.1]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </Link>
            </div>

            {/* Subject Header (Identity) */}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] md:text-[24px] font-heading font-semibold text-white tracking-tight leading-tight mb-1.5">
                            {subject?.name}
                        </h1>
                        {subject?.description && (
                            <p className="text-slate-500 text-[14px] max-w-2xl leading-[1.6]">{subject.description}</p>
                        )}
                    </div>
                    <Link
                        to={`/subjects/${id}/reports`}
                        className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shrink-0 md:mt-1 cursor-pointer border border-white/[0.08] bg-surface-3/50 text-slate-300 hover:text-white hover:bg-surface-3 hover:border-white/[0.12] group"
                    >
                        <BarChart3 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" strokeWidth={2} />
                        <span>View Analytics</span>
                    </Link>
                </div>

                {/* Gradient separator */}
                <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.06] to-transparent" />

                {/* Controls (Sub-Nav + Action) — single row, vertically aligned */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Segmented Tabs */}
                    <div className="flex gap-1 p-1 bg-surface-2/50 backdrop-blur-md rounded-xl border border-white/[0.06] w-fit">
                        {['topics', 'sessions', 'questions', 'notes', 'images'].map((tab) => {
                            const count = tab === 'topics' ? topics.length : tab === 'sessions' ? sessions.length : tab === 'questions' ? questions.length : tab === 'notes' ? notes.length : images.length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex items-center gap-3 px-5 py-2.5 rounded-lg text-[13px] font-semibold capitalize transition-all duration-200 cursor-pointer
                                        ${activeTab === tab
                                            ? 'bg-primary text-white shadow-[0_2px_12px_rgba(139,92,246,0.35)]'
                                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
                                        }`}
                                >
                                    {tab}
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold leading-none
                                        ${activeTab === tab
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/[0.06] text-slate-500'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Bar — same row height as tabs */}
                    <div className="flex items-center gap-3">
                        {activeTab === 'sessions' && (
                            <button
                                onClick={() => setShowSessionModal(true)}
                                className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>New Session</span>
                            </button>
                        )}

                        {activeTab === 'questions' && (
                            <>
                                {isSelectionMode ? (
                                    <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 p-1.5 rounded-xl transition-all animate-in fade-in slide-in-from-right-4 duration-300">
                                        <button
                                            onClick={handleSelectAll}
                                            className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
                                        >
                                            {selectedItems.size > 0 && selectedItems.size === groupedQuestions.flatMap(g => g.questions).length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <div className="w-px h-4 bg-indigo-500/20 mx-1"></div>
                                        <button
                                            onClick={handleDownloadSelected}
                                            disabled={selectedItems.size === 0}
                                            className="bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 text-[13px] font-semibold px-4 py-1.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Download PDF ({selectedItems.size})</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); }}
                                            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer text-[13px] font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsSelectionMode(true)}
                                            className="bg-surface-3/50 text-slate-300 hover:text-white hover:bg-surface-3 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all border border-white/[0.08] cursor-pointer"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Select</span>
                                        </button>
                                        <button
                                            onClick={() => setShowQuestionModal(true)}
                                            className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98]"
                                        >
                                            <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                            <span>Add Question</span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {activeTab === 'notes' && (
                            <>
                                {isSelectionMode ? (
                                    <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 p-1.5 rounded-xl transition-all animate-in fade-in slide-in-from-right-4 duration-300">
                                        <button
                                            onClick={handleSelectAll}
                                            className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
                                        >
                                            {selectedItems.size > 0 && selectedItems.size === notes.filter(n => n.title?.toLowerCase().includes(noteSearchQuery.toLowerCase()) || n.content?.toLowerCase().includes(noteSearchQuery.toLowerCase())).length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <div className="w-px h-4 bg-indigo-500/20 mx-1"></div>
                                        <button
                                            onClick={handleDownloadSelected}
                                            disabled={selectedItems.size === 0}
                                            className="bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 text-[13px] font-semibold px-4 py-1.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Download PDF ({selectedItems.size})</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); }}
                                            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer text-[13px] font-semibold"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsSelectionMode(true)}
                                            className="bg-surface-3/50 text-slate-300 hover:text-white hover:bg-surface-3 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all border border-white/[0.08] cursor-pointer"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Select</span>
                                        </button>
                                        <button
                                            onClick={() => setShowNoteModal(true)}
                                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                        >
                                            <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                            <span>Add Note</span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {activeTab === 'images' && (
                            <button
                                onClick={() => setShowImageModal(true)}
                                className="bg-indigo-500 text-white hover:bg-indigo-600 flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-[0.98]"
                            >
                                <ImageIcon className="w-4 h-4" strokeWidth={2} />
                                <span>Add Image</span>
                            </button>
                        )}

                        {activeTab === 'topics' && (
                            <button
                                onClick={() => setShowTopicModal(true)}
                                className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md cursor-pointer hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98]"
                            >
                                <PlusCircle className="w-4 h-4" strokeWidth={2} />
                                <span>Manage Syllabus</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'topics' && (
                <div className="fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Syllabus</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setTopicsDefaultExpanded(true);
                                    setTreeKey(prev => prev + 1);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-primary hover:bg-primary/10 border border-white/5 transition-all cursor-pointer uppercase tracking-wider"
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
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer uppercase tracking-wider"
                                title="Collapse all"
                            >
                                <Minimize2 className="w-3.5 h-3.5" />
                                <span>Collapse All</span>
                            </button>
                        </div>
                    </div>
                    <TopicTree
                        key={treeKey}
                        topics={topics}
                        subjectId={id}
                        onTopicDeleted={handleTopicDeleted}
                        onTopicsChanged={setTopics}
                        defaultExpanded={topicsDefaultExpanded}
                    />
                </div>
            )}

            {activeTab === 'sessions' && (
                <div className="fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Study Sessions</h3>
                        <div className="relative group min-w-[300px]">
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


                    {sessions.length === 0 ? (
                        <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-white/10 max-w-2xl mx-auto mt-8">
                            <div className="w-20 h-20 rounded-xl bg-surface-3 mx-auto flex items-center justify-center mb-6 shadow-inner border border-white/5">
                                <Activity className="w-8 h-8 text-primary opacity-80" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No learning sessions</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-md mx-auto">
                                You haven't recorded any sessions for this subject yet. Start a session to log your correct and incorrect topics.
                            </p>
                            <button
                                onClick={() => setShowSessionModal(true)}
                                className="btn-primary flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg transition-all mx-auto w-fit cursor-pointer"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>Record First Session</span>
                            </button>
                        </div>
                    ) : (
                        <div className={`grid gap-5 ${sessionsViewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                            {(() => {
                                const filtered = sessions.filter(s =>
                                    (s.title || s.name || '')?.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
                                    s.notes?.toLowerCase().includes(sessionSearchQuery.toLowerCase())
                                );

                                if (filtered.length === 0 && sessions.length > 0) {
                                    return (
                                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-2xl border border-white/[0.05] border-dashed">
                                            <Search className="w-8 h-8 text-slate-600 mb-3" />
                                            <p className="text-slate-400 font-medium">No sessions match your search</p>
                                            <button onClick={() => setSessionSearchQuery('')} className="mt-2 text-indigo-400 text-sm hover:underline">Clear search</button>
                                        </div>
                                    );
                                }

                                return filtered.map((s) => (
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Question Bank</h3>
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by content or topic tags..."
                                className="w-full bg-surface-2/50 border border-white/[0.1] rounded-xl py-2 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 focus:bg-surface-2 transition-all"
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
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-start">
                        {/* Form moved to Modal */}

                        {/* Questions List (Full Width) */}
                        <div className="w-full">
                            {questions.length === 0 ? (
                                <div className="glass p-16 text-center rounded-xl border-dashed border-white/10 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 rotate-3">
                                        <HelpCircle className="w-10 h-10 text-slate-500" />
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">Your question bank is empty</h3>
                                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                        Start adding questions from your books or notes. AI will automatically format them for better readability.
                                    </p>
                                    <button
                                        onClick={() => setShowQuestionModal(true)}
                                        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        <span>Add Your First Question</span>
                                    </button>
                                </div>
                            ) : groupedQuestions.length === 0 ? (
                                <div className="glass p-16 text-center rounded-xl border-dashed border-white/10 flex flex-col items-center">
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
                                                    className={`question-card group relative transition-all ${isSelectionMode ? (selectedItems.has(q.id) ? 'ring-2 ring-indigo-500 cursor-pointer bg-indigo-500/5' : 'cursor-pointer hover:bg-white/[0.02]') : ''}`}
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
                                                        <span className="text-[12px] text-slate-500 ml-auto font-medium">
                                                            {new Date(q.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>

                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingQuestion(q);
                                                                    setShowEditQuestionModal(true);
                                                                }}
                                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer"
                                                                title="Edit Question"
                                                            >
                                                                <Pencil className="w-[18px] h-[18px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedQuestionIdForNote(q.id);
                                                                    setShowNoteModal(true);
                                                                }}
                                                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all cursor-pointer"
                                                                title="Manual Note"
                                                            >
                                                                <FileText className="w-[18px] h-[18px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleGenerateAINote(q.id)}
                                                                disabled={generatingAINoteId === q.id}
                                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                title={existingAINote ? "View AI Note" : "AI Note"}
                                                            >
                                                                {generatingAINoteId === q.id ? (
                                                                    <div className="w-[18px] h-[18px] border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                ) : existingAINote ? (
                                                                    <BookOpen className="w-[18px] h-[18px]" />
                                                                ) : (
                                                                    <Wand2 className="w-[18px] h-[18px]" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteQuestion({ open: true, questionId: q.id })}
                                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer"
                                                                title="Delete Question"
                                                            >
                                                                <Trash2 className="w-[18px] h-[18px]" />
                                                            </button>
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
                                                    {(() => {
                                                        let qTags = [];
                                                        try {
                                                            qTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []);
                                                        } catch {
                                                            qTags = [];
                                                        }
                                                        if (!qTags || qTags.length === 0) return null;
                                                        return (
                                                            <div className="mt-4 flex flex-wrap gap-2">
                                                                {qTags.map((tag, idx) => (
                                                                    <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                        <Hash className="w-2.5 h-2.5" />
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}

                                                    {q.type === 'image' && (
                                                        <div className="mt-5">
                                                            {fetchedImages[q.id] || fetchedImages[q.source_image_id] ? (
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
                                                                    className={`question-card group relative transition-all ${isSelectionMode ? (selectedItems.has(q.id) ? 'ring-2 ring-indigo-500 cursor-pointer bg-indigo-500/5' : 'cursor-pointer hover:bg-white/[0.02]') : ''}`}
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

                                                                        <div className="flex items-center gap-1 ml-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingQuestion(q);
                                                                                    setShowEditQuestionModal(true);
                                                                                }}
                                                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer"
                                                                                title="Edit Question"
                                                                            >
                                                                                <Pencil className="w-[18px] h-[18px]" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedQuestionIdForNote(q.id);
                                                                                    setShowNoteModal(true);
                                                                                }}
                                                                                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all cursor-pointer"
                                                                                title="Manual Note"
                                                                            >
                                                                                <FileText className="w-[18px] h-[18px]" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleGenerateAINote(q.id)}
                                                                                disabled={generatingAINoteId === q.id}
                                                                                className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                                title={existingAINote ? "View AI Note" : "AI Note"}
                                                                            >
                                                                                {generatingAINoteId === q.id ? (
                                                                                    <div className="w-[18px] h-[18px] border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                                                ) : existingAINote ? (
                                                                                    <BookOpen className="w-[18px] h-[18px]" />
                                                                                ) : (
                                                                                    <Wand2 className="w-[18px] h-[18px]" />
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setConfirmDeleteQuestion({ open: true, questionId: q.id })}
                                                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all cursor-pointer"
                                                                                title="Delete Question"
                                                                            >
                                                                                <Trash2 className="w-[18px] h-[18px]" />
                                                                            </button>
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
                                                                    {(() => {
                                                                        let qTags = [];
                                                                        try {
                                                                            qTags = typeof q.tags === 'string' ? JSON.parse(q.tags) : (q.tags || []);
                                                                        } catch {
                                                                            qTags = [];
                                                                        }
                                                                        if (!qTags || qTags.length === 0) return null;
                                                                        return (
                                                                            <div className="mt-4 flex flex-wrap gap-2">
                                                                                {qTags.map((tag, idx) => (
                                                                                    <span key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                                        <Hash className="w-2.5 h-2.5" />
                                                                                        {tag}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {q.type === 'image' && qidx === 0 && (
                                                                        <div className="mt-5">
                                                                            {fetchedImages[q.id] || fetchedImages[q.source_image_id] ? (
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                        <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Notes</h3>
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                value={noteSearchQuery}
                                onChange={(e) => setNoteSearchQuery(e.target.value)}
                                placeholder="Search notes by title or content..."
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


                    <div className="w-full">
                        {notes.length === 0 ? (
                            <div className="glass p-16 text-center rounded-xl border-dashed border-white/10 flex flex-col items-center">
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
                                    const filtered = notes.filter(n =>
                                        n.title?.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
                                        n.content?.toLowerCase().includes(noteSearchQuery.toLowerCase())
                                    );

                                    if (filtered.length === 0 && notes.length > 0) {
                                        return (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-2xl border border-white/[0.05] border-dashed">
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
                                            className={`glass-panel rounded-xl border transition-all flex group relative overflow-hidden ${notesViewMode === 'list' ? 'items-center py-3 pr-5 pl-1' : 'flex-col p-5'} ${isSelectionMode ? (selectedItems.has(note.id) ? 'border-indigo-400 bg-indigo-500/10 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/[0.06] hover:border-white/[0.1] cursor-pointer') : 'border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.02] cursor-pointer'}`}
                                            onClick={() => {
                                                if (isSelectionMode) {
                                                    const next = new Set(selectedItems);
                                                    if (next.has(note.id)) next.delete(note.id);
                                                    else next.add(note.id);
                                                    setSelectedItems(next);
                                                } else {
                                                    setViewingNote(note);
                                                    if (note.source_image_id) {
                                                        handleFetchNoteImage(note.id);
                                                    }
                                                }
                                            }}
                                        >
                                            {isSelectionMode && (
                                                <div className="absolute top-3 right-3 z-30">
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedItems.has(note.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 bg-surface-3/50'}`}>
                                                        {selectedItems.has(note.id) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                </div>
                                            )}
                                            {/* List mode progress line/indicator */}
                                            {notesViewMode === 'list' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/40" />
                                            )}

                                            {/* Optional background glow */}
                                            {notesViewMode === 'grid' && (
                                                <div className="absolute -right-10 -top-10 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full"></div>
                                            )}

                                            <div className={`flex flex-1 min-w-0 ${notesViewMode === 'list' ? 'items-center px-4 gap-6' : 'flex-col'}`}>
                                                {/* Title Section */}
                                                <div className={`flex items-start gap-3 relative z-10 ${notesViewMode === 'list' ? 'w-1/3 shrink-0' : 'mb-4'}`}>
                                                    <div className={`rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 ${notesViewMode === 'list' ? 'p-1.5' : 'p-2.5'}`}>
                                                        <FileText className={`${notesViewMode === 'list' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-heading font-bold text-white tracking-tight break-words truncate group-hover:text-emerald-400 transition-colors ${notesViewMode === 'list' ? 'text-[14px]' : 'text-[15px]'}`}>
                                                            {note.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                                                {new Date(note.created_at).toLocaleDateString(undefined, {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: notesViewMode === 'grid' ? 'numeric' : undefined
                                                                })}
                                                            </span>
                                                            {notesViewMode === 'list' && note.question_id && (
                                                                <>
                                                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                                                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Question Link</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Content Section */}
                                                {notesViewMode === 'grid' ? (
                                                    <div className="text-sm text-slate-300 line-clamp-5 leading-relaxed mb-4 relative z-10 overflow-hidden">
                                                        <div className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mt-0 prose-p:mb-2 prose-headings:font-bold prose-headings:text-white prose-headings:m-0 prose-headings:mb-1.5 prose-h1:text-[15px] prose-h2:text-[14px] prose-h3:text-[13px] prose-a:text-indigo-400 prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                                rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                                            >
                                                                {preprocessMarkdown(note.content || '')}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 min-w-0 relative z-10 hidden md:block">
                                                        <p className="text-[12px] text-slate-400 truncate opacity-70 group-hover:opacity-100 transition-opacity">
                                                            {note.content?.substring(0, 200).replace(/[#*`\n]/g, ' ')}...
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Source Image Link Section */}
                                                {note.source_image_id && (
                                                    <div className={`relative z-10 shrink-0 ${notesViewMode === 'list' ? 'mb-0' : 'mb-6'}`}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFetchNoteImage(note.id);
                                                                setViewingNote(note);
                                                            }}
                                                            disabled={fetchingImageId === `note-${note.id}`}
                                                            className={`flex items-center gap-2 rounded-xl font-bold bg-white/[0.04] text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-white/[0.08] disabled:opacity-50 cursor-pointer ${notesViewMode === 'list' ? 'p-2' : 'px-4 py-2 text-[12px]'}`}
                                                            title="View Source Image"
                                                        >
                                                            {fetchingImageId === `note-${note.id}` ? (
                                                                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <ImageIcon className={`${notesViewMode === 'list' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                                            )}
                                                            {notesViewMode === 'grid' && <span>Source Image</span>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions Section */}
                                            <div className={`flex items-center relative z-10 shrink-0 ${notesViewMode === 'list' ? 'py-0 border-l border-white/[0.06] pl-5 ml-2 gap-4' : 'pt-3 border-t border-white/[0.06] mt-auto justify-between'}`}>
                                                {notesViewMode === 'grid' && (
                                                    <div className="flex items-center gap-3">
                                                        {note.question_id && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigateToQuestion(note.question_id);
                                                                }}
                                                                className="flex items-center gap-1 hover:text-indigo-400 transition-colors cursor-pointer text-[12px]"
                                                                title="Go to Source Question"
                                                            >
                                                                <LinkIcon className="w-3.5 h-3.5" />
                                                                <span>Source</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                <div className={`flex items-center gap-1 ${notesViewMode === 'list' ? 'flex-col sm:flex-row' : 'opacity-0 group-hover:opacity-100 transition-all'}`}>
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
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingNote(note);
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-all cursor-pointer"
                                                        title="Edit Note"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDeleteNote({ open: true, note });
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                                                        title="Delete Note"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'images' && (
                <div className="fade-in pb-12 px-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/[0.08] pb-4">
                        <div className="flex items-center gap-3">
                            <ImageIcon className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-[20px] font-heading font-bold text-white tracking-tight">Image Gallery</h3>
                        </div>
                        <div className="relative group min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                placeholder="Search by date..."
                                className="w-full bg-surface-2/50 border border-white/[0.1] rounded-xl py-2 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 focus:bg-surface-2 transition-all"
                            />
                            {imageSearchQuery && (
                                <button
                                    onClick={() => setImageSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {images.length === 0 ? (
                        <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-white/10 flex flex-col items-center max-w-2xl mx-auto mt-8">
                            <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-6 shadow-inner border border-white/5 rotate-3">
                                <ImageIcon className="w-10 h-10 text-slate-500" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No images yet</h3>
                            <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-8">
                                Upload diagrams, textbook snippets, or handwritten notes. They'll be saved here for easy reference and AI analysis.
                            </p>
                            <button
                                onClick={() => setShowImageModal(true)}
                                className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg transition-all cursor-pointer"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>Upload Your First Image</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                            {images
                                .filter(img =>
                                    new Date(img.created_at).toLocaleDateString().includes(imageSearchQuery)
                                )
                                .map((img, index, arr) => {
                                    const isLast = index === arr.length - 1;
                                    return (
                                        <div
                                            key={img.id}
                                            ref={isLast ? lastImageElementRef : null}
                                            className="group relative aspect-square rounded-2xl overflow-hidden bg-surface-2 border border-white/[0.06] hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                                        >
                                            {/* Source Indicator Button */}
                                            {(img.linked_question_id || img.linked_note_id) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (img.linked_question_id) {
                                                            navigateToQuestion(img.linked_question_id);
                                                        } else if (img.linked_note_id) {
                                                            const note = notes.find(n => n.id === img.linked_note_id);
                                                            if (note) {
                                                                setViewingNote(note);
                                                                if (note.source_image_id) handleFetchNoteImage(note.id);
                                                            }
                                                        }
                                                    }}
                                                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-xl text-indigo-400 border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-all shadow-2xl z-20 hover:scale-110 active:scale-95 hover:bg-indigo-500/20"
                                                    title="View Linked Content"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            <img
                                                src={img.data}
                                                alt="Subject material"
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[11px] font-bold text-white/70 flex items-center gap-1.5">
                                                        <Activity className="w-3 h-3 text-indigo-400" />
                                                        {new Date(img.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                    {img.linked_question_id && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Question</span>}
                                                    {img.linked_note_id && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Note</span>}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const fakeNote = {
                                                            id: `img-${img.id}`,
                                                            title: 'Source Image',
                                                            content: 'Original captured material.',
                                                            source_image_id: img.id,
                                                            created_at: img.created_at
                                                        };
                                                        setFetchedImages(prev => ({ ...prev, [`note-img-${img.id}`]: img.data }));
                                                        setViewingNote(fakeNote);
                                                    }}
                                                    className="w-full py-2 bg-white text-black text-[12px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                    View Full
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {loadingMoreImages && (
                        <div className="flex justify-center mt-8 mb-4">
                            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubjectDetail;

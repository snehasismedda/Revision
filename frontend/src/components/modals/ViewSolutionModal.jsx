import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Link2 as LinkIcon, Maximize2, Minimize2, Sun, Moon, Loader2, Pencil, Check, Copy, Eye } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import { formatDate } from '../../utils/dateUtils';
import { useTheme } from '../../context/ThemeContext.jsx';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { preprocessMarkdown } from '../../utils/markdownUtils';

// Syntax Highlighting imports
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Enhanced Code Block with Language Detection, Syntax Highlighting and Copy Button
const SimpleCodeBlock = React.memo(({ children, isLightMode, fontSize = 16, primaryColor = '#3b82f6', className }) => {
    const [copied, setCopied] = useState(false);
    
    const languageMatch = React.useMemo(() => {
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
                : 'bg-[#0f0f1b] border-border shadow-black/40'}`}>
            
            <div className={`flex items-center justify-between px-6 py-3 border-b transition-colors duration-300
                ${isLightMode ? 'bg-[#f1f3f7] border-slate-200/60' : 'bg-surface-2 border-border'}`}>
                <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5 mr-2">
                         <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-surface-2' : 'bg-surface-3'}`} />
                         <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-surface-2' : 'bg-surface-3'}`} />
                         <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-surface-2' : 'bg-surface-3'}`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em]
                        ${isLightMode ? 'text-text-muted' : 'text-text-muted'}`}>
                        {languageMatch || 'CODE'}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer flex items-center gap-2 group/btn
                        ${isLightMode 
                            ? 'hover:bg-surface-2 text-text-muted' 
                            : 'hover:bg-surface-3 text-text'}`}
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

const ViewSolutionModal = ({ isOpen, onClose, solution, sourceImage, isFetchingImage, onEdit, isFullscreen: initialFullscreen = false, onMinimize }) => {
    const { theme } = useTheme();
    const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
    const [isLightMode, setIsLightMode] = useState(theme === 'light');
    const contentRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setIsLightMode(theme === 'light');
            setIsFullscreen(initialFullscreen);
        }
    }, [isOpen, theme, initialFullscreen]);

    const processedContent = preprocessMarkdown(solution?.content || '');

    const handleOpenOriginal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!sourceImage) return;
        
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Original Solution Image</title>
                        <style>
                            body { margin: 0; background: #010103; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
                            img { max-width: 100%; max-height: 100vh; object-fit: contain; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
                        </style>
                    </head>
                    <body>
                        <img src="${sourceImage}" alt="Solution Original" />
                    </body>
                </html>
            `);
            newWindow.document.close();
        } else {
            // Fallback for popup blockers
            const link = document.createElement('a');
            link.href = sourceImage;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!isOpen || !solution) return null;

    return (
        <ModalPortal>
            <div className={`fixed inset-0 z-50 flex items-center justify-center modal-backdrop fade-in ${isFullscreen ? 'p-0' : 'p-0 md:p-6'}`} onClick={onClose}>
                <div
                    className={`w-full flex flex-col ${isFullscreen ? 'h-screen w-screen md:max-h-screen rounded-none border-none' : 'h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-2xl border'} overflow-hidden transition-all duration-300 ${isLightMode ? 'light bg-surface-2 border-border' : 'dark bg-surface-2 border-border'}`}
                    style={{
                        maxWidth: isFullscreen ? 'none' : '56rem',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0 bg-surface/80 border-border text-text">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-heading font-bold text-text tracking-tight leading-snug">
                                    {solution.title || 'Solution'}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 opacity-80">
                                    <span className="text-[11px] font-medium text-text-muted">
                                        Solution  ·  {formatDate(solution.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button
                                    onClick={() => setIsLightMode(!isLightMode)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}
                                >
                                    {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </button>
                                {onEdit && (
                                        <button
                                        onClick={() => {
                                            onClose();
                                            onEdit(solution, isFullscreen, true);
                                        }}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                        title="Edit Solution"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                >
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                {onMinimize && (
                                    <button
                                        onClick={() => onMinimize(true)}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                                        title="Minimize Mode"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                )}
                            <button onClick={onClose} className="p-1.5 rounded-lg transition-all text-text-muted hover:bg-surface-3 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar scroll-smooth bg-surface-2 text-text">
                        <div className={`max-w-4xl mx-auto prose prose-blue prose-sm md:prose-base transition-colors duration-300 ${isLightMode ? 'prose-slate' : 'prose-invert'}`}>
                             {sourceImage && (
                                <div className="mb-10 group relative rounded-2xl overflow-hidden border border-border shadow-2xl transition-all hover:scale-[1.01]">
                                    <img src={sourceImage} alt="Solution Original" className="w-full h-auto rounded-xl select-none" />
                                    <div className="absolute inset-0 bg-surface-2/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={handleOpenOriginal} className="bg-surface-3 hover:bg-surface-2 text-text border border-border px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer">
                                            <Maximize2 className="w-4 h-4" /> View Original
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isFetchingImage && (
                                <div className="mb-10 h-64 bg-surface-2/30 rounded-2xl flex items-center justify-center animate-pulse border border-border">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 text-blue-500/40 animate-spin" />
                                        <span className="text-xs font-bold text-blue-400/40 uppercase tracking-widest">Loading Media...</span>
                                    </div>
                                </div>
                            )}

                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="font-heading font-extrabold tracking-tight text-text" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="font-heading font-bold tracking-tight text-text" {...props} />,
                                    table: ({ node, ...props }) => (
                                        <div className="overflow-x-auto my-6 rounded-xl border border-border shadow-xl">
                                            <table className="w-full border-collapse text-[13px]" {...props} />
                                        </div>
                                    ),
                                    th: ({ node, ...props }) => <th className="px-4 py-3 bg-surface-3/50 text-left font-bold text-text" {...props} />,
                                    td: ({ node, ...props }) => <td className="px-4 py-3 border-t border-border text-text-muted" {...props} />,
                                    pre: ({ children }) => children,
                                    code: ({ node, className, children, ...props }) => {
                                        const isBlock = /language-(\w+)/.exec(className || '') || String(children).includes('\n');
                                        return isBlock ? (
                                            <SimpleCodeBlock isLightMode={isLightMode} className={className}>
                                                {children}
                                            </SimpleCodeBlock>
                                        ) : (
                                            <code 
                                                className="px-1.5 py-0.5 rounded-md text-[0.85em] font-bold font-mono border transition-colors select-all bg-surface-3 text-primary border-border"
                                                {...props}
                                            >
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {processedContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .prose { max-width: 100%; color: var(--color-text-muted); }
                .prose h1, .prose h2, .prose h3 { color: var(--color-text); }
                .prose blockquote { border-left-color: var(--color-primary); background: rgba(139, 92, 246, 0.05); padding: 1rem; border-radius: 0 0.75rem 0.75rem 0; font-style: italic; }
            `}</style>
        </ModalPortal>
    );
};

export default ViewSolutionModal;

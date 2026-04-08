import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Link2 as LinkIcon, Maximize2, Minimize2, Sun, Moon, Loader2, Pencil, Check, Copy } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import { formatDate } from '../../utils/dateUtils';

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
        .replace(/\$$([^\n])/g, '$$\n$1');
};

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
                : 'bg-[#0f0f1b] border-white/[0.06] shadow-black/40'}`}>
            
            <div className={`flex items-center justify-between px-6 py-3 border-b transition-colors duration-300
                ${isLightMode ? 'bg-[#f1f3f7] border-slate-200/60' : 'bg-white/[0.03] border-white/[0.05]'}`}>
                <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5 mr-2">
                         <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-slate-300' : 'bg-white/10'}`} />
                         <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-slate-300' : 'bg-white/10'}`} />
                         <div className={`w-2.5 h-2.5 rounded-full ${isLightMode ? 'bg-slate-300' : 'bg-white/10'}`} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em]
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

const ViewSolutionModal = ({ isOpen, onClose, solution, sourceImage, isFetchingImage, onEdit }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLightMode, setIsLightMode] = useState(false);
    const contentRef = useRef(null);

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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className={`w-full flex flex-col ${isFullscreen ? 'h-screen md:max-h-screen rounded-none border-none' : 'h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-2xl border'} overflow-hidden transition-all duration-300`}
                    style={{
                        background: isLightMode ? '#ffffff' : '#12121a',
                        borderColor: isLightMode ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                        maxWidth: isFullscreen ? 'none' : '56rem',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${isLightMode ? 'bg-[#f8fafc] border-slate-200 text-slate-900' : 'bg-surface-2/80 border-white/[0.06] text-white'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className={`text-[16px] font-heading font-bold ${isLightMode ? 'text-slate-900' : 'text-white'} tracking-tight leading-snug`}>
                                    {solution.title || 'Solution'}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 opacity-80">
                                    <span className={`text-[11px] font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Solution  ·  {formatDate(solution.created_at)}

                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button
                                    onClick={() => setIsLightMode(!isLightMode)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isLightMode ? 'bg-white shadow-sm text-amber-500 hover:bg-amber-50' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}
                                >
                                    {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                </button>
                                {onEdit && (
                                        <button
                                        onClick={() => {
                                            onClose();
                                            onEdit(solution);
                                        }}
                                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isLightMode ? 'bg-white shadow-sm text-blue-600 hover:bg-blue-50' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                        title="Edit Solution"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isLightMode ? 'bg-white shadow-sm text-blue-600 hover:bg-blue-50' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                                >
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            <button onClick={onClose} className={`p-1.5 rounded-lg transition-all ${isLightMode ? 'text-slate-400 hover:bg-black/5' : 'text-slate-500 hover:bg-white/10'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar scroll-smooth">
                        <div className={`max-w-4xl mx-auto prose prose-invert prose-blue prose-sm md:prose-base transition-colors duration-300 ${isLightMode ? 'prose-slate' : ''}`}>
                             {sourceImage && (
                                <div className="mb-10 group relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl transition-all hover:scale-[1.01]">
                                    <img src={sourceImage} alt="Solution Original" className="w-full h-auto rounded-xl select-none" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={handleOpenOriginal} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                                            <Maximize2 className="w-4 h-4" /> View Original
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isFetchingImage && (
                                <div className="mb-10 h-64 bg-surface-2/30 rounded-2xl flex items-center justify-center animate-pulse border border-white/[0.05]">
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
                                    h1: ({ node, ...props }) => <h1 className={`font-heading font-extrabold tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`} {...props} />,
                                    h2: ({ node, ...props }) => <h2 className={`font-heading font-bold tracking-tight ${isLightMode ? 'text-slate-800' : 'text-white'}`} {...props} />,
                                    table: ({ node, ...props }) => (
                                        <div className="overflow-x-auto my-6 rounded-xl border border-white/[0.06] shadow-xl">
                                            <table className="w-full border-collapse text-[13px]" {...props} />
                                        </div>
                                    ),
                                    th: ({ node, ...props }) => <th className={`px-4 py-3 bg-surface-3/50 text-left font-bold ${isLightMode ? 'text-slate-700' : 'text-slate-200'}`} {...props} />,
                                    td: ({ node, ...props }) => <td className={`px-4 py-3 border-t border-white/5 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`} {...props} />,
                                    pre: ({ children }) => children,
                                    code: ({ node, className, children, ...props }) => {
                                        const isBlock = /language-(\w+)/.exec(className || '') || String(children).includes('\n');
                                        return isBlock ? (
                                            <SimpleCodeBlock isLightMode={isLightMode} className={className}>
                                                {children}
                                            </SimpleCodeBlock>
                                        ) : (
                                            <code 
                                                className={`px-1.5 py-0.5 rounded-md text-[0.85em] font-bold font-mono border transition-colors select-all`} 
                                                style={{ 
                                                    backgroundColor: isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                                                    color: '#3b82f6',
                                                    borderColor: isLightMode ? '#e2e8f0' : 'rgba(255,255,255,0.1)'
                                                }} 
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
                .prose { max-width: 100%; color: ${isLightMode ? '#334155' : 'rgba(255,255,255,0.7)'}; }
                .prose h1, .prose h2, .prose h3 { color: ${isLightMode ? '#0f172a' : 'white'}; }
                .prose blockquote { border-left-color: #3b82f6; background: rgba(59,130,246,0.05); padding: 1rem; border-radius: 0 0.75rem 0.75rem 0; font-style: italic; }
            `}</style>
        </ModalPortal>
    );
};

export default ViewSolutionModal;

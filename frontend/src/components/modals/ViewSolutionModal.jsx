import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Link2 as LinkIcon, Maximize2, Minimize2, Sun, Moon, Loader2, Pencil } from 'lucide-react';
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
        .replace(/\$\$([^\n])/g, '$$\n$1');
};

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
                                        Solution  ·  {new Date(solution.created_at).toLocaleDateString()}
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
                .prose code { background: ${isLightMode ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}; color: #3b82f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
                .prose pre { background: #011627 !important; border-radius: 1rem; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1); }
            `}</style>
        </ModalPortal>
    );
};

export default ViewSolutionModal;

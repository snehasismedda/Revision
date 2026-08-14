import React, { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { preprocessMarkdown } from '../../utils/markdownUtils';

/**
 * A lightweight preview modal for Key Highlights of a note.
 * Features a projection animation where the modal projects out directly from the note card origin.
 */
const KeyHighlightsModal = ({ note, onClose }) => {
    if (!note) return null;

    let kh = note.key_highlights || [];
    if (typeof kh === 'string') { try { kh = JSON.parse(kh); } catch { kh = []; } }
    if (!Array.isArray(kh)) kh = [];

    const triggerRect = note.triggerRect;

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <ModalPortal>
            <style>{`
                @keyframes projectModalFromOrigin {
                    0% {
                        opacity: 0;
                        transform: scale(0.15);
                    }
                    65% {
                        opacity: 1;
                        transform: scale(1.02);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes projectModalCenter {
                    0% {
                        opacity: 0;
                        transform: scale(0.85) translateY(16px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>

            {/* Backdrop without blur */}
            <div
                className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 fade-in"
                onClick={onClose}
            >
                {/* Modal Container */}
                <div
                    className="relative w-full max-w-lg bg-surface-2 border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    style={{
                        transformOrigin: triggerRect ? `${triggerRect.centerX}px ${triggerRect.centerY}px` : 'center center',
                        animation: triggerRect
                            ? 'projectModalFromOrigin 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                            : 'projectModalCenter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Glowing Top Accent Line */}
                    <div
                        className="h-[2px] w-full shrink-0"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.4) 25%, rgba(245,158,11,0.8) 50%, rgba(245,158,11,0.4) 75%, transparent 100%)' }}
                    />

                    {/* Header */}
                    <div className="px-6 py-4.5 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                <Zap className="w-5 h-5" fill="currentColor" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                                        Key Highlights
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">
                                        {kh.length}
                                    </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-heading font-bold text-text leading-snug truncate">
                                    {note.title}
                                </h3>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/50 rounded-xl transition-all cursor-pointer shrink-0"
                            title="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body / List */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 max-h-[60vh]">
                        {kh.length === 0 ? (
                            <p className="text-[13px] text-text-muted italic text-center py-6">
                                No key highlights added to this note.
                            </p>
                        ) : (
                            <ul className="space-y-2.5">
                                {kh.map((hl, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 p-3.5 rounded-xl bg-surface/50 border border-border/60 hover:border-amber-500/30 transition-all"
                                    >
                                        <span className="shrink-0 mt-0.5 w-5 h-5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center text-[10px] font-bold">
                                            {idx + 1}
                                        </span>
                                        <div className="text-[14px] text-text font-medium leading-relaxed flex-1 overflow-x-auto">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                                components={{
                                                    p: ({ children }) => <span className="inline">{children}</span>
                                                }}
                                            >
                                                {preprocessMarkdown(hl)}
                                            </ReactMarkdown>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default KeyHighlightsModal;

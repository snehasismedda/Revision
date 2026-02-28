import React from 'react';
import { X, FileText, Link2 as LinkIcon, Wand2 } from 'lucide-react';
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
        .replace(/\\bottom/g, '\\bot');
};

const ViewNoteModal = ({ isOpen, onClose, note, onNavigateToQuestion }) => {
    if (!isOpen || !note) return null;

    const isAINote = note.title?.startsWith('AI Note');
    const processedContent = preprocessMarkdown(note.content);

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/[0.08]"
                    style={{ background: '#12121a' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0 bg-surface-2/30 backdrop-blur-md">
                        <div className="flex items-center gap-4">
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
                            {note.question_id && onNavigateToQuestion && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onNavigateToQuestion(note.question_id);
                                    }}
                                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all border border-transparent hover:border-indigo-500/20"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    <span>Source Details</span>
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

                    {/* Content Body - Markdown Rendered */}
                    <div className="px-6 py-6 md:px-8 md:py-8 overflow-y-auto custom-scrollbar flex-1" style={{ background: '#12121a' }}>
                        <div className="prose prose-invert prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-h1:text-[22px] prose-h2:text-[19px] prose-h3:text-[17px] prose-headings:mt-6 prose-headings:mb-3 prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-3 prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-strong:text-white prose-code:text-emerald-300 prose-code:bg-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface-2 prose-pre:border prose-pre:border-white/[0.08] prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                            >
                                {processedContent}
                            </ReactMarkdown>
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
            </div>
        </ModalPortal>
    );
};

export default ViewNoteModal;

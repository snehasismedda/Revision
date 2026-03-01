import React from 'react';
import { X, FileText, Link2 as LinkIcon, Wand2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';

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

const ViewNoteModal = ({ isOpen, onClose, note, onNavigateToQuestion, sourceImage, isFetchingImage, onEdit, onPrev, onNext }) => {

    if (!isOpen || !note) return null;

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft' && onPrev) onPrev();
            if (e.key === 'ArrowRight' && onNext) onNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onPrev, onNext, onClose]);

    const isAINote = note.title?.startsWith('AI Note');
    const processedContent = preprocessMarkdown(note.content || '');

    const handleOpenOriginal = () => {
        if (!sourceImage) return;

        try {
            // Split the data URI to get the mime type and the base64 data
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

            // Cleanup the URL after a delay
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
            console.error('Error opening original image:', error);
            // Fallback for extremely simple cases or if atob fails
            const newWindow = window.open();
            newWindow.document.write(`<img src="${sourceImage}" style="max-width: 100%; height: auto;" />`);
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/[0.08]"
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

                    {/* Content Body - Markdown Rendered */}
                    <div className="px-6 py-6 md:px-8 md:py-8 overflow-y-auto custom-scrollbar flex-1" style={{ background: '#12121a' }}>

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

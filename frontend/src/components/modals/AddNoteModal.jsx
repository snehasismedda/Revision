import { useState } from 'react';
import { notesApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Save, FileText } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const AddNoteModal = ({ isOpen, onClose, subjectId, onNoteAdded, questionId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const handleAddNote = async (e) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            return toast.error('Please provide both title and content');
        }

        setAddingNote(true);
        try {
            const { note } = await notesApi.create(subjectId, { title: title.trim(), content: content.trim(), questionId });
            onNoteAdded(note);
            setTitle('');
            setContent('');
            onClose();
            toast.success('Note added successfully');
        } catch {
            toast.error('Failed to add note');
        } finally {
            setAddingNote(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            Add New Note
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        <form id="add-note-form" onSubmit={handleAddNote} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">
                                    Note Title
                                </label>
                                <div className="relative relative-group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Important formulas for Chapter 1"
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">
                                    Note Content
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Type your markdown notes here..."
                                    rows={8}
                                    className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none font-mono"
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-end">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                form="add-note-form"
                                type="submit"
                                disabled={addingNote || !title.trim() || !content.trim()}
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98]"
                            >
                                {addingNote ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Save Note</span>
                                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default AddNoteModal;

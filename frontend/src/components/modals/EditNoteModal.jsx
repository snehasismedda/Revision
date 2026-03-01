import React, { useState, useEffect } from 'react';
import { notesApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Save, FileText } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const EditNoteModal = ({ isOpen, onClose, subjectId, note, onNoteUpdated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (note) {
            setTitle(note.title || '');
            setContent(note.content || '');
        }
    }, [note]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Title cannot be empty');
        if (!content.trim()) return toast.error('Content cannot be empty');

        setSaving(true);
        try {
            const payload = {
                title: title.trim(),
                content: content.trim()
            };

            const { note: updated } = await notesApi.update(subjectId, note.id, payload);
            onNoteUpdated(updated);
            onClose();
            toast.success('Note updated successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update note');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !note) return null;

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
                                <FileText className="w-5 h-5" />
                            </div>
                            Edit Note
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar space-y-6">
                        <form id="edit-note-form" onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5 text-slate-400">
                                    Note Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter note title..."
                                    className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5 text-slate-400">
                                    Note Content (Markdown)
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Edit note content..."
                                    rows={10}
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
                                form="edit-note-form"
                                type="submit"
                                disabled={saving}
                                className="bg-emerald-600 text-white text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98] hover:bg-emerald-500"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Update Note</span>
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

export default EditNoteModal;

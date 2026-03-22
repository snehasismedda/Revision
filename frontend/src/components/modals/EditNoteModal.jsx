import React, { useState, useEffect } from 'react';
import { notesApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Save, FileText } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const EditNoteModal = ({ isOpen, onClose, subjectId, note, onNoteUpdated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [availableTags, setAvailableTags] = useState([]);

    useEffect(() => {
        if (note) {
            setTitle(note.title || '');
            setContent(note.content || '');
            
            let t = note.tags || [];
            if (typeof t === 'string') {
                try { t = JSON.parse(t); } catch { t = []; }
            }
            setTags(Array.isArray(t) ? t : []);
            fetchAvailableTags();
        }
    }, [note, subjectId]);

    const fetchAvailableTags = async () => {
        try {
            const { tags } = await notesApi.getTags(subjectId);
            setAvailableTags(tags || []);
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Title cannot be empty');
        if (!content.trim()) return toast.error('Content cannot be empty');

        setSaving(true);
        try {
            const finalTags = [...tags];
            const trimmedTag = tagInput.trim();
            if (trimmedTag && !finalTags.includes(trimmedTag)) {
                finalTags.push(trimmedTag);
            }

            const payload = {
                title: title.trim(),
                content: content.trim(),
                tags: finalTags
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
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
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar flex-1">
                        <form id="edit-note-form" onSubmit={handleUpdate} className="space-y-6 flex flex-col h-full min-h-0">
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

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5 text-slate-400">
                                    Note Content (Markdown)
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Edit note content..."
                                    rows={12}
                                    className="w-full min-h-[300px] bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-y font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 text-[12px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1.5">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => setTags(t => t.filter(x => x !== tag))}
                                                className="hover:text-white transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            const t = tagInput.trim();
                                            if (t && !tags.includes(t)) {
                                                setTags([...tags, t]);
                                            }
                                            setTagInput('');
                                        }
                                    }}
                                    className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 transition-all placeholder:text-slate-600/80"
                                    placeholder="Type a tag and press Enter..."
                                />
                                
                                {/* Tag Suggestions */}
                                {availableTags.length > 0 && (
                                    <div className="mt-3">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 opacity-60 text-slate-500">Suggestions</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableTags
                                                .filter(tag => !tags.includes(tag))
                                                .filter(tag => !tagInput || tag.toLowerCase().includes(tagInput.toLowerCase()))
                                                .slice(0, 10)
                                                .map(tag => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!tags.includes(tag)) {
                                                                setTags([...tags, tag]);
                                                            }
                                                            setTagInput('');
                                                        }}
                                                        className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-emerald-400 bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 rounded-md transition-all cursor-pointer"
                                                    >
                                                        + {tag}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
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

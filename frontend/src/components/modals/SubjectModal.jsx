import { useState, useEffect } from 'react';
import { subjectsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, LibraryBig, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalPortal from '../ModalPortal.jsx';
import { useSubjects } from '../../context/SubjectContext.jsx';

const SubjectModal = ({ isOpen, onClose, editingSubject, onSubjectSaved, existingTags = [] }) => {
    const [form, setForm] = useState({ name: '', description: '', tags: [] });
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { addSubject, updateSubject } = useSubjects();

    useEffect(() => {
        if (editingSubject) {
            let t = editingSubject.tags || [];
            if (typeof t === 'string') {
                try { t = JSON.parse(t); } catch { t = []; }
            }
            t = Array.isArray(t) ? t : [];
            setForm({ name: editingSubject.name, description: editingSubject.description || '', tags: t });
        } else {
            setForm({ name: '', description: '', tags: [] });
        }
    }, [editingSubject, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        // Auto-add any leftover tagInput
        const finalTags = [...form.tags];
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !finalTags.includes(trimmedTag)) {
            finalTags.push(trimmedTag);
        }

        try {
            if (editingSubject) {
                const subject = await updateSubject(editingSubject.id, {
                    name: form.name,
                    description: form.description,
                    tags: finalTags
                });
                onSubjectSaved(subject, true);
                onClose();
            } else {
                const subject = await addSubject({
                    name: form.name,
                    description: form.description,
                    tags: finalTags
                });

                onSubjectSaved(subject, false);
                onClose();
                navigate(`/subjects/${subject.id}`);
            }
        } catch (err) {
            setError(err.message || 'Operation failed');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <LibraryBig className="w-5 h-5" />
                            </div>
                            {editingSubject ? 'Edit Subject' : 'Create Subject'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form id="subject-form" onSubmit={handleSubmit} className="px-7 py-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-medium">{error}</div>
                        )}

                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Subject Name *</label>
                            <input
                                required
                                autoFocus
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                placeholder="e.g. Mathematics, Physics..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                rows={2}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none"
                                placeholder="Optional description..."
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Tags</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {form.tags.map(tag => (
                                    <span key={tag} className="px-2.5 py-1 text-[12px] font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center gap-1.5">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}
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
                                        if (t && !form.tags.includes(t)) {
                                            setForm(f => ({ ...f, tags: [...f.tags, t] }));
                                        }
                                        setTagInput('');
                                    }
                                }}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                placeholder="Type a tag and press Enter..."
                            />
                            {existingTags.filter(t => !form.tags.includes(t)).length > 0 && (
                                <div className="mt-3">
                                    <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">Available Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {existingTags.filter(t => !form.tags.includes(t)).map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, tags: [...f.tags, tag] }))}
                                                className="px-2 py-1 text-[11px] font-medium bg-surface-3/50 text-slate-300 hover:text-white hover:bg-surface-3 border border-white/[0.06] hover:border-white/[0.12] rounded-md transition-all cursor-pointer shadow-sm active:scale-95"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>


                    </form>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="subject-form"
                            disabled={saving || !form.name.trim()}
                            className="flex-[2] btn-primary flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                        >
                            <span>{saving ? (editingSubject ? 'Updating...' : 'Creating...') : (editingSubject ? 'Update Subject' : 'Create Subject')}</span>
                            {!saving && !editingSubject && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default SubjectModal;

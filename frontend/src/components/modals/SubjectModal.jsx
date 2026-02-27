import { useState, useEffect } from 'react';
import { subjectsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, LibraryBig, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalPortal from '../ModalPortal.jsx';

const SubjectModal = ({ isOpen, onClose, editingSubject, onSubjectSaved }) => {
    const [form, setForm] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (editingSubject) {
            setForm({ name: editingSubject.name, description: editingSubject.description || '' });
        } else {
            setForm({ name: '', description: '' });
        }
    }, [editingSubject, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const loadingToast = toast.loading(editingSubject ? 'Updating subject...' : 'Creating subject...');
        try {
            if (editingSubject) {
                const { subject } = await subjectsApi.update(editingSubject.id, form);
                onSubjectSaved(subject, true);
                toast.success('Subject updated successfully!', { id: loadingToast });
                onClose();
            } else {
                const { subject } = await subjectsApi.create(form);
                onSubjectSaved(subject, false);
                toast.success('Subject created successfully!', { id: loadingToast });
                onClose();
                navigate(`/subjects/${subject.id}`);
            }
        } catch (err) {
            setError(err.message);
            toast.error(err.message || (editingSubject ? 'Failed to update subject' : 'Failed to create subject'), { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
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
                    <form id="subject-form" onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
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
                                rows={3}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none"
                                placeholder="Optional description..."
                            />
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

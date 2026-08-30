import { useState, useEffect } from 'react';
import { sessionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Pencil, Save } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const EditSessionModal = ({ isOpen, onClose, subjectId, session, onSessionUpdated }) => {
    const [form, setForm] = useState({ title: '', notes: '', sessionDate: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (session) {
            setForm({
                title: session.title || '',
                notes: session.notes || '',
                sessionDate: session.sessionDate
                    ? new Date(session.sessionDate).toISOString().split('T')[0]
                    : '',
            });
        }
    }, [session]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Title is required');
        setSaving(true);
        try {
            const { session: updated } = await sessionsApi.update(subjectId, session.id, {
                title: form.title.trim(),
                notes: form.notes.trim() || null,
                sessionDate: form.sessionDate || null,
            });
            onSessionUpdated(updated);
            onClose();
            toast.success('Session updated');
        } catch {
            toast.error('Failed to update session');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !session) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Pencil className="w-5 h-5" />
                            </div>
                            Edit Session
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form id="edit-session-form" onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Title *</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-text-muted/60"
                                autoFocus
                                placeholder="Session title..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Date</label>
                            <input
                                type="date"
                                value={form.sessionDate}
                                onChange={(e) => setForm((p) => ({ ...p, sessionDate: e.target.value }))}
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                rows={3}
                                placeholder="Optional session notes..."
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-text-muted/60 resize-none"
                            />
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-border flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text hover:bg-surface-3/10 transition-all cursor-pointer border border-transparent hover:border-border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="edit-session-form"
                            disabled={saving || !form.title.trim()}
                            className="flex-[2] btn-primary flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default EditSessionModal;

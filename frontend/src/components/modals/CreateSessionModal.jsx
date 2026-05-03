import { useState } from 'react';
import { sessionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Activity, ChevronRight } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const CreateSessionModal = ({ isOpen, onClose, subjectId, onSessionCreated }) => {
    const [form, setForm] = useState({
        title: '',
        notes: '',
        sessionDate: new Date().toISOString().slice(0, 10)
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;

        setSaving(true);
        const loadingToast = toast.loading('Creating session...');
        try {
            const { session } = await sessionsApi.create(subjectId, form);
            onSessionCreated(session);
            setForm({
                title: '',
                notes: '',
                sessionDate: new Date().toISOString().slice(0, 10)
            });
            toast.success('Session created successfully!', { id: loadingToast });
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to create session', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

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
                                <Activity className="w-5 h-5" />
                            </div>
                            New Learning Session
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form id="session-form" onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Session Title *</label>
                            <input
                                required
                                autoFocus
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-text-muted/60"
                                placeholder="e.g. Mock Test 1, Practice Set 3..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Date</label>
                            <input
                                type="date"
                                value={form.sessionDate}
                                onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                rows={3}
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-text-muted/60 resize-none"
                                placeholder="Optional notes about this session..."
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
                            form="session-form"
                            disabled={saving || !form.title.trim()}
                            className="flex-[2] btn-primary flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                        >
                            <span>{saving ? 'Creating...' : 'Create Session'}</span>
                            {!saving && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default CreateSessionModal;

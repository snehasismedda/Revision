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
                    className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Activity className="w-5 h-5" />
                            </div>
                            New Learning Session
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form id="session-form" onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Session Title *</label>
                            <input
                                required
                                autoFocus
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                placeholder="e.g. Mock Test 1, Practice Set 3..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Date</label>
                            <input
                                type="date"
                                value={form.sessionDate}
                                onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Notes</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                rows={3}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none"
                                placeholder="Optional notes about this session..."
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

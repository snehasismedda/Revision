import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sessionsApi, entriesApi } from '../api/index.js';
import { useSubjects } from '../context/SubjectContext.jsx';
import { useTopics } from '../context/TopicContext.jsx';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, GitCommit } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import toast from 'react-hot-toast';

const flattenTopics = (nodes, depth = 0) => {
    const flat = [];
    nodes.forEach((n) => {
        flat.push({ ...n, depth });
        if (n.children?.length) flat.push(...flattenTopics(n.children, depth + 1));
    });
    return flat;
};

const NewSession = () => {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const { refreshStats } = useSubjects();
    const [step, setStep] = useState(1); // 1=details, 2=topics
    const [form, setForm] = useState({ title: '', notes: '', sessionDate: new Date().toISOString().slice(0, 10) });
    const { topicsBySubject, loadTopics } = useTopics();
    const topics = flattenTopics(topicsBySubject[subjectId] || []);
    const [selected, setSelected] = useState({}); // topicId → { selected, isCorrect }
    const [saving, setSaving] = useState(false);
    const [session, setSession] = useState(null);
    const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

    useEffect(() => {
        if (subjectId) loadTopics(subjectId);
    }, [subjectId, loadTopics]);

    const handleDetailsSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const loadingToast = toast.loading('Creating session...');
        try {
            const { session: s } = await sessionsApi.create(subjectId, form);
            setSession(s);
            setStep(2);
            toast.success('Session details saved!', { id: loadingToast });
        } catch (err) {
            toast.error(err.message || 'Failed to create session', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const toggleTopic = (id) => {
        setSelected((prev) => ({
            ...prev,
            [id]: prev[id] ? undefined : { selected: true, isCorrect: true },
        }));
    };

    const toggleCorrect = (id, e) => {
        e.stopPropagation();
        setSelected((prev) => ({
            ...prev,
            [id]: { ...prev[id], isCorrect: !prev[id]?.isCorrect },
        }));
    };

    const handleSaveEntries = async () => {
        const entries = Object.entries(selected)
            .filter(([, v]) => v)
            .map(([topicId, v]) => ({ topicId, isCorrect: v.isCorrect }));

        if (entries.length === 0) {
            setShowEmptyConfirm(true);
            return;
        }

        executeSave(entries);
    };

    const executeSave = async (entries) => {
        setSaving(true);
        const loadingToast = toast.loading('Saving results...');
        try {
            if (entries.length > 0) {
                await entriesApi.create(session.id, { entries });
            }
            toast.success('Session completed!', { id: loadingToast });
            refreshStats([subjectId]);
            navigate(`/subjects/${subjectId}/sessions/${session.id}`);
        } catch {
            toast.error('Failed to save session results', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = Object.values(selected).filter(Boolean).length;

    return (
        <div className="fade-in max-w-2xl mx-auto">
            <ConfirmDialog
                isOpen={showEmptyConfirm}
                title="Save Empty Session?"
                message="You haven't tagged any topics for this session. Do you want to save it as an empty entry?"
                confirmText="Save Anyway"
                type="primary"
                onConfirm={() => executeSave([])}
                onCancel={() => setShowEmptyConfirm(false)}
            />

            <div className="flex items-center gap-3 mb-8">
                <Link
                    to={`/subjects/${subjectId}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
                <div className="h-4 w-px bg-white/10" />
                <h1 className="text-2xl font-heading font-bold text-white tracking-tight">New Session</h1>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 -z-10" />

                {[{ n: 1, label: 'Details' }, { n: 2, label: 'Tag Topics' }].map(({ n, label }, idx) => (
                    <div key={n} className="flex-1 flex flex-col items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-heading font-bold outline outline-4 outline-surface transition-all duration-500
                                ${step > n ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : step === n ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                                        : 'bg-surface-3 text-slate-500 border border-white/5'}`
                            }
                        >
                            {step > n ? <CheckCircle2 className="w-5 h-5" /> : n}
                        </div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${step >= n ? 'text-slate-300' : 'text-slate-600'}`}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <form onSubmit={handleDetailsSubmit} className="glass p-6 md:p-8 space-y-5 fade-in rounded-xl">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Session Title *</label>
                        <input
                            required
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            className="w-full bg-surface-2/50 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                            placeholder="e.g. Mock Test 1, Practice Set 3..."
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                        <input
                            type="date"
                            value={form.sessionDate}
                            onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))}
                            className="w-full bg-surface-2/50 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner [color-scheme:dark]"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            rows={3}
                            className="w-full bg-surface-2/50 border border-white/10 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none shadow-inner"
                            placeholder="Optional notes about this session..."
                        />
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving || !form.title.trim()}
                            className="btn-primary w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <span>{saving ? 'Creating Session...' : 'Continue to Topic Tagging'}</span>
                            {!saving && <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="fade-in space-y-4">
                    <div className="glass p-6 rounded-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-heading font-semibold text-white tracking-tight mb-1">What did you cover?</h3>
                                <p className="text-sm text-slate-400">
                                    Select topics encountered in this session, then mark them as <span className="text-emerald-400 font-semibold px-1 py-0.5 bg-emerald-500/10 rounded">correct</span> or <span className="text-red-400 font-semibold px-1 py-0.5 bg-red-500/10 rounded">incorrect</span>.
                                </p>
                            </div>
                            <div className="shrink-0 bg-primary/10 border border-primary/20 text-primary font-heading font-bold text-sm px-3 py-1.5 rounded-lg">
                                {selectedCount} Selected
                            </div>
                        </div>
                    </div>

                    <div className="glass p-2 md:p-4 rounded-xl max-h-[500px] overflow-y-auto">
                        {topics.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-white/10 rounded-xl mx-2 my-2 bg-white/5">
                                <GitCommit className="w-8 h-8 text-slate-500 mx-auto mb-3 opacity-50" />
                                <p className="text-slate-400 text-sm font-medium">No topics found in this subject.</p>
                                <p className="text-slate-500 text-xs mt-1">Add topics horizontally via the Subject page first.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {topics.map((t) => {
                                    const sel = selected[t.id];
                                    return (
                                        <div
                                            key={t.id}
                                            className={`relative flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all cursor-pointer group
                                                ${sel
                                                    ? 'bg-primary/10 border border-primary/20 shadow-inner'
                                                    : 'border border-transparent hover:bg-white/5'
                                                }`}
                                            onClick={() => toggleTopic(t.id)}
                                        >
                                            {/* Indentation Visualizer */}
                                            {t.depth > 0 && (
                                                <div
                                                    className="w-px h-full bg-white/5 absolute left-0 top-0 bottom-0"
                                                    style={{ left: `${Math.max(12, t.depth * 16)}px` }}
                                                />
                                            )}

                                            <div style={{ marginLeft: `${t.depth * 16}px` }} className="flex items-center gap-3 flex-1">
                                                {/* Custom Checkbox */}
                                                <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all duration-300
                                                    ${sel ? 'bg-primary border-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'border-slate-600 bg-surface-3 group-hover:border-slate-400'}
                                                `}>
                                                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                                </div>

                                                <span className={`text-sm flex-1 transition-colors ${sel ? 'text-white font-medium' : 'text-slate-400'} ${t.depth === 0 ? 'font-heading font-semibold' : ''}`}>
                                                    {t.name}
                                                </span>
                                            </div>

                                            {/* Correct/Incorrect Toggle Switch */}
                                            {sel && (
                                                <button
                                                    onClick={(e) => toggleCorrect(t.id, e)}
                                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300
                                                        ${sel.isCorrect
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                                        }`}
                                                >
                                                    {sel.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                    {sel.isCorrect ? 'Correct' : 'Incorrect'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSaveEntries}
                        disabled={saving || topics.length === 0}
                        className="btn-primary w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <span>{saving ? 'Saving Application...' : 'Save Session Entries'}</span>
                        {!saving && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NewSession;

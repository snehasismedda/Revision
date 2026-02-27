import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sessionsApi } from '../api/index.js';
import PerformanceBadge from '../components/PerformanceBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Calendar, Trash2, Target, CheckCircle2, XCircle, Tags } from 'lucide-react';

const SessionDetail = () => {
    const { subjectId, id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        sessionsApi.get(subjectId, id)
            .then(({ session: s }) => {
                // Normalize field names from snake_case
                setSession({
                    ...s,
                    sessionDate: s.session_date || s.sessionDate,
                    totalQuestions: s.entries?.length || 0,
                    totalCorrect: s.entries?.filter(e => e.is_correct ?? e.isCorrect).length || 0,
                    totalIncorrect: s.entries?.filter(e => !(e.is_correct ?? e.isCorrect)).length || 0,
                    accuracy: s.entries?.length
                        ? Math.round((s.entries.filter(e => e.is_correct ?? e.isCorrect).length / s.entries.length) * 1000) / 10
                        : 0,
                    entries: (s.entries || []).map(e => ({
                        ...e,
                        topicId: e.topic_id || e.topicId,
                        topicName: e.topic_name || e.topicName,
                        isCorrect: e.is_correct ?? e.isCorrect,
                    })),
                });
            })
            .catch(() => navigate(`/subjects/${subjectId}`))
            .finally(() => setLoading(false));
    }, [id, subjectId]);

    const handleDelete = async () => {
        const loadingToast = toast.loading('Deleting session...');
        try {
            await sessionsApi.delete(subjectId, id);
            toast.success('Session deleted', { id: loadingToast });
            navigate(`/subjects/${subjectId}`);
        } catch {
            toast.error('Failed to delete session', { id: loadingToast });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) return null;

    const correctTopics = session.entries?.filter(e => e.isCorrect) || [];
    const incorrectTopics = session.entries?.filter(e => !e.isCorrect) || [];

    return (
        <div className="fade-in max-w-5xl mx-auto pb-14">
            <ConfirmDialog
                isOpen={showConfirm}
                title="Delete Session"
                message="Are you sure you want to delete this study session? This action cannot be undone and will remove these results from your performance analytics."
                onConfirm={handleDelete}
                onCancel={() => setShowConfirm(false)}
            />

            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-12">
                <Link
                    to={`/subjects/${subjectId}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        to={`/subjects/${subjectId}/sessions/${id}/tag`}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
                    >
                        <Tags className="w-4 h-4" />
                        Tag Topics
                    </Link>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Session"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Session Summary Card */}
            <div className="glass p-10 rounded-xl mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-heading font-bold text-white tracking-tight">{session.title}</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(session.sessionDate).toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                            <Target className="w-4 h-4" />
                            {session.totalQuestions} questions tracked
                        </div>
                    </div>

                    {session.notes && (
                        <p className="mt-6 text-slate-400 text-sm leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">{session.notes}</p>
                    )}
                </div>

                {/* Score Section */}
                {session.totalQuestions > 0 && (
                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 flex flex-col items-center justify-center p-8 rounded-xl bg-white/5 border border-white/5 shadow-inner">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Net Accuracy</span>
                            <div className={`text-6xl font-heading font-bold tracking-tight drop-shadow-sm ${session.accuracy >= 75 ? 'text-emerald-400' : session.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {session.accuracy}%
                            </div>
                            <div className="mt-4">
                                <PerformanceBadge accuracy={session.accuracy} />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex flex-col justify-center gap-4">
                            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden shadow-inner flex">
                                <div
                                    className="bg-emerald-500 h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    style={{ width: `${(session.totalCorrect / session.totalQuestions) * 100}%` }}
                                />
                                <div
                                    className="bg-red-500/50 h-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(session.totalIncorrect / session.totalQuestions) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-semibold text-slate-200">{session.totalCorrect} Correct</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-slate-200">{session.totalIncorrect} Incorrect</span>
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Topics Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Correct Topics */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-sm font-heading font-bold text-slate-200 uppercase tracking-wider">Mastered Topics</h2>
                        <span className="ml-auto text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">{correctTopics.length}</span>
                    </div>
                    <div className="space-y-2">
                        {correctTopics.length > 0 ? correctTopics.map(e => (
                            <div key={e.topicId || e.id} className="glass px-4 py-3 rounded-xl border-emerald-500/10 bg-emerald-500/[0.02] flex items-center justify-between group hover:bg-emerald-500/[0.05] transition-colors">
                                <span className="text-sm font-medium text-slate-300">{e.topicName}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                            </div>
                        )) : (
                            <div className="p-4 rounded-xl border border-dashed border-white/5 text-center">
                                <p className="text-xs text-slate-500">No mastered topics in this session</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Incorrect Topics */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <h2 className="text-sm font-heading font-bold text-slate-200 uppercase tracking-wider">Revision Required</h2>
                        <span className="ml-auto text-[10px] font-bold text-red-500/50 uppercase tracking-widest">{incorrectTopics.length}</span>
                    </div>
                    <div className="space-y-2">
                        {incorrectTopics.length > 0 ? incorrectTopics.map(e => (
                            <div key={e.topicId || e.id} className="glass px-4 py-3 rounded-xl border-red-500/10 bg-red-500/[0.02] flex items-center justify-between group hover:bg-red-500/[0.05] transition-colors">
                                <span className="text-sm font-medium text-slate-300">{e.topicName}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            </div>
                        )) : (
                            <div className="p-4 rounded-xl border border-dashed border-white/5 text-center">
                                <p className="text-xs text-slate-500">No incorrect topics! Perfect score.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionDetail;

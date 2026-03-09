import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sessionsApi, aiApi } from '../api/index.js';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import PerformanceBadge from '../components/PerformanceBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import toast from 'react-hot-toast';
import {
    ArrowLeft, FileText, Calendar, Trash2, Target,
    CheckCircle2, XCircle, Tags, Sparkles, TrendingUp,
    Activity, ChevronRight, BarChart3, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

const preprocessMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\\\\\[/g, '\n$$\n')
        .replace(/\\\\\]/g, '\n$$\n')
        .replace(/\\\[/g, '\n$$\n')
        .replace(/\\\]/g, '\n$$\n')
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\$\$\$\$/g, '$$\n$$')
        .replace(/\$ \$/g, '$$')
        .replace(/([^\n])\$\$/g, '$1\n$$')
        .replace(/\$\$([^\n])/g, '$$\n$1')
        .replace(/\\bottom([a-zA-Z])/g, '\\bot $1')
        .replace(/\\bottom/g, '\\bot');
};

const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass p-3 border border-white/10 rounded-lg shadow-xl backdrop-blur-xl text-sm">
            <p className="text-slate-300 font-heading font-semibold mb-1.5">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="font-medium text-white">{p.name}: {p.value}%</span>
                </div>
            ))}
        </div>
    );
};

const SessionDetail = () => {
    const { subjectId, id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [insight, setInsight] = useState('');
    const [insightLoading, setInsightLoading] = useState(false);

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
    }, [id, subjectId, navigate]);

    const loadInsight = async () => {
        setInsightLoading(true);
        const loadingToast = toast.loading('Generating AI analysis...');
        try {
            const { insight: text } = await aiApi.sessionInsights(subjectId, id);
            setInsight(text);
            toast.success('Analysis complete', { id: loadingToast });
        } catch {
            setInsight('Unable to generate AI insights for this session.');
            toast.error('AI service unavailable', { id: loadingToast });
        } finally {
            setInsightLoading(false);
        }
    };

    const topicPerformance = useMemo(() => {
        if (!session?.entries) return [];
        const map = {};
        session.entries.forEach(e => {
            if (!e.topicId || !e.topicName) return;
            if (!map[e.topicId]) {
                map[e.topicId] = { topicName: e.topicName, correct: 0, total: 0 };
            }
            map[e.topicId].total++;
            if (e.isCorrect) map[e.topicId].correct++;
        });
        return Object.entries(map).map(([id, stats]) => ({
            topicId: id,
            topicName: stats.topicName,
            accuracy: Math.round((stats.correct / stats.total) * 100),
            correct: stats.correct,
            total: stats.total
        })).sort((a, b) => b.accuracy - a.accuracy);
    }, [session?.entries]);

    const getBarColor = (accuracy) => {
        if (accuracy >= 75) return EMERALD;
        if (accuracy >= 50) return AMBER;
        return RED;
    };

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
            <div className="flex items-center justify-between mb-8">
                <Link
                    to={`/subjects/${subjectId}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>
                <div className="flex items-center gap-2">
                    {!session.testId && (
                        <Link
                            to={`/subjects/${subjectId}/sessions/${id}/tag`}
                            className="flex items-center gap-2 text-[13px] font-semibold text-slate-300 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/5"
                        >
                            <Tags className="w-4 h-4 text-indigo-400" />
                            Tag Topics
                        </Link>
                    )}
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                        title="Delete Session"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Session Hero Section */}
            <div className="flex flex-col gap-6 mb-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-primary font-bold tracking-widest uppercase text-[10px]">
                            <Activity className="w-3.5 h-3.5" />
                            Session Overview
                        </div>
                        <h1 className="text-3xl font-heading font-bold text-white tracking-tight leading-tight">{session.title}</h1>
                        <div className="flex items-center gap-4 mt-2.5">
                            <div className="flex items-center gap-1.5 text-slate-400 text-[13px]">
                                <Calendar className="w-4 h-4" />
                                {new Date(session.sessionDate).toLocaleDateString(undefined, {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                            <div className="flex items-center gap-1.5 text-slate-400 text-[13px]">
                                <Target className="w-4 h-4" />
                                {session.totalQuestions} questions tracked
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.06] to-transparent" />
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* SECTION 1: Performance Summary          */}
            {/* ═══════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                {/* Accuracy Card */}
                <div className="lg:col-span-1 glass p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Final Accuracy</span>
                    <div className={`text-5xl font-heading font-bold tracking-tighter ${session.accuracy >= 75 ? 'text-emerald-400' : session.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {session.accuracy}%
                    </div>
                    <div className="mt-4">
                        <PerformanceBadge accuracy={session.accuracy} />
                    </div>
                </div>

                {/* Score Breakdown Card */}
                <div className="lg:col-span-3 glass p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-bl-full pointer-events-none" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400 font-medium">Session Distribution</span>
                                <span className="text-slate-500 text-xs">{session.totalQuestions} Questions</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-3.5 overflow-hidden flex shadow-inner group-hover:shadow-primary/5 transition-shadow">
                                <div
                                    className="bg-emerald-500 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                    style={{ width: `${(session.totalCorrect / session.totalQuestions) * 100}%` }}
                                />
                                <div
                                    className="bg-red-500/50 h-full transition-all duration-1000 ease-out"
                                    style={{ width: `${(session.totalIncorrect / session.totalQuestions) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-sm font-semibold text-slate-200">{session.totalCorrect} Correct</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-semibold text-slate-200">{session.totalIncorrect} Incorrect</span>
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/[0.05] p-4 rounded-xl">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Author's Note</h4>
                            <p className="text-[13px] text-slate-400 leading-relaxed italic">
                                {session.notes || "No additional notes provided for this study session."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* SECTION 1.5: Topic Distribution         */}
            {/* ═══════════════════════════════════════ */}
            {topicPerformance.length > 0 && (
                <div className="glass p-6 rounded-2xl mb-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">Question Distribution</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{topicPerformance.length} topics covered</span>
                    </div>

                    <div className="h-[280px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...topicPerformance].sort((a, b) => b.total - a.total).slice(0, 8)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fill: '#475569', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="topicName"
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={140}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="glass p-3 border border-indigo-500/20 rounded-xl shadow-2xl backdrop-blur-2xl text-sm ring-1 ring-white/10">
                                                    <p className="text-white font-heading font-bold mb-1.5">{label}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                                        <span className="text-slate-300">Questions: <span className="text-white font-bold">{payload[0].value}</span></span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="total" name="Questions" radius={[0, 6, 6, 0]}>
                                    {([...topicPerformance].sort((a, b) => b.total - a.total).slice(0, 8)).map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill="#8b5cf6"
                                            fillOpacity={0.9 - (index * 0.1)}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* SECTION 2: Best & Weak Areas Spotlight  */}
            {/* ═══════════════════════════════════════ */}
            {topicPerformance.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Best Areas */}
                    <div className="glass p-6 rounded-2xl border-emerald-500/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 mb-5 relative z-10">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">Session Victories</h2>
                        </div>
                        <div className="space-y-2 relative z-10">
                            {topicPerformance.filter(t => t.accuracy >= 75).slice(0, 3).length > 0 ? (
                                topicPerformance.filter(t => t.accuracy >= 75).slice(0, 3).map((t, i) => (
                                    <div key={t.topicId} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/20">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-100 truncate">{t.topicName}</p>
                                        </div>
                                        <PerformanceBadge accuracy={t.accuracy} />
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 rounded-xl border border-dashed border-white/5 text-center">
                                    <p className="text-xs text-slate-500">No high-accuracy areas this session.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Weak Areas */}
                    <div className="glass p-6 rounded-2xl border-red-500/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 mb-5 relative z-10">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">Needs Support</h2>
                        </div>
                        <div className="space-y-2 relative z-10">
                            {[...topicPerformance].reverse().filter(t => t.accuracy < 50).slice(0, 3).length > 0 ? (
                                [...topicPerformance].reverse().filter(t => t.accuracy < 50).slice(0, 3).map((t, i) => (
                                    <div key={t.topicId} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10 transition-all hover:bg-red-500/10">
                                        <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold border border-red-500/20">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-100 truncate">{t.topicName}</p>
                                        </div>
                                        <PerformanceBadge accuracy={t.accuracy} />
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 rounded-xl border border-dashed border-white/5 text-center">
                                    <p className="text-xs text-slate-500">No major weak areas detected!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* SECTION 3: Topic Performance & AI      */}
            {/* ═══════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
                {/* Topic-wise Breakdown */}
                <div className="lg:col-span-7 glass p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">Topic-wise Efficiency</h2>
                        </div>
                    </div>

                    <div className="h-[320px] w-full">
                        {topicPerformance.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topicPerformance} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fill: '#475569', fontSize: 11 }}
                                        tickFormatter={(v) => `${v}%`}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="topicName"
                                        tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 500 }}
                                        width={140}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={20}>
                                        {topicPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                                <BarChart3 className="w-12 h-12 text-slate-700 mx-auto" strokeWidth={1} />
                                <p className="text-slate-500 text-sm">Tag topics to see breakdown</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Session Analysis */}
                <div className="lg:col-span-5 glass p-6 rounded-2xl border-indigo-500/15 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-indigo-500/15 text-indigo-400">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">AI Evaluation</h2>
                        </div>
                        <button
                            onClick={loadInsight}
                            disabled={insightLoading}
                            className="text-xs font-semibold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                            {insightLoading ? (
                                <><div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Analyzing...</>
                            ) : insight ? "↻ Refresh" : "✨ Insights"}
                        </button>
                    </div>

                    <div className="relative z-10 h-[280px] overflow-y-auto pr-1">
                        {insight ? (
                            <div className="p-4 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10">
                                <div className="prose prose-sm prose-invert prose-indigo max-w-none prose-p:leading-relaxed">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                    >
                                        {preprocessMarkdown(insight)}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-indigo-500/15 rounded-xl bg-indigo-500/[0.01]">
                                <Sparkles className="w-8 h-8 text-indigo-500/30 mb-4" />
                                <p className="text-indigo-300/40 text-[13px] leading-relaxed">
                                    Generate insights to receive a personalized analysis of your session results and focus areas.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SessionDetail;

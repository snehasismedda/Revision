import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine,
    ComposedChart, Line
} from 'recharts';
import { analyticsApi, subjectsApi, aiApi } from '../api/index.js';
import PerformanceBadge from '../components/PerformanceBadge.jsx';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Sparkles, TrendingUp, Target, BarChart3,
    AlertTriangle, BookOpen, CheckCircle2, XCircle, Activity
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

const PURPLE = '#8b5cf6';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass p-3 border border-white/10 rounded-lg shadow-xl backdrop-blur-xl text-sm">
            <p className="text-slate-200 font-heading font-bold mb-2 pb-2 border-b border-white/5">{label}</p>
            <div className="space-y-2">
                {payload.map((p) => (
                    <div key={p.name} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-slate-400 text-xs font-medium">{p.name}</span>
                        </div>
                        <span className="font-bold text-white text-xs">
                            {p.name.includes('Count') ? p.value : `${p.value}%`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Reports = () => {
    const { subjectId } = useParams();
    const [subject, setSubject] = useState(null);
    const [overview, setOverview] = useState(null);
    const [trends, setTrends] = useState([]);
    const [topicPerf, setTopicPerf] = useState([]);
    const [weakAreas, setWeakAreas] = useState([]);
    const [insight, setInsight] = useState('');
    const [insightLoading, setInsightLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [subRes, ovRes, trendsRes, topRes, weakRes] = await Promise.all([
                    subjectsApi.get(subjectId),
                    analyticsApi.overview(subjectId),
                    analyticsApi.trends(subjectId),
                    analyticsApi.topicPerformance(subjectId),
                    analyticsApi.weakAreas(subjectId),
                ]);
                setSubject(subRes.subject);
                setOverview(ovRes.overview);

                // Process trends to add rolling average
                const rawTrends = trendsRes.trends || [];
                const processed = rawTrends.map((t, idx) => {
                    const windowSize = 3;
                    const start = Math.max(0, idx - windowSize + 1);
                    const slice = rawTrends.slice(start, idx + 1);
                    const avg = Math.round(slice.reduce((acc, curr) => acc + curr.accuracy, 0) / slice.length);
                    return { ...t, trend: avg };
                });

                setTrends(processed);
                setTopicPerf(topRes.topics.slice(0, 15));
                setWeakAreas(weakRes.weakAreas);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [subjectId]);

    const loadInsight = async () => {
        setInsightLoading(true);
        const loadingToast = toast.loading('Generating AI analysis...');
        try {
            const { insight: text } = await aiApi.insights(subjectId);
            setInsight(text);
            toast.success('Analysis complete', { id: loadingToast });
        } catch {
            setInsight('Unable to generate insights. Check if the AI service is reachable.');
            toast.error('AI service unavailable', { id: loadingToast });
        } finally {
            setInsightLoading(false);
        }
    };

    const getBarColor = (accuracy) => {
        if (accuracy >= 75) return EMERALD;
        if (accuracy >= 50) return AMBER;
        return RED;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // No data state
    if (!overview && trends.length === 0 && topicPerf.length === 0) {
        return (
            <div className="fade-in max-w-5xl mx-auto pb-12">
                <div className="flex items-center gap-3 mb-8">
                    <Link to={`/subjects/${subjectId}`} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">
                        <ArrowLeft className="w-4 h-4" /> Back to Subject
                    </Link>
                </div>
                <div className="glass-panel p-16 text-center rounded-xl border-dashed border-white/10 max-w-2xl mx-auto">
                    <div className="w-20 h-20 rounded-xl bg-surface-3 mx-auto flex items-center justify-center mb-6 shadow-inner border border-white/5">
                        <BarChart3 className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No analytics data</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                        Your performance reports will appear here once you record study sessions and tag correct/incorrect topics.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-5xl mx-auto pb-12">
            {/* Header Navigation */}
            <div className="flex items-center gap-3 mb-8">
                <Link
                    to={`/subjects/${subjectId}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Subject
                </Link>
            </div>

            {/* Page Title */}
            <div className="flex items-center gap-3 mb-10">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white tracking-tight leading-tight">Analytics & Reports</h1>
                    <p className="text-slate-400 text-sm mt-1">{subject?.name} · All-time performance data</p>
                </div>
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* SECTION 1: Hero Stats — Full width row */}
            {/* ═══════════════════════════════════════ */}
            {overview && (
                <div className="glass p-6 rounded-xl mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-emerald-500/[0.03] pointer-events-none" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                        {/* Net Accuracy — Hero */}
                        <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center py-4 border-r border-white/5 md:border-r-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Accuracy</p>
                            <div className={`text-5xl font-heading font-bold tracking-tight ${overview.accuracy >= 75 ? 'text-emerald-400' : overview.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'
                                }`}>
                                {overview.accuracy}%
                            </div>
                            <div className="mt-3">
                                <PerformanceBadge accuracy={overview.accuracy} />
                            </div>
                        </div>

                        {/* Total Questions */}
                        <div className="flex flex-col justify-center py-2">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Target className="w-4 h-4 text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Questions</span>
                            </div>
                            <p className="text-3xl font-heading font-bold text-white">{overview.totalQuestions}</p>
                            <p className="text-xs text-slate-500 mt-1">{overview.totalSessions || '—'} sessions</p>
                        </div>

                        {/* Correct */}
                        <div className="flex flex-col justify-center py-2">
                            <div className="flex items-center gap-2 mb-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                                <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest">Correct</span>
                            </div>
                            <p className="text-3xl font-heading font-bold text-emerald-400">{overview.totalCorrect}</p>
                            <div className="w-full bg-white/5 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${overview.totalQuestions ? (overview.totalCorrect / overview.totalQuestions) * 100 : 0}%` }} />
                            </div>
                        </div>

                        {/* Incorrect */}
                        <div className="flex flex-col justify-center py-2">
                            <div className="flex items-center gap-2 mb-1.5">
                                <XCircle className="w-4 h-4 text-red-500/70" />
                                <span className="text-[10px] font-bold text-red-500/70 uppercase tracking-widest">Incorrect</span>
                            </div>
                            <p className="text-3xl font-heading font-bold text-red-400">{overview.totalIncorrect}</p>
                            <div className="w-full bg-white/5 rounded-full h-1.5 mt-2.5 overflow-hidden">
                                <div className="bg-red-500/60 h-full rounded-full transition-all duration-1000" style={{ width: `${overview.totalQuestions ? (overview.totalIncorrect / overview.totalQuestions) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* SECTION 2: Trend Chart — Full width, prominent */}
            {/* ═══════════════════════════════════════════════ */}
            {trends.length > 0 && (
                <div className="glass p-6 rounded-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-heading font-bold text-white tracking-tight">Performance Trend</h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Accuracy vs Intensity (Session Volume)</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accuracy</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-0.5 bg-amber-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Moving Avg</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm bg-white/10" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volume</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={PURPLE} stopOpacity={0.2} />
                                        <stop offset="100%" stopColor={PURPLE} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis
                                    dataKey="title"
                                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    yAxisId="left"
                                    domain={[0, 100]}
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[0, 'auto']}
                                    tick={{ fill: '#475569', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    hide={window.innerWidth < 768}
                                />
                                <Tooltip
                                    content={<CustomTooltip />}
                                    cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
                                />

                                {/* Volume Bars */}
                                <Bar
                                    yAxisId="right"
                                    dataKey="total"
                                    name="Question Count"
                                    fill="rgba(255,255,255,0.05)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />

                                {/* Accuracy Area */}
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="accuracy"
                                    name="Accuracy"
                                    stroke={PURPLE}
                                    strokeWidth={3}
                                    fill="url(#trendGrad)"
                                    dot={{ fill: '#0a0a0f', stroke: PURPLE, strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: PURPLE, stroke: '#fff', strokeWidth: 2 }}
                                    animationDuration={1500}
                                />

                                {/* Moving Average Line */}
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="trend"
                                    name="Trend (3-Session Avg)"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={false}
                                />

                                <ReferenceLine yAxisId="left" y={75} stroke="#10b981" strokeDasharray="3 3" opacity={0.3} />
                                <ReferenceLine yAxisId="left" y={50} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.3} />

                                {/* Lifetime Average Reference Line */}
                                {overview && (
                                    <ReferenceLine
                                        yAxisId="left"
                                        y={overview.accuracy}
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth={1}
                                        label={{
                                            value: `Avg: ${overview.accuracy}%`,
                                            position: 'insideBottomRight',
                                            fill: '#94a3b8',
                                            fontSize: 9,
                                            fontWeight: 700
                                        }}
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Trend Insights Footer */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 py-3 px-4 rounded-xl bg-white/[0.02] border border-white/5 relative z-10">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            <span className="text-[11px] font-semibold text-slate-300">Trend Insight:</span>
                        </div>
                        {(() => {
                            const first = trends[0].trend;
                            const last = trends[trends.length - 1].trend;
                            const diff = last - first;
                            return (
                                <p className="text-[11px] text-slate-400">
                                    {diff > 0 ? (
                                        <>Your performance is <span className="text-emerald-400 font-bold">improving (+{diff}%)</span> based on the 3-session moving average.</>
                                    ) : diff < 0 ? (
                                        <>Performance has <span className="text-amber-400 font-bold">dipped ({diff}%)</span> recently. Consider reviewing older topics.</>
                                    ) : (
                                        <>Performance is holding <span className="text-indigo-400 font-bold">steady</span> over recent sessions.</>
                                    )}
                                </p>
                            );
                        })()}
                        <div className="ml-auto flex items-center gap-3">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Best Session: <span className="text-emerald-400">{Math.max(...trends.map(t => t.accuracy))}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* SECTION 2.5: Topic Distribution — Questions per Topic */}
            {/* ═══════════════════════════════════════════════ */}
            {topicPerf.length > 0 && (
                <div className="glass p-6 rounded-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/[0.04] rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">Most Questions Asked</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{topicPerf.length} topics total</span>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...topicPerf].sort((a, b) => b.total - a.total).slice(0, 10)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
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
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={120}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="glass p-3 border border-white/10 rounded-lg shadow-xl backdrop-blur-xl text-sm">
                                                    <p className="text-white font-bold mb-1">{label}</p>
                                                    <p className="text-emerald-400">Questions: {payload[0].value}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="total" name="Questions" radius={[0, 4, 4, 0]}>
                                    {([...topicPerf].sort((a, b) => b.total - a.total).slice(0, 10)).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PURPLE} fillOpacity={0.8 - (index * 0.05)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* SECTION 3: Three-column — Best Areas | Weak Areas | AI Insights       */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {(() => {
                const bestAreas = [...topicPerf]
                    .filter((t) => t.accuracy >= 75)
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .slice(0, 8);

                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Best Areas */}
                        <div className="glass p-6 rounded-xl border-emerald-500/10 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-lg font-heading font-bold text-white tracking-tight">Best Areas</h2>
                                </div>
                                {bestAreas.length > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">{bestAreas.length} topics</span>
                                )}
                            </div>
                            {bestAreas.length > 0 ? (
                                <div className="space-y-2 relative z-10 max-h-[360px] overflow-y-auto pr-1">
                                    {bestAreas.map((t, i) => (
                                        <div key={t.topicId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-500/[0.03] transition-colors border border-white/[0.04] group">
                                            <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25'
                                                : i < 3 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                                    : 'bg-white/5 text-slate-500 border border-white/5'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-200 truncate">{t.topicName}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{t.correct || (t.total - (t.incorrect || 0))}/{t.total} correct</p>
                                            </div>
                                            <div className="shrink-0">
                                                <PerformanceBadge accuracy={t.accuracy} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 rounded-lg border border-dashed border-emerald-500/10 text-center">
                                    <p className="text-slate-500 text-sm">No topics with ≥75% accuracy yet. Keep practicing!</p>
                                </div>
                            )}
                        </div>

                        {/* Weak Areas */}
                        <div className="glass p-6 rounded-xl border-amber-500/10 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <h2 className="text-lg font-heading font-bold text-white tracking-tight">Weak Areas</h2>
                                </div>
                                {weakAreas.length > 0 && (
                                    <span className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest">{weakAreas.length} topics</span>
                                )}
                            </div>
                            {weakAreas.length > 0 ? (
                                <div className="space-y-2 relative z-10 max-h-[360px] overflow-y-auto pr-1">
                                    {weakAreas.map((t, i) => (
                                        <div key={t.topicId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors border border-white/[0.04] group">
                                            <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                                : i < 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                                                    : 'bg-white/5 text-slate-500 border border-white/5'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-200 truncate">{t.topicName}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{t.incorrect}/{t.total} incorrect</p>
                                            </div>
                                            <div className="shrink-0">
                                                <PerformanceBadge accuracy={t.accuracy} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 rounded-lg border border-dashed border-white/5 text-center">
                                    <p className="text-slate-500 text-sm">No weak areas detected yet. Keep studying!</p>
                                </div>
                            )}
                        </div>

                        {/* AI Insights */}
                        <div className="glass p-6 rounded-xl border-indigo-500/15 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                <Sparkles className="w-32 h-32 text-indigo-400" />
                            </div>

                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-indigo-500/15 text-indigo-400">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-lg font-heading font-bold text-indigo-100 tracking-tight">AI Insights</h2>
                                </div>
                                <button
                                    onClick={loadInsight}
                                    disabled={insightLoading}
                                    className="text-xs font-semibold bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/20 px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                    {insightLoading ? (
                                        <><div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Thinking...</>
                                    ) : insight ? (
                                        <>↻ Refresh</>
                                    ) : (
                                        <>✨ Generate</>
                                    )}
                                </button>
                            </div>

                            <div className="relative z-10">
                                {insight ? (
                                    <div className="p-4 rounded-lg bg-surface-2/80 border border-indigo-500/10 shadow-inner max-h-[400px] overflow-y-auto">
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
                                    <div className="p-8 rounded-lg border border-dashed border-indigo-500/15 text-center bg-indigo-500/[0.02] flex flex-col items-center">
                                        <Sparkles className="w-8 h-8 text-indigo-500/30 mb-3" />
                                        <p className="text-indigo-300/60 text-sm max-w-xs">
                                            Click "Generate" to receive a personalized summary of your performance and a study plan.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ═══════════════════════════════════════════════════ */}
            {/* SECTION 4: Topic Performance Bar Chart — Full width */}
            {/* ═══════════════════════════════════════════════════ */}
            {topicPerf.length > 0 && (
                <div className="glass p-6 rounded-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-slate-400" />
                            <h2 className="text-lg font-heading font-bold text-white tracking-tight">Topic-wise Accuracy</h2>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> ≥75%</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> ≥50%</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> &lt;50%</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-[500px]">
                            <ResponsiveContainer width="100%" height={Math.max(240, topicPerf.length * 38)}>
                                <BarChart data={topicPerf} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        domain={[0, 100]}
                                        tick={{ fill: '#475569', fontSize: 11, fontFamily: 'Inter' }}
                                        tickFormatter={(v) => `${v}%`}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="topicName"
                                        tick={{ fill: '#cbd5e1', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}
                                        width={160}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <ReferenceLine x={75} stroke={EMERALD} strokeDasharray="4 4" opacity={0.15} />
                                    <ReferenceLine x={50} stroke={AMBER} strokeDasharray="4 4" opacity={0.15} />
                                    <Bar dataKey="accuracy" name="Accuracy" radius={[0, 4, 4, 0]} barSize={18}>
                                        {topicPerf.map((entry) => (
                                            <Cell key={entry.topicId} fill={getBarColor(entry.accuracy)} fillOpacity={0.85} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;


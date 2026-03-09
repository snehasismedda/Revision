import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Target, ArrowLeft, Activity, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
    Award, Zap, BarChart2, BarChart3, BookOpen, Minus, AlertTriangle, Flame, Brain,
    Loader2, CheckCircle2, ShieldAlert, RefreshCw, ArrowUpRight, ArrowDownRight,
    SlidersHorizontal
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Cell
} from 'recharts';
import * as testsApi from '../api/testsApi';
import { analyticsApi } from '../api';
import toast from 'react-hot-toast';

// ── colour helpers ────────────────────────────────────────────────────────────
const accColor = (v) => v >= 75 ? '#34d399' : v >= 50 ? '#fbbf24' : '#f87171';
const accPill = (v) => v >= 75
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : v >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

const consistLabel = (v) => v >= 85 ? 'Highly Consistent' : v >= 65 ? 'Moderate' : 'Inconsistent';
const consistColor = (v) => v >= 85 ? 'text-emerald-400' : v >= 65 ? 'text-amber-400' : 'text-rose-400';
const consistBorder = (v) => v >= 85 ? 'border-emerald-500/20 from-emerald-500/8' : v >= 65 ? 'border-amber-500/20 from-amber-500/8' : 'border-rose-500/20 from-rose-500/8';

// ── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#13132a]/95 border border-white/10 rounded-xl p-3 shadow-2xl text-[13px] min-w-[140px]">
            <p className="text-slate-500 mb-1.5 text-[11px] font-medium uppercase tracking-wider">{payload[0]?.payload?.date || label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-slate-400 font-medium">{p.name}:</span>
                    <span style={{ color: p.color }} className="font-bold">
                        {p.value}{p.name.includes('Acc') || p.name === 'Accuracy' || p.name === 'Target' ? '%' : ''}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ── AI text formatter ─────────────────────────────────────────────────────────
const AIInsightText = ({ text }) => (
    <div className="space-y-1 text-sm leading-relaxed">
        {text.split('\n').filter(Boolean).map((line, i) => {
            if (/^#+\s|^[A-Z][A-Za-z ]+:/.test(line.trim()) || (line.includes('→') && line.length < 70))
                return <p key={i} className="text-pink-300 font-semibold mt-3 mb-0.5">{line.replace(/^#+\s/, '')}</p>;
            if (/^[-•*]/.test(line.trim()))
                return <p key={i} className="text-slate-300 pl-4 before:content-['·'] before:mr-2 before:text-pink-400">{line.replace(/^[-•*]\s*/, '')}</p>;
            return <p key={i} className="text-slate-400">{line}</p>;
        })}
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const TestAnalytics = () => {
    const { seriesId, testId } = useParams();
    const navigate = useNavigate();

    const [testData, setTestData] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('subjects');
    const [expandedAttempt, setExpanded] = useState(null);
    const [attemptTab, setAttemptTab] = useState('subjects');
    const [aiInsight, setAiInsight] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    // High-impact features
    const [targetScore, setTargetScore] = useState(75);
    const [negFactor, setNegFactor] = useState(0);
    const [showNegSim, setShowNegSim] = useState(false);
    const [trendType, setTrendType] = useState('accuracy'); // 'accuracy' or 'score'


    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [testRes, analyticsRes] = await Promise.all([
                    testsApi.getTestDetail(seriesId, testId).catch(() => null),
                    analyticsApi.test(seriesId, testId).catch(() => null)
                ]);
                if (!testRes?.test) { toast.error('Test not found'); navigate(`/tests/${seriesId}`); return; }
                setTestData(testRes.test);
                setAnalytics(analyticsRes);
            } catch { toast.error('Failed to load analytics'); navigate(`/tests/${seriesId}`); }
            finally { setLoading(false); }
        };
        if (testId) load();
    }, [seriesId, testId, navigate]);

    const generateInsights = async () => {
        setAiLoading(true); setAiInsight('');
        try {
            const res = await analyticsApi.testInsights(seriesId, testId);
            setAiInsight(res.insight || 'No insights generated.');
        } catch { toast.error('AI insights failed'); }
        finally { setAiLoading(false); }
    };

    if (loading || !testData) return (
        <div className="flex-1 flex items-center justify-center h-[100dvh]">
            <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
        </div>
    );

    const global = analytics?.global || {};
    const attempts = analytics?.attempts || [];
    const stats = analytics?.stats || {};
    const examTraps = analytics?.examTrapTopics || [];

    const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    const latestR = latest?.result;
    const latestAcc = latest?.accuracy ?? '--';

    // ── Trend chart data ────────────────────────────────────────────────────
    const trendData = attempts.map((a, i) => ({
        attempt: `#${i + 1}`,
        Accuracy: a.accuracy,
        Score: Number(a.result.my_score),
        Max: Number(a.result.total_score),
        Target: targetScore,
        date: new Date(a.result.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }));


    // ── Recovery vs Decline computed on frontend ────────────────────────────
    // Build per-topic history from attempt-level data
    const topicHistory = {};
    attempts.forEach((a, i) => {
        (a.topicPerformance || []).forEach(tp => {
            if (!topicHistory[tp.topic_name]) topicHistory[tp.topic_name] = [];
            topicHistory[tp.topic_name].push({ idx: i, acc: Number(tp.accuracy) });
        });
    });
    const recovering = [], declining = [];
    Object.entries(topicHistory).forEach(([name, hist]) => {
        if (hist.length < 2) return;
        const delta = hist[hist.length - 1].acc - hist[0].acc;
        const entry = { name, first: hist[0].acc, last: hist[hist.length - 1].acc, delta: Math.abs(delta) };
        if (delta > 5) recovering.push(entry);
        else if (delta < -5) declining.push(entry);
    });
    recovering.sort((a, b) => b.delta - a.delta);
    declining.sort((a, b) => b.delta - a.delta);



    const impPositive = stats.improvement > 0;
    const impNeutral = stats.improvement === 0;

    // ── Group most asked topics by subject ──────────────────────────────────
    const topicsBySub = {};
    (global.topicPerformance || []).forEach(t => {
        const subName = t.subject_name || 'Other';
        if (!topicsBySub[subName]) topicsBySub[subName] = [];
        topicsBySub[subName].push(t);
    });
    // Sort each group by frequency
    Object.keys(topicsBySub).forEach(sub => {
        topicsBySub[sub].sort((a, b) => Number(b.total_questions) - Number(a.total_questions));
    });

    const subjectBarData = (global.subjectPerformance || [])
        .map(s => ({
            name: s.subject_name,
            Accuracy: Number(s.accuracy),
            Correct: Number(s.total_correct),
            Total: Number(s.total_questions),
            Marks: Number(s.contribution_marks || 0)
        }))
        .sort((a, b) => b.Accuracy - a.Accuracy);



    return (
        <div className="fade-in max-w-6xl mx-auto">
            {/* Back Button Row */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate(`/tests/${seriesId}`)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
            </div>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-[22px] md:text-[24px] font-heading font-semibold text-white tracking-tight leading-tight mb-2">
                        {testData?.name.toUpperCase() || 'Test'} <span className="opacity-40 ml-1"> — Analytics</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-500 text-[14px] ml-0.5">
                        <Activity className="w-4 h-4 text-pink-500/60" />
                        <span>{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={generateInsights}
                        disabled={aiLoading || attempts.length === 0}
                        className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer border border-violet-500/20 bg-violet-500/10 text-violet-300 hover:text-white hover:bg-violet-500/20 group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={2} />}
                        <span>AI Insights</span>
                    </button>
                </div>
            </div>

            <div className="space-y-6 pb-12">

                {/* ── AI Panel ──────────────────────────────────────────── */}
                {(aiInsight || aiLoading) && (
                    <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.07] via-pink-500/[0.03] to-transparent p-6 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <Brain className="w-4 h-4 text-violet-400" />
                            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">AI Insights</span>
                            {aiInsight && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        {aiLoading
                            ? <p className="text-slate-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-violet-400" /> Analysing your performance…</p>
                            : <AIInsightText text={aiInsight} />}
                    </div>
                )}

                {/* ── KPI Row ────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                    {[
                        { label: 'Latest Score', value: latestR ? `${latestR.my_score}/${latestR.total_score}` : '—', color: 'text-pink-400', border: 'border-pink-500/20', bg: 'from-pink-500/8' },
                        { label: 'Latest Accuracy', value: `${latestAcc}%`, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'from-emerald-500/8' },
                        { label: 'Avg Accuracy', value: `${stats.avgAccuracy ?? 0}%`, color: 'text-sky-400', border: 'border-sky-500/20', bg: 'from-sky-500/8' },
                        { label: 'Best Attempt', value: `${stats.bestAccuracy ?? 0}%`, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'from-amber-500/8' },
                        {
                            label: 'Improvement',
                            value: stats.improvement !== undefined ? `${impPositive ? '+' : ''}${stats.improvement}%` : '—',
                            color: impNeutral ? 'text-slate-400' : impPositive ? 'text-emerald-400' : 'text-rose-400',
                            border: impNeutral ? 'border-white/10' : impPositive ? 'border-emerald-500/20' : 'border-rose-500/20',
                            bg: impNeutral ? 'from-white/4' : impPositive ? 'from-emerald-500/8' : 'from-rose-500/8'
                        },
                        {
                            label: 'Consistency',
                            value: stats.consistencyScore != null ? `${stats.consistencyScore}` : '—',
                            sub: stats.consistencyScore != null ? consistLabel(stats.consistencyScore) : '',
                            color: stats.consistencyScore != null ? consistColor(stats.consistencyScore) : 'text-slate-400',
                            border: stats.consistencyScore != null ? consistBorder(stats.consistencyScore).split(' ')[0] : 'border-white/10',
                            bg: stats.consistencyScore != null ? consistBorder(stats.consistencyScore).split(' ')[1] || 'from-white/4' : 'from-white/4'
                        },
                        {
                            label: 'Projected',
                            value: stats.projectedAccuracy != null ? `${stats.projectedAccuracy}%` : '—',
                            sub: stats.projectedAccuracy != null ? 'next attempt' : 'need 2+ attempts',
                            color: stats.projectedAccuracy != null ? accColor(stats.projectedAccuracy).replace('#', 'text-[#') + ']' : 'text-slate-400',
                            colorDirect: stats.projectedAccuracy != null ? accColor(stats.projectedAccuracy) : undefined,
                            border: stats.projectedAccuracy != null ? 'border-purple-500/20' : 'border-white/10',
                            bg: 'from-purple-500/8'
                        },
                    ].map((kpi, i) => (
                        <div key={i} className={`rounded-2xl border ${kpi.border} bg-gradient-to-b ${kpi.bg} to-transparent bg-[#0f0f1a] p-3.5 flex flex-col gap-1.5`}>
                            <p className="text-xl font-heading font-bold leading-none" style={kpi.colorDirect ? { color: kpi.colorDirect } : undefined}>
                                <span className={kpi.colorDirect ? '' : kpi.color}>{kpi.value}</span>
                            </p>
                            {kpi.sub && <p className="text-[10px] text-slate-500">{kpi.sub}</p>}
                            <p className="text-[11px] text-slate-500 mt-auto">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Target Score + Trend ─────────────────────────────── */}
                <div className="glass rounded-3xl border border-white/8 p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                        <div className="flex items-center gap-3 flex-1">
                            <TrendingUp className="w-4 h-4 text-pink-400" />
                            <h2 className="text-sm font-heading font-semibold text-white">Trend Analysis</h2>
                            <div className="flex bg-black/30 p-1 rounded-lg ml-2">
                                <button
                                    onClick={() => setTrendType('accuracy')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${trendType === 'accuracy' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >Accuracy</button>
                                <button
                                    onClick={() => setTrendType('score')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${trendType === 'score' ? 'bg-violet-500/20 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >Marks</button>
                            </div>
                        </div>

                        {/* Target Score Tracker */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 whitespace-nowrap">Target:</span>
                            <input
                                type="range" min={10} max={100} step={5}
                                value={targetScore}
                                onChange={e => setTargetScore(Number(e.target.value))}
                                className="w-24 accent-pink-500"
                            />
                            <span className="text-sm font-bold text-pink-400 w-10">{targetScore}%</span>
                            {latestAcc !== '--' && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${latestAcc >= targetScore ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                    {latestAcc >= targetScore ? '✓ Hit' : `${(targetScore - latestAcc).toFixed(1)}% gap`}
                                </span>
                            )}
                        </div>
                    </div>

                    {trendData.length > 0 ? (
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                                    <defs>
                                        <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'} stopOpacity={0.28} />
                                            <stop offset="95%" stopColor={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="attempt" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                                    <YAxis
                                        domain={trendType === 'accuracy' ? [0, 100] : ['auto', 'auto']}
                                        tickFormatter={v => trendType === 'accuracy' ? `${v}%` : v}
                                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip content={<ChartTip />} />
                                    {trendType === 'accuracy' && (
                                        <ReferenceLine y={targetScore} stroke="#ec4899" strokeDasharray="4 4" strokeOpacity={0.6}
                                            label={{ value: `Target ${targetScore}%`, position: 'insideTopRight', fill: '#ec4899', fontSize: 10 }} />
                                    )}
                                    {trendType === 'accuracy' && stats.projectedAccuracy != null && (
                                        <ReferenceLine y={stats.projectedAccuracy} stroke="#a78bfa" strokeDasharray="2 4" strokeOpacity={0.5}
                                            label={{ value: `Proj. ${stats.projectedAccuracy}%`, position: 'insideBottomRight', fill: '#a78bfa', fontSize: 10 }} />
                                    )}
                                    <Area
                                        type="monotone"
                                        dataKey={trendType === 'accuracy' ? 'Accuracy' : 'Score'}
                                        stroke={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'}
                                        strokeWidth={2.5}
                                        fill="url(#accGrad)"
                                        dot={{ fill: trendType === 'accuracy' ? '#ec4899' : '#8b5cf6', r: 4, strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        name={trendType === 'accuracy' ? 'Accuracy' : 'Marks'}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>

                        </div>
                    ) : (
                        <EmptyState text="Log at least one attempt to see the accuracy trend." />
                    )}
                </div>

                {/* ── Exam Trap Topics ────────────────────────────────── */}
                {examTraps.length > 0 && (
                    <div className="rounded-3xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.06] via-rose-500/[0.03] to-transparent p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <ShieldAlert className="w-5 h-5 text-orange-400" />
                            <h2 className="text-base font-heading font-semibold text-white">Exam Trap Topics</h2>
                            <span className="text-xs text-orange-400/70 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full ml-1">High frequency · Low accuracy</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">These topics appear most frequently in your tests but have the lowest accuracy — the highest risk area in a real exam.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {examTraps.map((t, i) => {
                                const acc = Number(t.accuracy);
                                const riskLevel = t.riskScore >= 3 ? 'High' : t.riskScore >= 1.5 ? 'Medium' : 'Low';
                                const riskColor = t.riskScore >= 3 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                    : t.riskScore >= 1.5 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                                return (
                                    <div key={i} className="bg-black/20 rounded-xl p-4 border border-white/[0.06] flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-white leading-tight">{t.topic_name}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${riskColor}`}>{riskLevel}</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-1.5">
                                            <div className="h-full rounded-full" style={{ width: `${acc}%`, backgroundColor: accColor(acc) }} />
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500">{t.total_questions} questions seen</span>
                                            <span className="font-bold" style={{ color: accColor(acc) }}>{acc}% acc</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Recovery vs Decline ─────────────────────────────── */}
                {(recovering.length > 0 || declining.length > 0) && (
                    <div className="glass rounded-3xl border border-white/8 p-5 shadow-xl">
                        <div className="flex items-center gap-2 mb-5">
                            <RefreshCw className="w-4 h-4 text-sky-400" />
                            <h2 className="text-sm font-heading font-semibold text-white">Recovery vs Decline</h2>
                            <span className="text-xs text-slate-500 ml-1">topics with consistent change across attempts</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recovering.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> Improving ({recovering.length})
                                    </p>
                                    <div className="space-y-2">
                                        {recovering.slice(0, 6).map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">{t.name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{t.first}% → {t.last}%</p>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-400 flex-shrink-0">+{t.delta.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {declining.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
                                        <ArrowDownRight className="w-3.5 h-3.5" /> Declining ({declining.length})
                                    </p>
                                    <div className="space-y-2">
                                        {declining.slice(0, 6).map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-rose-500/[0.04] border border-rose-500/10 rounded-xl p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">{t.name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{t.first}% → {t.last}%</p>
                                                </div>
                                                <span className="text-sm font-bold text-rose-400 flex-shrink-0">−{t.delta.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Needs Improvement ────────────────────────────────── */}
                {((global.subjectPerformance || []).some(s => Number(s.accuracy) < 75) ||
                    (global.topicPerformance || []).some(t => Number(t.accuracy) < 75)) && (
                        <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.05] to-transparent p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                                <h2 className="text-sm font-heading font-semibold text-white">Needs Improvement</h2>
                                <span className="text-xs text-rose-400/60 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">&lt;75% accuracy</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Weak subjects */}
                                {(global.subjectPerformance || []).filter(s => Number(s.accuracy) < 75).length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> Subjects</p>
                                        <div className="space-y-2">
                                            {(global.subjectPerformance || []).filter(s => Number(s.accuracy) < 75)
                                                .sort((a, b) => Number(a.accuracy) - Number(b.accuracy))
                                                .map((s, i) => {
                                                    const acc = Number(s.accuracy);
                                                    return (
                                                        <div key={i} className="bg-black/20 rounded-xl p-3 border border-white/[0.04]">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="text-xs font-medium text-white">{s.subject_name}</span>
                                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg border ${accPill(acc)}`}>{acc}%</span>
                                                            </div>
                                                            <div className="w-full bg-black/30 rounded-full h-1"><div className="h-full rounded-full" style={{ width: `${acc}%`, backgroundColor: accColor(acc) }} /></div>
                                                            <p className="text-[10px] text-slate-600 mt-1">{s.total_correct}/{s.total_questions} correct · {Number(s.total_questions) - Number(s.total_correct)} wrong</p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                                {/* Weak topics */}
                                {(global.topicPerformance || []).filter(t => Number(t.accuracy) < 75).length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target className="w-3 h-3" /> Topics</p>
                                        <div className="space-y-2">
                                            {(global.topicPerformance || []).filter(t => Number(t.accuracy) < 75)
                                                .sort((a, b) => Number(a.accuracy) - Number(b.accuracy))
                                                .slice(0, 8)
                                                .map((t, i) => {
                                                    const acc = Number(t.accuracy);
                                                    return (
                                                        <div key={i} className="bg-black/20 rounded-xl p-3 border border-white/[0.04] flex items-center gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-white truncate">{t.topic_name}</p>
                                                                <div className="w-full bg-black/30 rounded-full h-1 mt-1"><div className="h-full rounded-full" style={{ width: `${acc}%`, backgroundColor: accColor(acc) }} /></div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="text-xs font-bold" style={{ color: accColor(acc) }}>{acc}%</p>
                                                                <p className="text-[10px] text-slate-600">{t.total_correct}/{t.total_questions}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                {/* ── Most Asked Topics (Subject Wise) ─────────────────── */}
                {Object.keys(topicsBySub).length > 0 && (
                    <div className="glass rounded-3xl border border-white/8 p-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Flame className="w-5 h-5 text-amber-500" />
                            <h2 className="text-base font-heading font-semibold text-white">Most Asked Topics</h2>
                            <span className="text-xs text-slate-500 ml-1">subject-wise frequency focus</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(topicsBySub).map(([sub, topics]) => (
                                <div key={sub} className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
                                        <BookOpen className="w-3.5 h-3.5 text-pink-400" />
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{sub}</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {topics.slice(0, 5).map((t, idx) => (
                                            <div key={idx} className="group flex flex-col gap-1">
                                                <div className="flex justify-between items-center text-[13px]">
                                                    <span className="text-slate-200 truncate pr-2">{t.topic_name}</span>
                                                    <span className="text-[11px] font-bold text-pink-400 whitespace-nowrap">{t.total_questions} times</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-white/[0.03] rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-300 group-hover:from-pink-400 group-hover:to-violet-400"
                                                            style={{ width: `${Math.min(100, (Number(t.total_questions) / Number(topics[0].total_questions)) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 w-8">{t.accuracy}% acc</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="glass rounded-3xl border border-white/8 p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-pink-400" />
                            <h2 className="text-sm font-heading font-semibold text-white">Global Breakdown</h2>
                            <span className="text-xs text-slate-500">all attempts combined</span>
                        </div>
                        <div className="flex bg-black/30 p-1 rounded-xl w-fit">
                            {['subjects', 'topics'].map(t => (
                                <button key={t} onClick={() => setActiveTab(t)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === t ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    {activeTab === 'subjects' && (
                        subjectBarData.length === 0
                            ? <EmptyState text="No subject data yet." />
                            : <div className="space-y-4">
                                <div style={{ height: Math.max(140, subjectBarData.length * 36) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={subjectBarData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                                            <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} tickLine={false} axisLine={false} />
                                            <Tooltip content={<ChartTip />} />
                                            <Bar dataKey="Accuracy" radius={[0, 6, 6, 0]} barSize={13}>
                                                {subjectBarData.map((e, i) => <Cell key={i} fill={accColor(e.Accuracy)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {subjectBarData.map((s, i) => (
                                        <BreakdownCard key={i} name={s.name} accuracy={s.Accuracy} correct={s.Correct} total={s.Total} marks={s.Marks} />
                                    ))}
                                </div>

                            </div>
                    )}
                    {activeTab === 'topics' && (
                        !global.topicPerformance?.length
                            ? <EmptyState text="No topic data yet." />
                            : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(global.topicPerformance || [])
                                    .sort((a, b) => Number(b.accuracy) - Number(a.accuracy))
                                    .map((t, i) => (
                                        <BreakdownCard key={i} name={t.topic_name} accuracy={Number(t.accuracy)} correct={Number(t.total_correct)} total={Number(t.total_questions)} />
                                    ))}
                            </div>

                    )}
                </div>

                {/* ── Attempt History ──────────────────────────────────── */}
                {attempts.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-pink-400" />
                            <h2 className="text-sm font-heading font-semibold text-white">Attempt History</h2>
                            <span className="px-2 py-0.5 rounded-full bg-white/8 text-[11px] text-white/40">{attempts.length}</span>
                        </div>
                        <div className="space-y-2">
                            {[...attempts].reverse().map((a, revIdx) => {
                                const r = a.result;
                                if (!r) return null;
                                const num = attempts.length - revIdx;
                                const pct = a.accuracy ?? 0;
                                const isOpen = expandedAttempt === r.id;
                                return (
                                    <div key={r.id} className={`rounded-2xl border transition-all overflow-hidden ${isOpen ? 'border-pink-500/25 bg-[#0f0f1a]' : 'border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02]'}`}>
                                        <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpanded(isOpen ? null : r.id)}>
                                            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[10px] font-bold text-pink-400">#{num}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                <p className="text-xs text-slate-500">{r.total_qs} qs · {r.my_score}/{r.total_score} marks</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${accPill(pct)}`}>{pct}%</span>
                                            <div className="hidden sm:block w-20">
                                                <div className="w-full bg-white/[0.04] rounded-full h-1.5">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accColor(pct) }} />
                                                </div>
                                            </div>
                                            {isOpen ? <ChevronUp className="w-4 h-4 text-pink-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 pb-4 border-t border-white/[0.05] pt-3">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Breakdown</span>
                                                    <div className="flex bg-black/30 p-0.5 rounded-lg">
                                                        {['subjects', 'topics'].map(t => (
                                                            <button key={t} onClick={() => setAttemptTab(t)}
                                                                className={`px-3 py-0.5 rounded-md text-xs font-semibold capitalize transition-all ${attemptTab === t ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>{t}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {attemptTab === 'subjects' && <BreakdownList items={a.subjectPerformance} nameKey="subject_name" emptyText="No subject tags on this attempt." />}
                                                {attemptTab === 'topics' && <BreakdownList items={a.topicPerformance} nameKey="topic_name" emptyText="No topic tags on this attempt." />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {attempts.length === 0 && (
                    <div className="glass rounded-3xl border border-white/8 p-14 text-center">
                        <Activity className="w-10 h-10 text-pink-400/30 mx-auto mb-4" />
                        <p className="text-slate-300 font-medium">No attempts yet</p>
                        <p className="text-slate-500 text-sm mt-1">Log a test attempt to see analytics.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const BreakdownCard = ({ name, accuracy, correct, total, marks }) => (
    <div className="bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-xl border border-white/5 flex flex-col gap-2 transition-colors">
        <div className="flex justify-between items-start gap-2">
            <p className="text-xs font-semibold text-white leading-tight">{name}</p>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border flex-shrink-0 ${accPill(accuracy)}`}>{accuracy}%</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-1.5">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, accuracy)}%`, backgroundColor: accColor(accuracy) }} />
        </div>
        <p className="text-[11px] text-slate-500">
            {correct} / {total} correct {marks !== undefined && Number(marks) > 0 && `· ~${marks} marks contribution`}
        </p>
    </div>
);


const BreakdownList = ({ items, nameKey, emptyText }) => {
    if (!items?.length) return <p className="text-xs text-slate-500 text-center py-3">{emptyText}</p>;
    return (
        <div className="space-y-2">
            {items.map((item, i) => {
                const acc = Number(item.accuracy);
                return (
                    <div key={i} className="bg-black/20 rounded-xl p-2.5 border border-white/[0.04] flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{item[nameKey]}</p>
                            <div className="w-full bg-black/30 rounded-full h-1 mt-1.5">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(100, acc)}%`, backgroundColor: accColor(acc) }} />
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold" style={{ color: accColor(acc) }}>{acc}%</p>
                            <p className="text-[10px] text-slate-600">{item.total_correct}/{item.total_questions}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const EmptyState = ({ text }) => (
    <div className="p-10 text-center rounded-xl border border-dashed border-white/10">
        <p className="text-slate-500 text-sm">{text}</p>
    </div>
);

export default TestAnalytics;

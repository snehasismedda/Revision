import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, TrendingUp, BarChart3, ChevronDown, BarChart2, Target, Info, Award, Zap } from 'lucide-react';
import { analyticsApi } from '../api';
import * as testSeriesApi from '../api/testSeriesApi';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Cell, Legend
} from 'recharts';

// ── colour helpers ────────────────────────────────────────────────────────────
const accColor = (v) => v >= 75 ? '#34d399' : v >= 50 ? '#fbbf24' : '#f87171';
const accPill = (v) => v >= 75
    ? 'bg-emerald-500/10 text-emerald-500 [.dark_&]:text-emerald-400 border-emerald-500/20'
    : v >= 50 ? 'bg-amber-500/10 text-amber-600 [.dark_&]:text-amber-400 border-amber-500/20'
        : 'bg-rose-500/10 text-rose-600 [.dark_&]:text-rose-400 border-rose-500/20';

const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-surface-2/95 border border-border rounded-xl p-3 shadow-2xl text-[13px] min-w-[140px]">
            <p className="text-text-muted mb-1.5 text-[11px] font-medium uppercase tracking-wider">{payload[0]?.payload?.date || label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="text-text-muted font-medium">{p.name}:</span>
                    <span style={{ color: p.color }} className="font-bold">
                        {p.value}{p.name.includes('Acc') || p.name === 'Accuracy' || p.name === 'Target' ? '%' : ''}
                    </span>
                </div>
            ))}
        </div>
    );
};

const TestSeriesInsights = () => {
    const { seriesId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [trendType, setTrendType] = useState('accuracy'); // 'accuracy' or 'score'
    const [selectedSubject, setSelectedSubject] = useState('All Subjects');
    const [activeTooltip, setActiveTooltip] = useState(null); // 'total', 'avg', 'best', 'worst', 'consistency', 'momentum'

    // Close tooltip on global click
    useEffect(() => {
        const handleClick = () => setActiveTooltip(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const toggleTooltip = (e, id) => {
        e.stopPropagation();
        setActiveTooltip(activeTooltip === id ? null : id);
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const analyticsRes = await analyticsApi.testSeries(seriesId);
                setAnalytics(analyticsRes);
            } catch (error) {
                console.error('Failed to load insights data', error);
                toast.error('Failed to load insights');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [seriesId]);

    if (loading) {
        return (
            <div className="fade-in max-w-6xl mx-auto py-12 px-6">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-surface-2 animate-pulse rounded" />
                        <div className="h-8 w-48 bg-surface-2 animate-pulse rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 glass animate-pulse rounded-xl" />)}
                </div>
                <div className="h-[300px] glass animate-pulse rounded-xl" />
            </div>
        );
    }

    if (!analytics) return null;

    const stats = analytics?.detailedStats?.stats || {};
    const seriesTrend = analytics?.detailedStats?.seriesTrend || [];
    const subjectTrend = analytics?.detailedStats?.subjectTrend || {};
    const subjectPerformance = (analytics?.subjectPerformance || []).sort((a, b) => b.overall_accuracy - a.overall_accuracy);
    const overview = analytics?.overview || {};

    // Prepare Series Trend Data
    const trendData = seriesTrend.map((t, i) => ({
        attempt: `Test ${i + 1}`,
        name: t.test_name,
        Accuracy: t.accuracy,
        Score: t.score,
        Max: t.max_score,
        date: new Date(t.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }));

    // Prepare Subject Bar Data
    const subjectBarData = subjectPerformance.map(s => ({
        name: s.subject_name,
        Accuracy: Number(s.overall_accuracy),
        Correct: Number(s.total_correct),
        Total: Number(s.total_questions)
    }));

    // Prepare Subject Trend Data (Multi-Line Chart)
    const subjectTrendData = seriesTrend.map((t, i) => {
        const dp = { attempt: `T${i + 1}`, name: t.test_name, date: new Date(t.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) };
        Object.keys(subjectTrend).forEach(sub => {
            const match = subjectTrend[sub].find(x => x.testIndex === i);
            if (match) dp[sub] = match.accuracy;
        });
        return dp;
    });

    const colors = ['#f472b6', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f87171'];
    const availableSubjects = ['All Subjects', ...Object.keys(subjectTrend).sort()];

    // Calculations for selected subject
    let isAll = selectedSubject === 'All Subjects';
    let subPerf = isAll ? null : subjectPerformance.find(s => s.subject_name === selectedSubject);
    let subTrendArr = isAll ? [] : (subjectTrend[selectedSubject] || []);
    let subAccuracies = subTrendArr.map(s => s.accuracy);

    let subAvgAcc = subPerf ? Number(subPerf.overall_accuracy) : 0;
    let subBestAcc = subAccuracies.length > 0 ? Math.max(...subAccuracies) : 0;
    let subWorstAcc = subAccuracies.length > 0 ? Math.min(...subAccuracies) : 0;
    let subAttemptsCount = subAccuracies.length;
    let subImprovement = subAccuracies.length >= 2 ? (subAccuracies[subAccuracies.length - 1] - subAccuracies[0]).toFixed(1) : 0;

    let specificTrendData = subTrendArr.map(st => ({
        attempt: `Test ${st.testIndex + 1}`,
        name: st.test_name,
        Accuracy: st.accuracy
    }));

    // --- Advanced Exam Analytics ---
    const calculateStdDev = (arr) => {
        if (arr.length < 2) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1);
        return Math.sqrt(variance);
    };

    const calculateMomentum = (arr) => {
        if (arr.length < 2) return 0;
        const overallAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
        const lastTwoAvg = (arr[arr.length - 1] + arr[arr.length - 2]) / 2;
        const momentumVal = lastTwoAvg - overallAvg;
        return momentumVal;
    };

    let currentAccuracies = isAll ? trendData.map(t => t.Accuracy) : subAccuracies;
    let stdDev = calculateStdDev(currentAccuracies);
    let consistencyLabel = currentAccuracies.length < 2 ? 'N/A' : (stdDev < 5 ? 'High' : stdDev < 15 ? 'Medium' : 'Low');
    let consistencyColor = currentAccuracies.length < 2 ? 'text-text-muted' : (stdDev < 5 ? 'text-emerald-500 [.dark_&]:text-emerald-400' : stdDev < 15 ? 'text-amber-600 [.dark_&]:text-amber-400' : 'text-rose-600 [.dark_&]:text-rose-400');

    let momentumVal = calculateMomentum(currentAccuracies);
    let momentumLabel = currentAccuracies.length < 2 ? 'N/A' : (momentumVal > 3 ? 'Positive' : momentumVal < -3 ? 'Negative' : 'Neutral');
    let momentumColor = currentAccuracies.length < 2 ? 'text-text-muted' : (momentumVal > 3 ? 'text-emerald-500 [.dark_&]:text-emerald-400' : momentumVal < -3 ? 'text-rose-600 [.dark_&]:text-rose-400' : 'text-sky-600 [.dark_&]:text-sky-400');

    return (
        <div className="fade-in max-w-6xl mx-auto py-8">
            {/* Nav Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-4 md:px-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors text-text-muted hover:text-text cursor-pointer group"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-text tracking-tight">Series Insights: {analytics?.overview?.series_name}</h1>
                    </div>
                </div>

                {/* Subject Selector */}
                {Object.keys(subjectTrend).length > 0 && (
                    <div className="relative group self-start md:self-center">
                        <select
                            className="bg-surface-3/10 border border-border text-text-muted text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-pink-500/50 appearance-none cursor-pointer hover:bg-surface-3/10 transition-all min-w-[200px]"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                        >
                            {availableSubjects.map(sub => (
                                <option key={sub} value={sub} className="bg-surface-2">{sub}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-text-muted transition-colors" />
                    </div>
                )}
            </div>

            <div className="px-4 md:px-0 space-y-8 pb-12">
                {seriesTrend.length > 0 ? (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: 'Total Tests', value: isAll ? (overview.total_tests || 0) : subAttemptsCount, sub: 'Attempted', color: 'text-pink-500 [.dark_&]:text-pink-400', border: 'border-pink-500/20', bg: 'from-pink-500/10', icon: <Activity className="w-3.5 h-3.5" />, id: 'total', info: 'Total number of successfully completed tests in this series.' },
                                { label: 'Avg Acc', value: `${isAll ? (stats.avgAccuracy || 0) : subAvgAcc}%`, sub: 'Overall Mean', color: 'text-sky-500 [.dark_&]:text-sky-400', border: 'border-sky-500/20', bg: 'from-sky-500/10', icon: <Target className="w-3.5 h-3.5" />, id: 'avg', info: 'The arithmetic mean of accuracy percentages across all attempted tests.' },
                                { label: 'Best Acc', value: `${isAll ? (stats.bestAccuracy || 0) : subBestAcc}%`, sub: 'Peak Score', color: 'text-emerald-500 [.dark_&]:text-emerald-400', border: 'border-emerald-500/20', bg: 'from-emerald-500/10', icon: <Award className="w-3.5 h-3.5" />, id: 'best', info: 'The highest accuracy percentage achieved in a single test.' },
                                { label: 'Worst Acc', value: `${isAll ? (stats.worstAccuracy || 0) : subWorstAcc}%`, sub: 'Floor Score', color: 'text-rose-600 [.dark_&]:text-rose-400', border: 'border-rose-500/20', bg: 'from-rose-500/10', icon: <TrendingUp className="w-3.5 h-3.5 rotate-180" />, id: 'worst', info: 'The lowest accuracy percentage recorded in a single test.' },
                                {
                                    label: 'Consistency',
                                    value: consistencyLabel,
                                    sub: `SD: ${stdDev.toFixed(1)}`,
                                    color: consistencyColor,
                                    border: stdDev < 5 ? 'border-emerald-500/20' : stdDev < 15 ? 'border-amber-500/20' : 'border-rose-500/20',
                                    bg: stdDev < 5 ? 'from-emerald-500/10' : stdDev < 15 ? 'from-amber-500/10' : 'from-rose-500/10',
                                    icon: <BarChart3 className="w-3.5 h-3.5" />,
                                    id: 'consistency',
                                    info: 'Measures score stability using Standard Deviation. Higher stability (Lower Deviation < 5%) indicates reliable performance.'
                                },
                                {
                                    label: 'Momentum',
                                    value: momentumLabel,
                                    sub: `Index: ${momentumVal.toFixed(1)}`,
                                    color: momentumColor,
                                    border: momentumVal > 3 ? 'border-emerald-500/20' : momentumVal < -3 ? 'border-rose-500/20' : 'border-sky-500/20',
                                    bg: momentumVal > 3 ? 'from-emerald-500/10' : momentumVal < -3 ? 'from-rose-500/10' : 'from-sky-500/10',
                                    icon: <Zap className="w-3.5 h-3.5" />,
                                    id: 'momentum',
                                    info: 'Tracks recent performance trends. Positive momentum indicates your latest scores are improving against your average.'
                                },
                            ].map((kpi, i) => (
                                <div key={i} className={`group relative p-4 rounded-2xl border ${kpi.border} bg-gradient-to-b ${kpi.bg} to-transparent bg-surface-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/5 cursor-default flex flex-col gap-2 min-h-[100px]`}>
                                    {/* Info Tooltip Overlay */}
                                    <div className={`absolute inset-0 p-4 bg-surface-2/95 border ${kpi.border} rounded-2xl text-[10px] text-text z-50 shadow-2xl transition-all duration-300 backdrop-blur-md flex flex-col justify-center ${activeTooltip === kpi.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-1 rounded-md ${kpi.bg} ${kpi.color}`}>
                                                {kpi.icon}
                                            </div>
                                            <p className={`font-black uppercase tracking-wider ${kpi.color}`}>{kpi.label}</p>
                                        </div>
                                        <p className="leading-relaxed text-text-muted font-medium">{kpi.info}</p>
                                        <button onClick={(e) => toggleTooltip(e, null)} className="absolute top-2 right-2 p-1 text-text-muted hover:text-text transition-colors">
                                            <ChevronDown className="w-3 h-3 rotate-180" />
                                        </button>
                                    </div>

                                    <div className={`flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity ${kpi.color}`}>
                                        <div className="flex items-center gap-2">
                                            {kpi.icon}
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
                                        </div>
                                        <button
                                            onClick={(e) => toggleTooltip(e, kpi.id)}
                                            className="p-1 hover:bg-surface-3/20 rounded-md transition-colors"
                                        >
                                            <Info className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="mt-auto">
                                        <p className={`text-2xl font-heading font-black leading-tight tracking-tight ${kpi.color}`}>
                                            {kpi.value}
                                        </p>
                                        <p className="text-[10px] text-text-muted font-bold mt-1 leading-none opacity-80 uppercase tracking-tighter">{kpi.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isAll ? (
                            <>
                                {/* Main Trend Chart */}
                                <div className="glass rounded-3xl border border-border p-6 md:p-8 shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-pink-500/10">
                                                <TrendingUp className="w-5 h-5 text-pink-400" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-text">Series Progression</h2>
                                        </div>
                                        <div className="flex bg-surface-2/40 p-1.5 rounded-xl self-start sm:self-center">
                                            <button onClick={() => setTrendType('accuracy')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${trendType === 'accuracy' ? 'bg-pink-500/20 text-pink-400 shadow-lg' : 'text-text-muted hover:text-text-muted'}`}>Accuracy</button>
                                            <button onClick={() => setTrendType('score')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${trendType === 'score' ? 'bg-violet-500/20 text-violet-400 shadow-lg' : 'text-text-muted hover:text-text-muted'}`}>Marks</button>
                                        </div>
                                    </div>
                                    <div className="h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                <defs>
                                                    <linearGradient id="trendGradPage" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'} stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'} stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" vertical={false} />
                                                <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 10 }} className="text-text-muted/50" axisLine={false} tickLine={false} />
                                                <YAxis domain={trendType === 'accuracy' ? [0, 100] : [0, 'auto']} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-text-muted/50" axisLine={false} tickLine={false} tickFormatter={(v) => trendType === 'accuracy' ? `${v}%` : v} />
                                                <Tooltip content={<ChartTip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 4', className: 'text-border/40' }} />
                                                <Area type="monotone" dataKey={trendType === 'accuracy' ? 'Accuracy' : 'Score'} stroke={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'} strokeWidth={3} fillOpacity={1} fill="url(#trendGradPage)" animationDuration={1500} />
                                                {/* Target Line if all */}
                                                <ReferenceLine y={75} stroke="currentColor" className="text-emerald-500/30" strokeDasharray="3 3" label={{ value: 'Target 75%', position: 'insideBottomRight', fill: 'currentColor', className: 'text-emerald-500/40 text-[9px] font-bold' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Subject Overall Bar Chart */}
                                    <div className="glass rounded-3xl border border-border p-6 md:p-8 shadow-xl">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 rounded-lg bg-sky-500/10">
                                                <BarChart2 className="w-5 h-5 text-sky-400" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-text">Subject Mastery</h2>
                                        </div>
                                        <div className="h-[280px]">
                                            {subjectBarData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={subjectBarData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" horizontal={false} />
                                                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-text-muted/50" tickLine={false} axisLine={false} />
                                                        <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-text-muted/80" tickLine={false} axisLine={false} />
                                                        <Tooltip content={<ChartTip />} />
                                                        <Bar dataKey="Accuracy" radius={[0, 8, 8, 0]} barSize={16}>
                                                            {subjectBarData.map((e, i) => <Cell key={i} fill={accColor(e.Accuracy)} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : <p className="text-text-muted text-xs text-center mt-12">No subject data available</p>}
                                        </div>
                                    </div>

                                    {/* Subject Trajectory Line Chart */}
                                    <div className="glass rounded-3xl border border-border p-6 md:p-8 shadow-xl">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-text">Subject Trends</h2>
                                        </div>
                                        <div className="h-[280px]">
                                            {Object.keys(subjectTrend).length > 0 && seriesTrend.length > 1 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={subjectTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" vertical={false} />
                                                        <XAxis dataKey="attempt" tick={{ fill: 'currentColor', fontSize: 12 }} className="text-text-muted/50" tickLine={false} axisLine={false} dy={10} />
                                                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-text-muted/50" tickLine={false} axisLine={false} />
                                                        <Tooltip content={<ChartTip />} />
                                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 24 }} />
                                                        {Object.keys(subjectTrend).map((sub, i) => (
                                                            <Line key={sub} type="monotone" dataKey={sub} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : <p className="text-text-muted text-xs text-center mt-12">Take at least 2 tests to see trends</p>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Specific Subject Trend Chart */}
                                <div className="glass rounded-3xl border border-border p-6 md:p-8 shadow-xl">
                                    <div className="flex items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-text">{selectedSubject} Progress</h2>
                                        </div>
                                        {subAccuracies.length > 1 && (
                                            <div className={`px-4 py-2 rounded-xl text-xs font-bold border ${Number(subImprovement) > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                {Number(subImprovement) > 0 ? '↑ Improving' : '↓ Declining'} by {Math.abs(Number(subImprovement))}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="h-[320px]">
                                        {specificTrendData.length > 1 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={specificTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                    <defs>
                                                        <linearGradient id="subGradPage" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/20" vertical={false} />
                                                    <XAxis dataKey="attempt" tick={{ fill: 'currentColor', fontSize: 12 }} className="text-text-muted/50" tickLine={false} axisLine={false} dy={10} />
                                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'currentColor', fontSize: 11 }} className="text-text-muted/50" tickLine={false} axisLine={false} />
                                                    <Tooltip content={<ChartTip />} />
                                                    <Area type="monotone" dataKey="Accuracy" stroke="#34d399" strokeWidth={3} fill="url(#subGradPage)" dot={{ fill: '#34d399', r: 5, strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 0 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : <p className="text-text-muted text-center py-20 bg-surface-3/10 rounded-2xl border border-dashed border-border">Take at least 2 sessions to see trend data for this subject.</p>}
                                    </div>
                                </div>

                                {/* Specific Subject Breakdown */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                                        <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest">Test-wise History for {selectedSubject}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {specificTrendData.map((st, i) => {
                                            const acc = Number(st.Accuracy);
                                            return (
                                                <div key={i} className="bg-surface-2 rounded-2xl p-4 border border-border flex items-center justify-between transition-all hover:bg-surface-3/10 hover:border-border group">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-xl bg-surface-2/40 border border-border flex items-center justify-center group-hover:bg-pink-500/10 group-hover:border-pink-500/20 transition-colors">
                                                            <span className="text-xs font-bold text-text-muted group-hover:text-pink-400">#{st.attempt.split(' ')[1]}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-semibold text-text mb-0.5">{st.name}</p>
                                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{st.date || 'Test Result'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="hidden sm:block w-40">
                                                            <div className="w-full bg-surface-3/50 rounded-full h-1.5"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${acc}%`, backgroundColor: accColor(acc) }} /></div>
                                                        </div>
                                                        <span className={`min-w-[50px] text-center px-3 py-1.5 rounded-xl text-xs font-bold border ${accPill(acc)}`}>{acc}%</span>
                                                    </div>
                                                </div>
                                            );
                                        }).reverse()}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="py-24 text-center glass rounded-3xl border border-dashed border-border max-w-2xl mx-auto mt-12">
                        <div className="w-20 h-20 bg-surface-3/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Activity className="w-10 h-10 text-text-muted opacity-50" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-text mb-2">No Analytics Found</h2>
                        <p className="text-text-muted text-sm max-w-xs mx-auto mb-8">You haven't taken any tests in this series yet. Take your first test to unlock detailed insights.</p>
                        <button onClick={() => navigate(`/tests/${seriesId}`)} className="px-6 py-2.5 rounded-xl bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] text-text text-sm font-bold hover:scale-105 transition-transform cursor-pointer">Back to Series</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestSeriesInsights;

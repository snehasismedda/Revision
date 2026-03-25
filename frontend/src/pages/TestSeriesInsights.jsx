import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, TrendingUp, BarChart3, ChevronDown, BarChart2, Target, Info } from 'lucide-react';
import { analyticsApi } from '../api';
import * as testSeriesApi from '../api/testSeriesApi';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, Legend
} from 'recharts';

// ── colour helpers ────────────────────────────────────────────────────────────
const accColor = (v) => v >= 75 ? '#34d399' : v >= 50 ? '#fbbf24' : '#f87171';
const accPill = (v) => v >= 75
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : v >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

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
    let consistencyColor = currentAccuracies.length < 2 ? 'text-slate-500' : (stdDev < 5 ? 'text-emerald-400' : stdDev < 15 ? 'text-amber-400' : 'text-rose-400');

    let momentumVal = calculateMomentum(currentAccuracies);
    let momentumLabel = currentAccuracies.length < 2 ? 'N/A' : (momentumVal > 3 ? 'Positive' : momentumVal < -3 ? 'Negative' : 'Neutral');
    let momentumColor = currentAccuracies.length < 2 ? 'text-slate-500' : (momentumVal > 3 ? 'text-emerald-400' : momentumVal < -3 ? 'text-rose-400' : 'text-sky-400');

    return (
        <div className="fade-in max-w-6xl mx-auto py-8">
            {/* Nav Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-4 md:px-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors text-slate-400 hover:text-white cursor-pointer group"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-white tracking-tight">Series Insights: {analytics?.overview?.series_name}</h1>
                    </div>
                </div>

                {/* Subject Selector */}
                {Object.keys(subjectTrend).length > 0 && (
                    <div className="relative group self-start md:self-center">
                        <select
                            className="bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-pink-500/50 appearance-none cursor-pointer hover:bg-white/[0.08] transition-all min-w-[200px]"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                        >
                            {availableSubjects.map(sub => (
                                <option key={sub} value={sub} className="bg-[#161622]">{sub}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-slate-300 transition-colors" />
                    </div>
                )}
            </div>

            <div className="px-4 md:px-0 space-y-8 pb-12">
                {seriesTrend.length > 0 ? (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="bg-surface-2 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 relative group">
                                <Activity className="absolute -right-2 -top-2 w-14 h-14 text-pink-500/5" />

                                {/* Card Tooltip */}
                                <div className={`absolute inset-2.5 p-3.5 bg-[#131121]/95 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] text-slate-300 z-50 shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-none ${activeTooltip === 'total' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                    <p className="font-semibold text-pink-400 mb-1">Total Tests</p>
                                    <p className="leading-relaxed opacity-80">Total number of successfully completed tests in this series.</p>
                                </div>

                                <p className="text-3xl font-bold text-white leading-none mb-1">{isAll ? (overview.total_tests || 0) : subAttemptsCount}</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{isAll ? 'Total Tests' : 'Tests Taken'}</p>
                                    <button
                                        onClick={(e) => toggleTooltip(e, 'total')}
                                        className={`p-0.5 rounded-md transition-all ${activeTooltip === 'total' ? 'bg-pink-500/20 text-pink-400 rotate-12' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Info className="w-3.5 h-3.5 cursor-pointer" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface-2 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 relative group">
                                <div className={`absolute inset-2.5 p-3.5 bg-[#131121]/95 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] text-slate-300 z-50 shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-none ${activeTooltip === 'avg' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                    <p className="font-semibold text-sky-400 mb-1">Avg Accuracy</p>
                                    <p className="leading-relaxed opacity-80">The arithmetic mean of accuracy percentages across all attempted tests.</p>
                                </div>
                                <p className="text-3xl font-bold text-sky-400 leading-none mb-1">{isAll ? (stats.avgAccuracy || 0) : subAvgAcc}%</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Avg Acc</p>
                                    <button
                                        onClick={(e) => toggleTooltip(e, 'avg')}
                                        className={`p-0.5 rounded-md transition-all ${activeTooltip === 'avg' ? 'bg-sky-500/20 text-sky-400 rotate-12' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Info className="w-3.5 h-3.5 cursor-pointer" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface-2 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 relative group">
                                <div className={`absolute inset-2.5 p-3.5 bg-[#131121]/95 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] text-slate-300 z-50 shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-none ${activeTooltip === 'best' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                    <p className="font-semibold text-emerald-400 mb-1">Best Accuracy</p>
                                    <p className="leading-relaxed opacity-80">The highest accuracy percentage achieved in a single test.</p>
                                </div>
                                <p className="text-3xl font-bold text-emerald-400 leading-none mb-1">{isAll ? (stats.bestAccuracy || 0) : subBestAcc}%</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Best Acc</p>
                                    <button
                                        onClick={(e) => toggleTooltip(e, 'best')}
                                        className={`p-0.5 rounded-md transition-all ${activeTooltip === 'best' ? 'bg-emerald-500/20 text-emerald-400 rotate-12' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Info className="w-3.5 h-3.5 cursor-pointer" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface-2 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 relative group">
                                <div className={`absolute inset-2.5 p-3.5 bg-[#131121]/95 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] text-slate-300 z-50 shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-none ${activeTooltip === 'worst' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                    <p className="font-semibold text-rose-400 mb-1">Worst Accuracy</p>
                                    <p className="leading-relaxed opacity-80">The lowest accuracy percentage recorded in a single test.</p>
                                </div>
                                <p className="text-3xl font-bold text-rose-400 leading-none mb-1">{isAll ? (stats.worstAccuracy || 0) : subWorstAcc}%</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Worst Acc</p>
                                    <button
                                        onClick={(e) => toggleTooltip(e, 'worst')}
                                        className={`p-0.5 rounded-md transition-all ${activeTooltip === 'worst' ? 'bg-rose-500/20 text-rose-400 rotate-12' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Info className="w-3.5 h-3.5 cursor-pointer" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface-2 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 relative group">
                                <div className={`absolute inset-2.5 p-3.5 bg-[#131121]/95 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] text-slate-300 z-50 shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-none ${activeTooltip === 'consistency' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                    <p className="font-semibold text-violet-400 mb-1">Consistency</p>
                                    <p className="leading-relaxed opacity-80">Measures score stability using Standard Deviation. Higher stability (Lower Deviation &lt; 5%) indicates reliable performance.</p>
                                </div>
                                <p className={`text-3xl font-bold ${consistencyColor} leading-none mb-1`}>{consistencyLabel}</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center justify-between flex-1">
                                        Consistency <span className="text-[9px] text-slate-600 bg-white/5 px-1.5 rounded">{stdDev.toFixed(1)}</span>
                                    </p>
                                    <button
                                        onClick={(e) => toggleTooltip(e, 'consistency')}
                                        className={`p-0.5 rounded-md transition-all ${activeTooltip === 'consistency' ? 'bg-violet-500/20 text-violet-400 rotate-12' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Info className="w-3.5 h-3.5 cursor-pointer" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-surface-2 border border-white/5 p-5 rounded-2xl flex flex-col gap-1 relative group">
                                <div className={`absolute inset-2.5 p-3.5 bg-[#131121]/95 backdrop-blur-xl border border-white/10 rounded-xl text-[11px] text-slate-300 z-50 shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-none ${activeTooltip === 'momentum' ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                    <p className="font-semibold text-amber-400 mb-1">Momentum</p>
                                    <p className="leading-relaxed opacity-80">Compares the average of your last 2 tests against your overall average. Positive values indicate a recent upward trend.</p>
                                </div>
                                <p className={`text-3xl font-bold ${momentumColor} leading-none mb-1`}>{momentumLabel}</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center justify-between flex-1">
                                        Momentum <span className="text-[9px] text-slate-600 bg-white/5 px-1.5 rounded">{(momentumVal > 0 ? '+' : '')}{momentumVal.toFixed(1)}%</span>
                                    </p>
                                    <button
                                        onClick={(e) => toggleTooltip(e, 'momentum')}
                                        className={`p-0.5 rounded-md transition-all ${activeTooltip === 'momentum' ? 'bg-amber-500/20 text-amber-400 rotate-12' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <Info className="w-3.5 h-3.5 cursor-pointer" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isAll ? (
                            <>
                                {/* Main Trend Chart */}
                                <div className="glass rounded-3xl border border-white/8 p-6 md:p-8 shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-pink-500/10">
                                                <TrendingUp className="w-5 h-5 text-pink-400" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-white">Series Progression</h2>
                                        </div>
                                        <div className="flex bg-black/40 p-1.5 rounded-xl self-start sm:self-center">
                                            <button onClick={() => setTrendType('accuracy')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${trendType === 'accuracy' ? 'bg-pink-500/20 text-pink-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Accuracy</button>
                                            <button onClick={() => setTrendType('score')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${trendType === 'score' ? 'bg-violet-500/20 text-violet-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Marks</button>
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
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                <XAxis dataKey="attempt" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis domain={trendType === 'accuracy' ? [0, 100] : ['auto', 'auto']} tickFormatter={v => trendType === 'accuracy' ? `${v}%` : v} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                                <Tooltip content={<ChartTip />} />
                                                <Area type="monotone" dataKey={trendType === 'accuracy' ? 'Accuracy' : 'Score'} stroke={trendType === 'accuracy' ? '#ec4899' : '#8b5cf6'} strokeWidth={3} fill="url(#trendGradPage)" dot={{ fill: trendType === 'accuracy' ? '#ec4899' : '#8b5cf6', r: 5, strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 0 }} name={trendType === 'accuracy' ? 'Accuracy' : 'Marks'} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Subject Overall Bar Chart */}
                                    <div className="glass rounded-3xl border border-white/8 p-6 md:p-8 shadow-xl">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 rounded-lg bg-sky-500/10">
                                                <BarChart2 className="w-5 h-5 text-sky-400" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-white">Subject Mastery</h2>
                                        </div>
                                        <div className="h-[280px]">
                                            {subjectBarData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={subjectBarData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                                        <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} tickLine={false} axisLine={false} />
                                                        <Tooltip content={<ChartTip />} />
                                                        <Bar dataKey="Accuracy" radius={[0, 8, 8, 0]} barSize={16}>
                                                            {subjectBarData.map((e, i) => <Cell key={i} fill={accColor(e.Accuracy)} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : <p className="text-slate-500 text-xs text-center mt-12">No subject data available</p>}
                                        </div>
                                    </div>

                                    {/* Subject Trajectory Line Chart */}
                                    <div className="glass rounded-3xl border border-white/8 p-6 md:p-8 shadow-xl">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-white">Subject Trends</h2>
                                        </div>
                                        <div className="h-[280px]">
                                            {Object.keys(subjectTrend).length > 0 && seriesTrend.length > 1 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={subjectTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                        <XAxis dataKey="attempt" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                                        <Tooltip content={<ChartTip />} />
                                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 24 }} />
                                                        {Object.keys(subjectTrend).map((sub, i) => (
                                                            <Line key={sub} type="monotone" dataKey={sub} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
                                                        ))}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : <p className="text-slate-500 text-xs text-center mt-12">Take at least 2 tests to see trends</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Subject Detailed Breakdown */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Performance Matrix</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {subjectPerformance.map((s, i) => {
                                            const acc = Number(s.overall_accuracy);
                                            return (
                                                <div key={i} className="bg-surface-2 rounded-2xl p-5 border border-white/[0.05] hover:border-white/10 transition-all flex items-center justify-between group">
                                                    <div className="flex-1 pr-6 border-r border-white/[0.06]">
                                                        <p className="text-[17px] font-semibold text-white mb-2 group-hover:text-pink-400 transition-colors">{s.subject_name}</p>
                                                        <div className="w-full bg-black/40 rounded-full h-1.5"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${acc}%`, backgroundColor: accColor(acc) }} /></div>
                                                    </div>
                                                    <div className="flex gap-8 pl-6 shrink-0">
                                                        <div className="text-center">
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Accuracy</p>
                                                            <p className="text-lg font-bold" style={{ color: accColor(acc) }}>{acc}%</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Questions</p>
                                                            <p className="text-lg font-bold text-white">{s.total_correct}/{s.total_questions}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Specific Subject Trend Chart */}
                                <div className="glass rounded-3xl border border-white/8 p-6 md:p-8 shadow-xl">
                                    <div className="flex items-center justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <h2 className="text-lg font-heading font-semibold text-white">{selectedSubject} Progress</h2>
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
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                                    <XAxis dataKey="attempt" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                                    <Tooltip content={<ChartTip />} />
                                                    <Area type="monotone" dataKey="Accuracy" stroke="#34d399" strokeWidth={3} fill="url(#subGradPage)" dot={{ fill: '#34d399', r: 5, strokeWidth: 0 }} activeDot={{ r: 7, strokeWidth: 0 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : <p className="text-slate-500 text-center py-20 bg-black/20 rounded-2xl border border-dashed border-white/5">Take at least 2 sessions to see trend data for this subject.</p>}
                                    </div>
                                </div>

                                {/* Specific Subject Breakdown */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Test-wise History for {selectedSubject}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {specificTrendData.map((st, i) => {
                                            const acc = Number(st.Accuracy);
                                            return (
                                                <div key={i} className="bg-surface-2 rounded-2xl p-4 border border-white/[0.04] flex items-center justify-between transition-all hover:bg-white/[0.02] hover:border-white/10 group">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:bg-pink-500/10 group-hover:border-pink-500/20 transition-colors">
                                                            <span className="text-xs font-bold text-slate-400 group-hover:text-pink-400">#{st.attempt.split(' ')[1]}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[16px] font-semibold text-white mb-0.5">{st.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{st.date || 'Test Result'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="hidden sm:block w-40">
                                                            <div className="w-full bg-black/50 rounded-full h-1.5"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${acc}%`, backgroundColor: accColor(acc) }} /></div>
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
                    <div className="py-24 text-center glass rounded-3xl border border-dashed border-white/10 max-w-2xl mx-auto mt-12">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Activity className="w-10 h-10 text-slate-700 opacity-50" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-white mb-2">No Analytics Found</h2>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">You haven't taken any tests in this series yet. Take your first test to unlock detailed insights.</p>
                        <button onClick={() => navigate(`/tests/${seriesId}`)} className="px-6 py-2.5 rounded-xl bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] text-white text-sm font-bold hover:scale-105 transition-transform cursor-pointer">Back to Series</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestSeriesInsights;

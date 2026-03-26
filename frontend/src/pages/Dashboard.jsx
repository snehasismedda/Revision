import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../api/index.js';
import { useSubjects } from '../context/SubjectContext.jsx';
import { useTestSeries } from '../context/TestSeriesContext.jsx';
import SubjectCard from '../components/SubjectCard.jsx';
import SubjectModal from '../components/modals/SubjectModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import toast from 'react-hot-toast';
import {
    BookOpen, Target, Activity, CheckCircle2,
    AlertTriangle, PlusCircle, LayoutDashboard,
    TrendingUp, ArrowUpRight, Sparkles, Wand2, Download,
    Edit2, Save, CheckCircle, ArrowRight
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

/* ── Mini sparkline-style progress bar ─────────────────────── */
const MiniProgressBar = ({ value, max, colorClass = 'bg-primary' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-3">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

/* ── Stat Card ─────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
const StatCard = ({ label, value, sub, icon: Icon, colorClass, delayClass, trend, progressValue, progressMax, progressColor, className = '' }) => (
    <div className={`glass-card glass p-6 min-h-[150px] flex flex-col justify-between fade-in ${delayClass} relative overflow-hidden group ${className}`}>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-xl border border-white/5 bg-white/[0.04] shadow-inner ${colorClass}`}>
                <Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            {trend && (
                <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'text-emerald-400 bg-emerald-500/10' : trend === '--' ? 'text-slate-500 bg-white/5' : 'text-red-400 bg-red-500/10'}`}>
                    {trend !== '--' && <ArrowUpRight className="w-3 h-3" />}
                    {trend}
                </div>
            )}
        </div>
        <div className="relative z-10">
            <p className="text-3xl font-heading font-bold text-slate-100 tracking-tight">{value}</p>
            <p className="text-[13px] font-medium text-slate-400 mt-1">{label}</p>
            {sub && <p className="text-[11px] font-medium text-slate-500 mt-1.5 uppercase tracking-wider">{sub}</p>}
            {progressValue != null && progressMax != null && (
                <MiniProgressBar value={progressValue} max={progressMax} colorClass={progressColor || 'bg-primary'} />
            )}
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { 
        subjects, 
        statsMap, 
        loadSubjects, 
        deleteSubject 
    } = useSubjects(); 


    const { 
        testSeries, 
        loadTestSeries 
    } = useTestSeries();

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });
    const [globalInsight, setGlobalInsight] = useState('');
    const [globalInsightLoading, setGlobalInsightLoading] = useState(false);
    const [isEditingInsight, setIsEditingInsight] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                // Batch fetch subjects and stats
                await loadSubjects();
                
                // Fetch test series centrally
                await loadTestSeries();
            } catch (err) {
                console.error("[Dashboard] Load error:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [loadSubjects, loadTestSeries]);

    const handleSubjectSaved = () => {
        // Context now handles the updates internally via SubjectModal
        setShowModal(false);
        setEditingSubject(null);
    };

    const handleDelete = async () => {
        const { id, name } = confirmDelete;
        try {
            await deleteSubject(id, name);
        } catch (error) {
            // Error handled in context
        } finally {
            setConfirmDelete({ open: false, id: null, name: '' });
        }
    };

    const loadGlobalInsight = async () => {
        setGlobalInsightLoading(true);
        const loadingToast = toast.loading('Calculating study strategy...');
        try {
            const { insight } = await aiApi.globalInsights();
            setGlobalInsight(insight);
            toast.success('Strategy generated!', { id: loadingToast });
        } catch {
            setGlobalInsight('Unable to generate global insights. Ensure you have recorded some sessions first.');
            toast.error('AI Strategy failed', { id: loadingToast });
        } finally {
            setGlobalInsightLoading(false);
        }
    };

    const handleDownloadTxt = () => {
        if (!globalInsight) return;
        const blob = new Blob([globalInsight], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Study_Strategy_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Strategy saved as .txt');
    };

    const totalSessions = Object.values(statsMap).reduce((a, s) => a + (s?.totalSessions || 0), 0);
    const totalRevisionSessions = Object.values(statsMap).reduce((a, s) => a + (s?.totalRevisionSessions || 0), 0);
    const totalQuestions = Object.values(statsMap).reduce((a, s) => a + (s?.totalQuestions || 0), 0);
    const totalCorrect = Object.values(statsMap).reduce((a, s) => a + (s?.totalCorrect || 0), 0);
    const globalAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : '--';

    const totalIncorrect = totalQuestions - totalCorrect;

    const needsAttentionCount = subjects.filter((s) => statsMap[s.id]?.accuracy != null && statsMap[s.id].totalQuestions > 0 && statsMap[s.id].accuracy < 75).length;

    const weakSubjects = subjects
        .filter((s) => statsMap[s.id]?.accuracy != null && statsMap[s.id].totalQuestions > 0 && statsMap[s.id].accuracy < 75)
        .sort((a, b) => (statsMap[a.id]?.accuracy ?? 100) - (statsMap[b.id]?.accuracy ?? 100))
        .slice(0, 3);

    const topSubject = subjects.length > 0
        ? [...subjects]
            .filter(s => statsMap[s.id]?.totalQuestions > 0)
            .sort((a, b) => (statsMap[b.id]?.accuracy ?? 0) - (statsMap[a.id]?.accuracy ?? 0))[0]
        : null;

    return (
        <div className="fade-in max-w-6xl mx-auto">
            <ConfirmDialog
                isOpen={confirmDelete.open}
                title="Delete Subject"
                message={`Are you sure you want to delete "${confirmDelete.name}"? This will permanently remove all topics, sessions, and performance data associated with it.`}
                confirmText="Delete Subject"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ open: false, id: null, name: '' })}
            />

            <SubjectModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                editingSubject={editingSubject}
                onSubjectSaved={handleSubjectSaved}
            />

            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest text-primary uppercase">Overview</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">Your learning performance at a glance.</p>
                </div>
            </div>

            {/* AI Strategic Insights Section — Top Level Analysis
            <div className="mb-10 fade-in stagger-1">
                <div className="glass-card glass p-8 rounded-[2rem] border-indigo-500/20 bg-indigo-500/[0.03] relative overflow-hidden group shadow-2xl shadow-indigo-900/10">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 text-indigo-400 border border-indigo-500/30 shadow-xl shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-500">
                                    <Sparkles className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-heading font-bold text-white tracking-tight">AI Strategic Planner</h2>
                                        <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Powered by AI</div>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-xl">Intelligent analysis of your global performance with a curated roadmap for your upcoming study sessions.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {globalInsight && (
                                    <div className="hidden md:flex flex-col items-end mr-2">
                                        <span className="text-[10px] uppercase tracking-tighter text-indigo-400/60 font-black">Plan Strength</span>
                                        <div className="flex gap-1 mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`h-1 w-4 rounded-full ${i < 4 ? 'bg-indigo-500' : 'bg-white/10'}`} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={loadGlobalInsight}
                                    disabled={globalInsightLoading || totalQuestions === 0}
                                    className="group/btn relative overflow-hidden flex items-center gap-3 px-7 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {globalInsightLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Synthesizing Strategy...</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                                            <Wand2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                                            <span>{globalInsight ? 'Regenerate Roadmap' : 'Initialize Planner'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {globalInsight ? (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="flex items-center justify-between mb-3 px-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity className="w-3 h-3 text-indigo-400" /> Current Strategy
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsEditingInsight(!isEditingInsight)}
                                            className={`text-[11px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${isEditingInsight ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'text-slate-500 hover:text-white border-transparent hover:bg-white/5'}`}
                                        >
                                            {isEditingInsight ? <><CheckCircle className="w-3 h-3" /> Save Changes</> : <><Edit2 className="w-3 h-3" /> Edit Mode</>}
                                        </button>
                                        <button
                                            onClick={handleDownloadTxt}
                                            className="text-[11px] font-bold text-slate-500 hover:text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-transparent hover:bg-emerald-500/5 hover:border-emerald-500/10"
                                        >
                                            <Download className="w-3 h-3" /> Export (.txt)
                                        </button>
                                    </div>
                                </div>
                                <div className={`p-8 rounded-[1.5rem] bg-indigo-500/[0.02] border transition-colors duration-500 relative group/editor ${isEditingInsight ? 'border-indigo-500/40 bg-indigo-500/[0.04]' : 'border-white/[0.05]'}`}>
                                    {isEditingInsight ? (
                                        <textarea
                                            value={globalInsight}
                                            onChange={(e) => setGlobalInsight(e.target.value)}
                                            className="w-full bg-transparent text-slate-200 text-base leading-relaxed font-medium outline-none border-none resize-none min-h-[300px] focus:ring-0 selection:bg-indigo-500/30 font-mono scrollbar-hide"
                                            autoFocus
                                            placeholder="Craft your master study plan here..."
                                        />
                                    ) : (
                                        <div className="prose prose-invert prose-indigo max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-heading prose-headings:tracking-tight prose-strong:text-indigo-400 prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
                                            >
                                                {preprocessMarkdown(globalInsight)}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
                                        <div className="text-[9px] px-2 py-1 rounded bg-black/40 border border-white/10 text-slate-500 uppercase tracking-widest font-black">
                                            {isEditingInsight ? 'MASTER EDITOR' : 'SECURE VIEW'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-16 rounded-[2rem] border-2 border-dashed border-indigo-500/10 bg-indigo-500/[0.01] text-center group/empty transition-colors hover:border-indigo-500/20 hover:bg-indigo-500/[0.02]">
                                <div className="w-20 h-20 mx-auto bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-indigo-500/20 group-hover/empty:scale-110 group-hover/empty:bg-indigo-500/20 transition-all duration-500">
                                    <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-indigo-100 mb-3 tracking-tight">Unlock AI Strategy</h3>
                                <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                                    {totalQuestions > 0
                                        ? "Your data is ready for analysis. Our AI is waiting to synthesize your performance patterns into a high-performance study roadmap."
                                        : "Record a few study sessions first. Once we have enough data points, we'll unlock the ability to generate personalized strategic plans."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            */}

            {/* Global Stats Grid — Bento Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                {/* Global Accuracy & Questions Attempted - Hero Card */}
                <div className="md:col-span-2 glass-card glass p-8 relative overflow-hidden group border-indigo-500/20 bg-indigo-500/[0.02] flex flex-col justify-between fade-in stagger-1 min-h-[220px]">
                    <div className="flex justify-between items-start mb-2 z-10 relative">
                        <div className="flex items-center gap-3">
                            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                                <Target className="w-6 h-6" strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-lg font-heading font-bold text-white tracking-tight">Performance Summary</h3>
                                <p className="text-slate-400 text-sm mt-0.5">{totalQuestions} Questions Attempted</p>
                            </div>
                        </div>

                        {globalAccuracy !== '--' && (
                            <div className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider flex items-center gap-1.5 uppercase
                                ${globalAccuracy >= 75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : globalAccuracy >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {globalAccuracy >= 75 ? <><TrendingUp className="w-3.5 h-3.5" /> Excellent</>
                                    : globalAccuracy >= 50 ? <><Activity className="w-3.5 h-3.5" /> Good</>
                                        : <><AlertTriangle className="w-3.5 h-3.5" /> Needs Work</>}
                            </div>
                        )}
                    </div>

                    <div className="z-10 relative mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                        <div>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-6xl md:text-7xl font-heading font-black text-white tracking-tighter leading-none">
                                    {globalAccuracy === '--' ? '--' : globalAccuracy}
                                </span>
                                {globalAccuracy !== '--' && <span className="text-2xl font-bold text-slate-500 mb-1">%</span>}
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Global Accuracy</p>
                        </div>

                        {totalQuestions > 0 && (
                            <div className="w-full pb-1">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-2 px-0.5">
                                    <span className="text-emerald-400">Correct: {totalCorrect}</span>
                                    <span className="text-red-400">Incorrect: {totalIncorrect}</span>
                                </div>
                                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out 
                                            ${globalAccuracy >= 75 ? 'bg-emerald-400'
                                                : globalAccuracy >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                        style={{ width: `${globalAccuracy}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mt-2 px-0.5">
                                    <span>{totalQuestions} Total Attempts</span>
                                    <span className="text-emerald-400/80">Keep going!</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Subjects */}
                <StatCard
                    delayClass="stagger-2"
                    label="Active Subjects"
                    value={subjects.length}
                    sub={needsAttentionCount > 0 ? `${needsAttentionCount} ${needsAttentionCount === 1 ? 'subject needs' : 'subjects need'} attention` : (subjects.length > 0 ? 'All subjects performing well' : 'No active subjects')}
                    icon={BookOpen}
                    colorClass="text-primary"
                />

                {/* Test Series */}
                <StatCard
                    delayClass="stagger-3"
                    label="Active Test Series"
                    value={testSeries.length}
                    sub="Examination roadmap"
                    icon={Target}
                    colorClass="text-pink-500"
                />

                {/* Total Sessions */}
                <StatCard
                    delayClass="stagger-4"
                    label="Study Sessions"
                    value={totalSessions}
                    sub="Recorded study segments"
                    icon={Activity}
                    colorClass="text-blue-400"
                />

                {/* Revision Sessions */}
                <StatCard
                    delayClass="stagger-5"
                    label="Revision Sessions"
                    value={totalRevisionSessions}
                    sub="Completed revision sessions"
                    icon={TrendingUp}
                    colorClass="text-purple-400"
                />
            </div>

            {/* Weak areas spotlight with amber glow */}
            {weakSubjects.length > 0 && (
                <div className="mb-10 fade-in stagger-3">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-white tracking-tight">Needs Attention</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.02]">
                        {weakSubjects.map((s) => (
                            <SubjectCard
                                key={s.id}
                                subject={s}
                                stats={statsMap[s.id]}
                                variant="attention"
                                onEdit={(subj) => {
                                    setEditingSubject(subj);
                                    setShowModal(true);
                                }}
                                onDelete={(subj) => setConfirmDelete({ open: true, id: subj.id, name: subj.name })}
                            />
                        ))}
                    </div>
                </div>
            )}



            <div className="fade-in stagger-4 pb-12">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-white tracking-tight">Active Subjects</h2>
                    </div>
                    {subjects.length > 6 && (
                        <button
                            onClick={() => navigate('/subjects')}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-semibold transition-colors cursor-pointer group/see-all"
                        >
                            <span>See All</span>
                            <ArrowRight className="w-4 h-4 group-hover/see-all:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="glass p-6 animate-pulse h-[140px] rounded-xl border-white/5" />
                        ))}
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="glass-panel rounded-xl p-12 text-center border-dashed border-primary/30 w-full relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-primary/20 pulse-ring">
                            <BookOpen className="w-10 h-10 text-primary" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">No subjects yet</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                            Create your first subject to start tracking your revision performance and unlocking AI insights.
                        </p>
                        <button
                            onClick={() => navigate('/subjects?new=1')}
                            className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span>Create Subject</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {subjects.slice(0, 6).map((s) => (
                            <SubjectCard
                                key={s.id}
                                subject={s}
                                stats={statsMap[s.id]}
                                onEdit={(subj) => {
                                    setEditingSubject(subj);
                                    setShowModal(true);
                                }}
                                onDelete={(subj) => setConfirmDelete({ open: true, id: subj.id, name: subj.name })}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="fade-in stagger-5 pb-12">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                            <Target className="w-5 h-5 text-pink-500" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-white tracking-tight">Active Test Series</h2>
                    </div>
                    {testSeries.length > 6 && (
                        <button
                            onClick={() => navigate('/tests')}
                            className="flex items-center gap-2 text-pink-500 hover:text-pink-400 text-sm font-semibold transition-colors cursor-pointer group/see-all"
                        >
                            <span>See All</span>
                            <ArrowRight className="w-4 h-4 group-hover/see-all:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                </div>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="glass p-6 animate-pulse h-[100px] rounded-xl border-white/5" />
                        ))}
                    </div>
                ) : testSeries.length === 0 ? (
                    <div className="glass-panel p-16 rounded-xl text-center border-dashed border-white/10 w-full relative overflow-hidden group">
                        <div className="w-16 h-16 mx-auto bg-pink-500/10 rounded-full flex items-center justify-center mb-4 border border-pink-500/20 pulse-ring">
                            <Target className="w-8 h-8 text-pink-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-heading font-bold text-white mb-2 tracking-tight">No active test series</h3>
                        <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
                            Create or join a test series to track your exam performance.
                        </p>
                        <button
                            onClick={() => navigate('/tests')}
                            className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/20 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                        >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Go to Tests</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {testSeries.slice(0, 6).map((ts) => (
                            <div key={ts.id}
                                onClick={() => navigate(`/tests/${ts.id}`, { state: { series: ts } })}
                                className="glass-card glass p-5 cursor-pointer group flex flex-col justify-between transition-all hover:border-pink-500/30 min-h-[160px]"
                            >
                                {/* Top: Icon + Title */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <div className="p-1.5 rounded-lg border shrink-0 bg-pink-500/10 border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                                                <Target className="w-3.5 h-3.5" strokeWidth={2.2} />
                                            </div>
                                            <h3 className="text-[17px] font-heading font-semibold text-slate-100 group-hover:text-pink-400 transition-colors truncate tracking-tight leading-tight">
                                                {ts.name}
                                            </h3>
                                        </div>
                                        {ts.description && (
                                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-1 ml-[30px]">{ts.description}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Footer: Stats + Arrow */}
                                <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500 font-bold tracking-tight uppercase">
                                        <div className="flex items-center gap-1.5">
                                            <Activity className="w-3 h-3 text-pink-400" strokeWidth={2} />
                                            <span>{ts.testCount || 0} Tests</span>
                                        </div>
                                        <div className="h-2.5 w-px bg-white/10" />
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen className="w-3 h-3 text-purple-400" strokeWidth={2} />
                                            <span>{ts.subjects?.length || 0} Subjects</span>
                                        </div>
                                    </div>
                                    <button className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-500 group-hover:text-white transition-colors border border-white/5 group-hover:bg-pink-500/20">
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Target, ArrowLeft, Plus, Calendar, Activity, TrendingUp, TrendingDown, BookOpen, Trash2, Edit2, ChevronRight, ChevronDown, X, Brain, CheckCircle2, BarChart3, Notebook, BarChart2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

import * as testSeriesApi from '../api/testSeriesApi';
import * as testsApi from '../api/testsApi';
import { useTestSeries } from '../context/TestSeriesContext.jsx';
import { useTopics } from '../context/TopicContext.jsx';
import CreateTestModal from '../components/modals/CreateTestModal';
import toast from 'react-hot-toast';

import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Cell, Legend
} from 'recharts';

import ModalPortal from '../components/ModalPortal.jsx';

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


const TestSeriesDetail = () => {
    const { seriesId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { seriesDetails, detailLoading, loadSeriesDetail, updateTestsInSeries } = useTestSeries();
    const { loadTopics } = useTopics();
    
    // Derived from global state
    const cached = seriesDetails[seriesId];
    const series = cached?.series || null;
    const tests = cached?.tests || [];
    const loading = detailLoading[seriesId] && !series;

    const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
    const [isInsightsOpen, setIsInsightsOpen] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState(null);




    const loadData = useCallback(async (force = false) => {
        if (seriesId) await loadSeriesDetail(seriesId, force);
    }, [seriesId, loadSeriesDetail]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Pre-load topics for all subjects in this series
    useEffect(() => {
        if (series?.subjects) {
            series.subjects.forEach(sub => loadTopics(sub.id));
        }
    }, [series?.subjects, loadTopics]);

    const handleDeleteTest = async (e, testId) => {
        e.stopPropagation();
        setTestToDelete(testId);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDeleteTest = async () => {
        if (!testToDelete) return;
        try {
            await testsApi.deleteTest(seriesId, testToDelete);
            toast.success('Test deleted');
            // Refresh details in context
            loadData(true);
        } catch (error) {
            toast.error('Failed to delete test');
        } finally {
            setIsConfirmDeleteOpen(false);
            setTestToDelete(null);
        }
    };


    const handleEditTest = (e, test) => {
        e.stopPropagation();
        setEditingTest(test);
        setIsCreateTestModalOpen(true);
    };

    const handleModalClose = () => {
        setIsCreateTestModalOpen(false);
        setEditingTest(null);
    };


    if (loading) {
        return (
            <div className="fade-in max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-surface-2 animate-pulse rounded" />
                        <div className="h-8 w-48 bg-surface-2 animate-pulse rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass p-8 animate-pulse h-[160px] rounded-xl border-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    if (!series) return null;

    return (
        <div className="fade-in max-w-6xl mx-auto">
            <div className="relative mb-6">
                {/* Background ambient effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-24 bg-pink-500/5 blur-[70px] -z-10 rounded-full opacity-60" />
                
                <div className="flex items-center justify-between gap-6 py-2 px-1">
                    {/* Left: Back */}
                    <div className="flex-1 flex justify-start">
                        <button
                            onClick={() => navigate('/tests')}
                            className="flex items-center gap-2 text-[12.5px] font-bold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] pl-2.5 pr-4 py-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.1] group/back backdrop-blur-md whitespace-nowrap cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-0.5 transition-transform" />
                            <span>Back</span>
                        </button>
                    </div>

                    {/* Center: Title (Maximum focus) */}
                    <div className="flex-[4] text-center min-w-0">
                        <h1 className="text-[28px] md:text-[38px] lg:text-[46px] font-heading font-black text-white tracking-tighter leading-none truncate drop-shadow-2xl selection:bg-pink-500/30 py-1">
                            {series.name}
                        </h1>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-1 flex justify-end gap-3">
                        <button
                            onClick={() => navigate(`/tests/${seriesId}/insights`)}
                            className="flex items-center gap-2.5 text-[12px] font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-purple-500/10 bg-purple-500/5 text-purple-400 hover:text-white hover:bg-purple-500/20 hover:border-purple-500/30 group/insights shadow-lg shadow-purple-500/5 backdrop-blur-sm whitespace-nowrap"
                        >
                            <BarChart3 className="w-3.5 h-3.5 text-purple-400 group-hover/insights:scale-110 transition-transform" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Insights</span>
                        </button>
                    </div>
                </div>

                {/* Description below title */}
                {series.description && (
                    <div className="max-w-2xl mx-auto mt-2 pb-1 text-center">
                        <p className="text-slate-400/80 text-[13px] md:text-[14px] font-medium leading-relaxed truncate px-4">
                            {series.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Divider and section Heading */}
            <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.06] to-transparent mb-4" />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
                        <Notebook className="w-4 h-4 text-pink-400" />
                    </div>
                    <h2 className="text-[20px] font-heading font-bold text-white tracking-tight">All Tests</h2>
                </div>
                <button
                    onClick={() => setIsCreateTestModalOpen(true)}
                    className="flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-lg transition-all cursor-pointer border border-pink-500/20 bg-pink-500/10 text-pink-400 hover:text-white hover:bg-pink-500/20 group shadow-lg shadow-pink-500/5 backdrop-blur-sm"
                >
                    <Plus className="w-3.5 h-3.5 text-pink-400 group-hover:rotate-90 transition-transform" strokeWidth={2.5} />
                    <span>Add Test</span>
                </button>
            </div>

            {/* Tests Section */}
            <div>
                {tests.length === 0 ? (
                    <div className="glass-panel rounded-xl p-16 text-center border-dashed border-pink-500/20 max-w-xl mx-auto relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <div className="w-20 h-20 mx-auto bg-pink-500/10 rounded-full flex items-center justify-center mb-6 border border-pink-500/20 pulse-ring">
                            <Calendar className="w-10 h-10 text-pink-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No tests yet</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                            Schedule your first test to start tracking scores against the subjects in this series.
                        </p>
                        <button
                            onClick={() => setIsCreateTestModalOpen(true)}
                            className="btn-primary-pink flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add First Test</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {tests.map(test => (
                            <div
                                key={test.id}
                                onClick={() => navigate(`/tests/${seriesId}/test/${test.id}/analytics`)}
                                className="glass-card glass p-6 cursor-pointer group flex flex-col justify-between transition-all hover:border-pink-500/30 min-h-[160px] relative active:scale-[0.99]"
                            >
                                {/* Top: Info + Actions */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-[17px] font-heading font-semibold text-slate-100 transition-colors truncate tracking-tight leading-tight mb-2">
                                            {test.name.toUpperCase()}
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500/60 shadow-[0_0_8px_rgba(236,72,153,0.4)]" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {test.subjects?.length || 0} Subjects
                                                </span>
                                            </div>
                                            <div className="h-3 w-px bg-white/10" />
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3 text-slate-600" />
                                                <span className="text-[10px] font-bold text-slate-600">
                                                    {new Date(test.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button
                                            onClick={(e) => handleEditTest(e, test)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-pink-400 transition-colors"
                                            title="Edit Test"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteTest(e, test.id)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
                                            title="Delete Test"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Footer: Score Actions & Analytics */}
                                <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/tests/${seriesId}/test/${test.id}`); }}
                                        className="flex-1 h-10 px-3 rounded-lg bg-pink-500/10 hover:bg-pink-500 text-pink-400 hover:text-white border border-pink-500/10 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Scores
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/tests/${seriesId}/test/${test.id}/analytics`); }}
                                        className="flex-1 h-10 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/10 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all"
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        Analytics
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals & Dialogs */}
            <CreateTestModal
                isOpen={isCreateTestModalOpen}
                onClose={handleModalClose}
                onSuccess={() => loadData(true)}
                seriesId={seriesId}
                seriesSubjects={series.subjects || []}
                initialData={editingTest}
            />



            <ConfirmDialog
                isOpen={isConfirmDeleteOpen}
                title="Delete Test?"
                message="Are you sure you want to delete this test? Scores will be lost, but global subject sessions will remain intact."
                onConfirm={confirmDeleteTest}
                onCancel={() => {
                    setIsConfirmDeleteOpen(false);
                    setTestToDelete(null);
                }}
                confirmText="Delete Test"
            />
        </div>
    );
};


export default TestSeriesDetail;


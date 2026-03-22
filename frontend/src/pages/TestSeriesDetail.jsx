import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Plus, Calendar, Activity, TrendingUp, TrendingDown, BookOpen, Trash2, Edit2, ChevronRight, X, Brain, CheckCircle2, BarChart3, Notebook } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

import * as testSeriesApi from '../api/testSeriesApi';
import * as testsApi from '../api/testsApi';
import { analyticsApi } from '../api';
import CreateTestModal from '../components/modals/CreateTestModal';
import toast from 'react-hot-toast';



import ModalPortal from '../components/ModalPortal.jsx';

const TestSeriesDetail = () => {
    const { seriesId } = useParams();
    const navigate = useNavigate();

    const [series, setSeries] = useState(null);
    const [tests, setTests] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
    const [isInsightsOpen, setIsInsightsOpen] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState(null);




    const loadData = async () => {
        try {
            setLoading(true);
            const [detailRes, analyticsRes] = await Promise.all([
                testSeriesApi.getTestSeriesDetail(seriesId),
                analyticsApi.testSeries(seriesId).catch(() => null)
            ]);

            setSeries(detailRes.series);
            setTests(detailRes.tests || []);
            setAnalytics(analyticsRes);
        } catch (error) {
            console.error('Failed to load test series detail', error);
            toast.error('Failed to load series details');
            navigate('/tests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (seriesId) loadData();
    }, [seriesId]);

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
            loadData();
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
            {/* Back Button Row */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={() => navigate('/tests')}
                    className="flex items-center gap-2 text-[13px] font-semibold text-slate-400 hover:text-white transition-all hover:bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
            </div>

            {/* Header Content matching SubjectDetail approach */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-[22px] md:text-[24px] font-heading font-semibold text-white tracking-tight leading-tight mb-1.5">
                        {series.name}
                    </h1>
                    {series.description && (
                        <p className="text-slate-500 text-[14px] max-w-2xl leading-[1.6]">{series.description}</p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsInsightsOpen(true)}
                        className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer border border-white/[0.08] bg-surface-3/50 text-slate-300 hover:text-white hover:bg-surface-3 hover:border-white/[0.12] group"
                    >
                        <BarChart3 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" strokeWidth={2} />
                        <span className="hidden sm:inline">Series Insights</span>
                        <span className="sm:hidden">Insights</span>
                    </button>
                    <button
                        onClick={() => setIsCreateTestModalOpen(true)}
                        className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer border border-pink-500/20 bg-pink-500/10 text-pink-400 hover:text-white hover:bg-pink-500/20 group"
                    >
                        <Plus className="w-4 h-4 text-pink-400 group-hover:rotate-90 transition-transform" strokeWidth={2} />
                        <span>Add Test</span>
                    </button>
                </div>
            </div>

            {/* Divider and section Heading */}
            <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.06] to-transparent mb-8" />

            <div className="flex items-center gap-2.5 mb-8">
                <div className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
                    <Notebook className="w-4 h-4 text-pink-400" />
                </div>
                <h2 className="text-[20px] font-heading font-bold text-white tracking-tight">All Tests</h2>
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
                onSuccess={loadData}
                seriesId={seriesId}
                seriesSubjects={series.subjects || []}
                initialData={editingTest}
            />

            <TestSeriesInsightsModal
                isOpen={isInsightsOpen}
                onClose={() => setIsInsightsOpen(false)}
                analytics={analytics}
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


const TestSeriesInsightsModal = ({ isOpen, onClose, analytics }) => {
    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-heading font-semibold text-white leading-tight">Series Insights</h3>
                                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mt-0.5">Performance Analysis</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                        {analytics ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-pink-500/20 transition-all">
                                    <Activity className="absolute -right-3 -top-3 w-16 h-16 text-pink-500/5 group-hover:text-pink-500/10 transition-colors" />
                                    <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em] mb-1.5">Total Tests</h3>
                                    <p className="text-3xl font-heading font-bold text-white tracking-tight">{analytics.overview?.total_tests || 0}</p>
                                </div>

                                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                                    <TrendingUp className="absolute -right-3 -top-3 w-16 h-16 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors" />
                                    <h4 className="text-[10px] font-extrabold text-emerald-500/80 uppercase tracking-[0.2em] mb-1.5">Strongest</h4>
                                    <p className="text-[15px] font-heading font-bold text-white tracking-tight truncate mb-1">{analytics.strongest?.subject_name || 'N/A'}</p>
                                    <p className="text-[11px] font-bold text-slate-500">{analytics.strongest ? `${analytics.strongest.overall_accuracy}% Accuracy` : '—'}</p>
                                </div>

                                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-rose-500/20 transition-all">
                                    <TrendingDown className="absolute -right-3 -top-3 w-16 h-16 text-rose-500/5 group-hover:text-rose-500/10 transition-colors" />
                                    <h4 className="text-[10px] font-extrabold text-rose-500/80 uppercase tracking-[0.2em] mb-1.5">Weakest</h4>
                                    <p className="text-[15px] font-heading font-bold text-white tracking-tight truncate mb-1">{analytics.weakest?.subject_name || 'N/A'}</p>
                                    <p className="text-[11px] font-bold text-slate-500">{analytics.weakest ? `${analytics.weakest.overall_accuracy}% Accuracy` : '—'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-16 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                                <Activity className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-50" />
                                <p className="text-slate-400 text-sm font-medium">No analytics data available for this series yet.</p>
                            </div>
                        )}

                        {analytics?.strongest && (
                            <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/15 flex items-start gap-4 transition-all hover:bg-emerald-500/[0.05]">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[14px] font-bold text-emerald-400">Great progress in {analytics.strongest.subject_name}!</p>
                                    <p className="text-[13px] text-slate-400 leading-relaxed max-w-lg">
                                        You've maintained exceptional performance in this subject. To improve further, balance your effort by targeting {analytics.weakest?.subject_name || 'weaker areas'} in your next session.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] flex shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-[13px] font-bold transition-all border border-white/10 uppercase tracking-widest cursor-pointer shadow-md active:scale-95"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default TestSeriesDetail;


import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, Plus, Calendar, Activity, TrendingUp, TrendingDown, BookOpen, Trash2, Edit2, ChevronRight, X, Brain, CheckCircle2 } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

import * as testSeriesApi from '../api/testSeriesApi';
import * as testsApi from '../api/testsApi';
import { analyticsApi } from '../api';
import CreateTestModal from '../components/modals/CreateTestModal';
import toast from 'react-hot-toast';



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
            <div className="flex-1 flex items-center justify-center h-[100dvh]">
                <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (!series) return null;

    return (
        <div className="flex-1 min-w-0 flex flex-col h-[100dvh]">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/tests')}
                            className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/10"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-300" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded bg-pink-500/10 flex items-center justify-center">
                                    <Target className="w-3.5 h-3.5 text-pink-400" />
                                </div>
                                <h1 className="text-xl font-heading font-bold text-white leading-tight">
                                    {series.name}
                                </h1>
                            </div>
                            {series.description && (
                                <p className="text-sm text-slate-400 line-clamp-1">{series.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setIsInsightsOpen(true)}
                            className="h-10 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 font-medium text-sm transition-all border border-white/10 flex items-center gap-2"
                        >
                            <Brain className="w-4 h-4 text-purple-400" />
                            <span className="hidden sm:inline">Series Insights</span>
                        </button>
                        <button
                            onClick={() => setIsCreateTestModalOpen(true)}
                            className="h-10 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium text-sm transition-all flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.25)]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Test</span>
                        </button>
                    </div>

                </div>
            </header>

            <main className="flex-1 overflow-y-auto w-full p-6">
                <div className="max-w-[1200px] mx-auto space-y-8">



                    {/* Tests List */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <BookOpen className="w-5 h-5 text-pink-400" />
                            <h2 className="text-lg font-heading font-semibold text-white">Tests</h2>
                        </div>

                        {tests.length === 0 ? (
                            <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl">
                                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                                <h3 className="text-base font-semibold text-white mb-2">No tests created yet</h3>
                                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                    Schedule your first test to start tracking scores against the subjects in this series.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {tests.map(test => (
                                    <div
                                        key={test.id}
                                        onClick={() => navigate(`/tests/${series.id}/test/${test.id}/analytics`)}
                                        className="group relative bg-white/[0.02] border border-white/5 hover:border-pink-500/30 rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col min-h-[180px]"
                                    >
                                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleEditTest(e, test)}
                                                className="p-1.5 text-slate-500 hover:text-white transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteTest(e, test.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1 h-1 rounded-full bg-pink-500/60" />
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {test.subjects?.length || 0} Subjects
                                                </span>
                                            </div>


                                            <h3 className="text-lg font-heading font-semibold text-white group-hover:text-pink-400 transition-colors duration-300 line-clamp-2 leading-snug">
                                                {test.name}
                                            </h3>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/tests/${series.id}/test/${test.id}`); }}
                                                className="h-8 px-2.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-[10px] font-bold text-pink-400 border border-pink-500/10 hover:border-pink-500/20 uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Add Scores</span>
                                            </button>


                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/tests/${series.id}/test/${test.id}/analytics`); }}
                                                className="h-8 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[10px] font-bold text-indigo-400 border border-indigo-500/10 hover:border-indigo-500/20 uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                                            >
                                                <span>Analytics</span>
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {series && (
                <CreateTestModal
                    isOpen={isCreateTestModalOpen}
                    onClose={handleModalClose}
                    onSuccess={loadData}
                    seriesId={seriesId}
                    seriesSubjects={series.subjects || []}
                    initialData={editingTest}
                />
            )}

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[#0f0f1a] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                            <Brain className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-heading font-bold text-white leading-tight text-left">Series Insights</h2>
                            <p className="text-xs text-slate-500 text-left">Overall performance analysis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {analytics ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                <Activity className="absolute -right-2 -top-2 w-12 h-12 text-pink-500/10" />
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-left">Total Tests</h3>
                                <p className="text-2xl font-heading font-bold text-white text-left">{analytics.overview?.total_tests || 0}</p>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                <TrendingUp className="absolute -right-2 -top-2 w-12 h-12 text-emerald-500/10" />
                                <h3 className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1 text-left">Strongest</h3>
                                <p className="text-lg font-heading font-bold text-white truncate text-left">{analytics.strongest?.subject_name || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 text-left">{analytics.strongest ? `${analytics.strongest.overall_accuracy}% Accuracy` : '—'}</p>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                                <TrendingDown className="absolute -right-2 -top-2 w-12 h-12 text-rose-500/10" />
                                <h3 className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-1 text-left">Weakest</h3>
                                <p className="text-lg font-heading font-bold text-white truncate text-left">{analytics.weakest?.subject_name || 'N/A'}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 text-left">{analytics.weakest ? `${analytics.weakest.overall_accuracy}% Accuracy` : '—'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                            <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No analytics data available yet.</p>
                        </div>
                    )}

                    {analytics?.strongest && (
                        <div className="p-4 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-semibold text-emerald-400">Great progress in {analytics.strongest.subject_name}!</p>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                    You've maintained a high performance in this subject. Keep focused on weaker areas like {analytics.weakest?.subject_name || 'other topics'} to balance your preparation.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
                    <button onClick={onClose} className="h-10 px-6 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-semibold transition-all border border-white/10">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestSeriesDetail;


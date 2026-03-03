import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Search, Calendar, BookOpen, Trash2, Edit2, Activity, ArrowRight } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';



import * as testSeriesApi from '../api/testSeriesApi';
import CreateTestSeriesModal from '../components/modals/CreateTestSeriesModal';
import toast from 'react-hot-toast';

const TestSeriesList = () => {
    const navigate = useNavigate();
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [seriesToDelete, setSeriesToDelete] = useState(null);



    const loadSeries = async () => {
        try {
            setLoading(true);
            const data = await testSeriesApi.getTestSeries();
            setSeries(data.testSeries || []);
        } catch (error) {
            console.error('Failed to load test series', error);
            toast.error('Failed to load test series');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSeries();
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setSeriesToDelete(id);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!seriesToDelete) return;
        try {
            await testSeriesApi.deleteTestSeries(seriesToDelete);
            toast.success('Test series deleted');
            loadSeries();
        } catch (error) {
            toast.error('Failed to delete test series');
        } finally {
            setIsConfirmDeleteOpen(false);
            setSeriesToDelete(null);
        }
    };


    const handleEdit = (e, series) => {
        e.stopPropagation();
        setEditingSeries(series);
        setIsCreateModalOpen(true);
    };

    const handleModalClose = () => {
        setIsCreateModalOpen(false);
        setEditingSeries(null);
    };


    const filteredSeries = series.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 min-w-0 flex flex-col h-[100dvh]">
            {/* Header */}
            <header className="flex-shrink-0 h-16 border-b border-white/5 bg-[#0f0f1a]/80 backdrop-blur-md px-6 flex items-center justify-between z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-pink-400" />
                    </div>
                    <h1 className="text-lg font-heading font-semibold text-white">Test Series</h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="max-w-[1200px] mx-auto w-full p-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
                        {/* Search */}
                        <div className="relative group flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search test series..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-10 pr-4 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-11 px-5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 font-medium text-sm transition-all flex items-center gap-2 border border-pink-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New Series</span>
                            </button>
                        </div>
                    </div>

                    {/* Content Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-44 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : filteredSeries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSeries.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => navigate(`/tests/${s.id}`)}
                                    className="group relative bg-[#131320] border border-white/[0.08] hover:border-pink-500/40 rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-pink-500/10 flex flex-col min-h-[220px]"
                                >

                                    {/* Ambient Background Glow */}
                                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-pink-500/5 rounded-full blur-3xl group-hover:bg-pink-500/10 transition-colors duration-500" />

                                    <div className="absolute top-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
                                        <button
                                            onClick={(e) => handleEdit(e, s)}
                                            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center transition-colors border border-white/10 backdrop-blur-md"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, s.id)}
                                            className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors border border-red-500/20 backdrop-blur-md"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1 relative py-2">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform duration-500 shrink-0">
                                                <Target className="w-5 h-5 text-pink-400" />
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-heading font-bold text-white mb-2 pr-12 group-hover:text-pink-400 transition-colors duration-300 line-clamp-1">
                                            {s.name}
                                        </h3>
                                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                            {s.description || 'Track your progress and practice mock exams.'}
                                        </p>
                                    </div>


                                    <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 shrink-0">
                                                <Activity className="w-3 h-3 text-pink-400" />
                                                <span className="text-[10px] font-bold text-pink-400">
                                                    {s.testCount || 0} TESTS
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 shrink-0">
                                                <BookOpen className="w-3 h-3 text-purple-400" />
                                                <span className="text-[10px] font-bold text-purple-400">
                                                    {s.subjects?.length || 0} SUBJECTS
                                                </span>
                                            </div>
                                        </div>
                                        <button className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-white/5 shrink-0">
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                </div>
                            ))}


                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                                <Target className="w-8 h-8 text-pink-400" />
                            </div>
                            <h3 className="text-lg font-heading font-semibold text-white mb-2">No Test Series Found</h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                                {searchQuery
                                    ? `No series match your search "${searchQuery}".`
                                    : "Create a test series to track your practice and mock exam performances."}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="h-10 px-5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all"
                                >
                                    Create First Series
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <CreateTestSeriesModal
                isOpen={isCreateModalOpen}
                onClose={handleModalClose}
                onSuccess={loadSeries}
                initialData={editingSeries}
            />

            <ConfirmDialog
                isOpen={isConfirmDeleteOpen}
                title="Delete Test Series?"
                message="Are you sure you want to delete this test series? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => {
                    setIsConfirmDeleteOpen(false);
                    setSeriesToDelete(null);
                }}
                confirmText="Delete Series"
            />


        </div>
    );
};

export default TestSeriesList;

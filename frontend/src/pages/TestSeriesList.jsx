import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Search, X } from 'lucide-react';
import TestSeriesCard from '../components/cards/TestSeriesCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog';



import * as testSeriesApi from '../api/testSeriesApi';
import CreateTestSeriesModal from '../components/modals/CreateTestSeriesModal';
import toast from 'react-hot-toast';

import { useTestSeries } from '../context/TestSeriesContext.jsx';

const TestSeriesList = () => {
    const navigate = useNavigate();
    const { testSeries: series, loading, isLoaded, loadTestSeries: loadSeries, deleteSeries } = useTestSeries();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [seriesToDelete, setSeriesToDelete] = useState(null);



    useEffect(() => {
        loadSeries();
    }, [loadSeries]);

    const handleDelete = async (e, s) => {
        e.stopPropagation();
        setSeriesToDelete(s);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!seriesToDelete) return;
        try {
            await deleteSeries(seriesToDelete.id, seriesToDelete.name);
        } catch (error) {
            // Error handled in context
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
        <div className="fade-in max-w-6xl mx-auto">
            {/* Header section similar to Subjects.jsx */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-pink-500" />
                        <span className="text-[11px] font-bold tracking-widest text-pink-500 uppercase">Preparation</span>
                    </div>
                    <h1 className="text-3xl font-heading font-bold text-text tracking-tight">Test Series</h1>
                    <p className="text-text-muted text-sm mt-1.5">{series.length} series available for practice</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-pink-500 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter series..."
                            className="bg-surface-2/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-text w-[240px] focus:outline-none focus:border-pink-500/40 focus:bg-surface-2 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary-pink flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20"
                    >
                        <Plus className="w-4 h-4" /> New Series
                    </button>
                </div>
            </div>

            {/* Content Grid area */}
            {(loading || !isLoaded) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass p-8 animate-pulse h-[160px] rounded-xl border-border" />
                    ))}
                </div>
            ) : filteredSeries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSeries.map(s => (
                        <TestSeriesCard
                            key={s.id}
                            series={s}
                            onClick={(series) => navigate(`/tests/${series.id}`, { state: { series } })}
                            onEdit={(_, series) => handleEdit(_, series)}
                            onDelete={(_, series) => handleDelete(_, series)}
                        />
                    ))}
                </div>
            ) : (
                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-pink-500/20 w-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="w-20 h-20 mx-auto bg-pink-500/10 rounded-full flex items-center justify-center mb-6 border border-pink-500/20 pulse-ring">
                        <Trophy className="w-10 h-10 text-pink-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-text mb-3 tracking-tight">No test series found</h3>
                    <p className="text-text-muted text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                        {searchQuery
                            ? `No series match your search "${searchQuery}".`
                            : "Create your first test series to track your practice and mock exam performances."}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-primary-pink flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Series</span>
                        </button>
                    )}
                </div>
            )}
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

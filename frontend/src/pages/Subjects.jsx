import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SubjectCard from '../components/SubjectCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import SubjectModal from '../components/modals/SubjectModal.jsx';
import toast from 'react-hot-toast';
import { LibraryBig, PlusCircle, Trash2, Edit2, BookOpen, Search, X } from 'lucide-react';

import { useSubjects } from '../context/SubjectContext.jsx';

const Subjects = () => {
    const { subjects, statsMap, loading, loadSubjects, addSubject, updateSubject, deleteSubject } = useSubjects();
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('');

    // Custom confirm state
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });

    useEffect(() => {
        loadSubjects();
        if (searchParams.get('new')) setShowModal(true);
    }, [searchParams, loadSubjects]);


    const handleSubjectSaved = () => {
        setShowModal(false);
        setEditingSubject(null);
    };

    const handleEditClick = (subject) => {
        setEditingSubject(subject);
        setShowModal(true);
    };

    const handleDelete = async () => {
        const { id, name } = confirmDelete;
        try {
            await deleteSubject(id, name);
        } catch (error) {
            // Error is handled in context
        } finally {
            setConfirmDelete({ open: false, id: null, name: '' });
        }
    };

    // Derived unique tags (defensively parse stringified JSON if needed)
    const allTags = Array.from(new Set(subjects.flatMap(s => {
        let t = s.tags || [];
        if (typeof t === 'string') {
            try { t = JSON.parse(t); } catch { t = []; }
        }
        return Array.isArray(t) ? t : [];
    }))).sort();

    return (
        <div className="fade-in max-w-6xl mx-auto">
            {/* Custom Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDelete.open}
                title="Delete Subject"
                message={`Are you sure you want to delete "${confirmDelete.name}"? This will permanently remove all topics, sessions, and performance data associated with it.`}
                confirmText="Delete Subject"
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ open: false, id: null, name: '' })}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <LibraryBig className="w-5 h-5 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest text-primary uppercase">Library</span>
                    </div>
                    <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Subjects</h1>
                    <p className="text-slate-400 text-sm mt-1.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} in your library</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center items-stretch gap-3 md:gap-4 w-full sm:w-auto">
                    {allTags.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedTag}
                                onChange={(e) => setSelectedTag(e.target.value)}
                                className="w-full sm:w-auto bg-surface-2/50 border border-white/[0.08] text-slate-200 rounded-xl px-4 py-2.5 sm:py-2 text-[13px] focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all appearance-none cursor-pointer pr-10 hover:border-white/[0.15]"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(148, 163, 184, 1)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundSize: '1em'
                                }}
                            >
                                <option value="">All Tags</option>
                                {allTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="relative group flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter subjects..."
                            className="bg-surface-2/50 border border-white/[0.08] rounded-xl py-2.5 sm:py-2 pl-10 pr-4 text-[13px] text-white w-full sm:w-[200px] md:w-[240px] focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setShowModal(true);
                        }}
                        className="btn-primary flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                        <PlusCircle className="w-4 h-4" /> <span>New Subject</span>
                    </button>
                </div>
            </div>

            <SubjectModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                editingSubject={editingSubject}
                onSubjectSaved={handleSubjectSaved}
                existingTags={allTags}
            />



            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="glass p-8 animate-pulse h-[160px] rounded-xl border-white/5" />
                    ))}
                </div>
            ) : subjects.length === 0 ? (
                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-primary/20 w-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 pulse-ring">
                        <BookOpen className="w-10 h-10 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No subjects yet</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                        Create your first subject to start building your knowledge tree and tracking performance.
                    </p>
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setShowModal(true);
                        }}
                        className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Create Subject</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjects
                        .filter(s => {
                            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase());
                            let sTags = s.tags || [];
                            if (typeof sTags === 'string') {
                                try { sTags = JSON.parse(sTags); } catch { sTags = []; }
                            }
                            sTags = Array.isArray(sTags) ? sTags : [];

                            const matchesTag = selectedTag ? sTags.includes(selectedTag) : true;
                            return matchesSearch && matchesTag;
                        })
                        .map((s) => (
                            <SubjectCard
                                key={s.id}
                                subject={s}
                                stats={statsMap[s.id]}
                                onEdit={handleEditClick}
                                onDelete={(subj) => setConfirmDelete({ open: true, id: subj.id, name: subj.name })}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

export default Subjects;

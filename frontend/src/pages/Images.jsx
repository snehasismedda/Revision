import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { imagesApi, subjectsApi } from '../api/index.js';
import { Image as ImageIcon, PlusCircle, Search, X, Calendar, Activity, Maximize2, Link as LinkIcon, ChevronDown, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import AddImageModal from '../components/modals/AddImageModal.jsx';
import ViewNoteModal from '../components/modals/ViewNoteModal.jsx';

const Images = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 20;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('all');
    const [subjects, setSubjects] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        loadImages(page === 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            const res = await subjectsApi.list();
            setSubjects(res.subjects || []);
        } catch (error) {
            console.error('Failed to load subjects:', error);
        }
    };

    const loadImages = async (isFirstLoad) => {
        if (isFirstLoad) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await imagesApi.list(LIMIT, page * LIMIT);
            const newImages = res.images || [];

            setHasMore(newImages.length === LIMIT);

            if (isFirstLoad) {
                setImages(newImages);
            } else {
                setImages(prev => [...prev, ...newImages]);
            }
        } catch {
            toast.error('Failed to load images');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleImageSaved = () => {
        if (page === 0) loadImages(true);
        else setPage(0);
    };

    const observer = React.useRef();
    const lastImageElementRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        }, {
            rootMargin: '400px', // Pre-load when 400px from viewport
            threshold: 0
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const filteredImages = images.filter(img => {
        const matchesSearch =
            img.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            new Date(img.created_at).toLocaleDateString().includes(searchQuery);
        const matchesSubject = selectedSubjectId === 'all' || img.subject_id?.toString() === selectedSubjectId;
        return matchesSearch && matchesSubject;
    });

    // Grouping logic
    const groupImagesByDate = (imgs) => {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        imgs.forEach(img => {
            const date = new Date(img.created_at);
            date.setHours(0, 0, 0, 0);

            let groupName = '';
            if (date.getTime() === today.getTime()) groupName = 'Today';
            else if (date.getTime() === yesterday.getTime()) groupName = 'Yesterday';
            else if (date.getTime() >= lastWeek.getTime()) groupName = 'Last 7 Days';
            else groupName = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(img);
        });

        // Convert to sorted array of [groupName, images]
        // We assume imgs is already sorted by created_at desc from API
        return Object.entries(groups);
    };

    const groupedImages = groupImagesByDate(filteredImages);

    const handlePrev = useCallback(() => {
        if (!selectedImage) return;
        const idx = filteredImages.findIndex(img => img.id === selectedImage.id);
        if (idx > 0) setSelectedImage(filteredImages[idx - 1]);
    }, [selectedImage, filteredImages]);

    const handleNext = useCallback(() => {
        if (!selectedImage) return;
        const idx = filteredImages.findIndex(img => img.id === selectedImage.id);
        if (idx < filteredImages.length - 1) setSelectedImage(filteredImages[idx + 1]);
    }, [selectedImage, filteredImages]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedImage) return;
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') setSelectedImage(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, handlePrev, handleNext]);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto animate-pulse px-4 md:px-0">
                <div className="h-10 bg-surface-2 rounded-lg w-48 mb-8" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <div key={i} className="aspect-square bg-surface-2 rounded-xl border border-white/[0.06]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto pb-20 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <span className="text-[11px] font-bold tracking-widest text-primary uppercase">Library</span>
                    </div>
                    <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Image Gallery</h1>
                    <p className="text-slate-400 text-sm mt-1.5">{images.length} captured resource{images.length !== 1 ? 's' : ''} in your library</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find images..."
                            className="bg-surface-2/50 border border-white/[0.08] rounded-xl py-2 pl-10 pr-4 text-[13px] text-white w-full md:w-[240px] focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all"
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

                    <div className="relative group/sel min-w-[160px]">
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-200 rounded-xl px-4 py-2 text-[13px] focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all appearance-none cursor-pointer pr-10 hover:border-white/[0.15]"
                            style={{
                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(148, 163, 184, 1)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.75rem center',
                                backgroundSize: '1em'
                            }}
                        >
                            <option value="all">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id.toString()}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer grow md:grow-0 justify-center"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Upload Capture</span>
                    </button>
                </div>
            </div>

            {filteredImages.length === 0 ? (
                <div className="glass-panel rounded-xl p-16 text-center border-dashed border-primary/20 w-full relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 pulse-ring">
                        <ImageIcon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No images found</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                        {searchQuery || selectedSubjectId !== 'all'
                            ? "We couldn't find any images matching your current filters. Try resetting them."
                            : "Your captured materials will appear here once you upload them."}
                    </p>
                    <button
                        onClick={() => {
                            if (searchQuery || selectedSubjectId !== 'all') {
                                setSearchQuery('');
                                setSelectedSubjectId('all');
                            } else {
                                setShowAddModal(true);
                            }
                        }}
                        className="btn-primary flex items-center gap-2 mx-auto px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>{searchQuery || selectedSubjectId !== 'all' ? "Reset Filters" : "Upload First Material"}</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedImages.map(([dateGroup, groupImgs]) => (
                        <div key={dateGroup} className="relative">
                            <div className="sticky top-0 z-30 pt-4 pb-6 bg-surface mb-2">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
                                        {dateGroup}
                                        <span className="text-[11px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{groupImgs.length}</span>
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {groupImgs.map((img) => {
                                    const isLastElement = img.id === images[images.length - 1]?.id;
                                    const hasLink = img.linked_question_id || img.linked_note_id;

                                    return (
                                        <motion.div
                                            key={img.id}
                                            ref={isLastElement ? lastImageElementRef : null}
                                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: (groupImgs.indexOf(img) % 10) * 0.05 }}
                                            className="group relative aspect-square rounded-xl overflow-hidden bg-surface-2 border border-white/[0.04] hover:border-primary/40 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
                                            onClick={() => setSelectedImage(img)}
                                        >
                                            <img
                                                src={img.data}
                                                alt={img.subject_name}
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                                loading="lazy"
                                            />

                                            {/* Indicators */}
                                            {hasLink && (
                                                <div className="absolute top-2 left-2 flex gap-1 z-20">
                                                    {img.linked_question_id && (
                                                        <div className="p-1.5 rounded-lg bg-indigo-500/80 text-white border border-white/10 shadow-lg" title="Linked to Question">
                                                            <Activity className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    {img.linked_note_id && (
                                                        <div className="p-1.5 rounded-lg bg-emerald-500/80 text-white border border-white/10 shadow-lg" title="Linked to Note">
                                                            <FileText className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/subjects/${img.subject_id}`);
                                                        }}
                                                        className="text-[10px] font-bold text-primary uppercase tracking-wider hover:text-primary-light transition-colors cursor-pointer text-left"
                                                    >
                                                        {img.subject_name}
                                                    </button>
                                                    {hasLink && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const tab = img.linked_question_id ? 'questions' : 'notes';
                                                                const contentId = img.linked_question_id || img.linked_note_id;
                                                                navigate(`/subjects/${img.subject_id}?tab=${tab}&id=${contentId}`);
                                                            }}
                                                            className="p-1.5 bg-primary/20 hover:bg-primary text-white rounded-lg border border-primary/30 transition-all cursor-pointer"
                                                            title={img.linked_question_id ? "View Question" : "View Note"}
                                                        >
                                                            <LinkIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[11px] font-semibold text-white truncate">
                                                        {new Date(img.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                    </p>
                                                    <Maximize2 className="w-3 h-3 text-white/60" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AddImageModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onImageSaved={handleImageSaved}
            />

            {loadingMore && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-12 pb-10">
                    {[...Array(5)].map((_, i) => (
                        <div key={`skeleton-${i}`} className="aspect-square rounded-xl bg-surface-2/40 border border-white/[0.04] animate-pulse overflow-hidden">
                            <div className="w-full h-full bg-primary/5" />
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox / Detail View */}
            <ViewNoteModal
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                note={selectedImage ? {
                    id: `img-${selectedImage.id}`,
                    title: selectedImage.subject_name + ' Source',
                    content: 'Original captured material.',
                    source_image_id: selectedImage.id,
                    created_at: selectedImage.created_at,
                    question_id: selectedImage.linked_question_id || selectedImage.linked_note_id,
                    is_note_link: !!selectedImage.linked_note_id
                } : null}
                onNavigateToQuestion={(id) => {
                    const tab = selectedImage.linked_question_id ? 'questions' : 'notes';
                    const contentId = selectedImage.linked_question_id || selectedImage.linked_note_id;
                    navigate(`/subjects/${selectedImage.subject_id}?tab=${tab}&id=${contentId}`);
                }}
                sourceImage={selectedImage ? selectedImage.data : null}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    );
};

export default Images;

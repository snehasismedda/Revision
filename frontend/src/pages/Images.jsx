import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { imagesApi } from '../api/index.js';
import { Image as ImageIcon, PlusCircle, Search, X, Calendar, Activity, Maximize2, Link as LinkIcon } from 'lucide-react';
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
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        loadImages(page === 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

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
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const filteredImages = images.filter(img =>
        img.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(img.created_at).toLocaleDateString().includes(searchQuery)
    );

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
            <div className="max-w-6xl mx-auto animate-pulse">
                <div className="h-10 bg-surface-2 rounded-lg w-48 mb-8" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-square bg-surface-2 rounded-2xl border border-white/[0.06]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in max-w-6xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-[28px] font-heading font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                        <ImageIcon className="w-8 h-8 text-primary" />
                        My Images
                    </h1>
                    <p className="text-slate-500 text-sm">All uploaded educational materials across your subjects.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by subject or date..."
                            className="w-full bg-surface-2/50 border border-white/[0.1] rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-white focus:outline-none focus:border-primary/40 focus:bg-surface-2 transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-primary/20 active:scale-95 cursor-pointer"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Add Image</span>
                    </button>
                </div>
            </div>

            {filteredImages.length === 0 ? (
                <div className="glass-panel p-20 text-center rounded-3xl border-dashed border-white/10 max-w-2xl mx-auto mt-12 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-3xl bg-surface-3 flex items-center justify-center mb-8 shadow-inner border border-white/5 rotate-6">
                        <ImageIcon className="w-12 h-12 text-slate-600" />
                    </div>
                    <h3 className="text-2xl font-heading font-bold text-white mb-3 tracking-tight">No images found</h3>
                    <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-sm mx-auto">
                        {searchQuery ? "No images match your search criteria. Try a different subject or date." : "You haven't uploaded any study materials yet. Upload images to generate notes and questions automatically."}
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2 text-sm font-semibold px-8 py-3.5 rounded-xl transition-all shadow-xl hover:shadow-primary/30"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Upload Your First Image</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {filteredImages.map((img, index) => {
                        const isLastElement = index === filteredImages.length - 1;
                        return (
                            <div
                                key={img.id}
                                ref={isLastElement ? lastImageElementRef : null}
                                className="group relative aspect-square rounded-2xl overflow-hidden bg-surface-2 border border-white/[0.06] hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                            >
                                {/* Source Indicator Button */}
                                {(img.linked_question_id || img.linked_note_id) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (img.linked_question_id) {
                                                navigate(`/subjects/${img.subject_id}?tab=questions`);
                                            } else if (img.linked_note_id) {
                                                navigate(`/subjects/${img.subject_id}?tab=notes`);
                                            }
                                        }}
                                        className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-xl text-indigo-400 border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-all shadow-2xl z-20 hover:scale-110 active:scale-95 hover:bg-indigo-500/20 cursor-pointer"
                                        title="View Linked Content"
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                <img
                                    src={img.data}
                                    alt={img.subject_name}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-bold text-white/70 flex items-center gap-1.5">
                                            <Activity className="w-3 h-3 text-indigo-400" />
                                            {new Date(img.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            {img.linked_question_id && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Question</span>}
                                            {img.linked_note_id && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Note</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-bold text-slate-300 truncate w-full">{img.subject_name}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImage(img);
                                        }}
                                        className="w-full py-2 bg-white text-black text-[12px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 cursor-pointer"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                        View Full
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AddImageModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onImageSaved={handleImageSaved}
            />

            {loadingMore && (
                <div className="flex justify-center mt-8 mb-4">
                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Lightbox replaced with ViewNoteModal */}
            <ViewNoteModal
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                note={selectedImage ? {
                    id: `img-${selectedImage.id}`,
                    title: selectedImage.subject_name + ' Source',
                    content: 'Original captured material.',
                    source_image_id: selectedImage.id,
                    created_at: selectedImage.created_at,
                    question_id: selectedImage.linked_question_id
                } : null}
                onNavigateToQuestion={() => {
                    navigate(`/subjects/${selectedImage.subject_id}?tab=questions`);
                }}
                sourceImage={selectedImage ? selectedImage.data : null}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    );
};

export default Images;

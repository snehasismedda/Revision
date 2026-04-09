import React, { useState, useEffect } from 'react';
import { useQuickView } from '../context/QuickViewContext.jsx';
import { X, Eye, EyeOff, FileText, Image as ImageIcon, CornerUpRight, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const QuickViewBar = () => {
    const { minimizedItems, restoreMinimized, closeMinimized, clearAll } = useQuickView();
    const [isOpen, setIsOpen] = useState(false);

    // Auto-close list if empty
    useEffect(() => {
        if (minimizedItems.length === 0) setIsOpen(false);
    }, [minimizedItems.length]);

    if (minimizedItems.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[300] flex flex-col items-end gap-2.5">
            {/* Vertical List Drawer */}
            {isOpen && (
                <div
                    className="flex flex-col gap-2 min-w-[240px] max-w-[300px] max-h-[75vh] overflow-y-auto no-scrollbar pb-1 animate-in slide-in-from-bottom-5 fade-in duration-400 z-[301]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Clear All Header */}
                    <div className="flex justify-end mb-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearAll();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                        >
                            Clear All Items
                        </button>
                    </div>

                    {minimizedItems.map((item, index) => (
                        <div
                            key={`${item.type}-${item.id}`}
                            className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-[#12121e] border border-white/[0.05] hover:border-indigo-500/30 hover:bg-[#181825] transition-all cursor-pointer shadow-lg overflow-hidden"
                            onClick={(e) => {
                                e.stopPropagation();
                                restoreMinimized(index);
                                setIsOpen(false);
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-white/[0.03] ${(item.type === 'file' && item.data?.file_type?.toLowerCase() === 'pdf') ? 'bg-rose-500/10 text-rose-400' :
                                    item.type === 'file' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                {(item.type === 'file' && item.data?.file_type?.toLowerCase() === 'pdf') ? <FileText size={14} /> :
                                    item.type === 'file' ? <ImageIcon size={14} /> :
                                        <FileText size={14} />}
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 pr-6">
                                <span className="text-[11px] font-bold text-white/80 tracking-tight truncate leading-tight">
                                    {item.title || 'Untitled'}
                                </span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeMinimized(index);
                                }}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center bg-white/0 hover:bg-rose-500/20 text-white/[0.15] hover:text-rose-400 transition-all z-20"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* The Trigger Icon */}
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border ${isOpen
                            ? 'bg-indigo-600 border-indigo-400 text-white scale-90'
                            : 'bg-[#12121e] border-white/10 text-indigo-400 hover:scale-110 hover:border-indigo-500/50'
                        }`}
                >
                    {isOpen ? <X size={20} strokeWidth={2.5} /> : <EyeOff size={20} strokeWidth={2.5} />}
                </button>

                {/* Count Badge */}
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border-2 border-[#0f0f1a] flex items-center justify-center text-[9px] font-black text-white shadow-lg animate-in zoom-in-50 duration-300">
                        {minimizedItems.length}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuickViewBar;

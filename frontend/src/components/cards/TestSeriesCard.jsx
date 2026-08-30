import React from 'react';
import { Trophy, BookOpen, Activity, Edit2, Trash2, ArrowUpRight } from 'lucide-react';

/**
 * TestSeriesCard
 *
 * Props:
 *   series   – { id, name, description, testCount, subjects[] }
 *   onClick  – (series) => void  (navigate to detail)
 *   onEdit   – optional (e, series) => void  (show on hover when provided)
 *   onDelete – optional (e, series) => void  (show on hover when provided)
 */
const TestSeriesCard = ({ series, onClick, onEdit, onDelete }) => {
    const hasActions = onEdit || onDelete;

    return (
        <div
            onClick={() => onClick?.(series)}
            className="group relative bg-surface-2 border border-border rounded-3xl overflow-hidden cursor-pointer flex flex-col transition-all duration-300 hover:border-pink-500/30 hover:shadow-xl hover:shadow-pink-500/5"
        >
            {/* Hover glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(236,72,153,0.06) 0%, transparent 70%)' }}
            />

            <div className="flex flex-col flex-1 p-6">
                {/* Top row: Name + badge + actions */}
                <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="p-1.5 rounded-lg border shrink-0 bg-pink-500/10 border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform duration-300">
                                <Trophy className="w-3.5 h-3.5" strokeWidth={2.2} />
                            </div>
                            <h3 className="text-[15px] font-heading font-semibold text-text group-hover:text-pink-400 transition-colors truncate tracking-tight leading-tight">
                                {series.name}
                            </h3>
                        </div>
                        {series.description && (
                            <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mt-1 ml-[30px]">
                                {series.description}
                            </p>
                        )}
                    </div>

                    {/* Edit / Delete — visible on hover */}
                    {hasActions && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(e, series); }}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-pink-400 hover:bg-pink-500/10 transition-all"
                                    title="Edit Series"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(e, series); }}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Delete Series"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mx-6 mb-5 pt-4 border-t border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-pink-400" strokeWidth={2} />
                        <span>{series.testCount || 0} Tests</span>
                    </div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-purple-400" strokeWidth={2} />
                        <span>{series.subjects?.length || 0} Subjects</span>
                    </div>
                </div>
                <div className="w-7 h-7 rounded-full border border-border bg-surface-3 flex items-center justify-center transition-all duration-300 group-hover:bg-pink-500 group-hover:border-pink-500">
                    <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors duration-300" />
                </div>
            </div>
        </div>
    );
};

export default TestSeriesCard;

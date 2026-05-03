import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PerformanceBadge from './PerformanceBadge.jsx';
import { BookMarked, BrainCircuit, Activity, Trash2, Edit2, FileText, MoreVertical, Archive } from 'lucide-react';

const SubjectCard = ({ subject, stats, variant, onEdit, onDelete, onArchive }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const accuracy = stats?.accuracy ?? null;
    const totalQ = stats?.totalQuestions ?? 0;
    const totalCorrect = stats?.totalCorrect ?? 0;
    const pct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    const isAttention = variant === 'attention';

    let tags = subject.tags || [];
    if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch { tags = []; }
    }
    tags = Array.isArray(tags) ? tags : [];

    return (
        <div
            onClick={() => navigate(`/subjects/${subject.id}`, { state: { subject, stats } })}
            className={`glass-panel rounded-2xl border border-border p-5 cursor-pointer group flex flex-col justify-between transition-all !overflow-visible
                ${isAttention ? 'border-amber-500/15 hover:border-amber-500/30' : ''}`}
            style={{ minHeight: '140px' }}
        >
            {/* Top: Name + badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className={`p-1.5 rounded-lg border shrink-0 ${isAttention ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                            <BookMarked className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[15px] font-heading font-semibold text-text group-hover:text-primary-light transition-colors truncate tracking-tight leading-tight">
                            {subject.name}
                        </h3>
                    </div>
                    {subject.description && (
                        <p className="text-[11px] text-text-muted line-clamp-1 leading-relaxed mt-1 ml-[30px]">{subject.description}</p>
                    )}
                </div>
                {(accuracy != null || totalQ > 0) && (
                    <div className="shrink-0 transform group-hover:scale-105 transition-transform duration-300 origin-top-right">
                        <PerformanceBadge accuracy={totalQ > 0 ? (accuracy ?? 0) : null} />
                    </div>
                )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 px-1 mt-1">
                    {tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 rounded">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            {totalQ > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] font-medium text-text-muted mb-1.5">
                        <span>Accuracy</span>
                        <span className="text-text-muted font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-3/40 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer: stats + Actions */}
            <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] font-medium text-text-muted">
                    <div className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-text-muted" strokeWidth={2} />
                        <span>{(stats?.totalSessions ?? 0) + (stats?.totalRevisionSessions ?? 0)} sessions</span>
                    </div>
                    <div className="h-2.5 w-px bg-surface-3/20" />
                    <div className="flex items-center gap-1.5">
                        <BrainCircuit className="w-3 h-3 text-text-muted" strokeWidth={2} />
                        <span>{stats?.availableQuestions ?? (stats?.totalQuestions ?? 0)} Qs</span>
                    </div>
                    <div className="h-2.5 w-px bg-surface-3/20" />
                    <div className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-text-muted" strokeWidth={2} />
                        <span>{stats?.totalNotes ?? 0} notes</span>
                    </div>
                </div>

                {(onEdit || onDelete) && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center
                                ${showMenu ? 'bg-surface-3/20 text-primary' : 'text-text-muted text-text hover:bg-surface-3/10 opacity-0 group-hover:opacity-100'}`}
                            title="Options"
                        >
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {showMenu && (
                            <div
                                className="absolute right-0 bottom-full mb-2 w-36 bg-surface-2 rounded-xl border border-border shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(false);
                                            onEdit(subject);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-text-muted text-text hover:bg-surface-3/20 transition-colors text-left"
                                    >
                                        <Edit2 className="w-3 h-3 text-blue-400" />
                                        <span>Edit Subject</span>
                                    </button>
                                )}
                                {onArchive && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(false);
                                            onArchive(subject, !subject.is_archived);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-text-muted text-text hover:bg-surface-3/20 transition-colors text-left"
                                    >
                                        <Archive className={`w-3 h-3 ${subject.is_archived ? 'text-emerald-400 [.light_&]:text-emerald-600' : 'text-amber-400'}`} />
                                        <span>{subject.is_archived ? 'Restore Subject' : 'Add to Archive'}</span>
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowMenu(false);
                                            onDelete(subject);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-semibold text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                    >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                        <span>Delete Subject</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubjectCard;

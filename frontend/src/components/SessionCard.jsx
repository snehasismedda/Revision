import { useNavigate } from 'react-router-dom';
import { Calendar, Target, CheckCircle2, XCircle, Trash2, Pencil, FileText, BarChart3, Tags, ArrowRight } from 'lucide-react';

/* ── Circular Progress Ring ──────────────────────────── */
const ProgressRing = ({ value, size = 44, stroke = 3.5 }) => {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    const color = value >= 75 ? '#34d399' : value >= 50 ? '#fbbf24' : '#f87171';

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-heading font-bold text-white">{value}%</span>
            </div>
        </div>
    );
};

const SessionCard = ({ subjectId, session, onDelete, onEdit }) => {
    const navigate = useNavigate();

    const totalQ = session.totalQuestions || 0;
    const correct = session.totalCorrect || 0;
    const incorrect = session.totalIncorrect || 0;
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

    return (
        <div
            className="group relative overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{
                background: 'rgba(22, 22, 34, 0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={() => navigate(`/subjects/${subjectId}/sessions/${session.id}`)}
        >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />


            {/* Card Body */}
            <div className="p-5">
                {/* Top row: Title + Ring */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-heading font-semibold text-white tracking-tight text-[15px] truncate group-hover:text-primary-light transition-colors">
                            {session.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(session.sessionDate).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                            <div className="w-px h-3 bg-white/10" />
                            <span className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-slate-400" />
                                {totalQ} Qs
                            </span>
                        </div>
                    </div>

                    {/* Accuracy ring — only show if there are questions */}
                    {totalQ > 0 && (
                        <ProgressRing value={accuracy} />
                    )}
                </div>

                {/* Notes: compact single line */}
                {session.notes && (
                    <div className="flex items-center gap-1.5 mb-3">
                        <FileText className="w-3 h-3 text-slate-600 shrink-0" />
                        <p className="text-[11px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">{session.notes}</p>
                    </div>
                )}

                {/* Stats row */}
                {totalQ > 0 ? (
                    <div className="flex items-center gap-2 mb-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> {correct} correct
                        </span>
                        {incorrect > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
                                <XCircle className="w-3 h-3" /> {incorrect} wrong
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="py-1.5 px-3 bg-white/[0.02] rounded-lg border border-white/[0.05] border-dashed">
                        <p className="text-[10px] text-slate-600 text-center font-medium uppercase tracking-widest">No entries yet</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/subjects/${subjectId}/sessions/${session.id}`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer"
                >
                    <BarChart3 className="w-3 h-3 text-indigo-400" />
                    <span>Analytics</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/subjects/${subjectId}/sessions/${session.id}/tag`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-primary hover:text-white hover:bg-primary/15 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
                >
                    <Tags className="w-3 h-3" />
                    <span>Tag Topics</span>
                </button>
                <div className="flex-1" />
                {/* Edit & Delete — right side, hover visible */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(session); }}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                            title="Edit"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(session); }}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionCard;

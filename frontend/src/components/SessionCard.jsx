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

const SessionCard = ({ subjectId, session, onDelete, onEdit, viewMode = 'grid' }) => {
    const navigate = useNavigate();

    const totalQ = session.totalQuestions || 0;
    const correct = session.totalCorrect || 0;
    const incorrect = session.totalIncorrect || 0;
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

    const isList = viewMode === 'list';

    return (
        <div
            className={`group relative overflow-hidden rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer ${isList ? 'flex items-center gap-4 py-2 pr-5 pl-1' : 'flex flex-col'}`}
            style={{
                background: 'rgba(22, 22, 34, 0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={() => navigate(`/subjects/${subjectId}/sessions/${session.id}`)}
        >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* List mode progress line/indicator */}
            {isList && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: totalQ > 0 ? (accuracy >= 75 ? '#34d399' : accuracy >= 50 ? '#fbbf24' : '#f87171') : 'rgba(255,255,255,0.1)' }}
                />
            )}

            {/* Card Body */}
            <div className={`p-5 flex-1 min-w-0 ${isList ? 'py-4 flex items-center justify-between gap-6' : ''}`}>
                {/* Info Section */}
                <div className={`flex-1 min-w-0 ${isList ? 'flex items-center gap-6' : ''}`}>
                    {/* Title and Date */}
                    <div className="min-w-0 shrink-0" style={isList ? { width: '40%' } : {}}>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-heading font-semibold text-white tracking-tight text-[15px] truncate group-hover:text-primary-light transition-colors">
                                {session.title}
                            </h4>
                            {session.testId && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[9px] font-bold uppercase tracking-wider border border-pink-500/20">
                                    Test Attempt
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-500">
                            <span className="flex items-center gap-1.5 shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(session.sessionDate).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                            <div className="w-px h-3 bg-white/10" />
                            <span className="flex items-center gap-1.5 shrink-0">
                                <Target className="w-3.5 h-3.5 text-slate-400" />
                                {totalQ} Qs
                            </span>
                        </div>
                    </div>

                    {/* Stats row - more compact in list mode */}
                    <div className={`min-w-0 ${isList ? 'flex-1 flex items-center gap-6' : 'mt-4 flex items-center gap-2'}`}>
                        {totalQ > 0 ? (
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md ${isList ? 'hidden md:inline-flex' : ''}`}>
                                    <CheckCircle2 className="w-3 h-3" /> {correct} correct
                                </span>
                                {isList && <span className="text-emerald-400 font-bold text-[12px] md:hidden">{correct}✔</span>}
                                {incorrect > 0 && (
                                    <>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-1 rounded-md ${isList ? 'hidden md:inline-flex' : ''}`}>
                                            <XCircle className="w-3 h-3" /> {incorrect} wrong
                                        </span>
                                        {isList && <span className="text-red-400 font-bold text-[12px] md:hidden">{incorrect}✖</span>}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className={`py-1 py-1.5 px-3 bg-white/[0.02] rounded-lg border border-white/[0.05] border-dashed shrink-0 ${isList ? 'hidden sm:block' : ''}`}>
                                <p className="text-[10px] text-slate-600 text-center font-medium uppercase tracking-widest">No entries yet</p>
                            </div>
                        )}

                        {/* Notes: only show if space allows or in grid */}
                        {session.notes && (
                            <div className={`flex items-center gap-1.5 min-w-0 ${isList ? 'flex-1 hidden lg:flex' : 'mb-3 mt-3'}`}>
                                <FileText className="w-3 h-3 text-slate-600 shrink-0" />
                                <p className="text-[11px] text-slate-500 truncate group-hover:text-slate-400 transition-colors">{session.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Section (Accuracy + Actions in Grid, just Accuracy in List inner flex) */}
                <div className={`flex items-center gap-4 shrink-0 ${isList ? '' : 'hidden'}`}>
                    {totalQ > 0 && (
                        <ProgressRing value={accuracy} size={isList ? 38 : 44} />
                    )}
                </div>

                {/* Accuracy ring — Grid only (positioned absolutely or top-right) */}
                {!isList && totalQ > 0 && (
                    <div className="absolute right-5 top-5">
                        <ProgressRing value={accuracy} />
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className={`px-5 py-3 flex items-center gap-2 ${isList ? 'shrink-0 py-0 border-t-0 border-l border-white/[0.06]' : 'border-t border-white/[0.06]'}`}>
                <div className={`flex items-center gap-2 ${isList ? 'flex-col sm:flex-row' : ''}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/subjects/${subjectId}/sessions/${session.id}`); }}
                        className={`flex items-center gap-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer ${isList ? 'p-1.5 sm:px-3 sm:py-1.5' : 'px-3 py-1.5'}`}
                        title="Analytics"
                    >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span className={isList ? 'hidden sm:inline' : ''}>Analytics</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/subjects/${subjectId}/sessions/${session.id}/tag`); }}
                        className={`flex items-center gap-1.5 rounded-lg text-[11px] font-semibold text-primary hover:text-white hover:bg-primary/15 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer ${isList ? 'p-1.5 sm:px-3 sm:py-1.5' : 'px-3 py-1.5'}`}
                        title="Tag Topics"
                    >
                        <Tags className="w-3.5 h-3.5" />
                        <span className={isList ? 'hidden sm:inline' : ''}>Tag Topics</span>
                    </button>
                </div>

                {!isList && <div className="flex-1" />}

                {/* Actions Section */}
                <div className={`flex items-center gap-1 ${isList ? 'flex-col sm:flex-row' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
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

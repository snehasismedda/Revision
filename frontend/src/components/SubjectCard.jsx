import { useNavigate } from 'react-router-dom';
import PerformanceBadge from './PerformanceBadge.jsx';
import { BookMarked, BrainCircuit, ActivitySquare, ArrowRight, Clock } from 'lucide-react';

const SubjectCard = ({ subject, stats, variant }) => {
    const navigate = useNavigate();

    const accuracy = stats?.accuracy ?? null;
    const totalQ = stats?.totalQuestions ?? 0;
    const totalCorrect = stats?.totalCorrect ?? 0;
    const pct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    const isAttention = variant === 'attention';

    return (
        <div
            onClick={() => navigate(`/subjects/${subject.id}`)}
            className={`glass-card glass p-5 cursor-pointer group flex flex-col justify-between transition-all
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
                        <h3 className="text-[15px] font-heading font-semibold text-slate-100 group-hover:text-primary-light transition-colors truncate tracking-tight leading-tight">
                            {subject.name}
                        </h3>
                    </div>
                    {subject.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed mt-1 ml-[30px]">{subject.description}</p>
                    )}
                </div>
                {accuracy != null && (
                    <div className="shrink-0 transform group-hover:scale-105 transition-transform duration-300 origin-top-right">
                        <PerformanceBadge accuracy={accuracy} />
                    </div>
                )}
            </div>

            {/* Progress bar */}
            {totalQ > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 mb-1.5">
                        <span>Progress</span>
                        <span className="text-slate-400 font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer: stats + CTA */}
            <div className="mt-auto pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <ActivitySquare className="w-3 h-3 text-slate-400" strokeWidth={2} />
                        <span>{stats?.totalSessions ?? 0} sessions</span>
                    </div>
                    <div className="h-2.5 w-px bg-white/10" />
                    <div className="flex items-center gap-1.5">
                        <BrainCircuit className="w-3 h-3 text-slate-400" strokeWidth={2} />
                        <span>{totalQ} Qs</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
    );
};

export default SubjectCard;

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

/* ── Mini sparkline progress bar ──────────────────────────────── */
export const MiniProgressBar = ({ value, max, colorClass = 'bg-primary' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-surface-3/10 rounded-full overflow-hidden mt-3">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

/**
 * StatCard
 *
 * Props:
 *   label, value, sub        – display text
 *   icon                     – lucide icon component
 *   colorClass               – tailwind text-* color for icon container
 *   delayClass               – stagger animation class (e.g. 'stagger-2')
 *   trend                    – string like '+12%' | '--' | '-5%'
 *   progressValue / progressMax / progressColor – optional progress bar
 *   className                – extra classes for the outer div
 */
const StatCard = ({
    label, value, sub,
    icon: Icon,
    colorClass,
    delayClass,
    trend,
    progressValue, progressMax, progressColor,
    className = ''
}) => (
    <div className={`bg-surface-2 border border-border p-5 min-h-[140px] flex flex-col justify-between fade-in ${delayClass} relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 rounded-2xl ${className}`}>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-2.5 rounded-xl border border-border bg-surface-3/10 shadow-inner ${colorClass}`}>
                <Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            {trend && (
                <div className={`flex items-center gap-0.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    trend.startsWith('+')
                        ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                        : trend === '--'
                            ? 'text-text-muted bg-surface-3/20 border border-border'
                            : 'text-rose-600 bg-rose-500/10 border border-rose-500/20'
                }`}>
                    {trend !== '--' && <ArrowUpRight className="w-3 h-3" />}
                    {trend}
                </div>
            )}
        </div>

        <div className="relative z-10">
            <p className="text-3xl font-heading font-black text-text tracking-tight leading-none">{value}</p>
            <p className="text-[13px] font-bold text-text-muted mt-2">{label}</p>
            {sub && <p className="text-[10px] font-bold text-text-muted/60 mt-1.5 uppercase tracking-widest">{sub}</p>}
            {progressValue != null && progressMax != null && (
                <MiniProgressBar value={progressValue} max={progressMax} colorClass={progressColor || 'bg-primary'} />
            )}
        </div>

        {/* Subtle glow on hover */}
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none ${
            colorClass?.includes('text-primary')  ? 'bg-primary'     :
            colorClass?.includes('text-pink')     ? 'bg-pink-500'    :
            colorClass?.includes('text-blue')     ? 'bg-blue-400'    : 'bg-purple-400'
        }`} />
    </div>
);

export default StatCard;

import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

const PerformanceBadge = ({ accuracy }) => {
    if (accuracy == null) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/15 shadow-sm">
                <HelpCircle className="w-4 h-4" />
                New
            </span>
        );
    }

    const num = Number(accuracy);

    if (num >= 75) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                <CheckCircle2 className="w-4 h-4" />
                {num.toFixed(0)}%
            </span>
        );
    }

    if (num >= 50) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
                <AlertTriangle className="w-4 h-4 -mt-px" />
                {num.toFixed(0)}%
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]">
            <AlertTriangle className="w-4 h-4 -mt-px" />
            {num.toFixed(0)}%
        </span>
    );
};

export default PerformanceBadge;

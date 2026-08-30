import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const TAG_COLORS = {
    'Utility':    'bg-sky-500/10 text-sky-400 border-sky-500/20',
    'AI Powered': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const ToolCard = ({ tool, onClick }) => {
    const Icon = tool.icon;

    return (
        <div
            onClick={() => tool.isActive && onClick(tool)}
            className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col ${
                tool.isActive
                    ? 'border-border hover:border-primary/40 cursor-pointer hover:shadow-xl hover:shadow-primary/5 bg-surface-2'
                    : 'border-border/50 cursor-not-allowed opacity-60 bg-surface-2'
            }`}
        >
            {/* Gradient glow on hover */}
            {tool.isActive && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
                    style={{ background: 'radial-gradient(ellipse at top left, var(--color-primary-rgb, rgba(99,102,241,0.06)) 0%, transparent 70%)' }}
                />
            )}

            {/* Card body */}
            <div className="flex flex-col flex-1 p-6">

                {/* Top row: icon + tag + status */}
                <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 ${
                        tool.isActive
                            ? 'bg-primary/10 border border-primary/20 text-primary group-hover:scale-110'
                            : 'bg-surface-3 border border-border text-text-muted'
                    }`}>
                        <Icon className="w-5 h-5" strokeWidth={2} />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status dot */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-3 border border-border">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                tool.isActive
                                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse'
                                    : 'bg-red-400/60'
                            }`} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                                {tool.isActive ? 'Live' : 'Soon'}
                            </span>
                        </div>

                        {/* Tag */}
                        {tool.tag && (
                            <span className={`px-2 py-1 text-[9px] font-black tracking-widest uppercase rounded-lg border ${TAG_COLORS[tool.tag] || 'bg-surface-3 text-text-muted border-border'}`}>
                                {tool.tag}
                            </span>
                        )}
                    </div>
                </div>

                {/* Name + description */}
                <h3 className={`text-[16px] font-bold tracking-tight mb-1.5 transition-colors duration-200 ${
                    tool.isActive ? 'text-text group-hover:text-primary' : 'text-text-muted'
                }`}>
                    {tool.name}
                </h3>

                {tool.description && (
                    <p className="text-[12px] text-text-muted leading-relaxed line-clamp-2 flex-1">
                        {tool.description}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className={`mx-6 mb-5 pt-4 border-t flex items-center justify-between ${
                tool.isActive ? 'border-border/60' : 'border-border/30'
            }`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                    tool.isActive ? 'text-text-muted group-hover:text-primary' : 'text-text-muted/40'
                }`}>
                    {tool.isActive ? 'Open Tool' : 'Coming Soon'}
                </span>

                {tool.isActive && (
                    <div className="w-7 h-7 rounded-full border border-border bg-surface-3 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:border-primary">
                        <ArrowUpRight className="w-3.5 h-3.5 text-text-muted group-hover:text-white transition-colors duration-300" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolCard;

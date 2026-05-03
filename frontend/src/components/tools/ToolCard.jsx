import React from 'react';
import { Wrench, ArrowRight } from 'lucide-react';

const ToolCard = ({ tool, onClick }) => {
    return (
        <div
            onClick={() => tool.isActive && onClick(tool)}
            className={`glass-panel rounded-2xl border p-5 flex flex-col justify-between transition-all overflow-hidden relative ${
                tool.isActive 
                ? 'border-border cursor-pointer group hover:border-primary/30 hover:bg-surface-3/10' 
                : 'border-border/50 cursor-not-allowed opacity-80'
            }`}
            style={{ minHeight: '140px' }}
        >
            {/* Disabled Overlay */}
            {!tool.isActive && (
                <div className="absolute inset-0 bg-surface-1/50 z-10 pointer-events-none" />
            )}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="p-1.5 rounded-lg border shrink-0 bg-primary/10 border-primary/20 text-primary">
                            <tool.icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </div>
                        <div className="flex items-center gap-2">
                            <h3 className={`text-[15px] font-heading font-semibold truncate tracking-tight leading-tight transition-colors ${
                                tool.isActive ? 'text-text group-hover:text-primary-light' : 'text-text-muted'
                            }`}>
                                {tool.name}
                            </h3>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-3 border border-border">
                                <div 
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        tool.isActive 
                                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' 
                                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                    }`}
                                />
                                <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                                    {tool.isActive ? 'Active' : 'Down'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {tool.description && (
                        <p className={`text-[11px] line-clamp-2 leading-relaxed mt-1 ml-[30px] ${
                            tool.isActive ? 'text-text-muted' : 'text-text-muted/60'
                        }`}>
                            {tool.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <div className={`flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase transition-colors ${
                    tool.isActive 
                    ? 'text-text-muted group-hover:text-primary' 
                    : 'text-text-muted/50'
                }`}>
                    <span>{tool.isActive ? 'Open Tool' : 'Currently Offline'}</span>
                    {tool.isActive && <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />}
                </div>
                
                {tool.tag && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 rounded">
                        {tool.tag}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ToolCard;

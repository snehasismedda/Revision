import React from 'react';
import { Wrench, ArrowRight } from 'lucide-react';

const ToolCard = ({ tool, onClick }) => {
    return (
        <div
            onClick={() => onClick(tool)}
            className="glass-panel rounded-2xl border border-border p-5 cursor-pointer group flex flex-col justify-between transition-all hover:border-primary/30 hover:bg-surface-3/10 !overflow-visible"
            style={{ minHeight: '140px' }}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="p-1.5 rounded-lg border shrink-0 bg-primary/10 border-primary/20 text-primary">
                            <tool.icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                        </div>
                        <h3 className="text-[15px] font-heading font-semibold text-text group-hover:text-primary-light transition-colors truncate tracking-tight leading-tight">
                            {tool.name}
                        </h3>
                    </div>
                    {tool.description && (
                        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mt-1 ml-[30px]">
                            {tool.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-text-muted group-hover:text-primary transition-colors">
                    <span>Open Tool</span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
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

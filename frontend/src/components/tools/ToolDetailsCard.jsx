import React from 'react';
import { X, Wrench, ExternalLink, Shield, ChevronRight } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import YouTubeTranscriptTool from './YouTubeTranscriptTool.jsx';

const ToolDetailsCard = ({ tool, onClose, inline = false }) => {
    if (!tool) return null;

    const content = (
        <>
            <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/20">
                    <Shield className="w-3 h-3" /> System Verified
                </span>
                {tool.tag && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase border border-primary/20">
                        {tool.tag}
                    </span>
                )}
            </div>

            <p className="text-text-muted text-sm leading-relaxed">
                {tool.description || "This is a dummy description for the tool. Detailed functionality will be added here based on the tool's specific purpose."}
            </p>

            <div className="p-5 rounded-2xl bg-surface-3/30 border border-border relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h4 className="text-[10px] font-extrabold text-text uppercase tracking-widest mb-3 opacity-50 relative z-10">Current Status</h4>
                <p className="text-[13px] text-text-muted italic relative z-10">
                    "The code will define what happens when this tool is utilized. For now, this tool is in ready state for implementation."
                </p>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
                <button
                    onClick={onClose}
                    className="btn-primary flex items-center justify-center gap-2 font-semibold px-8 py-3 rounded-xl text-[13px] cursor-pointer shadow-lg active:scale-[0.98] transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                >
                    <span>Launch Tool</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </>
    );

    if (inline) {
        return content;
    }

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className={`w-full ${tool.id === 'youtube-transcript' ? 'max-w-4xl' : 'max-w-lg'} rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-surface-2 border border-border animate-in zoom-in-95 duration-300`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <tool.icon className="w-5 h-5" />
                            </div>
                            {tool.name}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-8 space-y-6 overflow-y-auto max-h-[85vh] custom-scrollbar">
                        {tool.id === 'youtube-transcript' ? (
                            <YouTubeTranscriptTool />
                        ) : (
                            content
                        )}
                    </div>

                    {/* Footer */}
                    {tool.id !== 'youtube-transcript' && (
                        <div className="px-7 py-5 border-t border-border flex gap-3 shrink-0 bg-surface-2/50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text hover:bg-surface-3/10 transition-all cursor-pointer border border-transparent hover:border-border"
                            >
                                Back
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-[2] btn-primary flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] cursor-pointer shadow-lg active:scale-[0.98] transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                            >
                                <span>Launch Tool</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default ToolDetailsCard;

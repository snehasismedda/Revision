import React, { useState, useEffect } from 'react';
import { X, ClipboardList, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const EditRevisionSessionModal = ({ isOpen, onClose, onSubmit, session, topics }) => {
    const [name, setName] = useState('');
    const [selectedTopics, setSelectedTopics] = useState(new Set());
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        if (isOpen && session) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName(session.name);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedTopics(new Set(session.topics?.map(t => t.topicId) || []));
            // Auto expand all topics
            const allIds = new Set();
            const collectIds = (nodes) => {
                nodes.forEach(n => {
                    allIds.add(n.id);
                    if (n.children) collectIds(n.children);
                });
            };
            collectIds(topics);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setExpanded(allIds);
        }
    }, [isOpen, session, topics]);

    if (!isOpen || !session) return null;

    // Helper functions for tree checklist
    const toggleExpand = (id) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSelect = (item, isSelected) => {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            const selectChildren = (node, select) => {
                if (select) next.add(node.id);
                else next.delete(node.id);
                if (node.children) {
                    node.children.forEach(c => selectChildren(c, select));
                }
            };
            selectChildren(item, !isSelected);
            return next;
        });
    };

    const renderNode = (item) => {
        const isExpanded = expanded.has(item.id);
        const children = item.children || [];
        const hasChildren = children.length > 0;
        const isSelected = selectedTopics.has(item.id);

        return (
            <div key={item.id} className="ml-4 mt-1">
                <div className="flex items-center gap-2 group p-1.5 rounded hover:bg-white/[0.04]">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-slate-400 group-hover:text-slate-300 cursor-pointer"
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    ) : (
                        <div className="w-5 h-5 flex items-center justify-center text-slate-600">
                            •
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => handleToggleSelect(item, isSelected)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer
                            ${isSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-500'}`}
                    >
                        {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
                    <span
                        className={`text-[13px] ${isSelected ? 'text-white font-medium' : 'text-slate-300'} cursor-pointer select-none`}
                        onClick={() => handleToggleSelect(item, isSelected)}
                    >
                        {item.name}
                    </span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="border-l border-white/[0.05] ml-2.5">
                        {children.map(c => renderNode(c))}
                    </div>
                )}
            </div>
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || selectedTopics.size === 0) return;
        onSubmit({
            sessionId: session.id,
            name: name.trim(),
            topicIds: Array.from(selectedTopics)
        });
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            Edit Revision Session
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        <form id="edit-revision-form" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Session Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Weekend Full Mock Revision"
                                    className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/15 transition-all font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    Select Topics ({selectedTopics.size} selected)
                                </label>
                                <div className="bg-surface-2/50 border border-white/[0.08] rounded-xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {topics.length > 0 ? (
                                        <div className="-ml-4">
                                            {topics.map(renderNode)}
                                        </div>
                                    ) : (
                                        <p className="text-center text-slate-500 text-sm py-4">No syllabus topics available.</p>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-end bg-black/20">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                form="edit-revision-form"
                                type="submit"
                                disabled={!name.trim() || selectedTopics.size === 0}
                                className="bg-violet-500 text-white shadow-lg text-[13px] font-bold px-8 py-3 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                            >
                                <span>Save Session</span>
                                <ClipboardList className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default EditRevisionSessionModal;

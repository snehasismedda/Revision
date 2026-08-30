import React, { useState, useEffect } from 'react';
import { X, ClipboardList, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const CreateRevisionSessionModal = ({ isOpen, onClose, onSubmit, topics }) => {
    const [name, setName] = useState('');
    const [selectedTopics, setSelectedTopics] = useState(new Set());
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setName('');
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedTopics(new Set());
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
    }, [isOpen, topics]);

    if (!isOpen) return null;

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
                <div className="flex items-center gap-2 group p-1.5 rounded-lg hover:bg-surface-3/10 transition-all">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-3/20 text-text-muted group-hover:text-text transition-all cursor-pointer"
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    ) : (
                        <div className="w-5 h-5 flex items-center justify-center text-text-muted/40">
                            •
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => handleToggleSelect(item, isSelected)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shadow-sm
                            ${isSelected ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'border-border bg-surface-2 group-hover:border-violet-500/40'}`}
                    >
                        {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
                    <span
                        className={`text-[13px] ${isSelected ? 'text-text font-bold' : 'text-text-muted'} cursor-pointer select-none transition-colors`}
                        onClick={() => handleToggleSelect(item, isSelected)}
                    >
                        {item.name}
                    </span>
                </div>
                {hasChildren && isExpanded && (
                    <div className="border-l border-border ml-2.5 pl-1.5 py-0.5">
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
            name: name.trim(),
            topicIds: Array.from(selectedTopics)
        });
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            New Revision Session
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        <form id="create-revision-form" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Session Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Weekend Full Mock Revision"
                                    className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-400/15 transition-all font-medium placeholder:text-text-muted/60 shadow-inner"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">
                                    Select Topics ({selectedTopics.size} selected)
                                </label>
                                <div className="bg-surface-2 border border-border rounded-xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                                    {topics.length > 0 ? (
                                        <div className="-ml-4">
                                            {topics.map(renderNode)}
                                        </div>
                                    ) : (
                                        <p className="text-center text-text-muted/60 text-sm py-4">No syllabus topics available.</p>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="px-7 py-5 border-t border-border shrink-0 flex items-center justify-end bg-surface-2/50">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                form="create-revision-form"
                                type="submit"
                                disabled={!name.trim() || selectedTopics.size === 0}
                                className="bg-violet-500 text-white shadow-lg text-[13px] font-bold px-8 py-3 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                            >
                                <span>Create Session</span>
                                <ClipboardList className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default CreateRevisionSessionModal;

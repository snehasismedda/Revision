import { useState } from 'react';
import { topicsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Plus, GitBranch } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import TopicTree from '../TopicTree.jsx';

const ManageSyllabusModal = ({ isOpen, onClose, subjectId, onTopicsUpdated, topics }) => {
    const [bulkTopics, setBulkTopics] = useState('');
    const [addingTopics, setAddingTopics] = useState(false);

    const handleAddTopics = async (e) => {
        e.preventDefault();
        const names = bulkTopics
            .split(/[\n,]/)
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (names.length === 0) return;

        setAddingTopics(true);
        const loadingToast = toast.loading(names.length === 1 ? 'Adding topic...' : `Adding ${names.length} topics...`);

        try {
            const topicsToCreate = names.map(name => ({ name }));
            await topicsApi.bulkCreate(subjectId, { topics: topicsToCreate });

            const { topics: freshTree } = await topicsApi.list(subjectId);
            onTopicsUpdated(freshTree);

            setBulkTopics('');
            toast.success(names.length === 1 ? 'Topic added' : `${names.length} topics added`, { id: loadingToast });
        } catch {
            toast.error('Failed to add topics', { id: loadingToast });
        } finally {
            setAddingTopics(false);
        }
    };

    const handleTopicDeleted = (topicId) => {
        const removeFromTree = (nodes) =>
            nodes
                .filter((n) => n.id !== topicId)
                .map((n) => ({ ...n, children: removeFromTree(n.children || []) }));
        onTopicsUpdated(prev => removeFromTree(prev));
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{
                        background: 'rgba(22, 22, 34, 0.96)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.04)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.06] shrink-0">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <PlusCircle className="w-5 h-5" />
                                </div>
                                Manage Syllabus
                            </h3>
                            <p className="text-[12px] text-slate-500 mt-1 ml-11">Build and organize your subject hierarchy</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-7 overflow-y-auto custom-scrollbar flex flex-col gap-8">

                        {/* ── Section 1: Bulk Quick Add ────────────────── */}
                        <div
                            className="p-6 rounded-xl shrink-0"
                            style={{ background: 'rgba(30, 30, 44, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-4 flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Quick Add Root Topics
                            </h4>
                            <form onSubmit={handleAddTopics} className="space-y-4">
                                <div className="flex gap-3">
                                    <textarea
                                        value={bulkTopics}
                                        onChange={(e) => setBulkTopics(e.target.value)}
                                        placeholder="Add topics... (separate with newlines or commas)"
                                        rows={1}
                                        className="flex-1 bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none h-[48px] custom-scrollbar"
                                    />
                                    <button
                                        type="submit"
                                        disabled={addingTopics || !bulkTopics.trim()}
                                        className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-white px-5 rounded-xl font-semibold text-[13px] transition-all disabled:opacity-40 whitespace-nowrap active:scale-95"
                                    >
                                        Add Roots
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ── Section 2: Full Tree Management ───────────── */}
                        <div className="flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] flex items-center gap-2">
                                    <GitBranch className="w-3 h-3 rotate-180" /> Manage Hierarchy
                                </h4>
                                <span className="text-[10px] text-slate-600 font-medium">Double-click to rename • Hover for actions</span>
                            </div>

                            <div className="rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.01]">
                                <TopicTree
                                    key={`modal-tree-${topics.length}-${topics[0]?.updated_at}`}
                                    topics={topics}
                                    subjectId={subjectId}
                                    onTopicDeleted={handleTopicDeleted}
                                    onTopicsChanged={onTopicsUpdated}
                                    defaultExpanded={false}
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-white/[0.06] flex justify-end bg-surface-1/50 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-[13px] font-semibold bg-white/[0.05] text-white hover:bg-white/[0.1] transition-all cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};


export default ManageSyllabusModal;

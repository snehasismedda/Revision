import { useState } from 'react';
import { topicsApi } from '../api/index.js';
import { ChevronRight, ChevronDown, Trash2, Plus, Pencil, Check, X, GitBranch, Circle, Maximize2, Minimize2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';
import toast from 'react-hot-toast';

const TopicNode = ({ topic, subjectId, depth = 0, onDeleted, onSubtopicAdded, onRenamed, setConfirmDelete, defaultExpanded = true }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(topic.name);
    const [addingChild, setAddingChild] = useState(false);
    const [newChildName, setNewChildName] = useState('');
    const [savingChild, setSavingChild] = useState(false);
    const [savingRename, setSavingRename] = useState(false);
    const hasChildren = topic.children?.length > 0;

    const handleRename = async () => {
        const trimmed = editName.trim();
        if (!trimmed || trimmed === topic.name) {
            setEditing(false);
            setEditName(topic.name);
            return;
        }
        setSavingRename(true);
        try {
            await topicsApi.update(subjectId, topic.id, { name: trimmed });
            onRenamed?.(topic.id, trimmed);
            setEditing(false);
            toast.success('Topic renamed');
        } catch {
            toast.error('Failed to rename topic');
            setEditName(topic.name);
        } finally {
            setSavingRename(false);
        }
    };

    const handleAddChild = async (e) => {
        e.preventDefault();
        const trimmed = newChildName.trim();
        if (!trimmed) return;
        setSavingChild(true);
        try {
            const { topic: created } = await topicsApi.create(subjectId, {
                name: trimmed,
                parentId: topic.id,
            });
            onSubtopicAdded?.(topic.id, { ...created, children: [] });
            setNewChildName('');
            setAddingChild(false);
            setExpanded(true);
            toast.success(`Subtopic "${trimmed}" added`);
        } catch {
            toast.error('Failed to add subtopic');
        } finally {
            setSavingChild(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleRename();
        if (e.key === 'Escape') {
            setEditing(false);
            setEditName(topic.name);
        }
    };

    return (
        <div className={`relative ${depth > 0 ? 'ml-6' : ''}`}>
            {/* Tree connector lines */}
            {depth > 0 && (
                <>
                    <div className="absolute -left-6 top-0 bottom-0 w-px bg-white/[0.06]" />
                    <div className="absolute -left-6 top-[20px] w-4 h-px bg-white/[0.06]" />
                </>
            )}

            {/* Node row */}
            <div
                className={`flex items-center gap-2 group/node relative z-10 rounded-lg transition-all min-w-0
                    ${depth === 0
                        ? 'py-2.5 px-2 hover:bg-primary/[0.04]'
                        : 'py-1.5 px-2 hover:bg-white/[0.04]'
                    }`}
            >
                {/* Expand/collapse or leaf bullet */}
                {hasChildren || depth === 0 ? (
                    <button
                        onClick={() => hasChildren && setExpanded(!expanded)}
                        className={`p-1 rounded-md transition-all text-slate-500 shrink-0 ${hasChildren ? 'hover:text-primary hover:bg-primary/10 cursor-pointer' : 'opacity-30 cursor-default'}`}
                    >
                        {expanded && hasChildren ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                ) : (
                    <div className="w-[28px] flex justify-center shrink-0">
                        <Circle className="w-1.5 h-1.5 fill-slate-600 text-slate-600" />
                    </div>
                )}

                {/* Name: editable or display */}
                {editing ? (
                    <div className="flex-1 flex items-center gap-1.5">
                        <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-surface-2/80 border border-primary/30 text-slate-100 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                            disabled={savingRename}
                        />
                        <button onClick={handleRename} disabled={savingRename} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors cursor-pointer">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditing(false); setEditName(topic.name); }} className="p-1 text-slate-500 hover:bg-white/5 rounded-md transition-colors cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <span
                        onDoubleClick={() => { setEditing(true); setEditName(topic.name); }}
                        className={`flex-1 min-w-0 truncate transition-colors cursor-default select-none
                            ${depth === 0
                                ? 'text-[15px] font-heading font-bold text-slate-100 tracking-tight'
                                : depth === 1
                                    ? 'text-[13px] font-semibold text-slate-300 group-hover/node:text-slate-100'
                                    : 'text-[13px] font-medium text-slate-500 group-hover/node:text-slate-300'
                            }`}
                        title={topic.name}
                    >
                        {topic.name}
                    </span>
                )}

                {/* Action buttons — shown on hover */}
                {!editing && (
                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/node:opacity-100 transition-opacity">
                        <button
                            onClick={() => { setEditing(true); setEditName(topic.name); }}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                            title="Rename"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setAddingChild((v) => !v)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${addingChild ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                            title="Add subtopic"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setConfirmDelete({ open: true, id: topic.id, name: topic.name })}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Inline add-subtopic input */}
            {addingChild && (
                <form onSubmit={handleAddChild} className="ml-[28px] mt-1 mb-2 flex items-center gap-1.5 fade-in">
                    <div className="w-3.5 h-px bg-white/[0.06]" />
                    <input
                        autoFocus
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        placeholder="Subtopic name..."
                        className="flex-1 bg-surface-2/80 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-600"
                        disabled={savingChild}
                    />
                    <button type="submit" disabled={savingChild || !newChildName.trim()} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors disabled:opacity-40 cursor-pointer">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => { setAddingChild(false); setNewChildName(''); }} className="p-1.5 text-slate-500 hover:bg-white/5 rounded-md transition-colors cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </form>
            )}

            {/* Children — increased spacing for top-level categories */}
            {expanded && hasChildren && (
                <div className={depth === 0 ? 'mt-0.5 mb-2' : 'mt-0.5'}>
                    {topic.children.map((child) => (
                        <TopicNode
                            key={child.id}
                            topic={child}
                            subjectId={subjectId}
                            depth={depth + 1}
                            onDeleted={onDeleted}
                            onSubtopicAdded={onSubtopicAdded}
                            onRenamed={onRenamed}
                            setConfirmDelete={setConfirmDelete}
                            defaultExpanded={defaultExpanded}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const TopicTree = ({ topics, subjectId, onTopicDeleted, onTopicsChanged, defaultExpanded = true }) => {
    const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });

    const handleDelete = async () => {
        const { id, name } = confirmDelete;
        const loadingToast = toast.loading(`Deleting ${name}...`);
        try {
            await topicsApi.delete(subjectId, id);
            onTopicDeleted?.(id);
            toast.success(`Topic "${name}" removed`, { id: loadingToast });
        } catch {
            toast.error('Failed to delete topic', { id: loadingToast });
        }
    };

    const handleSubtopicAdded = (parentId, newChild) => {
        onTopicsChanged?.((prev) => {
            const addChild = (nodes) =>
                nodes.map((n) =>
                    n.id === parentId
                        ? { ...n, children: [...(n.children || []), newChild] }
                        : { ...n, children: addChild(n.children || []) }
                );
            return addChild(prev);
        });
    };

    const handleRenamed = (topicId, newName) => {
        onTopicsChanged?.((prev) => {
            const rename = (nodes) =>
                nodes.map((n) =>
                    n.id === topicId
                        ? { ...n, name: newName }
                        : { ...n, children: rename(n.children || []) }
                );
            return rename(prev);
        });
    };

    if (!topics?.length) {
        return (
            <div className="glass-panel p-8 rounded-xl border-dashed border-white/10 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto flex items-center justify-center mb-4 border border-white/5">
                    <GitBranch className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm font-medium">
                    No topics yet. Start by adding a topic manually or paste a syllabus to generate a tree.
                </p>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl relative"
            style={{
                background: 'rgba(22, 22, 34, 0.5)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '1.25rem 1.5rem',
            }}
        >
            <ConfirmDialog
                isOpen={confirmDelete.open}
                title="Delete Topic"
                message={`Are you sure you want to delete "${confirmDelete.name}"? This will also remove all subtopics under it.`}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete({ open: false, id: null, name: '' })}
            />

            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            <div className="space-y-1">
                {topics.map((topic) => (
                    <TopicNode
                        key={topic.id}
                        topic={topic}
                        subjectId={subjectId}
                        onDeleted={onTopicDeleted}
                        onSubtopicAdded={handleSubtopicAdded}
                        onRenamed={handleRenamed}
                        setConfirmDelete={setConfirmDelete}
                        defaultExpanded={defaultExpanded}
                    />
                ))}
            </div>
        </div>
    );
};

export default TopicTree;

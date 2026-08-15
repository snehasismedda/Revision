import React, { useState, useEffect } from 'react';
import {
    X,
    CheckSquare,
    Plus,
    Trash2,
    Calendar,
    Tag,
    ListTodo,
    AlertCircle,
    Layers,
    Link as LinkIcon
} from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const CreateTodoModal = ({ isOpen, onClose, onSubmit, groups = [], onQuickCreateGroup }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [groupId, setGroupId] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
    const [subTodos, setSubTodos] = useState([]);
    const [currentSubInput, setCurrentSubInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setDueDate('');
            setGroupId('');
            setNewGroupName('');
            setIsCreatingNewGroup(false);
            setSubTodos([]);
            setCurrentSubInput('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddSubTask = (e) => {
        if (e) e.preventDefault();
        if (!currentSubInput.trim()) return;
        setSubTodos(prev => [...prev, { title: currentSubInput.trim(), id: Date.now() }]);
        setCurrentSubInput('');
    };

    const handleRemoveSubTask = (index) => {
        setSubTodos(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        let selectedGroupId = groupId || null;

        // If user entered a new group name on the fly
        if (isCreatingNewGroup && newGroupName.trim() && onQuickCreateGroup) {
            try {
                const createdGrp = await onQuickCreateGroup(newGroupName.trim());
                if (createdGrp && createdGrp.id) {
                    selectedGroupId = createdGrp.id;
                }
            } catch {
                // proceed with null if group creation failed
            }
        }

        onSubmit({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            groupId: selectedGroupId,
            subTodos: subTodos.map(s => s.title)
        });
    };

    const priorities = [
        { id: 'low', label: 'Low', color: 'border-slate-500/30 text-slate-400 bg-slate-500/10' },
        { id: 'medium', label: 'Medium', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
        { id: 'high', label: 'High', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
        { id: 'urgent', label: 'Urgent', color: 'border-rose-500/30 text-rose-400 bg-rose-500/10' },
    ];

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <CheckSquare className="w-5 h-5" />
                            </div>
                            Create New TODO
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/20 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        <form id="create-todo-form" onSubmit={handleSubmit} className="space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2">
                                    TODO Title *
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Master Calculus Integration Techniques"
                                    className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all font-medium placeholder:text-text-muted/60"
                                    required
                                />
                            </div>

                            {/* Description with link tip */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em]">
                                        Description & Links
                                    </label>
                                    <span className="text-[10px] text-text-muted/70 flex items-center gap-1">
                                        <LinkIcon className="w-3 h-3" /> Supports clickable URLs & [text](url)
                                    </span>
                                </div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Add notes, resources, or URLs e.g. https://example.com or [Lecture Notes](https://...)"
                                    className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all font-medium placeholder:text-text-muted/60 resize-none custom-scrollbar"
                                />
                            </div>

                            {/* Priority & Due Date Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Priority Chips */}
                                <div>
                                    <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2">
                                        Priority
                                    </label>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {priorities.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setPriority(p.id)}
                                                className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-all cursor-pointer
                                                    ${priority === p.id
                                                        ? `${p.color} ring-2 ring-primary/30 font-extrabold shadow-sm`
                                                        : 'border-border bg-surface-2/60 text-text-muted hover:text-text hover:bg-surface-2'
                                                    }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2">
                                        Due Date
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full bg-surface-2 border border-border text-text rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Group / Category */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em]">
                                        Group / Section
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingNewGroup(!isCreatingNewGroup)}
                                        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                                    >
                                        {isCreatingNewGroup ? 'Choose existing group' : '+ Create new group'}
                                    </button>
                                </div>

                                {isCreatingNewGroup ? (
                                    <input
                                        type="text"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        placeholder="e.g. Problem Sets, Formulas, Revision"
                                        className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-muted/60"
                                    />
                                ) : (
                                    <select
                                        value={groupId}
                                        onChange={(e) => setGroupId(e.target.value)}
                                        className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                                    >
                                        <option value="">No Group (General)</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Sub-tasks Builder */}
                            <div>
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2">
                                    Sub-tasks ({subTodos.length})
                                </label>
                                
                                <div className="space-y-2 mb-2">
                                    {subTodos.map((sub, idx) => (
                                        <div key={sub.id || idx} className="flex items-center gap-2 bg-surface-2/80 px-3 py-2 rounded-xl border border-border">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                                            <span className="flex-1 text-[13px] font-medium text-text">{sub.title}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubTask(idx)}
                                                className="p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={currentSubInput}
                                        onChange={(e) => setCurrentSubInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSubTask();
                                            }
                                        }}
                                        placeholder="Type a sub-task and press Enter..."
                                        className="flex-1 bg-surface-2 border border-border text-text rounded-xl px-3.5 py-2 text-[13px] focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-muted/60"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSubTask}
                                        disabled={!currentSubInput.trim()}
                                        className="px-4 py-2 bg-surface-3 hover:bg-primary/20 hover:text-primary text-text font-bold text-[12px] rounded-xl border border-border transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-7 py-5 border-t border-border shrink-0 flex items-center justify-end bg-surface-2/40">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                form="create-todo-form"
                                type="submit"
                                disabled={!title.trim()}
                                className="bg-primary text-white shadow-lg text-[13px] font-bold px-7 py-2.5 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                            >
                                <span>Create TODO</span>
                                <CheckSquare className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default CreateTodoModal;

import React, { useState } from 'react';
import {
    CheckSquare,
    Square,
    Calendar,
    Clock,
    Tag,
    ChevronDown,
    ChevronUp,
    Plus,
    Pencil,
    Trash2,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Circle,
    ListTodo
} from 'lucide-react';

/**
 * Parses description text and renders markdown links [text](url)
 * as well as raw http/https links as clickable elements.
 */
export const FormattedDescription = ({ text }) => {
    if (!text || !text.trim()) return null;

    // Regex to match [title](url) OR raw URLs https?://...
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        // Push preceding plain text
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }

        if (match[1] && match[2]) {
            // [title](url)
            parts.push({
                type: 'link',
                label: match[1],
                url: match[2]
            });
        } else if (match[3]) {
            // raw url
            parts.push({
                type: 'link',
                label: match[3],
                url: match[3]
            });
        }

        lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }

    return (
        <div className="text-[13px] text-text-muted leading-relaxed whitespace-pre-wrap mt-2 select-text">
            {parts.map((p, idx) => {
                if (p.type === 'text') {
                    return <span key={idx}>{p.content}</span>;
                }
                return (
                    <a
                        key={idx}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-hover hover:underline font-medium bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded transition-all mr-1"
                        title={p.url}
                    >
                        <span>{p.label}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 inline opacity-70" />
                    </a>
                );
            })}
        </div>
    );
};

const TodoCard = ({
    todo,
    onToggleStatus,
    onToggleSubTodo,
    onAddSubTodo,
    onDeleteSubTodo,
    onEdit,
    onDelete,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [newSubTitle, setNewSubTitle] = useState('');
    const [isAddingSub, setIsAddingSub] = useState(false);

    const isCompleted = todo.status === 'completed';
    const subTodos = todo.subTodos || [];
    const hasSubTodos = subTodos.length > 0;
    const subDone = todo.subTodosDone || subTodos.filter(s => s.status === 'completed').length;
    const subTotal = todo.subTodosTotal || subTodos.length;
    const progressPct = todo.progressPct ?? (subTotal > 0 ? Math.round((subDone / subTotal) * 100) : (isCompleted ? 100 : 0));

    // Due date formatting & status
    const formatDueDate = (dateStr) => {
        if (!dateStr) return null;
        const target = new Date(dateStr);
        const now = new Date();
        const diffMs = target - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        const formatted = target.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });

        const isOverdue = diffMs < 0 && !isCompleted;
        const isToday = diffDays === 0;
        const isTomorrow = diffDays === 1;

        let badgeClass = 'bg-surface-3/80 text-text-muted border-border';
        let label = formatted;

        if (isCompleted) {
            badgeClass = 'bg-surface-3/40 text-text-muted border-border/50 line-through';
        } else if (isOverdue) {
            badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
            label = `Overdue • ${formatted}`;
        } else if (isToday) {
            badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            label = 'Due Today';
        } else if (isTomorrow) {
            badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
            label = 'Due Tomorrow';
        }

        return { formatted, label, isOverdue, badgeClass };
    };

    const dueInfo = formatDueDate(todo.dueDate);

    // Priority configuration
    const priorityConfig = {
        urgent: { label: 'Urgent', class: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
        high: { label: 'High', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        medium: { label: 'Medium', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
        low: { label: 'Low', class: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
    };
    const prio = priorityConfig[todo.priority] || priorityConfig.medium;

    const handleAddSubSubmit = (e) => {
        e.preventDefault();
        if (!newSubTitle.trim()) return;
        onAddSubTodo(todo.id, newSubTitle.trim());
        setNewSubTitle('');
        setIsAddingSub(false);
    };

    return (
        <div
            className={`group/card glass-panel rounded-2xl border transition-all duration-200 overflow-hidden mb-3
                ${isCompleted
                    ? 'bg-surface-2/40 border-border opacity-75 hover:opacity-100'
                    : 'border-border hover:border-border-hover shadow-sm hover:shadow-md'
                }`}
        >
            {/* Main Header / Row */}
            <div className="p-4 flex items-start gap-3.5">
                {/* Main Checkbox */}
                <button
                    type="button"
                    onClick={() => onToggleStatus(todo.id, isCompleted ? 'pending' : 'completed')}
                    className={`shrink-0 mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer
                        ${isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'border-slate-500/50 bg-surface-2 hover:border-emerald-400/80 hover:bg-emerald-500/10'
                        }`}
                    title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                >
                    {isCompleted && <CheckSquare className="w-3.5 h-3.5" />}
                </button>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Group Tag */}
                        {todo.groupName && (
                            <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                                style={{
                                    backgroundColor: `${todo.groupColor || '#8b5cf6'}18`,
                                    color: todo.groupColor || '#8b5cf6',
                                    borderColor: `${todo.groupColor || '#8b5cf6'}35`,
                                }}
                            >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: todo.groupColor || '#8b5cf6' }} />
                                {todo.groupName}
                            </span>
                        )}

                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${prio.class}`}>
                            {prio.label}
                        </span>

                        {/* Due Date Badge */}
                        {dueInfo && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${dueInfo.badgeClass}`}>
                                {dueInfo.isOverdue ? <AlertCircle className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                                <span>{dueInfo.label}</span>
                            </span>
                        )}

                        {/* Progress Badge for Sub-tasks */}
                        {hasSubTodos && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-text-muted bg-surface-2 px-2.5 py-0.5 rounded-full border border-border">
                                <ListTodo className="w-3 h-3 text-primary" />
                                <span>{subDone}/{subTotal}</span>
                                <span className="text-[10px] font-normal text-text-muted/70">({progressPct}%)</span>
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h4
                        className={`text-[15px] font-bold tracking-tight leading-snug break-words transition-colors
                            ${isCompleted ? 'text-text-muted line-through decoration-slate-500' : 'text-text'}`}
                    >
                        {todo.title}
                    </h4>

                    {/* Description with link parser */}
                    {todo.description && (
                        <FormattedDescription text={todo.description} />
                    )}

                    {/* Progress bar if sub-tasks exist */}
                    {hasSubTodos && (
                        <div className="w-full mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-600 to-indigo-400'}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-text-muted shrink-0">{progressPct}%</span>
                        </div>
                    )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                        type="button"
                        onClick={() => onEdit(todo)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Edit TODO"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(todo.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete TODO"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {hasSubTodos && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-3/20 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Sub-tasks Accordion List */}
            {hasSubTodos && isExpanded && (
                <div className="bg-surface/60 border-t border-border px-5 py-3.5 flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                        {subTodos.map(sub => {
                            const subIsDone = sub.status === 'completed';
                            return (
                                <div
                                    key={sub.id}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all group/sub
                                        ${subIsDone ? 'bg-emerald-500/[0.04] border-emerald-500/15' : 'bg-surface-2/40 border-border/80 hover:border-border-hover'}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onToggleSubTodo(sub.id, subIsDone ? 'pending' : 'completed')}
                                        className={`shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer
                                            ${subIsDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-500/60 bg-transparent hover:border-emerald-500'}`}
                                    >
                                        {subIsDone && <CheckSquare className="w-3 h-3" />}
                                    </button>
                                    <span
                                        className={`flex-1 text-[13px] font-medium leading-tight select-text transition-colors
                                            ${subIsDone ? 'text-text-muted line-through decoration-slate-600' : 'text-text'}`}
                                    >
                                        {sub.title}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteSubTodo(sub.id)}
                                        className="opacity-0 group-hover/sub:opacity-100 p-1 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                                        title="Delete sub-task"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Inline Quick Add Sub-task */}
                    <form onSubmit={handleAddSubSubmit} className="flex items-center gap-2 mt-1">
                        <input
                            type="text"
                            value={newSubTitle}
                            onChange={(e) => setNewSubTitle(e.target.value)}
                            placeholder="+ Add a sub-task..."
                            className="flex-1 bg-surface-2/70 border border-border hover:border-border-hover focus:border-primary/50 text-text rounded-xl px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted/60"
                        />
                        {newSubTitle.trim() && (
                            <button
                                type="submit"
                                className="bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-sm hover:opacity-90 transition-all cursor-pointer"
                            >
                                Add
                            </button>
                        )}
                    </form>
                </div>
            )}

            {/* If no sub-tasks yet, show quick add prompt button when hovered */}
            {!hasSubTodos && (
                <div className="px-5 pb-3 pt-0">
                    {isAddingSub ? (
                        <form onSubmit={handleAddSubSubmit} className="flex items-center gap-2 mt-1">
                            <input
                                autoFocus
                                type="text"
                                value={newSubTitle}
                                onChange={(e) => setNewSubTitle(e.target.value)}
                                placeholder="Type sub-task and press Enter..."
                                className="flex-1 bg-surface-2 border border-border text-text rounded-xl px-3 py-1.5 text-[12px] focus:outline-none focus:border-primary/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newSubTitle.trim()}
                                className="bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-xl disabled:opacity-40 cursor-pointer"
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsAddingSub(false); setNewSubTitle(''); }}
                                className="text-text-muted hover:text-text text-[11px] px-2 py-1.5"
                            >
                                Cancel
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsAddingSub(true)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted/70 hover:text-primary transition-colors cursor-pointer py-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add sub-tasks</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TodoCard;

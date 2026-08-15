import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Pencil, Check } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const PRESET_COLORS = [
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#6366f1', // Indigo
];

const ManageTodoGroupsModal = ({
    isOpen,
    onClose,
    groups = [],
    onCreateGroup,
    onUpdateGroup,
    onDeleteGroup,
}) => {
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingColor, setEditingColor] = useState(PRESET_COLORS[0]);

    if (!isOpen) return null;

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        await onCreateGroup({
            name: newGroupName.trim(),
            color: newGroupColor,
        });
        setNewGroupName('');
    };

    const handleStartEdit = (group) => {
        setEditingGroupId(group.id);
        setEditingName(group.name);
        setEditingColor(group.color || PRESET_COLORS[0]);
    };

    const handleSaveEdit = async (groupId) => {
        if (!editingName.trim()) return;
        await onUpdateGroup(groupId, {
            name: editingName.trim(),
            color: editingColor,
        });
        setEditingGroupId(null);
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Layers className="w-5 h-5" />
                            </div>
                            Manage TODO Groups
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/20 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Create New Group Form */}
                        <form onSubmit={handleCreate} className="bg-surface-2/60 p-4 rounded-2xl border border-border space-y-3">
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em]">
                                Add New Group
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Formula Sheet, Weekly Goals..."
                                    className="flex-1 bg-surface border border-border text-text rounded-xl px-3.5 py-2 text-[13px] focus:outline-none focus:border-primary/50 transition-all font-medium placeholder:text-text-muted/60"
                                />
                                <button
                                    type="submit"
                                    disabled={!newGroupName.trim()}
                                    className="px-4 py-2 bg-primary text-white font-bold text-[12px] rounded-xl shadow-md disabled:opacity-40 hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add</span>
                                </button>
                            </div>

                            {/* Color Selector */}
                            <div className="flex items-center gap-2 pt-1">
                                <span className="text-[11px] text-text-muted font-medium mr-1">Color:</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewGroupColor(c)}
                                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer
                                                ${newGroupColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </form>

                        {/* Existing Groups List */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em]">
                                Existing Groups ({groups.length})
                            </label>

                            {groups.length === 0 ? (
                                <p className="text-sm text-text-muted/70 italic py-3 text-center">
                                    No custom groups yet. Add one above to organize your tasks.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
                                    {groups.map(group => {
                                        const isEditing = editingGroupId === group.id;

                                        if (isEditing) {
                                            return (
                                                <div key={group.id} className="p-3 bg-surface-2 rounded-xl border border-primary/40 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            className="flex-1 bg-surface border border-border text-text rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-primary font-medium"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveEdit(group.id)}
                                                            className="p-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
                                                            title="Save"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingGroupId(null)}
                                                            className="p-2 text-text-muted hover:text-text rounded-lg transition-all cursor-pointer"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pt-1">
                                                        {PRESET_COLORS.map(c => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => setEditingColor(c)}
                                                                className={`w-4 h-4 rounded-full transition-transform cursor-pointer
                                                                    ${editingColor === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-surface' : 'opacity-80'}`}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={group.id}
                                                className="flex items-center justify-between px-3.5 py-2.5 bg-surface-2/60 hover:bg-surface-2 rounded-xl border border-border transition-colors group"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span
                                                        className="w-3 h-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: group.color || '#8b5cf6' }}
                                                    />
                                                    <span className="text-[13px] font-bold text-text truncate">
                                                        {group.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEdit(group)}
                                                        className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                                                        title="Edit Group"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteGroup(group.id)}
                                                        className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                                        title="Delete Group"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-4 border-t border-border shrink-0 flex items-center justify-end bg-surface-2/40">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-[13px] font-semibold text-text hover:bg-surface-3 transition-all cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default ManageTodoGroupsModal;

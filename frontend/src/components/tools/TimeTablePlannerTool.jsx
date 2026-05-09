import React, { useState, useEffect } from 'react';
import { timeTableApi } from '../../api';
import { Calendar, Clock, Plus, Trash2, Edit2, Play, CheckCircle2, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ModalPortal from '../ModalPortal.jsx';
import TimeTableGrid from './TimeTableGrid.jsx';

const TimeTablePlannerTool = ({ onViewChange, backSignal }) => {
    const [view, setView] = useState('list'); // list, editor
    const [timeTables, setTimeTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingTable, setEditingTable] = useState(null); // The table being created/edited
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [type, setType] = useState('weekly');
    const [events, setEvents] = useState([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [exitConfirm, setExitConfirm] = useState(false);

    const fetchTimeTables = async () => {
        setLoading(true);
        try {
            const data = await timeTableApi.list();
            setTimeTables(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load time tables");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeTables();
    }, []);

    useEffect(() => {
        if (onViewChange) {
            onViewChange(view);
        }
    }, [view, onViewChange]);

    // Warn on browser refresh/close when there are unsaved changes
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (isDirty && view === 'editor') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty, view]);

    useEffect(() => {
        if (backSignal > 0 && view === 'editor') {
            handleBackRequest();
        }
    }, [backSignal]);

    const handleCreateNew = () => {
        setEditingTable(null);
        setName('');
        setType('weekly');
        setEvents([]);
        setIsDirty(false);
        setView('editor');
    };

    const handleEdit = (table) => {
        setEditingTable(table);
        setName(table.name);
        setType(table.type);
        setEvents(table.data.events || []);
        setIsDirty(false);
        setView('editor');
    };

    const handleBackRequest = () => {
        if (isDirty) {
            setExitConfirm(true);
        } else {
            setView('list');
        }
    };

    const handleDiscardAndExit = () => {
        setExitConfirm(false);
        setIsDirty(false);
        setView('list');
    };

    const handleSave = async () => {
        if (!name.trim()) return toast.error("Name is required");
        setLoading(true);
        try {
            const payload = { name, type, data: { events } };
            if (editingTable) {
                await timeTableApi.update(editingTable.id, payload);
                toast.success("Time table updated");
            } else {
                await timeTableApi.create(payload);
                toast.success("Time table created");
            }
            fetchTimeTables();
            setIsDirty(false);
            setExitConfirm(false); // always close the modal
            setView('list');
        } catch (err) {
            console.error(err);
            toast.error("Failed to save time table");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setLoading(true);
        try {
            await timeTableApi.delete(deleteConfirm);
            toast.success("Time table deleted");
            fetchTimeTables();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete");
        } finally {
            setLoading(false);
            setDeleteConfirm(null);
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await timeTableApi.toggleActive(id);
            toast.success("Active status updated");
            fetchTimeTables();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const addEvent = () => {
        const newEvent = {
            id: Date.now().toString(),
            days: [type === 'weekly' ? 1 : 1],
            startHour: 9,
            endHour: 10,
            title: 'New Block',
            color: 'bg-primary'
        };
        setEvents([...events, newEvent]);
        setIsDirty(true);
    };

    const updateEvent = (id, field, value) => {
        setEvents(events.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const removeEvent = (id) => {
        setEvents(events.filter(e => e.id !== id));
    };

    const daysOptions = type === 'weekly' 
        ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        : Array.from({length: 31}, (_, i) => `${i + 1}`);

    const colors = ['bg-primary', 'bg-blue-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];

    return (
        <div className="space-y-8">
            {view === 'list' ? (
                <div className="animate-in fade-in space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-text">Your Time Tables</h2>
                            <p className="text-[13px] text-text-muted">Manage your monthly and weekly study schedules</p>
                        </div>
                        <button 
                            onClick={handleCreateNew}
                            className="bg-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Plus className="w-4 h-4" /> Create New
                        </button>
                    </div>

                    {loading && timeTables.length === 0 ? (
                        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                    ) : timeTables.length === 0 ? (
                        <div className="glass-panel p-12 text-center rounded-3xl border-dashed border-2 border-border">
                            <div className="w-16 h-16 bg-surface-3 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-text-muted" />
                            </div>
                            <h3 className="text-lg font-bold text-text">No time tables yet</h3>
                            <p className="text-sm text-text-muted mt-1">Create one to organize your study routine.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {timeTables.map(t => (
                        <div key={t.id} className={`glass-panel p-6 rounded-3xl border transition-all cursor-pointer group ${t.is_active ? 'border-primary/50 shadow-lg shadow-primary/5 bg-primary/[0.02]' : 'border-border hover:border-primary/30'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.is_active ? 'bg-primary text-white shadow-md' : 'bg-surface-3 text-primary'}`}>
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                type="button"
                                                onClick={() => handleToggleActive(t.id)}
                                                className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mr-2 transition-all ${t.is_active ? 'bg-primary/10 border-primary/20 text-primary' : 'border-border text-text-muted hover:text-text hover:bg-surface-3'}`}
                                            >
                                                {t.is_active ? (
                                                    <><CheckCircle2 className="w-3 h-3" /> Active</>
                                                ) : (
                                                    'Inactive'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-[17px] font-bold text-text mb-1 truncate">{t.name}</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-6">{t.type} Planner</p>

                                    <div className="flex items-center justify-between border-t border-border pt-4">
                                        <button 
                                            type="button"
                                            onClick={() => handleEdit(t)}
                                            className="text-[12px] font-bold text-primary flex items-center gap-1.5 hover:underline"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" /> Edit Planner
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setDeleteConfirm(t.id)}
                                            className="text-[12px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 space-y-6">
                    <div className="flex flex-col xl:flex-row items-center justify-between bg-surface-2 p-3 rounded-2xl border border-border gap-4">
                        <div className="flex items-center gap-3 w-full xl:w-auto">
                            <div className="flex-1 min-w-[200px] max-w-sm pl-2">
                                {isEditingName ? (
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onBlur={() => setIsEditingName(false)}
                                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                        className="w-full bg-surface-3 border border-primary rounded-xl px-3 py-1.5 text-lg font-bold text-text outline-none"
                                        placeholder="Schedule Name"
                                    />
                                ) : (
                                    <h2 
                                        onDoubleClick={() => setIsEditingName(true)}
                                        className="text-lg font-bold text-text cursor-text px-3 py-1.5 hover:bg-surface-3 rounded-xl transition-colors border border-transparent hover:border-border/50 truncate w-full"
                                        title="Double click to edit name"
                                    >
                                        {name || 'Untitled Schedule'}
                                    </h2>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 custom-scrollbar">
                            <div className="flex bg-surface-3 rounded-xl p-1 border border-border shadow-inner shrink-0">
                                {['weekly', 'monthly'].map(t => (
                                    <button 
                                        type="button"
                                        key={t}
                                        onClick={() => { setType(t); setIsDirty(true); }}
                                        className={`px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-all ${type === t ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            
                            <button 
                                type="button"
                                onClick={addEvent}
                                className="flex items-center gap-1.5 bg-surface-3 hover:bg-surface-1 border border-border text-text px-4 py-2 rounded-xl text-[12px] font-bold transition-all shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Block
                            </button>

                            <button 
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-primary text-white px-5 py-2 rounded-xl text-[13px] font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
                            >
                                <Save className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>

                    <div className="h-[600px] w-full mt-4">
                        <TimeTableGrid events={events} setEvents={(fn) => { setEvents(fn); setIsDirty(true); }} type={type} />
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
                        <div className="relative w-full max-w-sm bg-surface-2 border border-border rounded-3xl shadow-2xl p-8 text-center">
                            <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">Delete Time Table?</h3>
                            <p className="text-sm text-text-muted mb-6">This action cannot be undone.</p>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-surface-3 text-text font-bold">Cancel</button>
                                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold">Delete</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {exitConfirm && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setExitConfirm(false)} />
                        <div className="relative w-full max-w-sm bg-surface-2 border border-border rounded-3xl shadow-2xl p-8 text-center">
                            <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <X className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold text-text mb-2">Unsaved Changes</h3>
                            <p className="text-sm text-text-muted mb-6">You have unsaved changes. Are you sure you want to exit without saving?</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={handleSave} disabled={loading} className="w-full py-3 rounded-xl bg-primary text-white font-bold shadow-md disabled:opacity-50">Save & Exit</button>
                                <button onClick={handleDiscardAndExit} className="w-full py-3 rounded-xl bg-surface-3 text-text font-bold">Discard Changes</button>
                                <button onClick={() => setExitConfirm(false)} className="w-full py-2 text-text-muted text-sm font-bold">Keep Editing</button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};

export default TimeTablePlannerTool;

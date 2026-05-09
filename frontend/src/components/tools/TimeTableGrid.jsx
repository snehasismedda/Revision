import React, { useState, useRef, useEffect } from 'react';
import { Trash2, X, Edit2, Repeat, AlertCircle } from 'lucide-react';

const colors = ['bg-primary', 'bg-blue-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];

const HOUR_WIDTH  = 80;  // px per hour
const ROW_HEIGHT  = 60;  // px per day row
const HEADER_H    = 40;  // px for the sticky hour header
const DAY_LABEL_W = 72;  // px for the sticky day-label column
const MIN_15      = HOUR_WIDTH / 4; // 20px = 15 min

const formatTime = (time) => {
    const h = Math.floor(time);
    const m = Math.round((time - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const TimeTableGrid = ({ events, setEvents, type }) => {
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [dragState, setDragState]         = useState(null);
    const [pendingEdit, setPendingEdit]     = useState(null);
    const gridRef = useRef(null); // ref on the event-overlay div

    const days  = type === 'weekly'
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : Array.from({ length: 31 }, (_, i) => `Day ${i + 1}`);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const normalizedEvents = events.map(e => ({ ...e, days: e.days || [e.day] }));

    /* ── coordinate helpers ──────────────────────────────────────────────── */
    const getTimeFromX = (clientX) => {
        if (!gridRef.current) return 0;
        const rect = gridRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        return Math.floor(x / MIN_15) * 0.25;
    };

    const getDayFromY = (clientY) => {
        if (!gridRef.current) return 0;
        const rect = gridRef.current.getBoundingClientRect();
        const y = Math.max(0, Math.min(clientY - rect.top, rect.height - 1));
        return Math.floor(y / ROW_HEIGHT);
    };

    /* ── mouse handlers ──────────────────────────────────────────────────── */
    const handleGridMouseDown = (e) => {
        if (e.target.closest('.event-block')) return;
        const time   = getTimeFromX(e.clientX);
        const dayIdx = getDayFromY(e.clientY);
        setDragState({ action: 'create', startTime: time, currentTime: time + 0.5, currentDay: dayIdx });
        setSelectedEvent(null);
    };

    const handleEventMouseDown = (e, evt, dayIdx, action) => {
        e.stopPropagation();
        const time = getTimeFromX(e.clientX);
        setDragState({
            action,
            eventId: evt.id,
            mouseStartTime: time,
            initialEvent: { ...evt, duration: evt.endHour - evt.startHour },
            tempEvent: { ...evt, hoverDay: dayIdx, originalHoverDay: dayIdx }
        });
        setSelectedEvent(evt.id);
    };

    /* ── drag tracking (mousemove / mouseup on window) ───────────────────── */
    useEffect(() => {
        const onMove = (e) => {
            if (!dragState) return;
            const time       = getTimeFromX(e.clientX);
            const hoverDay   = getDayFromY(e.clientY);

            if (dragState.action === 'create') {
                setDragState(p => ({ ...p, currentTime: time, currentDay: hoverDay }));
            } else if (dragState.action === 'move') {
                const delta    = time - dragState.mouseStartTime;
                const newStart = Math.max(0, Math.min(24 - dragState.initialEvent.duration, dragState.initialEvent.startHour + delta));
                setDragState(p => ({
                    ...p,
                    tempEvent: { ...p.tempEvent, startHour: newStart, endHour: newStart + p.initialEvent.duration, hoverDay }
                }));
            } else if (dragState.action === 'resizeRight') {
                const newEnd = Math.max(dragState.initialEvent.startHour + 0.25, time);
                setDragState(p => ({ ...p, tempEvent: { ...p.tempEvent, endHour: newEnd } }));
            } else if (dragState.action === 'resizeLeft') {
                const newStart = Math.min(dragState.initialEvent.endHour - 0.25, time);
                setDragState(p => ({ ...p, tempEvent: { ...p.tempEvent, startHour: newStart } }));
            }
        };

        const onUp = () => {
            if (!dragState) return;

            if (dragState.action === 'create') {
                const startHour = Math.min(dragState.startTime, dragState.currentTime);
                const endHour   = Math.max(dragState.startTime, dragState.currentTime);
                const finalEnd  = endHour === startHour ? startHour + 0.5 : endHour;
                const newEvent  = {
                    id: Date.now().toString(),
                    days: [type === 'weekly' ? dragState.currentDay : dragState.currentDay + 1],
                    startHour, endHour: finalEnd,
                    title: 'New Session', color: colors[0]
                };
                setEvents(prev => [...prev, newEvent]);
                setSelectedEvent(newEvent.id);
                setDragState(null);
            } else if (['move', 'resizeLeft', 'resizeRight'].includes(dragState.action)) {
                const original = events.find(e => e.id === dragState.eventId);
                if (original && original.days && original.days.length > 1) {
                    const snap   = dragState.tempEvent;
                    const action = dragState.action;
                    setDragState(null);          // detach cursor first
                    setPendingEdit({ type: 'drag', originalEvent: original, tempEvent: snap, action });
                } else {
                    applyDragEdit(dragState.eventId, dragState.tempEvent, dragState.action, 'all');
                    setDragState(null);
                }
            } else {
                setDragState(null);
            }
        };

        if (dragState) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup',   onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };
    }, [dragState, type, events]);

    /* ── keyboard delete ─────────────────────────────────────────────────── */
    useEffect(() => {
        const onKey = (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEvent && !pendingEdit) {
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                handleRemoveRequest(selectedEvent);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedEvent, pendingEdit, events]);

    /* ── edit helpers ────────────────────────────────────────────────────── */
    const applyDragEdit = (eventId, tempEvent, action, scope) => {
        if (scope === 'all') {
            setEvents(prev => prev.map(e => {
                if (e.id !== eventId) return e;
                const updated = { ...e, startHour: tempEvent.startHour, endHour: tempEvent.endHour };
                if (action === 'move' && tempEvent.hoverDay !== tempEvent.originalHoverDay) {
                    const origDay = type === 'weekly' ? tempEvent.originalHoverDay : tempEvent.originalHoverDay + 1;
                    const newDay  = type === 'weekly' ? tempEvent.hoverDay          : tempEvent.hoverDay + 1;
                    updated.days  = [...new Set(e.days.map(d => d === origDay ? newDay : d))];
                }
                return updated;
            }));
        } else {
            setEvents(prev => {
                const original   = prev.find(e => e.id === eventId);
                const origDay    = type === 'weekly' ? tempEvent.originalHoverDay : tempEvent.originalHoverDay + 1;
                const newDay     = type === 'weekly' ? tempEvent.hoverDay          : tempEvent.hoverDay + 1;
                const newEvent   = { ...original, id: Date.now().toString(), days: [newDay], startHour: tempEvent.startHour, endHour: tempEvent.endHour };
                const updOrig    = { ...original, days: original.days.filter(d => d !== origDay) };
                const rest       = prev.filter(e => e.id !== eventId);
                if (updOrig.days.length > 0) rest.push(updOrig);
                rest.push(newEvent);
                setSelectedEvent(newEvent.id);
                return rest;
            });
        }
    };

    const applyDeleteEdit = (eventId, scope) => {
        if (scope === 'all') {
            setEvents(prev => prev.filter(e => e.id !== eventId));
        } else if (scope === 'single' && pendingEdit) {
            const day = pendingEdit.dayToRemove;
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, days: e.days.filter(d => d !== day) } : e));
        }
        setSelectedEvent(null);
    };

    const handlePendingEditResolution = (scope) => {
        if (pendingEdit.type === 'drag')   applyDragEdit(pendingEdit.originalEvent.id, pendingEdit.tempEvent, pendingEdit.action, scope);
        if (pendingEdit.type === 'delete') applyDeleteEdit(pendingEdit.originalEvent.id, scope);
        setPendingEdit(null);
    };

    const updateSelectedEvent = (field, value) =>
        setEvents(prev => prev.map(e => e.id === selectedEvent ? { ...e, [field]: value } : e));

    const toggleRepeatDay = (dayIdx) => {
        setEvents(prev => prev.map(e => {
            if (e.id !== selectedEvent) return e;
            const cur  = e.days || [e.day];
            const next = cur.includes(dayIdx) ? cur.filter(d => d !== dayIdx) : [...cur, dayIdx];
            return { ...e, days: next.length > 0 ? next : [dayIdx] };
        }));
    };

    const handleRemoveRequest = (id) => {
        const ev = normalizedEvents.find(e => e.id === id);
        if (ev && ev.days.length > 1) {
            setPendingEdit({ type: 'delete', originalEvent: ev, dayToRemove: ev.days[0] });
        } else {
            setEvents(prev => prev.filter(e => e.id !== id));
            setSelectedEvent(null);
        }
    };

    const selectedEventObj = normalizedEvents.find(e => e.id === selectedEvent);

    /* ── helper: build event list for a day row ──────────────────────────── */
    const getRowEvents = (dayIdx) => {
        const realDay = type === 'weekly' ? dayIdx : dayIdx + 1;
        const evts    = normalizedEvents.filter(e => {
            if (dragState && dragState.eventId === e.id) return false;
            return e.days.includes(realDay);
        });
        if (dragState && dragState.action === 'create' && dragState.currentDay === dayIdx) {
            const sh = Math.min(dragState.startTime, dragState.currentTime);
            const eh = Math.max(dragState.startTime, dragState.currentTime);
            evts.push({ id: 'temp-create', startHour: sh, endHour: eh === sh ? sh + 0.25 : eh, title: 'New Session', color: 'bg-primary', isTemp: true });
        } else if (dragState && dragState.tempEvent && dragState.tempEvent.hoverDay === dayIdx) {
            evts.push({ ...dragState.tempEvent, isTemp: true });
        }
        return evts;
    };

    /* ── render ──────────────────────────────────────────────────────────── */
    const totalW = DAY_LABEL_W + 24 * HOUR_WIDTH;

    return (
        <div className="flex flex-col h-full bg-surface-2 rounded-3xl border border-border overflow-hidden relative">

            {/* ── SINGLE SCROLL CONTAINER ────────────────────────────────── */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <div style={{ width: `${totalW}px` }}>

                    {/* ── STICKY HEADER ROW ─────────────────────────────── */}
                    <div
                        className="flex sticky top-0 z-30 bg-surface-3 border-b border-border shadow-sm"
                        style={{ width: `${totalW}px` }}
                    >
                        {/* top-left corner */}
                        <div
                            className="shrink-0 sticky left-0 z-40 bg-surface-3 border-r border-border"
                            style={{ width: `${DAY_LABEL_W}px`, height: `${HEADER_H}px` }}
                        />
                        {/* hour labels */}
                        {hours.map(h => (
                            <div
                                key={h}
                                className="shrink-0 border-r border-border/40 text-[10px] font-bold text-text-muted flex items-center justify-center"
                                style={{ width: `${HOUR_WIDTH}px`, height: `${HEADER_H}px` }}
                            >
                                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                            </div>
                        ))}
                    </div>

                    {/* ── ROWS (each row = sticky day label + event area) ── */}
                    {/* The event-overlay div is positioned to match the rows */}
                    <div className="relative" style={{ width: `${totalW}px` }}>

                        {/* Lightweight row outlines (no event logic) */}
                        {days.map((dayLabel, dayIdx) => (
                            <div
                                key={dayIdx}
                                className="flex"
                                style={{ height: `${ROW_HEIGHT}px` }}
                            >
                                {/* Sticky day label */}
                                <div
                                    className="sticky left-0 z-10 shrink-0 flex items-center justify-center font-bold text-[12px] text-text bg-surface-2 border-b border-r border-border"
                                    style={{ width: `${DAY_LABEL_W}px`, height: `${ROW_HEIGHT}px` }}
                                >
                                    {dayLabel}
                                </div>
                                {/* Row background + bottom border */}
                                <div
                                    className="border-b border-border/40 bg-surface-1"
                                    style={{ width: `${24 * HOUR_WIDTH}px`, height: `${ROW_HEIGHT}px` }}
                                />
                            </div>
                        ))}

                        {/* Vertical hour lines (decorative, over rows) */}
                        <div
                            className="absolute top-0 pointer-events-none z-0 flex"
                            style={{ left: `${DAY_LABEL_W}px`, height: `${days.length * ROW_HEIGHT}px` }}
                        >
                            {hours.map(h => (
                                <div
                                    key={h}
                                    className="shrink-0 border-r border-border/30 h-full"
                                    style={{ width: `${HOUR_WIDTH}px` }}
                                />
                            ))}
                        </div>

                        {/* ── INTERACTIVE EVENT OVERLAY ── */}
                        <div
                            ref={gridRef}
                            className="absolute top-0 cursor-crosshair select-none z-20"
                            style={{
                                left:   `${DAY_LABEL_W}px`,
                                width:  `${24 * HOUR_WIDTH}px`,
                                height: `${days.length * ROW_HEIGHT}px`
                            }}
                            onMouseDown={handleGridMouseDown}
                        >
                            {days.map((_, dayIdx) =>
                                getRowEvents(dayIdx).map(evt => {
                                    const left     = evt.startHour * HOUR_WIDTH;
                                    const width    = (evt.endHour - evt.startHour) * HOUR_WIDTH;
                                    const top      = dayIdx * ROW_HEIGHT;
                                    const isSelected = selectedEvent === evt.id;

                                    return (
                                        <div
                                            key={evt.id + '-' + dayIdx + (evt.isTemp ? '-t' : '')}
                                            onMouseDown={(e) => !evt.isTemp && handleEventMouseDown(e, evt, dayIdx, 'move')}
                                            className={`event-block absolute rounded-lg ${evt.color || 'bg-primary'} overflow-hidden z-10 flex px-2 py-1 items-center
                                                ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-2 z-20 shadow-lg scale-[1.01]' : 'opacity-90 hover:opacity-100'}
                                                ${evt.isTemp ? 'opacity-60 pointer-events-none' : 'cursor-grab active:cursor-grabbing shadow-sm'}`}
                                            style={{
                                                left:   `${left}px`,
                                                width:  `${Math.max(20, width)}px`,
                                                top:    `${top + 4}px`,
                                                height: `${ROW_HEIGHT - 8}px`
                                            }}
                                        >
                                            {!evt.isTemp && (
                                                <div
                                                    className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize hover:bg-white/30 z-30"
                                                    onMouseDown={(e) => handleEventMouseDown(e, evt, dayIdx, 'resizeLeft')}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0 pointer-events-none">
                                                <div className="text-[11px] font-bold text-white truncate leading-tight">{evt.title}</div>
                                                <div className="text-[9px] text-white/80 font-medium truncate">
                                                    {formatTime(evt.startHour)} – {formatTime(evt.endHour)}
                                                </div>
                                            </div>
                                            {!evt.isTemp && (
                                                <div
                                                    className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize hover:bg-white/30 z-30"
                                                    onMouseDown={(e) => handleEventMouseDown(e, evt, dayIdx, 'resizeRight')}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── QUICK EDIT PANEL ─────────────────────────────────────────── */}
            {selectedEventObj && !pendingEdit && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-8">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[13px] font-bold text-text flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-primary" /> Edit Session
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-text-muted bg-surface-2 px-2 py-1 rounded-md border border-border">
                                {formatTime(selectedEventObj.startHour)} – {formatTime(selectedEventObj.endHour)}
                            </span>
                            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-surface-3 rounded-lg text-text-muted hover:text-text transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <input
                            autoFocus
                            type="text"
                            value={selectedEventObj.title}
                            onChange={(e) => updateSelectedEvent('title', e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-[13px] text-text outline-none focus:border-primary font-bold"
                            placeholder="Subject Name"
                        />

                        {type === 'weekly' && (
                            <div className="bg-surface-2 p-3 rounded-xl border border-border">
                                <span className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-1">
                                    <Repeat className="w-3 h-3" /> Repeat on
                                </span>
                                <div className="flex gap-1.5 mt-1.5">
                                    {['S','M','T','W','T','F','S'].map((d, i) => (
                                        <button
                                            key={i}
                                            onClick={() => toggleRepeatDay(i)}
                                            className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all
                                                ${selectedEventObj.days.includes(i)
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'bg-surface-3 border border-border text-text-muted hover:text-text'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateSelectedEvent('color', c)}
                                        className={`w-6 h-6 rounded-full ${c} transition-all
                                            ${selectedEventObj.color === c
                                                ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface'
                                                : 'opacity-60 hover:opacity-100 scale-90 hover:scale-100'}`}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-text-muted hidden sm:inline">Press Del to delete</span>
                                <button
                                    onClick={() => handleRemoveRequest(selectedEventObj.id)}
                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REPEATING EVENT MODAL ────────────────────────────────────── */}
            {pendingEdit && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-3">
                            <AlertCircle className="w-6 h-6 text-amber-500" />
                            <h3 className="text-lg font-bold text-text">Repeating Event</h3>
                        </div>
                        <p className="text-[13px] text-text-muted mb-6">
                            You're modifying a repeating event. Apply changes to just this instance or the entire series?
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => handlePendingEditResolution('single')}
                                className="w-full bg-surface-2 hover:bg-surface-3 border border-border text-text py-2.5 rounded-xl text-sm font-bold transition-all"
                            >
                                This event only
                            </button>
                            <button
                                onClick={() => handlePendingEditResolution('all')}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
                            >
                                All repeating events
                            </button>
                            <button
                                onClick={() => setPendingEdit(null)}
                                className="w-full text-text-muted hover:text-text py-2 rounded-xl text-sm font-bold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeTableGrid;

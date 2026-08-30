import React, { useState, useEffect } from 'react';
import { timeTableApi } from '../api';
import { Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const HOUR_WIDTH = 48; // px per hour in the timeline

const formatHour = (h) =>
    h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;

const formatTime = (t) => {
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i);

/* ── single gantt row ─────────────────────────────────────────────────── */
const GanttRow = ({ label, events, isToday }) => (
    <div className={`flex items-center gap-3 py-2 ${isToday ? 'bg-primary/[0.03] rounded-xl -mx-2 px-2' : ''}`}>
        <div className={`w-10 shrink-0 text-[11px] font-bold text-right ${isToday ? 'text-primary' : 'text-text-muted'}`}>
            {label}
        </div>
        {/* timeline */}
        <div className="relative flex-1 h-10 rounded-lg bg-surface-3/60 border border-border/50 overflow-hidden">
            {/* hour grid lines */}
            {hours.map(h => (
                <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: `${(h / 24) * 100}%` }}
                />
            ))}
            {/* current time indicator */}
            {isToday && (() => {
                const now = new Date();
                const pct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
                return (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/70 z-10" style={{ left: `${pct}%` }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-[3px] -mt-0.5 shadow" />
                    </div>
                );
            })()}
            {/* events */}
            {events.map(evt => {
                const left  = (evt.startHour / 24) * 100;
                const width = ((evt.endHour - evt.startHour) / 24) * 100;
                return (
                    <div
                        key={evt.id}
                        className={`absolute top-1 bottom-1 rounded-md ${evt.color || 'bg-primary'} flex items-center px-1.5 overflow-hidden border border-white/10 hover:brightness-110 transition-all cursor-default`}
                        style={{ left: `${left}%`, width: `${Math.max(0.5, width)}%` }}
                        title={`${evt.title}  ${formatTime(evt.startHour)} – ${formatTime(evt.endHour)}`}
                    >
                        <span className="text-[10px] font-bold text-white truncate">{evt.title}</span>
                    </div>
                );
            })}
        </div>
    </div>
);

/* ── widget ───────────────────────────────────────────────────────────── */
const ActiveTimeTableWidget = () => {
    const [activeTable, setActiveTable] = useState(null);
    const [loading, setLoading]         = useState(true);
    const [view, setView]               = useState('day');
    const [tick, setTick]               = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const tables = await timeTableApi.list();
                setActiveTable(tables.find(t => t.is_active) || null);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        })();
    }, []);

    // re-render every minute to keep current-time indicator accurate
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    if (loading) return <div className="bg-surface-2 animate-pulse h-56 rounded-3xl border border-border mt-8" />;
    if (!activeTable) return null;

    const now         = new Date();
    const currentDay  = now.getDay();   // 0–6
    const currentDate = now.getDate();  // 1–31

    const allEvents = (activeTable.data.events || []).map(e => ({ ...e, days: e.days || [e.day] }));

    /* build rows for the selected view */
    const rows = view === 'day'
        ? [{
            label:    activeTable.type === 'weekly' ? DAY_NAMES[currentDay] : `Day ${currentDate}`,
            isToday:  true,
            events:   allEvents.filter(e => activeTable.type === 'weekly'
                ? e.days.includes(currentDay)
                : e.days.includes(currentDate))
          }]
        : DAY_NAMES.map((name, idx) => ({
            label:   name,
            isToday: idx === currentDay,
            events:  allEvents.filter(e => e.days.includes(idx))
          }));

    /* find the earliest and latest event hour for nicer time hint */
    const todayEvents = rows[0]?.events ?? [];
    const nextEvent   = todayEvents
        .filter(e => e.startHour > now.getHours() + now.getMinutes() / 60)
        .sort((a, b) => a.startHour - b.startHour)[0];

    return (
        <div className="mb-10 fade-in stagger-2">
            {/* header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Calendar className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text leading-tight">{activeTable.name}</h2>
                        <p className="text-[11px] text-text-muted font-medium">
                            {activeTable.type === 'weekly' ? 'Weekly' : 'Monthly'} Schedule
                            {nextEvent && view === 'day' && (
                                <span className="ml-2 text-primary">
                                    · Next: {nextEvent.title} at {formatTime(nextEvent.startHour)}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-surface-2 rounded-xl p-1 border border-border shadow-sm">
                        {['day', 'week'].map(v => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setView(v)}
                                className={`px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-all ${view === v ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text'}`}
                            >
                                {v === 'day' ? 'Today' : 'Week'}
                            </button>
                        ))}
                    </div>
                    <Link to="/tools" className="text-[12px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                        Edit <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {/* gantt card */}
            <div className="bg-surface-2 border border-border rounded-3xl p-5">
                {/* hour axis */}
                <div className="flex items-end mb-1 pl-[52px]">
                    {hours.filter(h => h % 3 === 0).map(h => (
                        <div
                            key={h}
                            className="text-[9px] font-bold text-text-muted/60 text-left"
                            style={{ width: `${(3 / 24) * 100}%` }}
                        >
                            {formatHour(h)}
                        </div>
                    ))}
                </div>

                {/* rows */}
                <div className="space-y-0.5">
                    {rows.map((row, i) => (
                        <GanttRow key={i} {...row} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActiveTimeTableWidget;

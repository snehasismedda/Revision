import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAnalytics } from '../context/AnalyticsContext.jsx';
import {
    CalendarDays, FileText, HelpCircle, Lightbulb,
    Activity, Target, BookOpen, ChevronLeft, ChevronRight, Flame, RefreshCw
} from 'lucide-react';
import ActivityDetailModal from './modals/ActivityDetailModal.jsx';


/* ────────────────────── constants ────────────────────── */

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ────────────────────── helpers ────────────────────── */

const buildMonthGrid = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Mon=0 … Sun=6
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const weeks = [];
    let currentWeek = new Array(startDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        currentWeek.push(dateStr);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    return { weeks, monthName: MONTH_NAMES[month], year, month };
};

const getTotal = (d) => {
    if (!d) return 0;
    return (d.notes || 0) + (d.solutions || 0) + (d.questions || 0) + (d.sessions || 0) + (d.testAttempts || 0) + (d.revisionSessions || 0);
};

const getIntensity = (data) => {
    const total = getTotal(data);
    if (total === 0) return 0;
    if (total <= 2) return 1;
    if (total <= 5) return 2;
    if (total <= 10) return 3;
    return 4;
};

/* Richer intensity palette — layered violet fills with subtle differentiation */
const CELL_COLORS = [
    { bg: 'rgba(255,255,255,0.025)', border: 'rgba(255,255,255,0.03)' },                  // 0 — empty
    { bg: 'rgba(139,92,246,0.15)',   border: 'rgba(139,92,246,0.08)' },                    // 1 — low
    { bg: 'rgba(139,92,246,0.32)',   border: 'rgba(139,92,246,0.15)' },                    // 2 — medium
    { bg: 'rgba(124,58,237,0.52)',   border: 'rgba(139,92,246,0.25)' },                    // 3 — high
    { bg: 'rgba(109,40,217,0.78)',   border: 'rgba(139,92,246,0.40)' },                    // 4 — max
];

/** Compute current streak from today backwards */
const computeStreak = (activityData) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i <= 180; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Using local date string part: YYYY-MM-DD
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const data = activityData[key];
        
        if (data && getTotal(data) > 0) {
            streak++;
        } else {
            // If i is 0 (today) and there's no activity yet, we don't break the streak
            // but we don't increment it either. We check yesterday.
            if (i === 0) continue;
            break;
        }
    }
    return streak;
};

/* ────────────────────── Tooltip Pill ────────────────────── */

const STAT_ITEMS = [
    { key: 'notes', icon: FileText, label: 'Notes', color: '#34d399' },
    { key: 'questions', icon: HelpCircle, label: 'Questions', color: '#60a5fa' },
    { key: 'solutions', icon: Lightbulb, label: 'Solutions', color: '#fbbf24' },
    { key: 'sessions', icon: Activity, label: 'Sessions', color: '#22d3ee' },
    { key: 'testAttempts', icon: Target, label: 'Tests', color: '#f472b6' },
    { key: 'revisionSessions', icon: BookOpen, label: 'Revisions', color: '#a78bfa' },
];

const Tooltip = ({ date, data, x, y, containerWidth }) => {
    if (!date) return null;
    const d = new Date(date + 'T00:00:00');
    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const total = getTotal(data);

    const tooltipWidth = 240;
    const shouldFlipLeft = x + tooltipWidth / 2 > containerWidth - 20;
    const shouldFlipRight = x - tooltipWidth / 2 < 20;

    let translateX = '-50%';
    if (shouldFlipLeft) translateX = '-85%';
    if (shouldFlipRight) translateX = '-15%';

    return (
        <div
            className="absolute z-50 pointer-events-none"
            style={{ left: x, top: y - 10, transform: `translate(${translateX}, -100%)` }}
        >
            <div style={{
                background: 'rgba(10,10,18,0.97)',
                border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: 16,
                padding: '14px 16px',
                width: tooltipWidth,
                backdropFilter: 'blur(24px)',
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.06)',
            }}>
                {/* Date header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: total > 0 ? 10 : 0, paddingBottom: total > 0 ? 8 : 0, borderBottom: total > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.01em' }}>{formatted}</span>
                    <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                        color: total > 0 ? '#a78bfa' : '#475569',
                        background: total > 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                        padding: '3px 10px',
                        borderRadius: 20,
                    }}>
                        {total} {total === 1 ? 'action' : 'actions'}
                    </span>
                </div>

                {/* Stat rows */}
                {total > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {STAT_ITEMS.filter(s => data && data[s.key] > 0).map(({ key, icon: Icon, label, color }) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 6,
                                        background: `${color}12`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Icon style={{ width: 11, height: 11, color }} strokeWidth={2.5} />
                                    </div>
                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', fontFamily: 'Outfit, sans-serif' }}>{data[key]}</span>
                            </div>
                        ))}
                        {data && data.topicsRevised > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Topics Revised</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd' }}>{data.topicsRevised}</span>
                            </div>
                        )}
                    </div>
                )}

                {total === 0 && (
                    <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', margin: '6px 0 2px' }}>No activity recorded</p>
                )}
            </div>
        </div>
    );
};





/* ────────────────────── Month Card ────────────────────── */

const MonthCard = ({ grid, activityData, onCellHover, onCellLeave, isCurrentMonth, onMonthClick, onDayClick }) => {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    const activeDays = grid.weeks.flat().filter(d => d && activityData[d] && getTotal(activityData[d]) > 0).length;
    const totalDays = grid.weeks.flat().filter(Boolean).length;

    return (
        <div 
            className="flex-1 min-w-[210px] group/month cursor-pointer"
            onClick={() => onMonthClick(grid.month, grid.year)}
        >
            {/* Month Header */}
            <div className="flex items-center justify-between mb-4 px-0.5 transition-all duration-300 group-hover/month:translate-x-0.5">
                <div className="flex items-center gap-2">
                    <span className={`text-[15px] font-heading font-black tracking-tight transition-colors duration-300 ${isCurrentMonth
                        ? 'text-white'
                        : 'text-slate-400 group-hover/month:text-slate-200'
                        }`}>
                        {grid.monthName}
                    </span>
                    <span className="text-[9px] font-black tracking-widest text-slate-700 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5 opacity-60">
                        {grid.year}
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                    <div className="flex items-baseline gap-0.5">
                        <span className={`text-[13px] font-black tabular-nums transition-all duration-300 ${
                            activeDays > 0 
                            ? (isCurrentMonth ? 'text-violet-400' : 'text-slate-200') 
                            : 'text-slate-600'
                        }`}>
                            {activeDays}
                        </span>
                        <span className="text-[10px] font-bold text-slate-600 opacity-50">/</span>
                        <span className="text-[10px] font-bold text-slate-600 opacity-60">
                            {totalDays}
                        </span>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 scale-75 ${
                        activeDays > 0 
                        ? (isCurrentMonth ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]' : 'bg-slate-500') 
                        : 'bg-slate-800'
                    }`} />
                </div>
            </div>

            {/* Grid Body */}
            <div
                className="p-4 rounded-2xl transition-all duration-500 group-hover/month:border-white/10 group-hover/month:bg-white/[0.05] group-hover/month:shadow-xl group-hover/month:shadow-black/20"
                style={{
                    background: isCurrentMonth
                        ? 'linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(255,255,255,0.01) 100%)'
                        : 'rgba(255,255,255,0.02)',
                    border: isCurrentMonth
                        ? '1px solid rgba(139,92,246,0.15)'
                        : '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div style={{ display: 'flex', gap: 0 }}>
                    {/* Day labels column */}
                    <div className="flex flex-col gap-[3px] mr-3 opacity-20 pointer-events-none select-none">
                        {DAY_LABELS.map((label, i) => (
                            <div key={i} className="h-[14px] flex items-center justify-end w-4">
                                <span className="text-[7.5px] font-black uppercase text-white leading-none">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Week columns */}
                    <div className="flex gap-[3.5px] flex-1">
                        {grid.weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[3.5px] flex-1">
                                {week.map((date, di) => {
                                    if (!date) {
                                        return <div key={di} className="h-[14px] rounded-[3px] bg-white/[0.01]" />;
                                    }

                                    const data = activityData[date];
                                    const intensity = getIntensity(data);
                                    const isToday = date === todayStr;

                                    return (
                                        <div
                                            key={date}
                                            onMouseEnter={(e) => onCellHover(e, date)}
                                            onMouseLeave={onCellLeave}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDayClick(date);
                                            }}
                                            className="h-[16px] rounded-[3px] transition-all duration-200 relative group/cell"
                                            style={{
                                                background: CELL_COLORS[intensity].bg,
                                                cursor: 'pointer',
                                                outline: isToday ? '1.5px solid rgba(139,92,246,0.7)' : 'none',
                                                outlineOffset: 1.5,
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.4) translateY(-1px)';
                                                e.currentTarget.style.zIndex = '50';
                                                e.currentTarget.style.boxShadow = intensity > 0
                                                    ? '0 4px 12px rgba(139,92,246,0.45)'
                                                    : '0 4px 8px rgba(255,255,255,0.1)';
                                                e.currentTarget.style.borderRadius = '4px';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.zIndex = '0';
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.borderRadius = '3px';
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ────────────────────── Main Component ────────────────────── */

const ActivityHeatmap = () => {
    const { activityMap, loadingActivity, loadActivityMap, refreshActivityMap } = useAnalytics();
    const [tooltip, setTooltip] = useState({ visible: false, date: null, x: 0, y: 0 });
    const [detailMonth, setDetailMonth] = useState({ isOpen: false, month: null, year: null });
    const [monthOffset, setMonthOffset] = useState(0);
    const containerRef = useRef(null);

    const handleMonthClick = useCallback((month, year) => {
        setDetailMonth({ isOpen: true, month, year, initialDay: null });
    }, []);

    const handleDayClick = useCallback((date) => {
        if (!date) return;
        const d = new Date(date + 'T00:00:00');
        setDetailMonth({ 
            isOpen: true, 
            month: d.getMonth(), 
            year: d.getFullYear(),
            initialDay: date
        });
    }, []);

    useEffect(() => {
        if (Object.keys(activityMap).length === 0) {
            loadActivityMap(6);
        }
    }, [loadActivityMap, activityMap]);

    const handleCellHover = useCallback((e, date) => {
        if (!date) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        setTooltip({
            visible: true,
            date,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top,
        });
    }, []);

    const handleCellLeave = useCallback(() => {
        setTooltip(prev => ({ ...prev, visible: false }));
    }, []);

    const monthGrids = useMemo(() => {
        const now = new Date();
        const grids = [];
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i - monthOffset, 1);
            grids.push(buildMonthGrid(d.getFullYear(), d.getMonth()));
        }
        return grids;
    }, [monthOffset]);

    const stats = useMemo(() => {
        let total = 0, activeDays = 0, bestDay = 0;
        Object.values(activityMap).forEach(d => {
            const t = getTotal(d);
            if (t > 0) {
                total += t;
                activeDays++;
                if (t > bestDay) bestDay = t;
            }
        });
        const streak = computeStreak(activityMap);
        return { total, activeDays, streak, bestDay };
    }, [activityMap]);

    const canGoForward = monthOffset > 0;
    const canGoBack = monthOffset < 3;
    const currentMonth = new Date().getMonth();

    /* ── Loading skeleton ── */
    const hasData = Object.keys(activityMap).length > 0;
    if (loadingActivity && !hasData) {
        return (
            <div className="glass-card glass px-8 py-8 mb-8 fade-in relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] animate-pulse" />
                    <div className="flex flex-col gap-2">
                        <div className="w-32 h-4 rounded-lg bg-white/[0.06] animate-pulse" />
                        <div className="w-48 h-3 rounded-lg bg-white/5 animate-pulse" />
                    </div>
                </div>
                <div className="flex gap-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex-1 h-52 rounded-[2rem] bg-white/[0.02] animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="glass-card glass px-8 pt-8 pb-7 mb-8 fade-in relative overflow-hidden group/main"
        >
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 15,
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 100%)',
                        border: '1px solid rgba(139,92,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 16px -4px rgba(139,92,246,0.2)',
                    }}>
                        <CalendarDays style={{ width: 20, height: 20, color: '#a78bfa' }} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h3 style={{
                            fontSize: 18, fontWeight: 800, color: '#f8fafc',
                            fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em',
                            margin: 0, lineHeight: 1.1,
                        }}>
                            Study Heatmap
                        </h3>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, margin: '4px 0 0', opacity: 0.8 }}>
                            Visualizing your consistency across time
                        </p>
                    </div>
                </div>

                {/* Right side — Streak + Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Only Streak Badge */}
                    {stats.streak > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 18px',
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)',
                            border: '1px solid rgba(249,115,22,0.2)',
                            boxShadow: '0 8px 20px -6px rgba(249,115,22,0.25)',
                            transition: 'all 0.3s ease',
                        }}
                            className="hover:scale-105 active:scale-95 cursor-default"
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 10,
                                background: 'rgba(249,115,22,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Flame style={{ width: 14, height: 14, color: '#fb923c' }} strokeWidth={2.5} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 18, fontWeight: 900, color: '#fb923c', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                                    {stats.streak}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>
                                    Day Streak
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                            onClick={refreshActivityMap}
                            disabled={loadingActivity}
                            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/5 text-slate-500 hover:text-white disabled:opacity-30 group/refresh relative"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 transition-transform duration-700 ${loadingActivity ? 'animate-spin text-primary' : ''}`}
                            />
                            {/* Hover Label */}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/refresh:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover/refresh:scale-100 origin-bottom">
                                Refresh Stats
                            </span>
                        </button>
                        
                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)' }} />
                        
                        <button
                            onClick={() => setMonthOffset(p => p + 1)}
                            disabled={!canGoBack}
                            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/5 text-slate-500 hover:text-slate-300 disabled:opacity-20"
                        >
                            <ChevronLeft style={{ width: 16, height: 16 }} />
                        </button>
                        <button
                            onClick={() => setMonthOffset(p => p - 1)}
                            disabled={!canGoForward}
                            className="p-2 rounded-lg transition-all duration-200 hover:bg-white/5 text-slate-500 hover:text-slate-300 disabled:opacity-20"
                        >
                            <ChevronRight style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Month Grid Row ── */}
            <div style={{ display: 'flex', gap: 16 }}>
                {monthGrids.map((grid) => (
                    <MonthCard
                        key={`${grid.year}-${grid.month}`}
                        grid={grid}
                        activityData={activityMap}
                        onCellHover={handleCellHover}
                        onCellLeave={handleCellLeave}
                        isCurrentMonth={grid.month === currentMonth && monthOffset === 0}
                        onMonthClick={handleMonthClick}
                        onDayClick={handleDayClick}
                    />
                ))}
            </div>


            {/* ── Tooltip ── */}
            {tooltip.visible && tooltip.date && (
                <Tooltip
                    date={tooltip.date}
                    data={activityMap[tooltip.date]}
                    x={tooltip.x}
                    y={tooltip.y}
                    containerWidth={containerRef.current?.clientWidth || 800}
                />
            )}

            {/* ── Activity Detail Modal ── */}
            <ActivityDetailModal
                isOpen={detailMonth.isOpen}
                month={detailMonth.month}
                year={detailMonth.year}
                initialDay={detailMonth.initialDay}
                onClose={() => setDetailMonth(p => ({ ...p, isOpen: false }))}
            />

            {/* Scoped keyframes */}
            <style>{`
                @keyframes heatmap-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ActivityHeatmap;

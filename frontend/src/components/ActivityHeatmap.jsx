import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAnalytics } from '../context/AnalyticsContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
    CalendarDays, FileText, HelpCircle, Lightbulb,
    Activity, Target, BookOpen, ChevronLeft, ChevronRight, Flame, RefreshCw,
    Trophy, MousePointer2
} from 'lucide-react';
import ModalPortal from './ModalPortal.jsx';
import ActivityDetailModal from './modals/ActivityDetailModal.jsx';
import { formatDate } from '../utils/dateUtils';


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
const getCellColors = (theme) => [
    { bg: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.02)', border: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)', glow: 'none' },                  // 0 — empty
    { bg: 'rgba(139,92,246,0.12)',   border: 'rgba(139,92,246,0.08)', glow: 'none' },                    // 1 — low
    { bg: 'rgba(139,92,246,0.28)',   border: 'rgba(139,92,246,0.15)', glow: 'none' },                    // 2 — medium
    { bg: 'rgba(124,58,237,0.48)',   border: 'rgba(139,92,246,0.25)', glow: 'rgba(139,92,246,0.1)' },    // 3 — high
    { bg: 'rgba(109,40,217,0.75)',   border: 'rgba(139,92,246,0.40)', glow: 'rgba(139,92,246,0.25)' },   // 4 — max
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
    const formatted = formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
    const total = getTotal(data);

    const tooltipWidth = 220;
    const shouldFlipLeft = x + tooltipWidth / 2 > containerWidth - 20;
    const shouldFlipRight = x - tooltipWidth / 2 < 20;

    let translateX = '-50%';
    if (shouldFlipLeft) translateX = '-85%';
    if (shouldFlipRight) translateX = '-15%';

    return (
        <div
            className="absolute z-50 pointer-events-none fade-in"
            style={{ left: x, top: y - 12, transform: `translate(${translateX}, -100%)` }}
        >
            <div className="bg-surface-2 border border-border rounded-[20px] p-4 backdrop-blur-md shadow-2xl" style={{ width: tooltipWidth }}>
                {/* Date header */}
                <div className={`flex items-center justify-between ${total > 0 ? 'mb-3 pb-2.5 border-b border-border' : ''}`}>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-black text-text font-heading">{formatted}</span>
                        <span className="text-[10px] text-text-muted font-semibold mt-0.5">{total === 0 ? 'No activities' : `${total} ${total === 1 ? 'activity' : 'activities'}`}</span>
                    </div>
                    {total > 0 && (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                             <Activity className="w-3.5 h-3.5 text-primary-light" strokeWidth={2.5} />
                        </div>
                    )}
                </div>

                {/* Stat rows */}
                {total > 0 && (
                    <div className="flex flex-col gap-1.5">
                        {STAT_ITEMS.filter(s => data && data[s.key] > 0).map(({ key, icon: Icon, label, color }) => (
                            <div key={key} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Icon style={{ color }} className="w-3 h-3 opacity-90" strokeWidth={2.5} />
                                    <span className="text-xs text-text-muted font-medium">{label}</span>
                                </div>
                                <span className="text-[13px] font-black text-text font-heading">{data[key]}</span>
                            </div>
                        ))}
                        {data && data.topicsRevised > 0 && (
                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/50">
                                <span className="text-[11px] text-text-muted font-semibold">Topics Revised</span>
                                <span className="text-xs font-black text-primary-light">{data.topicsRevised}</span>
                            </div>
                        )}
                    </div>
                )}

                {total === 0 && (
                    <div className="flex items-center gap-2 justify-center py-1">
                        <span className="text-[11px] text-text-muted font-semibold">Stay consistent!</span>
                    </div>
                )}
            </div>
            {/* Arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border" />
        </div>
    );
};


/* ────────────────────── Month Card ────────────────────── */

const MonthCard = ({ grid, activityData, onCellHover, onCellLeave, isCurrentMonth, onMonthClick, onDayClick, theme }) => {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    const activeDays = grid.weeks.flat().filter(d => d && activityData[d] && getTotal(activityData[d]) > 0).length;
    const totalDays = grid.weeks.flat().filter(Boolean).length;
    const cellColors = getCellColors(theme);

    return (
        <div 
            className="flex-1 min-w-[210px] group/month cursor-pointer"
            onClick={() => onMonthClick(grid.month, grid.year)}
        >
            {/* Month Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex flex-col gap-0.5">
                    <span className={`text-[16px] font-heading font-black tracking-tight transition-all duration-300 ${isCurrentMonth
                        ? 'text-text'
                        : 'text-text-muted group-hover/month:text-text'
                        }`}>
                        {grid.monthName}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-60">
                         <span className="text-[9px] font-black tracking-wider text-text-muted uppercase">
                            {grid.year}
                        </span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-baseline gap-1">
                        <span className={`text-[14px] font-black tabular-nums transition-all duration-300 ${
                            activeDays > 0 
                            ? (isCurrentMonth ? 'text-violet-400' : 'text-text') 
                            : 'text-text-muted'
                        }`}>
                            {activeDays}
                        </span>
                        <span className="text-[10px] font-bold text-text-muted opacity-40">/</span>
                        <span className="text-[10px] font-bold text-text-muted">
                            {totalDays}
                        </span>
                    </div>
                    <div className={`h-[2px] w-8 rounded-full transition-all duration-500 ${
                        activeDays > 0 
                        ? (isCurrentMonth ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-surface-2') 
                        : 'bg-surface-2'
                    }`} />
                </div>
            </div>

            {/* Grid Body */}
            <div
                className="p-4.5 rounded-[1.25rem] transition-all duration-500 group-hover/month:border-border group-hover/month:bg-surface-3/10 group-hover/month:shadow-2xl group-hover/month:shadow-black/40"
                style={{
                    background: isCurrentMonth
                        ? (theme === 'light' ? 'linear-gradient(180deg, rgba(139,92,246,0.05) 0%, rgba(248,250,252,0.4) 100%)' : 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(20,20,30,0.4) 100%)')
                        : (theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'),
                    border: isCurrentMonth
                        ? (theme === 'light' ? '1px solid rgba(139,92,246,0.15)' : '1px solid rgba(139,92,246,0.2)')
                        : (theme === 'light' ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.06)'),
                }}
            >
                <div style={{ display: 'flex', gap: 0 }}>
                    {/* Day labels column */}
                    <div className="flex flex-col gap-[4px] mr-3 opacity-30 pointer-events-none select-none">
                        {DAY_LABELS.map((label, i) => (
                            <div key={i} className="h-[14px] flex items-center justify-end w-4">
                                <span className="text-[8px] font-black uppercase text-text-muted leading-none">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Week columns */}
                    <div className="flex gap-[4px] flex-1">
                        {grid.weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[4px] flex-1">
                                {week.map((date, di) => {
                                    if (!date) {
                                        return <div key={di} className="h-[15px] rounded-[4px] bg-surface-3/10" />;
                                    }

                                    const data = activityData[date];
                                    const intensity = getIntensity(data);
                                    const isToday = date === todayStr;
                                    const dayNum = date.split('-')[2].replace(/^0/, '');

                                    return (
                                        <div
                                            key={date}
                                            onMouseEnter={(e) => onCellHover(e, date)}
                                            onMouseLeave={onCellLeave}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDayClick(date);
                                            }}
                                            className="h-[15px] rounded-[4px] transition-all duration-300 relative group/cell flex items-center justify-center overflow-hidden"
                                            style={{
                                                background: cellColors[intensity].bg,
                                                boxShadow: intensity > 2 ? `0 0 10px ${cellColors[intensity].glow}` : 'none',
                                                cursor: 'pointer',
                                                outline: isToday ? '1.5px solid #a78bfa' : 'none',
                                                outlineOffset: 2,
                                                zIndex: isToday ? 10 : 0
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.25) translateY(-2px)';
                                                e.currentTarget.style.zIndex = '50';
                                                e.currentTarget.style.boxShadow = intensity > 0
                                                    ? '0 6px 15px rgba(139,92,246,0.4)'
                                                    : (theme === 'light' ? '0 4px 10px rgba(0,0,0,0.05)' : '0 4px 10px rgba(255,255,255,0.08)');
                                                e.currentTarget.style.background = intensity === 0 ? (theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)') : cellColors[intensity].bg;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.zIndex = isToday ? '10' : '0';
                                                e.currentTarget.style.boxShadow = intensity > 2 ? `0 0 10px ${cellColors[intensity].glow}` : 'none';
                                                e.currentTarget.style.background = cellColors[intensity].bg;
                                            }}
                                        >
                                            <span 
                                                className={`text-[7px] font-black select-none pointer-events-none transition-all duration-300
                                                    ${intensity > 0 ? 'text-text/40 group-hover/cell:text-text' : 'text-transparent group-hover/cell:text-text-muted'}
                                                `}
                                            >
                                                {dayNum}
                                            </span>
                                        </div>
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
    const { theme } = useTheme();
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
            <div className="bg-surface border border-border px-8 py-8 mb-8 fade-in relative overflow-hidden rounded-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-surface-3/10 animate-pulse" />
                    <div className="flex flex-col gap-2">
                        <div className="w-32 h-4 rounded-lg bg-surface-3/10 animate-pulse" />
                        <div className="w-48 h-3 rounded-lg bg-surface-3/5 animate-pulse" />
                    </div>
                </div>
                <div className="flex gap-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="flex-1 h-52 rounded-[2rem] bg-surface-3/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="bg-surface border border-border px-8 pt-8 pb-8 mb-8 fade-in relative overflow-hidden group/main rounded-2xl"
        >
            {/* ── Background Decoration ── */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none" />

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
                        <div style={{
                            width: 52, height: 52, borderRadius: 16,
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.05) 100%)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 12px 24px -6px rgba(139,92,246,0.3)',
                            position: 'relative'
                        }}>
                            <CalendarDays style={{ width: 22, height: 22, color: '#a78bfa' }} strokeWidth={2.2} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-text font-heading tracking-tight m-0 flex items-center gap-2">
                            Consistency Map
                            <span className="text-[10px] font-black tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 border-opacity-50 uppercase">
                                Analysis
                            </span>
                        </h3>
                        <p className="text-sm text-text-muted font-medium mt-1">
                            Your learning journey visualized over time
                        </p>
                    </div>
                </div>

                {/* Header Stats Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Activity Stats */}
                    <div className="flex items-center bg-surface-3/5 border border-border rounded-2xl p-1.5 pr-4 gap-4">
                        <div className="flex items-center gap-4 border-border pr-4 pl-1">
                            {/* Streak Badge */}
                            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-[0_4px_12px_rgba(249,115,22,0.1)]">
                                <Flame className="w-4 h-4 text-orange-400 fill-orange-400/20" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-orange-400 leading-none">{stats.streak}</span>
                                    <span className="text-[8px] font-black text-orange-400/60 uppercase tracking-tighter">Streak</span>
                                </div>
                            </div>
                        </div>

                        {/* Best Day / Trophy */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-text leading-none">{stats.bestDay}</span>
                                <span className="text-[8px] font-black text-text-muted uppercase tracking-tighter">Peak Day</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-10 bg-border mx-1" />

                    {/* Navigation Controls */}
                    <div className="flex items-center gap-2 bg-surface-3/5 p-1.5 rounded-2xl border border-border">
                        <button
                            onClick={refreshActivityMap}
                            disabled={loadingActivity}
                            className="p-2.5 rounded-xl transition-all duration-200 hover:bg-surface-3/10 text-text-muted hover:text-text disabled:opacity-30 group/refresh relative"
                        >
                            <RefreshCw
                                className={`w-4 h-4 transition-transform duration-700 ${loadingActivity ? 'animate-spin text-violet-400' : 'group-hover/refresh:rotate-180'}`}
                            />
                        </button>
                        
                        <div className="w-px h-5 bg-border" />
                        
                        <button
                            onClick={() => setMonthOffset(p => p + 1)}
                            disabled={!canGoBack}
                            className="p-2.5 rounded-xl transition-all duration-200 hover:bg-surface-3/10 text-text-muted hover:text-text disabled:opacity-20"
                        >
                            <ChevronLeft className="w-4.5 h-4.5" />
                        </button>
                        <button
                            onClick={() => setMonthOffset(p => p - 1)}
                            disabled={!canGoForward}
                            className="p-2.5 rounded-xl transition-all duration-200 hover:bg-surface-3/10 text-text-muted hover:text-text disabled:opacity-20"
                        >
                            <ChevronRight className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Month Grid Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
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
                        theme={theme}
                    />
                ))}
            </div>

            {/* Hint Footer */}
            <div className="mt-8 pt-6 border-top border-border flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Less</span>
                        <div className="flex gap-[3px]">
                            {getCellColors(theme).map((c, i) => (
                                <div key={i} className="w-[10px] h-[10px] rounded-[2px]" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
                            ))}
                        </div>
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">More</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 text-text-muted">
                    <MousePointer2 className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click month or day for details</span>
                </div>
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

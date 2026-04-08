import { useState, useEffect, useMemo } from 'react';
import { analyticsApi } from '../../api';
import {
    X, Calendar, FileText, HelpCircle, Lightbulb,
    Activity, Target, ChevronRight, Hash, BookOpen, Clock, 
    ArrowLeft, CalendarDays, Filter
} from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import { formatDate } from '../../utils/dateUtils';

const ActivityDetailModal = ({ isOpen, onClose, month, year, initialDay }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('notes');
    const [selectedDay, setSelectedDay] = useState(null); // YYYY-MM-DD or null for all month

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        if (isOpen && month !== undefined && year !== undefined) {
            const load = async () => {
                setLoading(true);
                try {
                    const res = await analyticsApi.monthActivityDetail(month, year);
                    // Convert full ISO UTC keys to local (IST) YYYY-MM-DD keys
                    if (res?.daily) {
                        const localDaily = {};
                        Object.entries(res.daily).forEach(([utcDate, value]) => {
                            const d = new Date(utcDate); // parses full ISO string to local time
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            const localKey = `${y}-${m}-${day}`;
                            
                            if (localDaily[localKey]) {
                                // Merge subjects under same local day
                                Object.values(value.subjects).forEach(s => {
                                    const existing = localDaily[localKey].subjects[s.id];
                                    if (existing) {
                                        existing.notes += (s.notes || 0);
                                        existing.solutions += (s.solutions || 0);
                                        existing.questions += (s.questions || 0);
                                        existing.sessions += (s.sessions || 0);
                                        existing.topics_revised += (s.topics_revised || 0);
                                    } else {
                                        localDaily[localKey].subjects[s.id] = { ...s };
                                    }
                                });
                                value.tests.forEach(t => localDaily[localKey].tests.push(t));
                            } else {
                                localDaily[localKey] = value;
                            }
                        });
                        res.daily = localDaily;
                    }
                    setData(res);
                } catch (err) {
                    console.error('[ActivityDetailModal] Load error:', err);
                } finally {
                    setLoading(false);
                }
            };
            load();
            setSelectedDay(initialDay || null);
        }
    }, [isOpen, month, year, initialDay]);

    // Calendar Grid Logic for the specific month
    const calendarDays = useMemo(() => {
        if (month === undefined || year === undefined) return [];
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Start from Monday (1)
        const startOffset = (firstDay + 6) % 7;
        const days = [];
        for (let i = 0; i < startOffset; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ day: d, date: dateStr });
        }
        return days;
    }, [month, year]);

    // Aggregated Results based on selection
    const results = useMemo(() => {
        if (!data?.daily) return { bySubject: [], tests: [], totals: {} };

        let combinedSubjects = {};
        let combinedTests = [];

        const daysToProcess = selectedDay ? [selectedDay] : Object.keys(data.daily);

        daysToProcess.forEach(date => {
            const dayData = data.daily[date];
            if (!dayData) return;

            // Merge subjects
            Object.values(dayData.subjects).forEach(s => {
                if (!combinedSubjects[s.id]) {
                    combinedSubjects[s.id] = { 
                        ...s, 
                        topicsRevised: (s.topics_revised || 0),
                        notes: (s.notes || 0),
                        solutions: (s.solutions || 0),
                        questions: (s.questions || 0),
                        sessions: (s.sessions || 0)
                    };
                } else {
                    combinedSubjects[s.id].notes += (s.notes || 0);
                    combinedSubjects[s.id].solutions += (s.solutions || 0);
                    combinedSubjects[s.id].questions += (s.questions || 0);
                    combinedSubjects[s.id].sessions += (s.sessions || 0);
                    combinedSubjects[s.id].topicsRevised += (s.topics_revised || 0);
                }
            });

            // Merge tests
            dayData.tests.forEach(t => {
                const existing = combinedTests.find(x => x.name === t.name);
                if (existing) existing.count += t.count;
                else combinedTests.push({ ...t });
            });
        });

        const bySubject = Object.values(combinedSubjects);
        const totals = {
            notes: bySubject.reduce((acc, s) => acc + s.notes, 0),
            questions: bySubject.reduce((acc, s) => acc + s.questions, 0),
            solutions: bySubject.reduce((acc, s) => acc + s.solutions, 0),
            sessions: bySubject.reduce((acc, s) => acc + s.sessions, 0),
            tests: combinedTests.reduce((acc, t) => acc + t.count, 0),
            topicsRevised: bySubject.reduce((acc, s) => acc + s.topicsRevised, 0)
        };

        return { bySubject, tests: combinedTests, totals };
    }, [data, selectedDay]);

    const tabs = useMemo(() => [
        { id: 'notes', label: 'Notes', icon: FileText, color: 'emerald' },
        { id: 'questions', label: 'Questions', icon: HelpCircle, color: 'blue' },
        { id: 'solutions', label: 'Solutions', icon: Lightbulb, color: 'amber' },
        { id: 'sessions', label: 'Sessions', icon: Activity, color: 'cyan' },
        { id: 'topicsRevised', label: 'Revised Topics', icon: BookOpen, color: 'purple' },
        { id: 'tests', label: 'Tests', icon: Target, color: 'pink' }
    ], []);

    const activeTabColor = useMemo(() => {
        return tabs.find(t => t.id === activeTab)?.color || 'violet';
    }, [activeTab, tabs]);

    const currentTabData = useMemo(() => {
        if (!results) return [];
        if (activeTab === 'tests') {
            return results.tests.map(t => ({ id: t.name, name: t.name, tests: t.count, isTest: true }));
        }
        return results.bySubject.filter(s => s[activeTab] > 0).sort((a, b) => b[activeTab] - a[activeTab]);
    }, [results, activeTab]);

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="relative w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden rounded-[2.5rem] border border-white/[0.08] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.6)]"
                    style={{ background: 'rgba(10, 10, 18, 0.98)', backdropFilter: 'blur(24px)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ─── Background Decor ─── */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/5 blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2" />

                    {/* ═══ Header ═══ */}
                    <div className="flex items-center justify-between px-10 py-7 border-b border-white/[0.06] shrink-0 relative z-10 bg-white/[0.01]">
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all duration-500" />
                                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 text-primary flex items-center justify-center shadow-lg shadow-primary/10 transition-transform group-hover:scale-105">
                                    <CalendarDays className="w-6 h-6" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-heading font-black text-white tracking-tight leading-none flex items-center gap-3">
                                    Activity <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark">Audit</span>
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-slate-400">
                                        <Calendar className="w-3 h-3 text-primary/60" />
                                        {monthNames[month]} {year}
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-slate-600" />
                                        {selectedDay 
                                            ? formatDate(selectedDay, { day: 'numeric', month: 'long', year: 'numeric' }) 
                                            : 'Continuous Progress Tracking'
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {selectedDay && (
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="flex items-center gap-2 text-[12px] font-black text-white px-5 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer shadow-sm active:scale-95 group"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                    Full Month
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-3 text-slate-500 hover:text-white hover:bg-white/[0.08] rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/10 group active:scale-90"
                            >
                                <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                    </div>

                    {/* ═══ Main Content ═══ */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">

                        {/* ─── Sidebar (Calendar & Tabs) ─── */}
                        <div className="w-full lg:w-[340px] shrink-0 border-r border-white/5 flex flex-col overflow-hidden bg-white/[0.01]">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                                {/* Calendar Section */}
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pointer-events-none">
                                            Timeline Context
                                        </label>
                                        <span className="text-[10px] font-black text-primary/60 uppercase">{monthNames[month].substring(0,3)}</span>
                                    </div>

                                    <div className="p-4 rounded-[1.75rem] bg-black/20 border border-white/5 shadow-inner">
                                        <div className="grid grid-cols-7 gap-2 mb-3">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                                <div key={i} className="text-[10px] font-black text-slate-700 text-center">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1.5">
                                            {calendarDays.map((day, i) => {
                                                if (!day) return <div key={i} className="aspect-square" />;

                                                const hasActivity = data?.daily?.[day.date];
                                                const isSelected = selectedDay === day.date;

                                                return (
                                                    <button
                                                        key={day.date}
                                                        onClick={() => setSelectedDay(isSelected ? null : day.date)}
                                                        className={`aspect-square rounded-xl text-[11px] font-black transition-all flex items-center justify-center cursor-pointer border ${isSelected
                                                                ? 'bg-primary text-white shadow-[0_8px_20px_-4px_rgba(139,92,246,0.6)] border-primary-light/40 scale-110 z-10'
                                                                : hasActivity
                                                                    ? 'bg-primary/10 text-primary-light border-primary/20 hover:bg-primary/20'
                                                                    : 'bg-white/[0.03] border-white/5 text-slate-600 hover:text-slate-300 hover:bg-white/10 hover:border-white/20'
                                                            }`}
                                                    >
                                                        {day.day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Category Navigation */}
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pointer-events-none">Metric Filters</label>
                                        <Filter className="w-3 h-3 text-slate-700" />
                                    </div>
                                    <div className="space-y-2">
                                        {tabs.map((tab) => {
                                            const count = results.totals[tab.id] || 0;
                                            const isActive = activeTab === tab.id;
                                            
                                            const colorStyles = {
                                                emerald: {
                                                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                    icon: 'bg-emerald-500/20 text-emerald-400',
                                                    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                                },
                                                blue: {
                                                    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                                    icon: 'bg-blue-500/20 text-blue-400',
                                                    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                                },
                                                amber: {
                                                    active: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                    icon: 'bg-amber-500/20 text-amber-400',
                                                    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                                                },
                                                cyan: {
                                                    active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                                                    icon: 'bg-cyan-500/20 text-cyan-400',
                                                    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20'
                                                },
                                                purple: {
                                                    active: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                                                    icon: 'bg-purple-500/20 text-purple-400',
                                                    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/20'
                                                },
                                                pink: {
                                                    active: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                                                    icon: 'bg-pink-500/20 text-pink-400',
                                                    badge: 'bg-pink-500/20 text-pink-400 border-pink-500/20'
                                                }
                                            };

                                            const styles = colorStyles[tab.color] || colorStyles.emerald;

                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`w-full flex items-center gap-4 px-4.5 py-3.5 rounded-2xl transition-all cursor-pointer group/tab border ${isActive
                                                            ? `${styles.active} shadow-lg shadow-black/20`
                                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border-transparent'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-xl transition-all ${isActive ? styles.icon : 'bg-white/5 text-slate-600 group-hover/tab:text-slate-400 group-hover/tab:bg-white/10'}`}>
                                                        <tab.icon className={`w-4 h-4 ${isActive ? 'scale-110' : ''}`} />
                                                    </div>
                                                    <span className={`flex-1 text-left text-[14px] font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>{tab.label}</span>
                                                    {count > 0 && (
                                                        <span className={`min-w-[28px] h-6 px-2.5 flex items-center justify-center rounded-xl text-[11px] font-black transition-all ${isActive
                                                                ? styles.badge
                                                                : 'bg-white/5 text-slate-600 border border-white/5'
                                                            }`}>
                                                            {count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── Main Panel (Audit List) ─── */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10 relative active-scrollbar">
                            <div className="p-10 max-w-4xl mx-auto w-full relative z-10">
                                <div className="mb-10 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.3em] mb-2">Audit Log Analytics</h4>
                                        <div className="h-1 w-16 bg-gradient-to-r from-primary/40 to-transparent rounded-full" />
                                    </div>
                                    <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-full">
                                        {loading ? 'Refreshing...' : `${currentTabData.length} Entity Records`}
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="space-y-4 pt-2">
                                        {Array(8).fill(0).map((_, i) => (
                                            <div key={i} className="h-20 rounded-3xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                                        ))}
                                    </div>
                                ) : currentTabData.length > 0 ? (
                                    <div className="space-y-3">
                                        {currentTabData.map((item, i) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-6 px-7 py-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-1 block-reveal"
                                                style={{ animationDelay: `${i * 30}ms` }}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[15px] font-black shrink-0 transition-all group-hover:scale-105 shadow-xl ${item.isTest
                                                        ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400 shadow-pink-500/5'
                                                        : `bg-${activeTabColor}-500/10 border border-${activeTabColor}-500/30 text-${activeTabColor}-400 shadow-${activeTabColor}-500/5`
                                                    }`}>
                                                    {item.isTest ? <Target className="w-6 h-6" /> : item.name.substring(0, 2).toUpperCase()}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[17px] font-heading font-black text-slate-100 group-hover:text-white transition-colors truncate tracking-tight">
                                                        {item.name}
                                                    </h4>
                                                    <div className="flex items-center gap-4 mt-1.5">
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/20 border border-white/5">
                                                             <Clock className="w-3 h-3 text-slate-600" />
                                                             <span className="text-[10px] font-bold text-slate-500 uppercase">Tracked Action</span>
                                                        </div>
                                                        {item.topicsRevised > 0 && activeTab !== 'topicsRevised' && (
                                                            <p className="text-[11px] font-bold text-primary/50 flex items-center gap-1.5">
                                                                <BookOpen className="w-3.5 h-3.5" />
                                                                {item.topicsRevised} Revised
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 shrink-0">
                                                    <div className="flex flex-col items-end">
                                                        <div className="px-5 py-2.5 rounded-2xl bg-black/40 border border-white/10 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all flex flex-col items-center min-w-[100px]">
                                                            <span className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">
                                                                {activeTab === 'tests' ? item.tests : item[activeTab]}
                                                            </span>
                                                            <span className="mt-1 text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-primary-light/60 transition-colors">
                                                                {activeTab === 'topicsRevised' ? 'REVISED' : activeTab === 'tests' ? 'COUNT' : activeTab}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:text-primary transition-all shadow-inner">
                                                        <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-24 flex flex-col items-center justify-center fade-in">
                                        <div className="relative mb-8">
                                            <div className="absolute inset-0 bg-slate-500/10 blur-3xl rounded-full" />
                                            <div className="relative w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/[0.06] flex items-center justify-center shadow-2xl">
                                                <Hash className="w-10 h-10 text-slate-800" strokeWidth={1} />
                                            </div>
                                        </div>
                                        <h4 className="text-xl font-heading font-black text-slate-500 tracking-tight">Vortex of Silence</h4>
                                        <p className="text-slate-700 text-[12px] font-bold mt-2 uppercase tracking-widest">No {activeTab} activity recorded {selectedDay ? 'on this specific day' : 'for this period'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};
export default ActivityDetailModal;

import { useState, useEffect, useMemo } from 'react';
import { analyticsApi } from '../../api';
import {
    X, Calendar, FileText, HelpCircle, Lightbulb,
    Activity, Target, ChevronRight, Hash, BookOpen, Clock
} from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

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
        let totalTopicsRevised = 0;

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
                    className="relative w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.5)]"
                    style={{ background: 'rgba(12, 12, 22, 0.95)', backdropFilter: 'blur(10px)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ═══ Header ═══ */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] shrink-0 bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg shadow-primary/5">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-heading font-bold text-white tracking-tight leading-none">
                                    Activity <span className="text-primary/70">Audit</span>
                                </h3>
                                <p className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-primary/40" />
                                    {monthNames[month]} {year} &middot; {selectedDay ? `Day ${parseInt(selectedDay.split('-')[2])} detail` : 'Full month analytics'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedDay && (
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="text-[11px] font-bold text-primary hover:text-white px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary transition-all cursor-pointer shadow-sm active:scale-95"
                                >
                                    View Full Month
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2.5 text-slate-500 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all cursor-pointer border border-transparent hover:border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ═══ Main Content ═══ */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                        {/* ─── Sidebar (Calendar) ─── */}
                        <div className="w-full lg:w-[320px] shrink-0 border-r border-white/5 flex flex-col overflow-hidden bg-black/20">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                {/* Calendar Section */}
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em] px-1 pointer-events-none">
                                        Time Context: {monthNames[month].substring(0,3)}
                                    </label>

                                    <div className="p-2 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                                        <div className="grid grid-cols-7 gap-1.5 mb-2">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                                <div key={i} className="text-[9px] font-black text-slate-600 text-center py-1">{d}</div>
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
                                                        className={`aspect-square rounded-lg text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer border ${isSelected
                                                                ? 'bg-primary text-white shadow-lg shadow-primary/30 border-primary-light/30 scale-110 z-10'
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
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em] px-1 pointer-events-none">Activity Categories</label>
                                    <div className="space-y-1.5">
                                        {tabs.map((tab) => {
                                            const count = results.totals[tab.id] || 0;
                                            const isActive = activeTab === tab.id;
                                            
                                            // Static color map for Tailwind JIT to pick up the classes
                                            const colorStyles = {
                                                emerald: {
                                                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                                                    icon: 'bg-emerald-500/20 text-emerald-400',
                                                    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                                },
                                                blue: {
                                                    active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                                                    icon: 'bg-blue-500/20 text-blue-400',
                                                    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                                },
                                                amber: {
                                                    active: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                                                    icon: 'bg-amber-500/20 text-amber-400',
                                                    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                                                },
                                                cyan: {
                                                    active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
                                                    icon: 'bg-cyan-500/20 text-cyan-400',
                                                    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20'
                                                },
                                                purple: {
                                                    active: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                                                    icon: 'bg-purple-500/20 text-purple-400',
                                                    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/20'
                                                },
                                                pink: {
                                                    active: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
                                                    icon: 'bg-pink-500/20 text-pink-400',
                                                    badge: 'bg-pink-500/20 text-pink-400 border-pink-500/20'
                                                }
                                            };

                                            const styles = colorStyles[tab.color] || colorStyles.emerald;

                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[13px] font-semibold transition-all cursor-pointer group/tab border ${isActive
                                                            ? `${styles.active} shadow-[0_4px_12px_rgba(0,0,0,0.2)]`
                                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border-transparent'
                                                        }`}
                                                >
                                                    <div className={`p-1.5 rounded-lg transition-all ${isActive ? styles.icon : 'bg-white/5 text-slate-600 group-hover/tab:text-slate-400 group-hover/tab:bg-white/10'}`}>
                                                        <tab.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="flex-1 text-left tracking-tight">{tab.label}</span>
                                                    {count > 0 && (
                                                        <span className={`min-w-[24px] h-6 px-2 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${isActive
                                                                ? styles.badge
                                                                : 'bg-white/[0.04] text-slate-600 border border-transparent'
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

                        {/* ─── Main Content (Results Panel) ─── */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5 relative active-scrollbar">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
                            
                            <div className="p-8 sm:p-10 max-w-4xl relative z-10 w-full">
                                <div className="mb-8 px-1">
                                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.25em] mb-1">Audit List</h4>
                                    <div className="h-0.5 w-12 bg-primary/30 rounded-full" />
                                </div>
                                {loading ? (
                                    <div className="space-y-3 pt-2">
                                        {Array(6).fill(0).map((_, i) => (
                                            <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                                        ))}
                                    </div>
                                ) : currentTabData.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {currentTabData.map((item, i) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-5 px-6 py-4 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-0.5"
                                                style={{ animationDelay: `${i * 20}ms` }}
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-bold shrink-0 transition-all group-hover:scale-110 shadow-lg ${item.isTest
                                                        ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400 shadow-pink-500/5'
                                                        : `bg-${activeTabColor}-500/10 border border-${activeTabColor}-500/20 text-${activeTabColor}-400 shadow-${activeTabColor}-500/5`
                                                    }`}>
                                                    {item.isTest ? <Target className="w-5 h-5" /> : item.name.substring(0, 2).toUpperCase()}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[15px] font-heading font-semibold text-slate-100 group-hover:text-white transition-colors truncate tracking-tight">
                                                        {item.name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        {item.topicsRevised > 0 && activeTab !== 'topicsRevised' && (
                                                            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                                                                <BookOpen className="w-3.5 h-3.5 text-primary-light/40" />
                                                                {item.topicsRevised} revised
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 shrink-0">
                                                    <div className="px-5 py-2 rounded-2xl bg-black/20 border border-white/5 group-hover:border-white/10 group-hover:bg-black/40 transition-all">
                                                        <span className="text-2xl font-heading font-black text-white tabular-nums tracking-tighter">
                                                            {activeTab === 'tests' ? item.count : item[activeTab]}
                                                        </span>
                                                        <span className="ml-2 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">
                                                            {activeTab === 'topicsRevised' ? 'REVISED' : activeTab === 'tests' ? 'COUNT' : activeTab}
                                                        </span>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:text-primary transition-all shadow-inner">
                                                        <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-24 flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
                                            <Hash className="w-8 h-8 text-slate-800" strokeWidth={1.5} />
                                        </div>
                                        <h4 className="text-lg font-heading font-bold text-slate-500 tracking-tight">No data found</h4>
                                        <p className="text-slate-700 text-[11px] mt-1.5">No {activeTab} recorded {selectedDay ? 'on this day' : 'this month'}</p>
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

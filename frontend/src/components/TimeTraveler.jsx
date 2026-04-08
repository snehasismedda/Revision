import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check, ArrowRight, History, PlusCircle } from 'lucide-react';

const TimeTraveler = ({ isOpen, onClose, onApply, initialQuery = '' }) => {
    const [view, setView] = useState('year'); // 'year', 'month', 'day'
    const [selectedYearForMonthView, setSelectedYearForMonthView] = useState(new Date().getFullYear());
    const [selectedMonthForDayView, setSelectedMonthForDayView] = useState(new Date().getMonth());
    
    // Selection state for multi-select
    const [selection, setSelection] = useState({
        years: [],
        months: [],
        days: [],
        range: null // { start, end }
    });

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Initialize from initialQuery if possible
    useEffect(() => {
        if (isOpen && initialQuery) {
            const newSelection = { years: [], months: [], days: [], range: null };
            const parts = initialQuery.split('|');
            parts.forEach(p => {
                const [key, val] = p.split(':');
                if (key === 'years') newSelection.years = val.split(',').map(v => parseInt(v));
                if (key === 'months') newSelection.months = val.split(',');
                if (key === 'days') newSelection.days = val.split(',');
                if (key === 'range') {
                    const [s, e] = val.split(',');
                    newSelection.range = { start: s, end: e };
                }
            });
            setSelection(newSelection);
        } else if (isOpen && !initialQuery) {
            setSelection({ years: [], months: [], days: [], range: null });
        }
    }, [isOpen, initialQuery]);

    const handleApply = () => {
        const parts = [];
        if (selection.years.length > 0) parts.push(`years:${selection.years.join(',')}`);
        if (selection.months.length > 0) parts.push(`months:${selection.months.join(',')}`);
        if (selection.days.length > 0) parts.push(`days:${selection.days.join(',')}`);
        if (selection.range) parts.push(`range:${selection.range.start},${selection.range.end}`);
        
        onApply(parts.join('|'));
        onClose();
    };

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const firstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };

    const toggleYear = (year) => {
        setSelection(prev => ({
            ...prev,
            years: prev.years.includes(year) 
                ? prev.years.filter(y => y !== year) 
                : [...prev.years, year]
        }));
    };

    const toggleMonth = (monthName) => {
        setSelection(prev => ({
            ...prev,
            months: prev.months.includes(monthName) 
                ? prev.months.filter(m => m !== monthName) 
                : [...prev.months, monthName]
        }));
    };

    const toggleDay = (dateStr) => {
        setSelection(prev => ({
            ...prev,
            days: prev.days.includes(dateStr) 
                ? prev.days.filter(d => d !== dateStr) 
                : [...prev.days, dateStr],
            range: null // Clear range if picking specific days
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative w-full max-w-sm glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-heading font-black text-white tracking-tight">Time Traveler</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center bg-white/5 p-1 rounded-xl gap-1">
                        <button 
                            onClick={() => setView('year')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'year' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Years
                        </button>
                        <button 
                            onClick={() => setView('month')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'month' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Months
                        </button>
                        <button 
                            onClick={() => setView('day')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'day' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Days
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="p-6 min-h-[340px] max-h-[400px] overflow-y-auto no-scrollbar">
                    {view === 'year' && (
                        <div className="grid grid-cols-2 gap-3">
                            {[2026, 2025, 2024, 2023, 2022, 2021].map(year => (
                                <button
                                    key={year}
                                    onClick={() => toggleYear(year)}
                                    className={`group relative h-20 rounded-2xl border p-4 flex flex-col justify-end transition-all overflow-hidden ${selection.years.includes(year) ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-surface-2/40 border-white/[0.04] text-slate-500 hover:border-white/[0.1] hover:bg-surface-2/60'}`}
                                >
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {selection.years.includes(year) ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4 text-slate-600" />}
                                    </div>
                                    <span className={`text-2xl font-heading font-black ${selection.years.includes(year) ? 'text-white' : ''}`}>{year}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Year</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'month' && (
                        <div className="grid grid-cols-3 gap-2">
                            {months.map((month, idx) => (
                                <button
                                    key={month}
                                    onClick={() => toggleMonth(month)}
                                    className={`h-16 rounded-xl flex flex-col items-center justify-center text-[11px] font-black uppercase tracking-widest transition-all border ${selection.months.includes(month) ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' : 'bg-surface-2/20 text-slate-500 border-white/[0.04] hover:bg-surface-2/50 hover:text-slate-300'}`}
                                >
                                    <span>{month.slice(0, 3)}</span>
                                    {selection.months.includes(month) && <Check className="w-3 h-3 mt-1" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'day' && (
                        <div>
                            {/* Calendar Sub-Header */}
                            <div className="flex items-center justify-between mb-4 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase text-white tracking-widest">{selectedYearForMonthView}</span>
                                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                                        <button onClick={() => setSelectedMonthForDayView(prev => prev === 0 ? 11 : prev - 1)} className="p-1 hover:text-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                        <span className="text-[10px] font-black uppercase px-2 w-16 text-center text-slate-400">{months[selectedMonthForDayView].slice(0,3)}</span>
                                        <button onClick={() => setSelectedMonthForDayView(prev => prev === 11 ? 0 : prev + 1)} className="p-1 hover:text-white"><ChevronRight className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedYearForMonthView(prev => prev - 1)}
                                    className="p-1.5 bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-6">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-black text-slate-600 py-1">{d}</div>
                                ))}
                                {[...Array(firstDayOfMonth(selectedYearForMonthView, selectedMonthForDayView))].map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {[...Array(getDaysInMonth(selectedYearForMonthView, selectedMonthForDayView))].map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(selectedYearForMonthView, selectedMonthForDayView, day);
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isSelected = selection.days.includes(dateStr);
                                    const inRange = selection.range && dateStr >= selection.range.start && dateStr <= selection.range.end;

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => toggleDay(dateStr)}
                                            className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${isSelected ? 'bg-indigo-500 text-white shadow-lg scale-110 z-10' : inRange ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Selection Summary */}
                <div className="p-4 bg-white/[0.01] border-t border-white/5">
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
                        {selection.years.map(y => (
                            <div key={y} className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md text-[9px] font-black uppercase border border-indigo-500/20">
                                {y}
                                <X className="w-2.5 h-2.5 cursor-pointer hover:text-red-400" onClick={() => toggleYear(y)} />
                            </div>
                        ))}
                        {selection.months.map(m => (
                            <div key={m} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-md text-[9px] font-black uppercase border border-emerald-500/20">
                                {m.slice(0,3)}
                                <X className="w-2.5 h-2.5 cursor-pointer hover:text-red-400" onClick={() => toggleMonth(m)} />
                            </div>
                        ))}
                        {selection.days.length > 0 && (
                            <div className="flex items-center gap-1 bg-violet-500/10 text-violet-400 px-2 py-1 rounded-md text-[9px] font-black uppercase border border-violet-500/20">
                                {selection.days.length} Days Selected
                                <X className="w-2.5 h-2.5 cursor-pointer hover:text-red-400" onClick={() => setSelection(prev => ({...prev, days: []}))} />
                            </div>
                        )}
                        {selection.years.length === 0 && selection.months.length === 0 && selection.days.length === 0 && (
                            <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest pl-1 py-1">No filters selected</span>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 border-t border-white/5 bg-white/[0.02] flex gap-3">
                    <button 
                        onClick={() => {
                            setSelection({ years: [], months: [], days: [], range: null });
                        }}
                        className="flex-1 py-3 rounded-2xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Clear
                    </button>
                    <button 
                        onClick={handleApply}
                        className="flex-[2] py-3 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        Apply Timeline
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TimeTraveler;

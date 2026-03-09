import { useState, useEffect } from 'react';
import { X, Check, Plus } from 'lucide-react';
import * as testsApi from '../../api/testsApi';
import toast from 'react-hot-toast';

import ModalPortal from '../ModalPortal.jsx';

const CreateTestModal = ({ isOpen, onClose, onSuccess, seriesId, seriesSubjects, initialData = null }) => {
    const [name, setName] = useState('');
    const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEdit = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name || '');
                setTestDate(initialData.test_date ? new Date(initialData.test_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                setSelectedSubjects((initialData.subjects || []).map(s => s.id));
            } else {
                setName('');
                setTestDate(new Date().toISOString().split('T')[0]);
                // By default select all subjects inherited from the series
                setSelectedSubjects(seriesSubjects.map(s => s.id));
            }
        }
    }, [isOpen, initialData, seriesSubjects]);

    const toggleSubject = (subjectId) => {
        setSelectedSubjects(prev =>
            prev.includes(subjectId)
                ? prev.filter(id => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Name is required');
        if (selectedSubjects.length === 0) return toast.error('Check at least one subject');

        try {
            setIsSubmitting(true);
            const payload = {
                name: name.trim(),
                testDate,
                subjectIds: selectedSubjects
            };

            if (isEdit) {
                await testsApi.updateTest(seriesId, initialData.id, payload);
                toast.success('Test updated');
            } else {
                await testsApi.createTest(seriesId, payload);
                toast.success('Test scheduled');
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(isEdit ? 'Failed to update test' : 'Failed to create test');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                                <Plus className="w-5 h-5" />
                            </div>
                            {isEdit ? 'Edit Mock Test' : 'Add Mock Test'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form
                        id="create-test-form"
                        onSubmit={handleSubmit}
                        className="px-7 py-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar"
                    >
                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Test Name *</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Mock Test 1"
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-pink-500/40 focus:ring-2 focus:ring-pink-500/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Date *</label>
                            <input
                                type="date"
                                value={testDate}
                                onChange={(e) => setTestDate(e.target.value)}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-pink-500/40 focus:ring-2 focus:ring-pink-500/15 focus:bg-surface-2/70 transition-all [color-scheme:dark] placeholder:text-slate-600/80"
                                required
                            />
                        </div>

                        <div className="pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">Subjects Tested</label>
                                <span className="text-[10px] font-bold text-pink-500/80 bg-pink-500/10 px-2 py-0.5 rounded-full">{selectedSubjects.length} selected</span>
                            </div>

                            {seriesSubjects.length === 0 ? (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-medium">
                                    This Series has no subjects.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {seriesSubjects.map(sub => {
                                        const isSelected = selectedSubjects.includes(sub.id);
                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => toggleSubject(sub.id)}
                                                className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border
                                                    ${isSelected
                                                        ? 'bg-pink-500/10 border-pink-500/20'
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border
                                                    ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-white/20 bg-transparent'}
                                                `}>
                                                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                                </div>
                                                <span className={`text-[14px] font-medium transition-colors ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                    {sub.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-test-form"
                            disabled={isSubmitting || !name.trim() || selectedSubjects.length === 0}
                            className="flex-[2] btn-primary-pink flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all bg-pink-500 text-white hover:bg-pink-400"
                        >
                            <span>{isSubmitting ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Test')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};


export default CreateTestModal;

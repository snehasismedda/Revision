import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import * as testsApi from '../../api/testsApi';
import toast from 'react-hot-toast';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-lg bg-[#11111a] border border-white/10 rounded-2xl shadow-2xl flex flex-col fade-in"
                style={{ maxHeight: 'calc(100vh - 40px)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-heading font-semibold text-white">{isEdit ? 'Edit Mock Test' : 'Schedule Mock Test'}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="create-test-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Test Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Mock Test 1"
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Date</label>
                            <input
                                type="date"
                                value={testDate}
                                onChange={(e) => setTestDate(e.target.value)}
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500/50 [color-scheme:dark]"
                                required
                            />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">Subjects Tested</label>
                                <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{selectedSubjects.length} selected</span>
                            </div>

                            {seriesSubjects.length === 0 ? (
                                <p className="text-sm font-medium text-rose-400 bg-rose-500/10 p-3 rounded-lg">
                                    This Series has no subjects.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {seriesSubjects.map(sub => {
                                        const isSelected = selectedSubjects.includes(sub.id);
                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => toggleSubject(sub.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                                    ${isSelected
                                                        ? 'bg-pink-500/10 border-pink-500/30'
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border
                                                    ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-white/20 bg-transparent'}
                                                `}>
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                                <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                    {sub.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02] rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="create-test-form"
                        disabled={isSubmitting || !name.trim() || selectedSubjects.length === 0}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                    >
                        {isSubmitting ? (isEdit ? 'Saving...' : 'Scheduling...') : (isEdit ? 'Save Changes' : 'Schedule Test')}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default CreateTestModal;

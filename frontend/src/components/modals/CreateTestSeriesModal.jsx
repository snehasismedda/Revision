import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import * as testSeriesApi from '../../api/testSeriesApi.js';
import { subjectsApi } from '../../api';
import toast from 'react-hot-toast';

const CreateTestSeriesModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEdit = !!initialData;

    useEffect(() => {
        if (isOpen) {
            loadSubjects();
            if (initialData) {
                setName(initialData.name || '');
                setDescription(initialData.description || '');
                setSelectedSubjects((initialData.subjects || []).map(s => s.id));
            } else {
                setName('');
                setDescription('');
                setSelectedSubjects([]);
            }
        }
    }, [isOpen, initialData]);

    const loadSubjects = async () => {
        try {
            const data = await subjectsApi.list();
            setAvailableSubjects(data.subjects || []);
        } catch (error) {
            toast.error('Failed to load available subjects');
        }
    };

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

        try {
            setIsSubmitting(true);
            const payload = {
                name: name.trim(),
                description: description.trim(),
                subjectIds: selectedSubjects
            };

            if (isEdit) {
                await testSeriesApi.updateTestSeries(initialData.id, payload);
                toast.success('Test series updated');
            } else {
                await testSeriesApi.createTestSeries(payload);
                toast.success('Test series created');
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(isEdit ? 'Failed to update test series' : 'Failed to create test series');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-lg bg-[#11111a] border border-white/10 rounded-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: 'calc(100vh - 40px)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-heading font-semibold text-white">{isEdit ? 'Edit Test Series' : 'New Test Series'}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="create-series-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Series Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. JEE Mains Weekly Mirrors"
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is the focus of this test series?"
                                rows="3"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 resize-none"
                            />
                        </div>

                        <div className="space-y-3 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">Subjects Included</label>
                                <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{selectedSubjects.length} selected</span>
                            </div>
                            {availableSubjects.length === 0 ? (
                                <p className="text-sm text-slate-500 bg-white/5 p-3 rounded-xl text-center">
                                    No subjects available natively. Create a subject in the dashboard first.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableSubjects.map(sub => {
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
                        form="create-series-form"
                        disabled={isSubmitting || !name.trim()}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                    >
                        {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Series')}
                    </button>
                </div>
            </div>
        </div>
    );
};


export default CreateTestSeriesModal;

import { useState, useEffect } from 'react';
import { X, Check, Plus } from 'lucide-react';
import * as testSeriesApi from '../../api/testSeriesApi.js';
import { useSubjects } from '../../context/SubjectContext.jsx';
import { useTestSeries } from '../../context/TestSeriesContext.jsx';
import toast from 'react-hot-toast';
import ModalPortal from '../ModalPortal.jsx';

const CreateTestSeriesModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const { addSeries, updateSeries } = useTestSeries();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const { subjects: availableSubjects, isLoaded, loadSubjects } = useSubjects();
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEdit = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (!isLoaded) loadSubjects();
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
    }, [isOpen, initialData, isLoaded, loadSubjects]);


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
                await updateSeries(initialData.id, payload);
            } else {
                await addSeries(payload);
            }
            
            onSuccess();
            onClose();
        } catch (error) {
            // Errors handled in context
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-surface border border-border"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                                <Plus className="w-5 h-5" />
                            </div>
                            {isEdit ? 'Edit Test Series' : 'New Test Series'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form
                        id="create-series-form"
                        onSubmit={handleSubmit}
                        className="px-7 py-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar"
                    >
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Series Name *</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. JEE Mains Weekly Mirrors"
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-pink-500/40 focus:ring-2 focus:ring-pink-500/15 transition-all placeholder:text-text-muted/60 shadow-inner"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is the focus of this test series?"
                                rows="3"
                                className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-pink-500/40 focus:ring-2 focus:ring-pink-500/15 transition-all placeholder:text-text-muted/60 resize-none shadow-inner"
                            />
                        </div>

                        <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em]">Subjects Included</label>
                                <span className="text-[10px] font-bold text-pink-500/80 bg-pink-500/10 px-2 py-0.5 rounded-full">{selectedSubjects.length} selected</span>
                            </div>
                            {availableSubjects.length === 0 ? (
                                <div className="p-4 rounded-xl bg-surface-3/10 border border-dashed border-border text-center">
                                    <p className="text-sm text-text-muted">No subjects available. Create a subject first.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableSubjects.map(sub => {
                                        const isSelected = selectedSubjects.includes(sub.id);
                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => toggleSubject(sub.id)}
                                                className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border
                                                    ${isSelected
                                                        ? 'bg-pink-500/10 border-pink-500/20'
                                                        : 'bg-surface-3/10 border-border hover:border-border hover:bg-surface-3/10'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border
                                                    ${isSelected ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'border-border bg-surface-2 group-hover:border-pink-500/40'}
                                                `}>
                                                    {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                                </div>
                                                <span className={`text-[14px] font-medium transition-colors ${isSelected ? 'text-text' : 'text-text-muted'}`}>
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
                    <div className="px-7 py-5 border-t border-border flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text hover:bg-surface-3/10 transition-all cursor-pointer border border-transparent hover:border-border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-series-form"
                            disabled={isSubmitting || !name.trim()}
                            className="flex-[2] flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all bg-pink-500 text-white hover:bg-pink-400 shadow-pink-500/20"
                        >
                            <span>{isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Series')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default CreateTestSeriesModal;

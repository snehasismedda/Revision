import { useState } from 'react';
import { questionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, FileText, Image as ImageIcon, Trash2, Save } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const AddQuestionModal = ({ isOpen, onClose, subjectId, onQuestionAdded }) => {
    const [newQuestionType, setNewQuestionType] = useState('text');
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionImage, setNewQuestionImage] = useState('');
    const [addingQuestion, setAddingQuestion] = useState(false);

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const content = newQuestionType === 'text' ? newQuestionText.trim() : newQuestionImage;
        if (!content) return toast.error('Please provide question content');

        setAddingQuestion(true);
        try {
            const { questions } = await questionsApi.create(subjectId, { content, type: newQuestionType });
            onQuestionAdded(questions);
            setNewQuestionText('');
            setNewQuestionImage('');
            onClose();
            const count = questions.length;
            toast.success(count > 1
                ? `${count} questions parsed and added successfully`
                : 'Question added and parsed successfully'
            );
        } catch {
            toast.error('Failed to add question');
        } finally {
            setAddingQuestion(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            Add New Question
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        {/* Type toggle */}
                        <div className="flex p-1 bg-surface-2/80 rounded-xl mb-6 border border-white/[0.06]">
                            <button
                                onClick={() => setNewQuestionType('text')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'text' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <FileText className="w-4 h-4" /> Text Question
                            </button>
                            <button
                                onClick={() => setNewQuestionType('image')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'image' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <ImageIcon className="w-4 h-4" /> Image Upload
                            </button>
                        </div>

                        <form id="add-question-form" onSubmit={handleAddQuestion} className="space-y-5">
                            {newQuestionType === 'text' ? (
                                <div>
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Question Content</label>
                                    <textarea
                                        value={newQuestionText}
                                        onChange={(e) => setNewQuestionText(e.target.value)}
                                        placeholder="Paste or type your question here... e.g., 'What is the sum of the first 100 integers?'"
                                        rows={8}
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Upload Image</label>
                                    <div
                                        className="relative border-2 border-dashed border-white/[0.08] rounded-xl p-12 flex flex-col items-center justify-center bg-surface-2/30 hover:bg-surface-2/50 hover:border-primary/30 transition-all cursor-pointer group"
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                const file = e.dataTransfer.files[0];
                                                if (file.type.startsWith('image/')) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setNewQuestionImage(reader.result);
                                                    reader.readAsDataURL(file);
                                                }
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setNewQuestionImage(reader.result);
                                                    reader.readAsDataURL(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        {newQuestionImage ? (
                                            <div className="w-full relative min-h-[200px] flex items-center justify-center">
                                                <img src={newQuestionImage} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg relative z-0" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                                                    <span className="text-white font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm text-[13px]">Click or Drag to change</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center pointer-events-none">
                                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                                                    <ImageIcon className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-white font-semibold mb-1 text-[14px]">Click to upload or drag and drop</h4>
                                                <p className="text-[13px] text-slate-500">SVG, PNG, JPG or GIF (max. 10MB)</p>
                                            </div>
                                        )}
                                    </div>
                                    {newQuestionImage && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setNewQuestionImage('')}
                                                className="text-[13px] text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg hover:bg-red-500/10 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove image
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-indigo-500/[0.06] px-3 py-1.5 rounded-lg border border-indigo-500/10">
                            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>AI will auto-process this question</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                form="add-question-form"
                                type="submit"
                                disabled={addingQuestion || (newQuestionType === 'text' ? !newQuestionText.trim() : !newQuestionImage)}
                                className="btn-primary text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98] hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                            >
                                {addingQuestion ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Analyze & Save</span>
                                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default AddQuestionModal;

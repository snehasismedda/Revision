import { useState } from 'react';
import { topicsApi, aiApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, Plus } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const ManageSyllabusModal = ({ isOpen, onClose, subjectId, onTopicsUpdated }) => {
    const [newTopicName, setNewTopicName] = useState('');
    const [addingTopic, setAddingTopic] = useState(false);
    const [syllabus, setSyllabus] = useState('');
    const [parsingAI, setParsingAI] = useState(false);
    const [aiError, setAiError] = useState('');

    const handleAddTopic = async (e) => {
        e.preventDefault();
        if (!newTopicName.trim()) return;
        setAddingTopic(true);
        try {
            const { topic } = await topicsApi.create(subjectId, { name: newTopicName.trim() });
            onTopicsUpdated(prev => [...prev, { ...topic, children: [] }]);
            setNewTopicName('');
            toast.success(`Topic "${topic.name}" added`);
        } catch {
            toast.error('Failed to add topic');
        } finally {
            setAddingTopic(false);
        }
    };

    const handleParseSyllabus = async () => {
        if (!syllabus.trim()) return;
        setParsingAI(true);
        setAiError('');
        const loadingToast = toast.loading('Analyzing syllabus with AI...');
        try {
            const { topics: freshTopics } = await aiApi.parseSyllabus({
                syllabusText: syllabus,
                subjectId: subjectId,
            });

            onTopicsUpdated(freshTopics);
            setSyllabus('');
            toast.success('Topic tree generated!', { id: loadingToast });
            onClose();
        } catch (err) {
            setAiError(err.message || 'Failed to parse syllabus');
            toast.error('Failed to parse syllabus', { id: loadingToast });
        } finally {
            setParsingAI(false);
        }
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{
                        background: 'rgba(22, 22, 34, 0.96)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.04)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            Manage Syllabus
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-7 overflow-y-auto custom-scrollbar">

                        {/* ── Section 1: Manual Add Topic ────────────────── */}
                        <div
                            className="p-6 rounded-xl"
                            style={{ background: 'rgba(30, 30, 44, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-4">
                                Add Root Topic
                            </h4>
                            <form onSubmit={handleAddTopic} className="space-y-3.5">
                                <div className="relative group/input">
                                    <input
                                        value={newTopicName}
                                        onChange={(e) => setNewTopicName(e.target.value)}
                                        placeholder="Enter topic name..."
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={addingTopic || !newTopicName.trim()}
                                    className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold px-4 py-3.5 rounded-xl disabled:opacity-40 transition-all cursor-pointer active:scale-[0.98] border border-primary/25 text-primary hover:bg-primary/[0.08] hover:border-primary/40 hover:text-white"
                                >
                                    <Plus className="w-4 h-4" />
                                    {addingTopic ? 'Adding...' : 'Add Topic'}
                                </button>
                            </form>
                        </div>

                        {/* ── Divider ────────────────────────────────────── */}
                        <div className="flex items-center gap-4 my-7">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] select-none">or</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                        </div>

                        {/* ── Section 2: AI Syllabus Parser ──────────────── */}
                        <div
                            className="p-6 rounded-xl relative overflow-hidden group"
                            style={{ background: 'rgba(30, 30, 44, 0.5)', border: '1px solid rgba(99,102,241,0.1)' }}
                        >
                            {/* Subtle gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent pointer-events-none" />

                            <div className="flex items-center gap-3 mb-2 relative z-10">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                    <Wand2 className="w-4.5 h-4.5" />
                                </div>
                                <h4 className="text-[13px] font-heading font-semibold text-indigo-300">AI Syllabus Parser</h4>
                            </div>
                            <p className="text-[12px] text-slate-500 mb-5 relative z-10 leading-relaxed ml-[44px]">
                                Paste raw syllabus text. <span className="text-indigo-400 font-semibold">AI</span> will analyze it and build a structured topic hierarchy automatically.
                            </p>

                            {aiError && (
                                <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mb-5 relative z-10">
                                    <span className="text-red-400 text-[13px] font-medium">{aiError}</span>
                                </div>
                            )}

                            <textarea
                                value={syllabus}
                                onChange={(e) => setSyllabus(e.target.value)}
                                placeholder="Paste course outline here..."
                                rows={6}
                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-y min-h-[120px] max-h-[300px] relative z-10 mb-5"
                            />

                            <button
                                onClick={handleParseSyllabus}
                                disabled={parsingAI || !syllabus.trim()}
                                className="w-full relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[13px] font-semibold px-5 py-3.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.4)] cursor-pointer active:scale-[0.98]"
                            >
                                {parsingAI ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Analyzing with AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        <span>Generate Topic Tree</span>
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

export default ManageSyllabusModal;

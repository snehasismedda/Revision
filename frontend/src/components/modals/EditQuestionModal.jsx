import React, { useState, useEffect } from 'react';
import { questionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Save, FileText, Hash, CheckCircle2, Circle } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const EditQuestionModal = ({ isOpen, onClose, subjectId, question, topics, onQuestionUpdated }) => {
    const [content, setContent] = useState('');
    const [tags, setTags] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (question) {
            setContent(question.content || '');
            let initialTags = [];
            try {
                initialTags = typeof question.tags === 'string' ? JSON.parse(question.tags) : (question.tags || []);
            } catch (e) {
                initialTags = [];
            }
            setTags(initialTags);
        }
    }, [question]);

    // Flatten topics for easier selection
    const flattenTopics = (nodes, result = [], path = '') => {
        nodes.forEach(node => {
            const currentPath = path ? `${path} > ${node.name}` : node.name;
            result.push({ id: node.id, name: node.name, path: currentPath, depth: path ? path.split('>').length : 0 });
            if (node.children) flattenTopics(node.children, result, currentPath);
        });
        return result;
    };

    const flatTopics = flattenTopics(topics || []);

    const toggleTag = (topicName) => {
        setTags(prev =>
            prev.includes(topicName)
                ? prev.filter(t => t !== topicName)
                : [...prev, topicName]
        );
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!content.trim()) return toast.error('Content cannot be empty');

        setSaving(true);
        try {
            const payload = {
                tags,
                type: question.type,
                content: content.trim()
            };

            const { question: updated } = await questionsApi.update(subjectId, question.id, payload);
            onQuestionUpdated(updated);
            onClose();
            toast.success('Question updated successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update question');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !question) return null;

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
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            Edit Question
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar space-y-6">
                        <form id="edit-question-form" onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5 text-slate-400">
                                    Question Text
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Edit question content..."
                                    rows={6}
                                    className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-indigo-400/40 focus:ring-2 focus:ring-indigo-400/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5 flex items-center gap-2 text-slate-400">
                                    <Hash className="w-3 h-3" /> Topic Tags
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-surface-2/30 border border-white/[0.04]">
                                    {flatTopics.map(topic => {
                                        const isSelected = tags.includes(topic.name);
                                        return (
                                            <button
                                                key={topic.id}
                                                type="button"
                                                onClick={() => toggleTag(topic.name)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border cursor-pointer
                                                    ${isSelected
                                                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.1)]'
                                                        : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'
                                                    }`}
                                            >
                                                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-40" />}
                                                {topic.depth > 0 && <span className="text-[10px] opacity-30 shrink-0">↳</span>}
                                                <span className="truncate" title={topic.path}>{topic.name}</span>
                                            </button>
                                        );
                                    })}
                                    {flatTopics.length === 0 && (
                                        <div className="col-span-full py-4 text-center text-[12px] text-slate-500 italic">
                                            No topics available. Add topics to regular syllabus first.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-end">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                form="edit-question-form"
                                type="submit"
                                disabled={saving || (question.type === 'text' && !content.trim())}
                                className="bg-indigo-600 text-white text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98] hover:bg-indigo-500"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Update Question</span>
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

export default EditQuestionModal;

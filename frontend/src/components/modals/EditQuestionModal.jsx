import React, { useState, useEffect } from 'react';
import { questionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Save, FileText, Hash, CheckCircle2, Circle, Search } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const EditQuestionModal = ({ isOpen, onClose, subjectId, question, topics, onQuestionUpdated }) => {
    const [content, setContent] = useState('');
    const [tags, setTags] = useState([]);
    const [topicSearchQuery, setTopicSearchQuery] = useState('');
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

    const filteredTopics = flatTopics.filter(topic =>
        topic.name.toLowerCase().includes(topicSearchQuery.toLowerCase())
    );

    const toggleTag = (topicName) => {
        setTags(prev =>
            prev.includes(topicName)
                ? prev.filter(t => t !== topicName)
                : [...prev, topicName]
        );
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        // Removed: if (!content.trim()) return toast.error('Content cannot be empty');

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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-text flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            Edit Question
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar space-y-6">
                        <form id="edit-question-form" onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] mb-2.5">
                                    Question Text
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Edit question content..."
                                    rows={6}
                                    className="w-full bg-surface-2 border border-border text-text rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2 transition-all placeholder:text-text-muted/60 shadow-inner resize-none"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.18em] flex items-center gap-2 text-text-muted">
                                        <Hash className="w-3 h-3" /> Topic Tags
                                    </label>
                                    <div className="relative w-48">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
                                        <input
                                            type="text"
                                            value={topicSearchQuery}
                                            onChange={(e) => setTopicSearchQuery(e.target.value)}
                                            placeholder="Search topics..."
                                            className="w-full bg-surface-2 border border-border rounded-lg py-1 pl-8 pr-3 text-[11px] text-text outline-none focus:border-primary/40 transition-all placeholder:text-text-muted/60 shadow-inner"
                                        />
                                        {topicSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setTopicSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-41 overflow-y-auto p-2 rounded-xl bg-surface-2 border border-border">
                                    {filteredTopics.map(topic => {
                                        const isSelected = tags.includes(topic.name);
                                        return (
                                            <button
                                                key={topic.id}
                                                type="button"
                                                onClick={() => toggleTag(topic.name)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border cursor-pointer
                                                    ${isSelected
                                                        ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_2px_8px_rgba(139,92,246,0.1)]'
                                                        : 'bg-surface-3 border-transparent text-text-muted hover:bg-surface hover:text-text'
                                                    }`}
                                            >
                                                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-40" />}
                                                {topic.depth > 0 && <span className="text-[10px] opacity-30 shrink-0">↳</span>}
                                                <span className="truncate" title={topic.path}>{topic.name}</span>
                                            </button>
                                        );
                                    })}
                                    {filteredTopics.length === 0 && (
                                        <div className="col-span-full py-4 text-center text-[12px] text-text-muted italic">
                                            {topicSearchQuery ? 'No topics found matching your search' : 'No topics available. Add topics to regular syllabus first.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-border shrink-0 flex items-center justify-end">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text hover:bg-surface-3/10 transition-all cursor-pointer border border-transparent hover:border-border"
                            >
                                Cancel
                            </button>
                            <button
                                form="edit-question-form"
                                type="submit"
                                disabled={saving}
                                className="bg-primary text-white text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98] hover:bg-primary-dark"
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

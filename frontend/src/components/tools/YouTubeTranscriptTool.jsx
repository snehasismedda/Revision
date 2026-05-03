import React, { useState, useEffect } from 'react';
import { Youtube, Copy, Check, Plus, Trash2, Edit2, Loader2, AlertCircle, Terminal, Sparkles, ChevronDown, History, Hash, Calendar, Search } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import SystemPromptModal from '../modals/SystemPromptModal.jsx';
import { aiApi, systemPromptsApi } from '../../api';
import ConfirmDialog from '../ConfirmDialog.jsx';

const YouTubeTranscriptTool = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [prompts, setPrompts] = useState([]);
    const [selectedPromptId, setSelectedPromptId] = useState(null);
    const [copied, setCopied] = useState(false);
    const [promptSearchQuery, setPromptSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('prompts'); // 'prompts' or 'output'

    // Prompt Editing State
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);

    // Delete confirmation state
    const [promptToDelete, setPromptToDelete] = useState(null);

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        try {
            const data = await systemPromptsApi.list();
            setPrompts(data);
            // Don't auto-select if something is already selected
            if (data.length > 0 && !selectedPromptId) {
                setSelectedPromptId(data[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch prompts:", err);
        }
    };

    const handleFetchTranscript = async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const res = await aiApi.youtubeTranscript({ url });
            setTranscript(res.transcript);
            setActiveTab('output'); // Auto-switch to output when transcript is fetched
        } catch (err) {
            setError(err.message || "Failed to fetch transcript. Check the URL and ensure captions are available.");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePrompt = async (data, saveAsNew = false) => {
        setIsSavingPrompt(true);
        try {
            if (!editingPrompt || saveAsNew) {
                const newPrompt = await systemPromptsApi.create({
                    ...data,
                    isDefault: prompts.length === 0
                });
                setPrompts([newPrompt, ...prompts]);
                setSelectedPromptId(newPrompt.id);
            } else {
                const updated = await systemPromptsApi.update(editingPrompt.id, data);
                setPrompts(prompts.map(p => p.id === editingPrompt.id ? updated : p));
            }
            setIsEditingPrompt(false);
            setEditingPrompt(null);
        } catch (err) {
            console.error("Failed to save prompt:", err);
        } finally {
            setIsSavingPrompt(false);
        }
    };

    const handleDeletePrompt = async (id) => {
        try {
            await systemPromptsApi.delete(id);
            setPrompts(prompts.filter(p => p.id !== id));
            if (selectedPromptId === id) setSelectedPromptId(prompts[0]?.id || null);
        } catch (err) {
            console.error("Failed to delete prompt:", err);
        }
    };

    const handleCopy = () => {
        const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
        const fullText = `${selectedPrompt?.prompt || ''}\n\nTRANSCRIPT:\n${transcript}`;
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleProcessWithAI = async () => {
        if (!transcript) return;
        setIsProcessing(true);
        setAiResult('');
        try {
            const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
            await aiApi.processTranscriptStream(
                {
                    systemPrompt: selectedPrompt?.prompt,
                    transcript
                },
                (chunk) => {
                    setAiResult(prev => prev + chunk);
                }
            );
        } catch (err) {
            console.error("AI Processing failed:", err);
            setError("AI Processing failed. Check if Ollama is running.");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredPrompts = prompts.filter(p =>
        p.name.toLowerCase().includes(promptSearchQuery.toLowerCase()) ||
        p.prompt.toLowerCase().includes(promptSearchQuery.toLowerCase())
    );

    const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">YouTube Video URL</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-red-500 transition-colors" />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full bg-surface-3/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:outline-none focus:border-red-500/30 focus:bg-surface-3 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleFetchTranscript}
                            disabled={loading || !url}
                            className="btn-primary px-6 rounded-xl flex items-center gap-2 text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Fetch Transcript
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-surface-2 border border-border rounded-2xl w-fit mb-8">
                <button
                    onClick={() => setActiveTab('prompts')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === 'prompts'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-text-muted hover:text-text hover:bg-surface-3/50'
                        }`}
                >
                    <Terminal className="w-4 h-4" />
                    System Prompts
                </button>
                <button
                    disabled={!transcript}
                    onClick={() => setActiveTab('output')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${activeTab === 'output'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-text-muted hover:text-text hover:bg-surface-3/50'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Output {transcript && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
            </div>

            {activeTab === 'prompts' ? (
                /* Prompt Management Section */
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-primary" />
                            <h4 className="text-[14px] font-bold text-text">System Prompts</h4>
                            <span className="px-2 py-0.5 rounded-full bg-surface-3 border border-border text-[10px] font-bold text-text-muted">
                                {prompts.length} SAVED
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Prompt Search */}
                            <div className="relative group flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={promptSearchQuery}
                                    onChange={(e) => setPromptSearchQuery(e.target.value)}
                                    placeholder="Search prompts..."
                                    className="bg-surface-2 border border-border rounded-xl py-1.5 pl-9 pr-8 text-[12px] text-text w-full focus:outline-none focus:border-primary/40 focus:bg-surface-3 transition-all"
                                />
                                {promptSearchQuery && (
                                    <button
                                        onClick={() => setPromptSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setEditingPrompt(null);
                                    setIsEditingPrompt(true);
                                }}
                                className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary text-[12px] font-bold py-2 px-4 rounded-xl transition-all cursor-pointer group shrink-0"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                Create New
                            </button>
                        </div>
                    </div>

                    {prompts.length === 0 ? (
                        <div className="glass-panel rounded-3xl border-dashed border-2 border-border/50 p-12 text-center">
                            <div className="w-16 h-16 bg-surface-3 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                                <Terminal className="w-8 h-8 text-text-muted" />
                            </div>
                            <h5 className="text-[15px] font-bold text-text mb-1">No prompts found</h5>
                            <p className="text-[12px] text-text-muted max-w-[240px] mx-auto leading-relaxed">
                                Create your first system prompt to start formatting transcripts for AI.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                            {filteredPrompts.map(prompt => (
                                <div
                                    key={prompt.id}
                                    onClick={() => setSelectedPromptId(prompt.id)}
                                    className={`group relative p-5 rounded-2xl border transition-all cursor-pointer overflow-hidden ${selectedPromptId === prompt.id
                                            ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                                            : 'bg-surface-2 border-border hover:border-primary/30 hover:bg-surface-3/30'
                                        }`}
                                >
                                    {/* Selection Indicator */}
                                    {selectedPromptId === prompt.id && (
                                        <div className="absolute top-0 right-0 p-3">
                                            <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between pr-8">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h5 className={`font-bold text-[15px] ${selectedPromptId === prompt.id ? 'text-primary' : 'text-text'}`}>
                                                        {prompt.name}
                                                    </h5>
                                                    <span className="px-1.5 py-0.5 rounded-md bg-surface-3 border border-border text-[9px] font-mono font-bold text-text-muted uppercase">
                                                        v{prompt.version || '1.0'}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-text-muted line-clamp-2 italic leading-relaxed pr-4">
                                                    "{prompt.prompt}"
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                                                    <Calendar className="w-3 h-3 opacity-50" />
                                                    {new Date(prompt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPrompt(prompt);
                                                        setIsEditingPrompt(true);
                                                    }}
                                                    className="p-2 rounded-xl hover:bg-primary/10 text-text-muted hover:text-primary transition-all"
                                                    title="Edit Prompt"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPromptToDelete(prompt);
                                                    }}
                                                    className="p-2 rounded-xl hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                                                    title="Delete Prompt"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Background Sparkle for Selected */}
                                    {selectedPromptId === prompt.id && (
                                        <div className="absolute -bottom-6 -right-6 text-primary/5 rotate-12">
                                            <Sparkles className="w-24 h-24" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Output Section */
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Final Output (Instructions + Transcript)</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleProcessWithAI}
                                disabled={isProcessing || !transcript}
                                className="flex items-center gap-2 text-[12px] font-bold text-primary hover:bg-primary/10 transition-all px-3 py-1.5 rounded-lg disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Process with AI
                            </button>
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-2 text-[12px] font-bold transition-all px-3 py-1.5 rounded-lg ${copied ? 'text-emerald-400 bg-emerald-400/10' : 'text-primary hover:bg-primary/10'}`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Copy for AI'}
                            </button>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl pointer-events-none" />
                        <div className="bg-surface-2 border border-border rounded-2xl p-6 max-h-[300px] overflow-y-auto custom-scrollbar font-mono text-[12px] leading-relaxed whitespace-pre-wrap select-all">
                            <div className="pb-4 mb-4 border-b border-border/50">
                                {selectedPrompt?.prompt || 'No system prompt selected.'}
                            </div>
                            {transcript}
                        </div>
                    </div>

                    {/* AI Result Section */}
                    {(aiResult || isProcessing) && (
                        <div className="space-y-3 pt-4 border-t border-border mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[13px] font-bold text-text flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    AI Result
                                </h4>
                                {isProcessing && (
                                    <span className="text-[11px] text-primary animate-pulse font-medium">Processing...</span>
                                )}
                            </div>
                            <div className="bg-surface-3/50 border border-primary/20 rounded-2xl p-6 prose prose-invert prose-sm max-w-none">
                                {aiResult ? (
                                    <div className="whitespace-pre-wrap text-[13px] text-text leading-relaxed">
                                        {aiResult}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-primary/20 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-[11px] text-text-muted text-center italic mt-4">
                        Tip: Paste this content into ChatGPT, Claude, or any AI to process the video transcript, or use the "Process with AI" button.
                    </p>
                </div>
            )}

            <SystemPromptModal
                isOpen={isEditingPrompt}
                onClose={() => setIsEditingPrompt(false)}
                onSave={handleSavePrompt}
                prompt={editingPrompt}
                loading={isSavingPrompt}
            />

            <ConfirmDialog
                isOpen={!!promptToDelete}
                title="Delete System Prompt"
                message={`Are you sure you want to delete "${promptToDelete?.name}"? This action cannot be undone.`}
                onConfirm={() => handleDeletePrompt(promptToDelete.id)}
                onCancel={() => setPromptToDelete(null)}
                confirmText="Delete Prompt"
            />
        </div>
    );
};

export default YouTubeTranscriptTool;

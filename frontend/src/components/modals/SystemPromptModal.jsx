import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Save, Loader2 } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';

const SystemPromptModal = ({ isOpen, onClose, onSave, prompt = null, loading = false }) => {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [saveAsNew, setSaveAsNew] = useState(false);
    const [versionType, setVersionType] = useState('minor'); // 'minor' or 'major'

    useEffect(() => {
        if (prompt) {
            setName(prompt.name || '');
            setContent(prompt.prompt || '');
            setSaveAsNew(false);
            setVersionType('minor');
        } else {
            setName('');
            setContent('');
            setSaveAsNew(false);
        }
    }, [prompt, isOpen]);

    if (!isOpen) return null;

    const calculateNewVersion = (currentVersion, type) => {
        if (!currentVersion) return '1.0';
        const parts = currentVersion.split('.').map(Number);
        if (parts.length === 1) parts.push(0); // Handle '1' as '1.0'

        if (type === 'major') {
            return `${parts[0] + 1}.0`;
        } else {
            return `${parts[0]}.${parts[1] + 1}`;
        }
    };

    const handleSave = () => {
        const payload = { name, prompt: content };
        if (prompt && saveAsNew) {
            payload.version = calculateNewVersion(prompt.version, versionType);
            onSave(payload, true); // true indicates save as new
        } else if (!prompt) {
            payload.version = '1.0';
            onSave(payload);
        } else {
            payload.version = prompt.version;
            onSave(payload);
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
                    onClick={onClose} 
                />
                <div className="relative w-full max-w-xl bg-surface-2 border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-3/20">
                        <h4 className="text-[15px] font-bold text-text flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                {prompt ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>
                            {prompt ? 'Edit System Prompt' : 'Create New System Prompt'}
                        </h4>
                        <button onClick={onClose} className="p-2 text-text-muted hover:text-text hover:bg-surface-3/30 rounded-lg transition-all cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">Prompt Name</label>
                                <input 
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Summary Assistant..."
                                    className="w-full bg-surface-3/50 border border-border rounded-xl py-3 px-4 text-[14px] text-text focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 focus:bg-surface-3 transition-all"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2 text-right">
                                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1">Current Version</label>
                                <div className="text-2xl font-mono font-bold text-primary">
                                    v{prompt?.version || '1.0'}
                                </div>
                            </div>
                        </div>

                        {prompt && (
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="saveAsNew"
                                            checked={saveAsNew}
                                            onChange={(e) => setSaveAsNew(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="saveAsNew" className="text-[13px] font-bold text-text cursor-pointer select-none">
                                            Save as New Version
                                        </label>
                                    </div>
                                    {saveAsNew && (
                                        <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
                                            <button 
                                                onClick={() => setVersionType('minor')}
                                                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${versionType === 'minor' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text'}`}
                                            >
                                                Minor (v{calculateNewVersion(prompt.version, 'minor')})
                                            </button>
                                            <button 
                                                onClick={() => setVersionType('major')}
                                                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${versionType === 'major' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text'}`}
                                            >
                                                Major (v{calculateNewVersion(prompt.version, 'major')})
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {saveAsNew && (
                                    <p className="text-[11px] text-text-muted italic">
                                        Creating a new version will keep the existing prompt and add this as a new entry with the updated version number.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider ml-1">System Instructions</label>
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter the instructions for the AI..."
                                className="w-full bg-surface-3/50 border border-border rounded-xl py-4 px-4 text-[14px] text-text min-h-[200px] focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 focus:bg-surface-3 transition-all resize-none custom-scrollbar"
                            />
                            <p className="text-[11px] text-text-muted italic px-1">
                                These instructions will be prepended to the YouTube transcript when sent to the AI.
                            </p>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface-3/10">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text hover:bg-surface-3 transition-all cursor-pointer border border-transparent hover:border-border"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={loading || !name || !content}
                            className="btn-primary px-6 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {prompt ? 'Save Changes' : 'Create Prompt'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default SystemPromptModal;

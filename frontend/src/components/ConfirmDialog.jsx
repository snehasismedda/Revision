import { AlertTriangle, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal.jsx';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', type = 'danger', requireInput = false, expectedInput = 'CONFIRM' }) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isConfirmDisabled = requireInput && inputValue !== expectedInput;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/70 fade-in"
                    onClick={onCancel}
                />

                {/* Modal Container */}
                <div
                    className="relative w-full max-w-md rounded-2xl shadow-xl fade-in overflow-hidden"
                    style={{ background: '#12121c', border: '1px solid rgba(255,255,255,0.08)', willChange: 'transform, opacity' }}
                >
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Body */}
                    <div className="px-7 py-8 flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${type === 'danger' ? 'bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                            }`}>
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        <h3 className="text-xl font-heading font-semibold text-white mb-2 tracking-tight">{title}</h3>
                        <p className="text-slate-400 text-[14px] leading-relaxed max-w-sm mb-4">
                            {message}
                        </p>

                        {requireInput && (
                            <div className="w-full mt-2 space-y-2 text-left animate-in fade-in slide-in-from-bottom-2">
                                <label className="text-[13px] font-medium text-slate-300 block">
                                    Type <strong className="text-white select-all">{expectedInput}</strong> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={expectedInput}
                                    className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 placeholder:text-slate-600 text-slate-200 text-[14px] font-medium transition-all focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (isConfirmDisabled) return;
                                onConfirm();
                                onCancel();
                            }}
                            disabled={isConfirmDisabled}
                            className={`flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${type === 'danger'
                                ? 'bg-red-600 hover:bg-red-500 disabled:hover:bg-red-600 text-white shadow-red-600/20 hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] disabled:hover:shadow-red-600/20'
                                : 'btn-primary hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]'
                                } ${isConfirmDisabled ? 'opacity-50' : 'cursor-pointer'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default ConfirmDialog;

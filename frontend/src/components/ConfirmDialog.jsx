import { AlertTriangle, X, Info } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal.jsx';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', type = 'danger', icon: Icon, requireInput = false, expectedInput = 'CONFIRM', children }) => {
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
                    className="absolute inset-0 modal-backdrop fade-in"
                    onClick={onCancel}
                />

                {/* Modal Container */}
                <div
                    className="relative w-full max-w-md rounded-2xl shadow-xl fade-in overflow-hidden bg-surface-2 border border-border"
                    style={{ willChange: 'transform, opacity' }}
                >
                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-2 text-text-muted hover:text-text hover:bg-surface-3/10 rounded-lg transition-all cursor-pointer z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Body */}
                    <div className="px-7 py-8 flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${type === 'danger' ? 'bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                            }`}>
                            {Icon ? <Icon className="w-7 h-7" /> : (type === 'danger' ? <AlertTriangle className="w-7 h-7" /> : <Info className="w-7 h-7" />)}
                        </div>

                        <h3 className="text-xl font-heading font-semibold text-text mb-2 tracking-tight">{title}</h3>
                        <p className="text-text-muted text-[14px] leading-relaxed max-w-sm mb-4">
                            {message}
                        </p>

                        {children}

                        {requireInput && (
                            <div className="w-full mt-2 space-y-2 text-left animate-in fade-in slide-in-from-bottom-2">
                                <label className="text-[13px] font-medium text-text-muted block">
                                    Type <strong className="text-text select-all">{expectedInput}</strong> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={expectedInput}
                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 placeholder:text-text-muted/40 text-text text-[14px] font-medium transition-all focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50"
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-border flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-text-muted hover:text-text hover:bg-surface-3/10 transition-all cursor-pointer border border-transparent hover:border-border"
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
                                ? 'bg-red-600 hover:bg-red-500 disabled:hover:bg-red-600 text-text shadow-red-600/20 hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)] disabled:hover:shadow-red-600/20'
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

import { AlertTriangle, X } from 'lucide-react';
import ModalPortal from './ModalPortal.jsx';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', type = 'danger' }) => {
    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in"
                    onClick={onCancel}
                />

                {/* Modal Container */}
                <div
                    className="relative w-full max-w-md rounded-2xl shadow-2xl fade-in overflow-hidden"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                        <p className="text-slate-400 text-[14px] leading-relaxed max-w-sm">
                            {message}
                        </p>
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
                                onConfirm();
                                onCancel();
                            }}
                            className={`flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold transition-all cursor-pointer shadow-lg active:scale-[0.98] ${type === 'danger'
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20 hover:shadow-[0_6px_24px_rgba(239,68,68,0.4)]'
                                : 'btn-primary hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]'
                                }`}
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

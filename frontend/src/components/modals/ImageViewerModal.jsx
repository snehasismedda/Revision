import React, { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Sun, Moon, Eye, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ImageViewerModal = ({ isOpen, onClose, imageUrl, title = 'Image Viewer', isFullscreen: initialFullscreen = false, onMinimize }) => {
    const { theme } = useTheme();
    const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
    const [isLightMode, setIsLightMode] = useState(theme === 'light');
    const [imageScale, setImageScale] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setIsLightMode(theme === 'light');
            setIsFullscreen(initialFullscreen);
            setImageScale(1);
        }
    }, [isOpen, theme, initialFullscreen]);

    if (!isOpen || !imageUrl) return null;

    return (
        <ModalPortal>
            <div className={`fixed inset-0 z-50 flex items-center justify-center modal-backdrop fade-in ${isFullscreen ? 'p-0' : 'p-0 md:p-6'}`} onClick={onClose}>
                <div
                    className={`w-full flex flex-col ${isFullscreen ? 'h-screen w-screen md:max-h-screen rounded-none border-none' : 'h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl shadow-2xl border'} overflow-hidden transition-all duration-300 ${isLightMode ? 'light bg-surface-2 border-border' : 'dark bg-surface-2 border-border'}`}
                    style={{
                        maxWidth: isFullscreen ? 'none' : '56rem',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0 bg-surface/80 border-border text-text">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[16px] font-heading font-bold text-text tracking-tight leading-snug">
                                {title}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsLightMode(!isLightMode)}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}
                            >
                                {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`}
                            >
                                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            {onMinimize && (
                                <button
                                    type="button"
                                    onClick={() => onMinimize(isFullscreen)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${isLightMode ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                                    title="Minimize Mode"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            )}
                            <button type="button" onClick={onClose} className="p-1.5 rounded-lg transition-all text-text-muted hover:bg-surface-3 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-0 md:p-0 custom-scrollbar scroll-smooth bg-surface-2 flex items-center justify-center relative">
                        <TransformWrapper
                            initialScale={1}
                            minScale={0.5}
                            maxScale={6}
                            centerOnInit
                            onTransformed={(ref) => {
                                setImageScale(ref.state.scale);
                            }}
                        >
                            {({ zoomIn, zoomOut, resetTransform }) => (
                                <div className="relative w-full h-full flex flex-col items-center justify-center">
                                    {/* Floating Bottom Control Bar */}
                                    <div className={`absolute left-1/2 -translate-x-1/2 bottom-8 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-colors duration-300
                                            ${isLightMode ? 'bg-white/90 border-slate-200' : 'bg-[#1a1a24]/90 border-border-hover'}`}>
                                        <div className={`px-4 py-1.5 flex items-center justify-center min-w-[4.5rem] text-[13px] font-medium
                                                ${isLightMode ? 'text-text-muted' : 'text-text'}`}>
                                            {Math.round(imageScale * 100)}%
                                        </div>
                                        <div className={`w-px h-5 ${isLightMode ? 'bg-surface-2' : 'bg-surface-3'} mx-0.5`} />
                                        <button type="button" onClick={() => zoomOut()} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-surface-2 text-text-muted' : 'hover:bg-surface-3 text-text'}`} title="Zoom Out"><ZoomOut size={18} strokeWidth={2} /></button>
                                        <button type="button" onClick={() => zoomIn()} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-surface-2 text-text-muted' : 'hover:bg-surface-3 text-text'}`} title="Zoom In"><ZoomIn size={18} strokeWidth={2} /></button>
                                        <button type="button" onClick={() => resetTransform()} className={`p-2 rounded-xl transition-all cursor-pointer ${isLightMode ? 'hover:bg-surface-2 text-text-muted' : 'hover:bg-surface-3 text-text'}`} title="Reset Zoom"><RefreshCw size={18} strokeWidth={2} /></button>
                                    </div>
                                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                        <img 
                                            src={imageUrl} 
                                            alt={title} 
                                            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-lg select-none" 
                                        />
                                    </TransformComponent>
                                </div>
                            )}
                        </TransformWrapper>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
};

export default ImageViewerModal;

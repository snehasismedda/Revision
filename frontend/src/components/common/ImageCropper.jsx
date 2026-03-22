import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Save, RotateCw, ZoomIn, ZoomOut, Scissors, Maximize, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getCroppedImg, getRotatedImage } from '../../utils/cropImage.js';

const cropStyles = `
.ReactCrop__drag-handle {
    width: 12px !important;
    height: 12px !important;
    background-color: var(--color-primary) !important;
    border: 2px solid white !important;
    border-radius: 50% !important;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.4) !important;
    z-index: 10;
}
.ReactCrop__crop-selection {
    border: 2px solid var(--color-primary) !important;
    box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.7) !important;
    border-radius: 4px;
}
.ReactCrop__rule-of-thirds-vt::before, .ReactCrop__rule-of-thirds-vt::after,
.ReactCrop__rule-of-thirds-hz::before, .ReactCrop__rule-of-thirds-hz::after {
    background-color: rgba(255, 255, 255, 0.2) !important;
}
`;

const ImageCropper = ({
    image,
    onCropComplete,
    onCancel,
    title = "Edit Image",
    subtitle = "Crop and rotate your image",
    aspect = undefined,
    circularCrop = false
}) => {
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [displayImage, setDisplayImage] = useState(image);
    const [isRotating, setIsRotating] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        setDisplayImage(image);
        setRotation(0);
    }, [image]);

    const handleBackingRotate = async (angle) => {
        if (isRotating) return;
        setIsRotating(true);

        // Let the CSS animation finish first for smooth experience
        setRotation(prev => prev + angle);

        setTimeout(async () => {
            try {
                const rotated = await getRotatedImage(displayImage, angle);
                // Instant swap without animation back
                setDisplayImage(rotated);
                // We reset rotation to 0 but it might trigger animation back if not careful
                // We'll use a local flag to hide the animation momentarily
                setRotation(0);
            } catch (err) {
                console.error("Rotation failed:", err);
            } finally {
                setIsRotating(false);
            }
        }, 500); // Match CSS transition duration
    };

    const setInitialCrop = (width, height) => {
        if (aspect) {
            const initialCrop = centerCrop(
                makeAspectCrop(
                    { unit: '%', width: 90 },
                    aspect,
                    width,
                    height
                ),
                width,
                height
            );
            setCrop(initialCrop);
            setCompletedCrop(initialCrop); // Use initialCrop as percent, handleApplyCrop will convert
        } else {
            const fullCrop = {
                unit: '%',
                x: 0,
                y: 0,
                width: 100,
                height: 100
            };
            setCrop(fullCrop);
            setCompletedCrop(fullCrop);
        }
    };

    function onImageLoad(e) {
        const { width, height } = e.currentTarget;
        setInitialCrop(width, height);
    }

    const handleApplyCrop = async () => {
        try {
            if (!completedCrop || !imgRef.current) return;

            // Since we bake rotation in, we use rotation 0 here
            const imageEl = imgRef.current;
            
            let pixelCrop = completedCrop;
            
            // If the crop is in percentages, convert to pixels
            if (completedCrop.unit === '%') {
                pixelCrop = {
                    x: (completedCrop.x / 100) * imageEl.naturalWidth,
                    y: (completedCrop.y / 100) * imageEl.naturalHeight,
                    width: (completedCrop.width / 100) * imageEl.naturalWidth,
                    height: (completedCrop.height / 100) * imageEl.naturalHeight,
                };
            } else {
                // If it's already in pixels, those are display pixels, need to scale to natural
                const scaleX = imageEl.naturalWidth / imageEl.width;
                const scaleY = imageEl.naturalHeight / imageEl.height;
                pixelCrop = {
                    x: completedCrop.x * scaleX,
                    y: completedCrop.y * scaleY,
                    width: completedCrop.width * scaleX,
                    height: completedCrop.height * scaleY,
                };
            }

            const croppedImage = await getCroppedImg(displayImage, pixelCrop, 0);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error("Crop applied failed:", e);
        }
    };

    const handleReset = () => {
        setRotation(0);
        setZoom(1);
        if (imgRef.current) {
            setInitialCrop(imgRef.current.width, imgRef.current.height);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#08080d] animate-in fade-in duration-200 overflow-hidden">
            <style>{cropStyles}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] bg-black/20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                        <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-heading font-semibold text-white leading-tight">{title}</h3>
                        {subtitle && <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-0.5 opacity-80">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white transition-all active:scale-95 border border-transparent hover:border-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApplyCrop}
                        className="px-8 py-2.5 rounded-xl text-[13px] font-bold bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center gap-2 active:scale-95 btn-primary"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Apply & Save
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="relative flex-1 overflow-auto flex items-center justify-center p-8 bg-[#050508]">
                {/* Visual grid background */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none dot-grid" />

                <div className="relative transform-gpu transition-transform duration-300 ease-out"
                    style={{ transform: `scale(${zoom})` }}>
                    <div className={`relative inline-block ${isRotating ? 'transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)' : ''}`}
                        style={{
                            transform: `rotate(${rotation}deg)`
                        }}>
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => !isRotating && setCrop(c)}
                            onComplete={(c) => !isRotating && setCompletedCrop(c)}
                            minHeight={20}
                            minWidth={20}
                            aspect={aspect}
                            circularCrop={circularCrop}
                            className={`shadow-[0_0_60px_rgba(0,0,0,0.6)] ${isRotating ? 'pointer-events-none' : ''}`}
                        >
                            <img
                                ref={imgRef}
                                alt="Crop tool"
                                src={displayImage}
                                onLoad={onImageLoad}
                                style={{
                                    maxHeight: '75vh',
                                    maxWidth: '90vw',
                                    display: 'block',
                                    userSelect: 'none'
                                }}
                                draggable={false}
                            />
                        </ReactCrop>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="px-7 py-6 border-t border-white/[0.06] bg-surface-2 shrink-0">
                <div className="max-w-6xl mx-auto flex flex-wrap gap-x-12 gap-y-6 items-center justify-center">

                    {/* Zoom Group */}
                    <div className="flex items-center gap-6 bg-white/[0.03] p-1.5 px-4 rounded-2xl border border-white/[0.06]">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">Zoom</span>
                                <span className="text-[11px] font-black text-primary font-mono">{Math.round(zoom * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <button
                                    onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                                    className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-all active:scale-90"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={0.5}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <button
                                    onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                                    className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-all active:scale-90"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tools Group */}
                    <div className="flex items-center gap-2 bg-white/[0.03] p-1.5 px-2 rounded-2xl border border-white/[0.06]">
                        <button
                            onClick={() => handleBackingRotate(-90)}
                            disabled={isRotating}
                            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 group"
                        >
                            <RotateCw className="w-4 h-4 -scale-x-100 group-hover:rotate-[-90deg] transition-transform duration-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Rotate L</span>
                        </button>

                        <div className="w-px h-6 bg-white/[0.1] mx-1" />

                        <button
                            onClick={() => handleBackingRotate(90)}
                            disabled={isRotating}
                            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 group"
                        >
                            <span className="text-[11px] font-bold uppercase tracking-wider">Rotate R</span>
                            <RotateCw className="w-4 h-4 group-hover:rotate-[90deg] transition-transform duration-500" />
                        </button>

                        <div className="w-px h-6 bg-white/[0.1] mx-1" />

                        <button
                            onClick={() => {
                                if (imgRef.current) setInitialCrop(imgRef.current.width, imgRef.current.height);
                            }}
                            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all group"
                        >
                            <Maximize className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Fill Image</span>
                        </button>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-rose-400 transition-all px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-rose-500/5 hover:border-rose-500/20 active:scale-95"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset All
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ImageCropper;

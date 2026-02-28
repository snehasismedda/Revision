import React, { useState, useRef } from 'react';
import { questionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, FileText, Image as ImageIcon, Trash2, Save, Scissors, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from '../../utils/cropImage.js';

// Custom styles for react-image-crop handles
const cropStyles = `
.ReactCrop__drag-handle {
    width: 12px !important;
    height: 12px !important;
    background-color: #8b5cf6 !important;
    border: 2px solid white !important;
    border-radius: 50% !important;
}
.ReactCrop__crop-selection {
    border: 2px solid #8b5cf6 !important;
    box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.7) !important;
}
`;

const AddQuestionModal = ({ isOpen, onClose, subjectId, onQuestionAdded }) => {
    const [newQuestionType, setNewQuestionType] = useState('text');
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionImage, setNewQuestionImage] = useState('');
    const [addingQuestion, setAddingQuestion] = useState(false);

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const imgRef = useRef(null);

    function onImageLoad(e) {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 70,
                },
                undefined, // Unrestricted aspect ratio
                width,
                height
            ),
            width,
            height
        );
        setCrop(initialCrop);
    }

    const handleApplyCrop = async () => {
        try {
            if (!completedCrop || !imgRef.current) return;

            // Calculate exact pixel crop coordinates based on displayed image size and actual native resolution
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

            const pixelCrop = {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY,
            };

            const croppedImage = await getCroppedImg(imageToCrop, pixelCrop, rotation);
            setNewQuestionImage(croppedImage);
            setIsCropping(false);
            setImageToCrop(null);
            setRotation(0);
            setZoom(1);
            setCompletedCrop(null);
            toast.success('Image cropped successfully');
        } catch (e) {
            console.error(e);
            toast.error('Failed to crop image');
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const content = newQuestionType === 'text' ? newQuestionText.trim() : newQuestionImage;
        if (!content) return toast.error('Please provide question content');

        setAddingQuestion(true);
        try {
            const { questions } = await questionsApi.create(subjectId, { content, type: newQuestionType });
            onQuestionAdded(questions);
            setNewQuestionText('');
            setNewQuestionImage('');
            onClose();
            const count = questions.length;
            toast.success(count > 1
                ? `${count} questions parsed and added successfully`
                : 'Question added and parsed successfully'
            );
        } catch {
            toast.error('Failed to add question');
        } finally {
            setAddingQuestion(false);
        }
    };

    if (!isOpen) return null;

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
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            Add New Question
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        {/* Type toggle */}
                        <div className="flex p-1 bg-surface-2/80 rounded-xl mb-6 border border-white/[0.06]">
                            <button
                                onClick={() => setNewQuestionType('text')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'text' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <FileText className="w-4 h-4" /> Text Question
                            </button>
                            <button
                                onClick={() => setNewQuestionType('image')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'image' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <ImageIcon className="w-4 h-4" /> Image Upload
                            </button>
                        </div>

                        <form id="add-question-form" onSubmit={handleAddQuestion} className="space-y-5">
                            {newQuestionType === 'text' ? (
                                <div>
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Question Content</label>
                                    <textarea
                                        value={newQuestionText}
                                        onChange={(e) => setNewQuestionText(e.target.value)}
                                        placeholder="Paste or type your question here... e.g., 'What is the sum of the first 100 integers?'"
                                        rows={8}
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80 resize-none"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Upload Image</label>
                                    <div
                                        className="relative border-2 border-dashed border-white/[0.08] rounded-xl p-12 flex flex-col items-center justify-center bg-surface-2/30 hover:bg-surface-2/50 hover:border-primary/30 transition-all cursor-pointer group"
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                const file = e.dataTransfer.files[0];
                                                if (file.type.startsWith('image/')) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setNewQuestionImage(reader.result);
                                                    reader.readAsDataURL(file);
                                                }
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    if (file.type.startsWith('image/')) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setImageToCrop(reader.result);
                                                            setIsCropping(true);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }
                                            }}
                                        />
                                        {newQuestionImage ? (
                                            <div className="w-full relative min-h-[200px] flex items-center justify-center">
                                                <img src={newQuestionImage} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg relative z-0" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                                                    <span className="text-white font-medium bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm text-[13px]">Click or Drag to change</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center pointer-events-none">
                                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                                                    <ImageIcon className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-white font-semibold mb-1 text-[14px]">Click to upload or drag and drop</h4>
                                                <p className="text-[13px] text-slate-500">SVG, PNG, JPG or GIF (max. 10MB)</p>
                                            </div>
                                        )}
                                    </div>
                                    {newQuestionImage && (
                                        <div className="flex justify-between items-center mt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageToCrop(newQuestionImage);
                                                    setIsCropping(true);
                                                }}
                                                className="text-[13px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg hover:bg-indigo-500/10 transition-all active:scale-95"
                                            >
                                                <Scissors className="w-4 h-4" /> Recrop image
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewQuestionImage('')}
                                                className="text-[13px] text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg hover:bg-red-500/10 transition-all active:scale-95"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove image
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-indigo-500/[0.06] px-3 py-1.5 rounded-lg border border-indigo-500/10">
                            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>AI will auto-process this question</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                form="add-question-form"
                                type="submit"
                                disabled={addingQuestion || (newQuestionType === 'text' ? !newQuestionText.trim() : !newQuestionImage)}
                                className="btn-primary text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98] hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                            >
                                {addingQuestion ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Analyze & Save</span>
                                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cropper UI Overlay */}
            {isCropping && (
                <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f0f1a]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-1 shrink-0">
                        <style>{cropStyles}</style>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <Scissors className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Free-form Crop</h3>
                                <p className="text-slate-400 text-xs">Select and rotate the question area</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsCropping(false);
                                    if (!newQuestionImage) setImageToCrop(null);
                                }}
                                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-all border border-white/5 bg-white/5 active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyCrop}
                                className="px-6 py-2 rounded-lg text-sm font-semibold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <Check className="w-4 h-4" /> Apply Crop
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-1 bg-[#05050a] overflow-auto flex items-center justify-center p-4 md:p-8">
                        <div className="transition-transform duration-200 ease-out flex items-center justify-center min-w-max min-h-max" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
                            <div className="relative inline-block" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    minHeight={20}
                                    minWidth={20}
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Crop me"
                                        src={imageToCrop}
                                        onLoad={onImageLoad}
                                        style={{ maxHeight: '65vh', maxWidth: '100%', display: 'block' }}
                                        crossOrigin="anonymous"
                                    />
                                </ReactCrop>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-6 border-t border-white/10 bg-surface-1 shrink-0">
                        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            {/* Zoom Control */}
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 text-center md:text-left">Zoom Control</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setZoom(z => Math.max(1, z - 0.2))}
                                        className="p-2.5 rounded-lg bg-surface-2 text-slate-400 hover:text-white border border-white/5 transition-all"
                                    >
                                        <ZoomOut className="w-5 h-5" />
                                    </button>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <button
                                        onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                                        className="p-2.5 rounded-lg bg-surface-2 text-slate-400 hover:text-white border border-white/5 transition-all"
                                    >
                                        <ZoomIn className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Rotate Control */}
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3 text-center md:text-left">Rotate ({rotation}°)</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setRotation(r => (r - 90) % 360)}
                                        className="p-2.5 rounded-lg bg-surface-2 text-slate-400 hover:text-white border border-white/5 transition-all"
                                        title="Rotate Left"
                                    >
                                        <RotateCw className="w-5 h-5 -scale-x-100" />
                                    </button>
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                        onChange={(e) => setRotation(parseInt(e.target.value))}
                                        className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-400"
                                    />
                                    <button
                                        onClick={() => setRotation(r => (r + 90) % 360)}
                                        className="p-2.5 rounded-lg bg-surface-2 text-slate-400 hover:text-white border border-white/5 transition-all"
                                        title="Rotate Right"
                                    >
                                        <RotateCw className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ModalPortal>
    );
};

export default AddQuestionModal;

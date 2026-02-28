import React, { useState, useRef, useEffect } from 'react';
import { notesApi, aiApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Trash2, Save, FileText, Image as ImageIcon, Camera, RefreshCcw, FlipHorizontal, ChevronDown, Scissors, Check, RotateCw, ZoomIn, ZoomOut, Wand2, Sparkles, Info } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from '../../utils/cropImage.js';

const AddNoteModal = ({ isOpen, onClose, subjectId, onNoteAdded, questionId }) => {
    const [mainType, setMainType] = useState('text'); // 'text' or 'image'
    const [imageMethod, setImageMethod] = useState('upload'); // 'upload' or 'camera'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [noteImage, setNoteImage] = useState('');

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const imgRef = useRef(null);

    // Camera State
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [cameraStream, setCameraStream] = useState(null);
    const [isCameraLoading, setIsCameraLoading] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    const getCameras = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);
            if (videoDevices.length > 0 && !selectedCameraId) {
                setSelectedCameraId(videoDevices[0].deviceId);
            }
        } catch (err) {
            console.error("Error enumerating cameras:", err);
            toast.error("Could not access camera list");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const startCamera = async (deviceId) => {
        stopCamera();
        setIsCameraLoading(true);
        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error starting camera:", err);
            toast.error("Failed to start camera. Please check permissions.");
        } finally {
            setIsCameraLoading(false);
        }
    };

    const handleMainTypeChange = (type) => {
        if (type !== 'image' || imageMethod !== 'camera') {
            stopCamera();
        } else if (type === 'image' && imageMethod === 'camera') {
            getCameras();
            startCamera(selectedCameraId);
        }
        setMainType(type);
    };

    const handleImageMethodChange = (method) => {
        if (method !== 'camera') {
            stopCamera();
        } else {
            getCameras();
            startCamera(selectedCameraId);
        }
        setImageMethod(method);
    };

    const takePhoto = () => {
        if (!videoRef.current || videoRef.current.videoWidth === 0) {
            return toast.error("Camera is not ready. Please wait a moment.");
        }
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        stopCamera();
        setImageToCrop(dataUrl);
        setIsCropping(true);
    };

    // ─── Image Cropping Handlers ───────────────────────────

    function onImageLoad(e) {
        const { width, height } = e.currentTarget;
        const initialCrop = centerCrop(
            makeAspectCrop(
                { unit: '%', width: 90 },
                width / height,
                width,
                height
            ),
            width,
            height
        );
        setCrop(initialCrop);

        setCompletedCrop({
            unit: 'px',
            x: (initialCrop.x / 100) * width,
            y: (initialCrop.y / 100) * height,
            width: (initialCrop.width / 100) * width,
            height: (initialCrop.height / 100) * height,
        });
    }

    const handleApplyCrop = async () => {
        try {
            if (!completedCrop || !imgRef.current) return;

            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

            const pixelCrop = {
                x: Math.round(completedCrop.x * scaleX),
                y: Math.round(completedCrop.y * scaleY),
                width: Math.round(completedCrop.width * scaleX),
                height: Math.round(completedCrop.height * scaleY),
            };

            const croppedImage = await getCroppedImg(imageToCrop, pixelCrop, rotation);
            setNoteImage(croppedImage);
            setMainType('image');
            setIsCropping(false);
            setImageToCrop(null);
            setRotation(0);
            setZoom(1);
            setCompletedCrop(null);
            toast.success('Image cropped successfully');

            // Image is now set, user can manually trigger AI tools in the UI
        } catch (e) {
            console.error(e);
            toast.error('Failed to crop image');
        }
    };

    const handleAnalyzeImage = async (image) => {
        if (!image) return;
        setIsAnalyzing(true);
        try {
            const result = await aiApi.parseNote({ content: image, type: 'image' });
            if (result.title) setTitle(result.title);
            if (result.content) setContent(result.content);
            toast.success('AI analysis complete');
        } catch (error) {
            console.error('AI Analysis failed:', error);
            toast.error('AI was unable to analyze this image.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGetImageDescription = async () => {
        if (!noteImage) return;
        setIsAnalyzing(true);
        try {
            const result = await aiApi.describeImage({ content: noteImage });
            if (result.title) setTitle(result.title);
            if (result.content) setContent(result.content);
            toast.success('Description generated');
        } catch (error) {
            toast.error('Failed to get description');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleEnhanceContent = async () => {
        if (!content.trim()) return toast.error('Add some content first');
        setIsEnhancing(true);
        try {
            const result = await aiApi.enhanceNote({ title, content });
            if (result.title) setTitle(result.title);
            if (result.content) setContent(result.content);
            toast.success('Note enhanced with AI');
        } catch (error) {
            toast.error('Failed to enhance note');
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            return toast.error('Please provide both title and content');
        }

        setAddingNote(true);
        try {
            const { note } = await notesApi.create(subjectId, {
                title: title.trim(),
                content: content.trim(),
                questionId,
                sourceImageContent: mainType === 'image' ? noteImage : null
            });
            onNoteAdded(note);
            handleModalClose();
            toast.success('Note added successfully');
        } catch {
            toast.error('Failed to add note');
        } finally {
            setAddingNote(false);
        }
    };

    const handleModalClose = () => {
        stopCamera();
        setTitle('');
        setContent('');
        setNoteImage('');
        setMainType('text');
        setImageMethod('upload');
        setCompletedCrop(null);
        setIsCropping(false);
        setImageToCrop(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={handleModalClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            {isCropping ? 'Crop Note Image' : 'Add New Note'}
                        </h3>
                        <button
                            onClick={handleModalClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {!isCropping ? (
                        <>
                            {/* Main Tabs */}
                            <div className="px-7 pt-5 shrink-0">
                                <div className="flex bg-surface-2/40 p-1 rounded-xl border border-white/[0.06]">
                                    <button
                                        onClick={() => handleMainTypeChange('text')}
                                        className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${mainType === 'text' ? 'bg-emerald-500/[0.12] text-white border border-emerald-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                                    >
                                        <FileText className="w-4 h-4" /> Text Note
                                    </button>
                                    <button
                                        onClick={() => handleMainTypeChange('image')}
                                        className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${mainType === 'image' ? 'bg-emerald-500/[0.12] text-white border border-emerald-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                                    >
                                        <ImageIcon className="w-4 h-4" /> Image Note
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                                {mainType === 'image' && (
                                    <div className="space-y-4 mb-6">
                                        {/* Image Sub-Tabs */}
                                        <div className="flex bg-surface-3/30 p-1 rounded-lg border border-white/5 w-fit">
                                            <button
                                                onClick={() => handleImageMethodChange('upload')}
                                                className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${imageMethod === 'upload' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                Upload
                                            </button>
                                            <button
                                                onClick={() => handleImageMethodChange('camera')}
                                                className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${imageMethod === 'camera' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                Camera
                                            </button>
                                        </div>

                                        {imageMethod === 'camera' ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">Native Camera</label>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative group/sel min-w-[140px]">
                                                            <select
                                                                value={selectedCameraId}
                                                                onChange={(e) => {
                                                                    const newId = e.target.value;
                                                                    setSelectedCameraId(newId);
                                                                    startCamera(newId);
                                                                }}
                                                                className="w-full bg-surface-3/50 border border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-[11px] text-slate-300 outline-none focus:border-emerald-400/40 appearance-none cursor-pointer hover:bg-surface-3 transition-all shadow-sm"
                                                            >
                                                                {cameras.length > 0 ? (
                                                                    cameras.map(camera => (
                                                                        <option key={camera.deviceId} value={camera.deviceId}>
                                                                            {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                                                                        </option>
                                                                    ))
                                                                ) : (
                                                                    <option value="">No Camera Found</option>
                                                                )}
                                                            </select>
                                                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-500 group-hover/sel:text-slate-300 transition-colors">
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={getCameras}
                                                            className="p-1.5 rounded-lg bg-surface-3/50 border border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all"
                                                        >
                                                            <RefreshCcw className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl flex items-center justify-center group bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0a0a0f_100%)]">
                                                    {isCameraLoading ? (
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                                            <span className="text-[12px] text-emerald-400/80 font-bold uppercase tracking-widest animate-pulse">Initializing...</span>
                                                        </div>
                                                    ) : cameraStream ? (
                                                        <>
                                                            <video
                                                                ref={videoRef}
                                                                autoPlay
                                                                playsInline
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={takePhoto}
                                                                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-slate-200"
                                                                >
                                                                    <div className="w-12 h-12 border-2 border-emerald-400/40 rounded-full" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => startCamera(selectedCameraId)}
                                                            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-[13px] font-bold shadow-lg"
                                                        >
                                                            Start Camera
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="relative border-2 border-dashed border-white/[0.08] rounded-xl p-8 flex flex-col items-center justify-center bg-surface-2/30 hover:bg-surface-2/50 transition-all cursor-pointer group min-h-[200px]"
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={e => {
                                                    e.preventDefault();
                                                    const file = e.dataTransfer.files[0];
                                                    if (file?.type.startsWith('image/')) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setImageToCrop(reader.result);
                                                            setIsCropping(true);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setImageToCrop(reader.result);
                                                                setIsCropping(true);
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                {noteImage ? (
                                                    <div className="w-full h-full flex flex-col items-center">
                                                        <img src={noteImage} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg mb-4" />
                                                        <div className="flex gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setImageToCrop(noteImage);
                                                                    setIsCropping(true);
                                                                }}
                                                                className="text-[12px] text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                                                            >
                                                                <Scissors className="w-3.5 h-3.5" /> Edit/Crop
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setNoteImage('');
                                                                }}
                                                                className="text-[12px] text-red-400 font-bold flex items-center gap-1 hover:underline"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                                        <h4 className="text-white font-semibold mb-1 text-[13px]">Upload your note image</h4>
                                                        <p className="text-[11px] text-slate-500">Drag or click to choose a file</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {noteImage && !isAnalyzing && (
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAnalyzeImage(noteImage)}
                                                    className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all flex-1 justify-center"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5" /> Generate Note with AI
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleGetImageDescription}
                                                    className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-all flex-1 justify-center"
                                                >
                                                    <Info className="w-3.5 h-3.5" /> Get Description
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <form id="add-note-form" onSubmit={handleAddNote} className={`space-y-5 ${mainType === 'image' ? 'mt-6 border-t border-white/[0.06] pt-6' : ''}`}>
                                    <div>
                                        <div className="flex justify-between items-center mb-2.5">
                                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">
                                                Note Title
                                            </label>
                                            {(isAnalyzing || isEnhancing) && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                                    <span className="text-[10px] text-emerald-400 font-bold">{isAnalyzing ? 'AI Analyzing...' : 'AI Enhancing...'}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g., Important formulas for Chapter 1"
                                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2.5">
                                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">
                                                Note Content (Markdown)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleEnhanceContent}
                                                disabled={!content.trim() || isEnhancing}
                                                className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 transition-all disabled:opacity-50"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" /> Enhance with AI
                                            </button>
                                        </div>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Type or paste your notes here..."
                                            rows={8}
                                            className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15 transition-all resize-none font-mono"
                                        />
                                    </div>
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-end bg-black/20">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleModalClose}
                                        className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        form="add-note-form"
                                        type="submit"
                                        disabled={addingNote || !title.trim() || !content.trim()}
                                        className="bg-emerald-500 text-white shadow-lg text-[13px] font-bold px-8 py-3 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98]"
                                    >
                                        {addingNote ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Save Note</span>
                                                <Save className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Cropper UI */
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-auto p-6 bg-black/40 flex items-center justify-center">
                                <ReactCrop
                                    crop={crop}
                                    onChange={c => setCrop(c)}
                                    onComplete={c => setCompletedCrop(c)}
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Crop me"
                                        src={imageToCrop}
                                        onLoad={onImageLoad}
                                        style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                                    />
                                </ReactCrop>
                            </div>
                            <div className="p-6 bg-surface-2 border-t border-white/[0.06] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setRotation(r => (r - 90) % 360)}
                                        className="p-2.5 rounded-lg bg-surface-3 text-slate-400 hover:text-white border border-white/5 transition-all"
                                    >
                                        <RotateCw className="w-5 h-5 -scale-x-100" />
                                    </button>
                                    <button
                                        onClick={() => setRotation(r => (r + 90) % 360)}
                                        className="p-2.5 rounded-lg bg-surface-3 text-slate-400 hover:text-white border border-white/5 transition-all"
                                    >
                                        <RotateCw className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsCropping(false)}
                                        className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleApplyCrop}
                                        className="bg-emerald-500 text-white px-8 py-2.5 rounded-xl text-[13px] font-bold shadow-lg flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Apply Crop
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .ReactCrop__drag-handle {
                    width: 12px !important;
                    height: 12px !important;
                    background-color: #10b981 !important;
                    border: 2px solid white !important;
                    border-radius: 50% !important;
                }
                .ReactCrop__crop-selection {
                    border: 2px solid #10b981 !important;
                    box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.7) !important;
                }
            `}</style>
        </ModalPortal>
    );
};

export default AddNoteModal;

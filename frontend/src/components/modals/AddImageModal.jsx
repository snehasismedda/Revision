import React, { useState, useRef, useEffect } from 'react';
import { imagesApi, subjectsApi, aiApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, FileText, Image as ImageIcon, Trash2, Save, Scissors, Check, RotateCw, ZoomIn, ZoomOut, Camera, RefreshCcw, FlipHorizontal, ChevronDown, Sparkles } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ImageCropper from '../common/ImageCropper.jsx';

const AddImageModal = ({ isOpen, onClose, onImageSaved }) => {
    const [saveType, setSaveType] = useState('question'); // 'question' or 'note'
    const [uploadType, setUploadType] = useState('image'); // 'image' or 'camera'
    const [newImage, setNewImage] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
    const [analyzeWithAI, setAnalyzeWithAI] = useState(true);

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // Camera State
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [cameraStream, setCameraStream] = useState(null);
    const [isCameraLoading, setIsCameraLoading] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadSubjects();
            const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                setUploadType('camera');
                getCameras();
            } else {
                setUploadType('image');
                stopCamera();
            }
        } else {
            stopCamera();
        }
    }, [isOpen]);

    const loadSubjects = async () => {
        setIsLoadingSubjects(true);
        try {
            const res = await subjectsApi.list();
            setSubjects(res.subjects);
            if (res.subjects.length > 0) {
                setSelectedSubjectId(res.subjects[0].id);
            }
        } catch {
            toast.error('Failed to load subjects');
        } finally {
            setIsLoadingSubjects(false);
        }
    };

    // Sync camera stream to video element when it mounts
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
                return videoDevices[0].deviceId;
            }
            return selectedCameraId;
        } catch (err) {
            console.error("Error enumerating cameras:", err);
            toast.error("Could not access camera list");
            return null;
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
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Camera API not available. This requires HTTPS.");
            }
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error starting camera:", err);
            if (err.name === 'NotAllowedError') {
                toast.error("Camera access denied. Please allow permissions.");
            } else if (err.message.includes('HTTPS')) {
                toast.error("Camera requires a secure context (HTTPS).");
            } else {
                toast.error("Failed to start camera: " + (err.message || "Please check permissions."));
            }
        } finally {
            setIsCameraLoading(false);
        }
    };

    const handleTabChange = (type) => {
        if (type !== 'camera') {
            stopCamera();
        } else {
            getCameras();
            startCamera(selectedCameraId);
        }
        setUploadType(type);
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

    const handleApplyCrop = (croppedImage) => {
        setNewImage(croppedImage);
        setUploadType('image');
        setIsCropping(false);
        setImageToCrop(null);
        toast.success('Image cropped successfully');
    };

    const handleEnhance = async () => {
        if (!newImage) return toast.error('Please upload or capture an image first');
        setIsEnhancing(true);
        const loadingToast = toast.loading('AI is analyzing the image...');
        try {
            const res = await aiApi.parseNote({ content: newImage, type: 'image' });
            if (res.title) setTitle(res.title);
            if (res.content) setContent(res.content);
            toast.success('Note enhanced with AI', { id: loadingToast });
        } catch (error) {
            toast.error(error.message || 'Failed to analyze image', { id: loadingToast });
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleSaveImage = async (e) => {
        e.preventDefault();
        if (!newImage) return toast.error('Please upload or capture an image');
        if (!selectedSubjectId) return toast.error('Please select a subject');

        setIsSaving(true);
        const loadingToast = toast.loading(`Processing as ${saveType}...`);
        try {
            const res = await imagesApi.saveAs({
                content: newImage,
                type: saveType,
                subjectId: selectedSubjectId,
                title: saveType === 'note' ? title : undefined,
                noteContent: saveType === 'note' ? content : undefined,
                skipAI: !analyzeWithAI
            });
            const successMsg = saveType === 'question'
                ? (analyzeWithAI ? 'Question saved and parsed with AI' : 'Question saved directly')
                : 'Note saved successfully';
            toast.success(successMsg, { id: loadingToast });
            onImageSaved(res);
            setNewImage('');
            setTitle('');
            setContent('');
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save image', { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalClose = () => {
        stopCamera();
        setNewImage('');
        setTitle('');
        setContent('');
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
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            Add New Image
                        </h3>
                        <button
                            onClick={handleModalClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 overflow-y-auto custom-scrollbar">
                        {/* Save Type & Subject Choice */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Save As</label>
                                <div className="flex p-1 bg-surface-2/80 rounded-xl border border-white/[0.06]">
                                    <button
                                        type="button"
                                        onClick={() => setSaveType('question')}
                                        className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${saveType === 'question' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                    >
                                        Question
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSaveType('note')}
                                        className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${saveType === 'note' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}
                                    >
                                        Note
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Choose Subject</label>
                                <div className="relative group/sel">
                                    <select
                                        value={selectedSubjectId}
                                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                                        className="w-full bg-surface-2/80 border border-white/[0.06] rounded-xl py-2 pl-4 pr-10 text-[13px] text-white outline-none focus:border-primary/40 appearance-none cursor-pointer hover:bg-surface-3 transition-all shadow-sm"
                                        disabled={isLoadingSubjects}
                                    >
                                        {subjects.map(subject => (
                                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 group-hover/sel:text-slate-300 transition-colors">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upload Method toggle */}
                        <div className="flex p-1 bg-surface-2/80 rounded-xl mb-6 border border-white/[0.06]">
                            <button
                                type="button"
                                onClick={() => handleTabChange('image')}
                                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${uploadType === 'image' ? 'bg-white/[0.08] text-white border border-white/10 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <ImageIcon className="w-4 h-4" /> Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('camera')}
                                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${uploadType === 'camera' ? 'bg-white/[0.08] text-white border border-white/10 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <Camera className="w-4 h-4" /> Camera
                            </button>
                        </div>

                        <form id="add-image-form" onSubmit={handleSaveImage} className="space-y-5">
                            {uploadType === 'image' ? (
                                <div>
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Image Preview</label>
                                    <div
                                        className="relative border-2 border-dashed border-white/[0.08] rounded-xl p-10 flex flex-col items-center justify-center bg-surface-2/30 hover:bg-surface-2/50 hover:border-primary/30 transition-all cursor-pointer group"
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                const file = e.dataTransfer.files[0];
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
                                        {newImage ? (
                                            <div className="w-full relative min-h-[200px] flex items-center justify-center">
                                                <img src={newImage} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg relative z-0" />
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
                                                <p className="text-[13px] text-slate-500">Academic material (Diagrams, Notes, Questions)</p>
                                            </div>
                                        )}
                                    </div>
                                    {newImage && (
                                        <div className="flex justify-between items-center mt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageToCrop(newImage);
                                                    setIsCropping(true);
                                                }}
                                                className="text-[13px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg hover:bg-indigo-500/10 transition-all"
                                            >
                                                <Scissors className="w-4 h-4" /> Recrop
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewImage('')}
                                                className="text-[13px] text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-lg hover:bg-red-500/10 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">Camera Feed</label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative group/sel min-w-[140px]">
                                                <select
                                                    value={selectedCameraId}
                                                    onChange={(e) => {
                                                        const newId = e.target.value;
                                                        setSelectedCameraId(newId);
                                                        startCamera(newId);
                                                    }}
                                                    className="w-full bg-surface-3/50 border border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-[11px] text-slate-300 outline-none focus:border-primary/40 appearance-none cursor-pointer hover:bg-surface-3 transition-all"
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
                                                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-500 transition-colors">
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={getCameras}
                                                className="p-1.5 rounded-lg bg-surface-3/50 border border-white/10 text-slate-500 hover:text-white transition-all active:scale-90"
                                            >
                                                <RefreshCcw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl flex items-center justify-center group bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0a0a0f_100%)]">
                                        {isCameraLoading ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                <span className="text-[12px] text-primary/80 font-bold uppercase tracking-widest animate-pulse">Initializing...</span>
                                            </div>
                                        ) : cameraStream ? (
                                            <>
                                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-center">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                                                    <button type="button" onClick={takePhoto} className="relative group cursor-pointer z-10 transition-transform active:scale-95">
                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-slate-200" />
                                                    </button>
                                                </div>
                                                <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1 bg-black/40 rounded-md backdrop-blur-sm border border-white/10">
                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-center px-10 py-6">
                                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                                    <Camera className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-white font-semibold mb-2 text-sm">Camera Permission Required</h4>
                                                <p className="text-[13px] text-slate-500 mb-6">Click below to allow camera access to capture images.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => startCamera(selectedCameraId)}
                                                    className="px-6 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-all"
                                                >
                                                    Start Camera
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {saveType === 'note' && (
                                <div className="space-y-5 pt-6 border-t border-white/[0.06] fade-in">
                                    <div>
                                        <div className="flex justify-between items-center mb-2.5">
                                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">
                                                Note Title (Optional)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleEnhance}
                                                disabled={isEnhancing || !newImage}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 px-2 py-1 rounded bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                {isEnhancing ? (
                                                    <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                ) : <Wand2 className="w-3 h-3" />}
                                                Enhance with AI
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g., Physics Diagram - Circuit Analysis"
                                                className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2.5">
                                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">
                                                Note Content (Optional)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleEnhance}
                                                disabled={isEnhancing || !newImage}
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 px-2 py-1 rounded bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                {isEnhancing ? (
                                                    <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                                ) : <Sparkles className="w-3 h-3" />}
                                                Generate Description
                                            </button>
                                        </div>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Manually add descriptions or leave for AI analysis..."
                                            rows={5}
                                            className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all resize-none font-mono"
                                        />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
                        <div className="flex flex-col gap-1.5">
                            {saveType === 'question' ? (
                                <button
                                    type="button"
                                    onClick={() => setAnalyzeWithAI(!analyzeWithAI)}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all active:scale-95 group/mode ${analyzeWithAI
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-transform ${analyzeWithAI ? 'bg-emerald-500 text-white scale-110 shadow-lg' : 'bg-rose-500 text-white'}`}>
                                        <Wand2 className={`w-3.5 h-3.5 ${analyzeWithAI ? 'animate-pulse' : ''}`} />
                                    </div>
                                    <div className="text-[12px] font-bold uppercase tracking-wider">
                                        AI MODE: <span className={analyzeWithAI ? 'text-emerald-400' : 'text-rose-400'}>{analyzeWithAI ? 'ON' : 'OFF'}</span>
                                    </div>
                                    <div className={`ml-1 w-7 h-3.5 rounded-full relative transition-colors ${analyzeWithAI ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`}>
                                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${analyzeWithAI ? 'right-0.5 bg-white' : 'left-0.5 bg-white'}`} />
                                    </div>
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-emerald-500/[0.06] px-3 py-1.5 rounded-lg border border-emerald-500/10 hidden sm:flex">
                                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Note will be saved as shown</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleModalClose}
                                className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                form="add-image-form"
                                type="submit"
                                disabled={isSaving || !newImage || !selectedSubjectId}
                                className="btn-primary text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg flex items-center gap-2 min-w-[140px] justify-center active:scale-[0.98] hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Save & Analyze</span>
                                        <Save className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cropper UI Overlay */}
            {isCropping && (
                <ImageCropper
                    image={imageToCrop}
                    onCropComplete={handleApplyCrop}
                    onCancel={() => {
                        setIsCropping(false);
                        if (!newImage) setImageToCrop(null);
                    }}
                    title="Crop Research Item"
                    subtitle="Select the area you want to save"
                />
            )}
        </ModalPortal>
    );
};

export default AddImageModal;

import React, { useState, useRef, useEffect } from 'react';
import { imagesApi, subjectsApi, aiApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, FileText, Image as ImageIcon, Trash2, Save, Scissors, Check, RotateCw, ZoomIn, ZoomOut, Camera, RefreshCcw, FlipHorizontal, ChevronDown, Sparkles } from 'lucide-react';
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
        if (isOpen) {
            loadSubjects();
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

    // Enumerating cameras
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

            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

            const pixelCrop = {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY,
            };

            const croppedImage = await getCroppedImg(imageToCrop, pixelCrop, rotation);
            setNewImage(croppedImage);
            setUploadType('image');
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
                noteContent: saveType === 'note' ? content : undefined
            });
            toast.success(`${saveType.charAt(0).toUpperCase() + saveType.slice(1)} saved successfully`, { id: loadingToast });
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
                                            <div className="flex flex-col items-center text-center px-10">
                                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                                                    <Camera className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-white font-semibold mb-2 text-sm">Camera Access Required</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => startCamera(selectedCameraId)}
                                                    className="px-6 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-all"
                                                >
                                                    Retry Camera
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
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-indigo-500/[0.06] px-3 py-1.5 rounded-lg border border-indigo-500/10">
                            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>AI analysis will start after saving</span>
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
                <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f0f1a]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-1 shrink-0">
                        <style>{cropStyles}</style>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <Scissors className="w-5 h-5" />
                            </div>
                            <h3 className="text-white font-semibold">Crop Image</h3>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setIsCropping(false);
                                    if (!newImage) setImageToCrop(null);
                                }}
                                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-all border border-white/5 bg-white/5 active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyCrop}
                                className="px-6 py-2 rounded-lg text-sm font-semibold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <Check className="w-4 h-4" /> Apply
                            </button>
                        </div>
                    </div>

                    <div className="relative flex-1 bg-[#05050a] overflow-auto flex items-center justify-center p-4">
                        <div className="transition-transform duration-200 ease-out min-w-max min-h-max" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
                            <div className="relative inline-block" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-out' }}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    minHeight={20}
                                    minWidth={20}
                                >
                                    <img ref={imgRef} alt="Crop me" src={imageToCrop} onLoad={onImageLoad} style={{ maxHeight: '65vh', maxWidth: '100%', display: 'block' }} />
                                </ReactCrop>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-6 border-t border-white/10 bg-surface-1 shrink-0">
                        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">Zoom</label>
                                <div className="flex items-center gap-4">
                                    <ZoomOut className="w-4 h-4 text-slate-500" />
                                    <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-primary" />
                                    <ZoomIn className="w-4 h-4 text-slate-500" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">Rotate ({rotation}°)</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setRotation(r => (r - 90) % 360)} className="p-2 rounded-lg bg-surface-2 text-slate-400 hover:text-white border border-white/5 active:scale-90"><RotateCw className="w-4 h-4 -scale-x-100" /></button>
                                    <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(parseInt(e.target.value))} className="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-indigo-400" />
                                    <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 rounded-lg bg-surface-2 text-slate-400 hover:text-white border border-white/5 active:scale-90"><RotateCw className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ModalPortal>
    );
};

export default AddImageModal;

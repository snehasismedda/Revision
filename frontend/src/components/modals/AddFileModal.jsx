import React, { useState, useRef, useEffect } from 'react';
import { filesApi, subjectsApi, aiApi } from '../../api/index.js';
import { useSubjects } from '../../context/SubjectContext.jsx';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, FileText, Image as ImageIcon, Trash2, Save, Scissors, Check, RotateCw, ZoomIn, ZoomOut, Camera, RefreshCcw, FlipHorizontal, ChevronDown, Sparkles, Table, UploadCloud, Loader2, Hash } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ImageCropper from '../common/ImageCropper.jsx';

const AddFileModal = ({ isOpen, onClose, onFileSaved, subjectId }) => {
    // Top-level workflow
    const [workflowPath, setWorkflowPath] = useState('image'); // 'image' or 'document'

    // Sub-states for Image Workflow
    const [useCamera, setUseCamera] = useState(false);
    const [saveType, setSaveType] = useState('question'); // 'question' or 'note'
    const [analyzeWithAI, setAnalyzeWithAI] = useState(true);

    // File / Form States
    const [newImage, setNewImage] = useState(''); // Stores base64 for file
    const [fileType, setFileType] = useState('image'); // 'image', 'pdf', 'doc', 'xlsx'
    const [fileName, setFileName] = useState('');
    const [originalFileName, setOriginalFileName] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const { subjects: allSubjects, selectedSubjectId: globalSelectedSubjectId } = useSubjects();
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

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

            // Conditional state updates to avoid redundant renders
            if (isMobile && !useCamera) {
                setUseCamera(true);
                getCameras();
                setWorkflowPath('image');
            } else if (!isMobile && useCamera) {
                setUseCamera(false);
                stopCamera();
            }

            const targetSubjectId = subjectId || globalSelectedSubjectId;
            if (targetSubjectId && selectedSubjectId !== targetSubjectId) {
                setSelectedSubjectId(targetSubjectId);
            }
        } else {
            stopCamera();
        }
    }, [isOpen, subjectId, globalSelectedSubjectId]);

    const handleFileSelection = (file) => {
        if (!file) return;

        const name = file.name.toLowerCase();
        let detectedType = 'doc';

        if (file.type.startsWith('image/')) {
            detectedType = 'image';
        } else if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
            detectedType = 'pdf';
        } else if (
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel' ||
            name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')
        ) {
            detectedType = 'xlsx';
        } else if (
            file.type === 'application/msword' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            name.endsWith('.doc') || name.endsWith('.docx')
        ) {
            detectedType = 'doc';
        }

        // Validate workflow vs detected type
        if (workflowPath === 'image' && detectedType !== 'image') {
            return toast.error("Please select an image file for this workflow.");
        }
        if (workflowPath === 'document' && detectedType === 'image') {
            return toast.error("Images should be uploaded via the Image/Photo workflow.");
        }

        setFileType(detectedType);
        setFileName(file.name);
        setOriginalFileName(file.name);

        const reader = new FileReader();
        reader.onloadend = () => {
            if (detectedType === 'image') {
                setImageToCrop(reader.result);
                setIsCropping(true);
                setUseCamera(false);
            } else {
                setNewImage(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const loadSubjects = async () => {
        setIsLoadingSubjects(true);
        try {
            const res = await subjectsApi.list();
            setSubjects(res.subjects);
            // Only auto-select if we don't have a value yet
            if (res.subjects.length > 0 && !selectedSubjectId) {
                setSelectedSubjectId(res.subjects[0].id);
            }
        } catch {
            toast.error('Failed to load subjects');
        } finally {
            setIsLoadingSubjects(false);
        }
    };

    // Sync camera stream to video element
    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream, useCamera]);

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
            } else {
                toast.error("Failed to start camera: check permissions/HTTPS.");
            }
            setUseCamera(false);
        } finally {
            setIsCameraLoading(false);
        }
    };

    // Handle major workflow changes
    const handleWorkflowChange = (path) => {
        if (path === 'document') {
            stopCamera();
            setUseCamera(false);
            setFileType('pdf'); // default for docs
        } else {
            setFileType('image');
        }
        setWorkflowPath(path);
        // Clear forms
        setNewImage('');
        setFileName('');
        setOriginalFileName('');
        setTitle('');
        setContent('');
    };

    // Toggle camera within image workflow
    const toggleCamera = () => {
        if (!useCamera) {
            setUseCamera(true);
            getCameras().then(startCamera);
            setNewImage(''); // clear existing images when opening camera
        } else {
            stopCamera();
            setUseCamera(false);
        }
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
        setUseCamera(false);
        setImageToCrop(dataUrl);
        setFileType('image');
        setFileName('');
        setOriginalFileName('');
        setIsCropping(true);
    };

    const handleApplyCrop = (croppedImage) => {
        setNewImage(croppedImage);
        setIsCropping(false);
        setImageToCrop(null);
        toast.success('Image cropped successfully');
    };

    const handleEnhance = async () => {
        if (!newImage) return toast.error('Please upload or capture a file first');
        if (fileType !== 'image') return toast.error('AI analysis only supports images');
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

    const handleSaveFile = async (e) => {
        e.preventDefault();
        if (!newImage) return toast.error('Please select a file');
        if (!selectedSubjectId) return toast.error('Please select a subject');

        setIsSaving(true);
        const actualSaveType = workflowPath === 'document' ? 'file' : saveType;
        const loadingToast = toast.loading(`Processing...`);
        try {
            const payload = {
                content: newImage,
                type: actualSaveType,
                fileType: fileType,
                fileName: fileName || originalFileName || 'Untitled',
                subjectId: selectedSubjectId,
                skipAI: workflowPath === 'document' ? true : (actualSaveType === 'question' ? !analyzeWithAI : true)
            };

            if (workflowPath === 'image' && actualSaveType === 'note') {
                payload.title = title || "Untitled Note";
                payload.noteContent = content;
            }

            const res = await filesApi.saveAs(payload);

            toast.success('Saved successfully', { id: loadingToast });
            onFileSaved(res);
            handleModalClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save', { id: loadingToast });
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalClose = () => {
        stopCamera();
        setNewImage('');
        setTitle('');
        setContent('');
        setFileName('');
        setOriginalFileName('');
        setWorkflowPath('image');
        setUseCamera(false);
        setIsCropping(false);
        setImageToCrop(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={handleModalClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.04] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <UploadCloud className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold text-white leading-none mb-1">Add Material</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Upload resource to your library</p>
                            </div>
                        </div>
                        <button
                            onClick={handleModalClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Workflow Segmented Control */}
                    <div className="px-7 pt-6 shrink-0">
                        <div className="flex p-1 bg-white/[0.02] rounded-xl border border-white/[0.05] mb-6">
                            {[
                                { id: 'image', label: 'Image / Photo', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                                { id: 'document', label: 'Document', icon: <FileText className="w-3.5 h-3.5" /> }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => handleWorkflowChange(btn.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer
                                        ${workflowPath === btn.id 
                                            ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' 
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
                                >
                                    {btn.icon}
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-7 pb-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            {/* File Name Input - Minimal */}
                            <div className="relative group">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                                    <Hash className="w-3 h-3" /> File Identity
                                </label>
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/[0.06] text-white rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                                    placeholder={originalFileName || "Enter file name..."}
                                />
                            </div>

                            {/* Workflow Specifics */}
                            {workflowPath === 'image' ? (
                                <div className="space-y-6">
                                    {/* Action Type Selection */}
                                    <div className="grid grid-cols-2 gap-3 p-1 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                                        {[
                                            { id: 'question', label: 'Question', icon: <Sparkles className="w-3.5 h-3.5" /> },
                                            { id: 'note', label: 'Note', icon: <FileText className="w-3.5 h-3.5" /> }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setSaveType(type.id)}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer
                                                    ${saveType === type.id 
                                                        ? (type.id === 'question' ? 'bg-primary/20 text-primary-light ring-1 ring-primary/30' : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30')
                                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}
                                            >
                                                {type.icon}
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Upload Area */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Image Content</label>
                                            {!newImage && (
                                                <button
                                                    type="button"
                                                    onClick={toggleCamera}
                                                    className={`toggle-camera flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold transition-all border
                                                        ${useCamera 
                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                                >
                                                    {useCamera ? <X size={12} /> : <Camera size={12} />}
                                                    {useCamera ? 'EXIT CAMERA' : 'USE CAMERA'}
                                                </button>
                                            )}
                                        </div>

                                        {useCamera ? (
                                            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl flex items-center justify-center group animate-in zoom-in-95 duration-300">
                                                {isCameraLoading ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                        <span className="text-[10px] text-primary font-bold tracking-[0.2em]">INITIALIZING...</span>
                                                    </div>
                                                ) : cameraStream && (
                                                    <>
                                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col items-center justify-end pb-6">
                                                            <button 
                                                                type="button" 
                                                                onClick={takePhoto} 
                                                                className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-[5px] border-white/20 active:scale-90 transition-transform cursor-pointer"
                                                            >
                                                                <div className="w-12 h-12 rounded-full border-2 border-slate-200" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer group flex flex-col items-center justify-center
                                                    ${newImage ? 'p-2 border-white/10' : 'p-10 border-white/10 hover:border-primary/40 hover:bg-white/[0.01]'}`}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onDrop={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
                                                }}
                                            >
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                                                />
                                                {newImage ? (
                                                    <div className="relative w-full group/preview">
                                                        <img src={newImage} alt="Preview" className="w-full max-h-[280px] object-contain rounded-xl shadow-lg shadow-black/40" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setImageToCrop(newImage); setIsCropping(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><Scissors size={16} /></button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setNewImage(''); setFileName(''); }} className="p-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-lg text-rose-400 transition-all"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="w-12 h-12 rounded-xl bg-white/[0.03] text-slate-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-primary transition-all">
                                                            <UploadCloud size={24} />
                                                        </div>
                                                        <p className="text-[13px] font-bold text-slate-300">Click or drag image</p>
                                                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-extrabold font-mono">JPG, PNG, WEBP</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Fields for Note */}
                                    {saveType === 'note' && (
                                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center justify-between p-3.5 bg-emerald-500/[0.04] rounded-xl border border-emerald-500/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Wand2 size={16} /></div>
                                                    <div>
                                                        <p className="text-[12px] font-bold text-emerald-400 leading-none mb-1">AI Enhancement</p>
                                                        <p className="text-[10px] text-slate-500">Auto-fill title and description</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleEnhance}
                                                    disabled={isEnhancing || !newImage}
                                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-30 cursor-pointer shadow-lg shadow-emerald-500/10"
                                                >
                                                    {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    placeholder="Note title (optional)"
                                                    className="w-full bg-white/[0.03] border border-white/[0.06] text-white rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-emerald-500/40 transition-all"
                                                />
                                                <textarea
                                                    value={content}
                                                    onChange={(e) => setContent(e.target.value)}
                                                    placeholder="Note content / description..."
                                                    rows={3}
                                                    className="w-full bg-white/[0.03] border border-white/[0.06] text-white rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-emerald-500/40 transition-all resize-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="p-4 bg-blue-500/[0.04] rounded-xl border border-blue-500/10 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><FileText size={16} /></div>
                                        <div>
                                            <p className="text-[12px] font-bold text-blue-400 leading-none mb-1">Direct Upload</p>
                                            <p className="text-[11px] text-slate-500 leading-relaxed">PDF, Word, or Excel. These will be added to your library vault as static resources.</p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer group flex flex-col items-center justify-center
                                            ${newImage ? 'p-4 border-white/10' : 'p-12 border-white/10 hover:border-blue-500/40 hover:bg-white/[0.01]'}`}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
                                        />
                                        {newImage ? (
                                            <div className="flex items-center gap-4 w-full p-4 bg-white/[0.02] rounded-xl border border-white/5 relative group/preview">
                                                <div className={`p-4 rounded-xl shadow-lg ${
                                                    fileType === 'pdf' ? 'bg-red-500/20 text-red-500' :
                                                    fileType === 'xlsx' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'
                                                }`}>
                                                    {fileType === 'xlsx' ? <Table size={24} /> : <FileText size={24} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-bold text-white truncate">{fileName || originalFileName}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-1 mt-1">
                                                        <Check size={10} className="text-emerald-500" /> FILE READY
                                                    </p>
                                                </div>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setNewImage(''); setFileName(''); }} className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] text-slate-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:text-blue-500 transition-all shadow-inner">
                                                    <UploadCloud size={28} />
                                                </div>
                                                <p className="text-[14px] font-bold text-slate-200">Select Document</p>
                                                <div className="flex items-center justify-center gap-3 mt-2">
                                                    <span className="text-[10px] font-black text-slate-600 border border-white/5 px-1.5 py-0.5 rounded">PDF</span>
                                                    <span className="text-[10px] font-black text-slate-600 border border-white/5 px-1.5 py-0.5 rounded">DOCX</span>
                                                    <span className="text-[10px] font-black text-slate-600 border border-white/5 px-1.5 py-0.5 rounded">XLSX</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer - minimal */}
                    <div className="px-7 py-5 bg-white/[0.01] border-t border-white/[0.04] shrink-0 flex items-center justify-between">
                        <div>
                            {workflowPath === 'image' && saveType === 'question' && (
                                <button
                                    type="button"
                                    onClick={() => setAnalyzeWithAI(!analyzeWithAI)}
                                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                        analyzeWithAI ? 'bg-primary/10 border-primary/20 text-primary-light' : 'bg-white/5 border-white/10 text-slate-500'
                                    }`}
                                >
                                    <Wand2 className={`w-3.5 h-3.5 ${analyzeWithAI ? 'text-primary' : 'text-slate-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">AI Parsing: {analyzeWithAI ? 'ON' : 'OFF'}</span>
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleModalClose}
                                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 hover:text-white transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                form="add-file-form"
                                type="submit"
                                disabled={isSaving || !newImage || !selectedSubjectId}
                                className={`px-7 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer disabled:opacity-30 shadow-xl shadow-black/20 flex items-center gap-2 min-w-[140px] justify-center active:scale-95
                                    ${workflowPath === 'document' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-primary text-white hover:bg-primary-dark'}`}
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : (
                                    <>
                                        <span>{workflowPath === 'document' ? 'Upload' : 'Save Material'}</span>
                                        <Save size={16} />
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
                    title="Crop Image"
                    subtitle="Select the area you want to save"
                />
            )}
        </ModalPortal>
    );
};

export default function AddFileModalWrapper(props) {
    return <AddFileModal {...props} />;
}

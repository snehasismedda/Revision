import React, { useState, useRef, useEffect } from 'react';
import { questionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Wand2, FileText, Image as ImageIcon, Trash2, Save, Scissors, Check, RotateCw, ZoomIn, ZoomOut, Camera, RefreshCcw, FlipHorizontal, ChevronDown, Hash, CheckCircle2, Circle, Search } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ImageCropper from '../common/ImageCropper.jsx';


const AddQuestionModal = ({ isOpen, onClose, subjectId, onQuestionAdded, topics }) => {
    const [newQuestionType, setNewQuestionType] = useState('text');
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionImage, setNewQuestionImage] = useState('');
    const [tags, setTags] = useState([]);
    const [topicSearchQuery, setTopicSearchQuery] = useState('');
    const [addingQuestion, setAddingQuestion] = useState(false);
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
        setNewQuestionType(type);
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

    // Flatten topics for easier selection
    const flattenTopics = (nodes, result = [], path = '') => {
        nodes.forEach(node => {
            const currentPath = path ? `${path} > ${node.name}` : node.name;
            result.push({ id: node.id, name: node.name, path: currentPath, depth: path ? path.split('>').length : 0 });
            if (node.children) flattenTopics(node.children, result, currentPath);
        });
        return result;
    };

    const flatTopics = flattenTopics(topics || []);

    const filteredTopics = flatTopics.filter(topic =>
        topic.name.toLowerCase().includes(topicSearchQuery.toLowerCase())
    );

    const toggleTag = (topicName) => {
        setTags(prev =>
            prev.includes(topicName)
                ? prev.filter(t => t !== topicName)
                : [...prev, topicName]
        );
    };

    useEffect(() => {
        if (isOpen) {
            const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                setNewQuestionType('camera');
                getCameras();
            } else {
                setNewQuestionType('text');
                stopCamera();
            }
        } else {
            stopCamera();
        }
    }, [isOpen]);

    React.useEffect(() => {
        return () => stopCamera();
    }, []);

    const handleApplyCrop = (croppedImage) => {
        setNewQuestionImage(croppedImage);
        setNewQuestionType('image'); // Switch to image tab to preview the result
        setIsCropping(false);
        setImageToCrop(null);
        toast.success('Image cropped successfully');
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const content = newQuestionType === 'text' ? newQuestionText.trim() : newQuestionImage;
        if (newQuestionType === 'image' && !content) return toast.error('Please provide an image');
        // Removed: if (!content) return toast.error('Please provide question content');

        setAddingQuestion(true);
        try {
            const { questions } = await questionsApi.create(subjectId, {
                content,
                type: newQuestionType,
                skipAI: !analyzeWithAI,
                tags: tags
            });
            onQuestionAdded(questions);
            setNewQuestionText('');
            setNewQuestionImage('');
            setTags([]);
            onClose();
            const count = questions.length;
            toast.success(analyzeWithAI
                ? (count > 1 ? `${count} questions parsed and added` : 'Question added and parsed')
                : 'Question added successfully'
            );
        } catch {
            toast.error('Failed to add question');
        } finally {
            setAddingQuestion(false);
        }
    };

    const handleModalClose = () => {
        stopCamera();
        setNewQuestionText('');
        setNewQuestionImage('');
        setTags([]);
        setTopicSearchQuery('');
        setIsCropping(false);
        setImageToCrop(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
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
                            onClick={handleModalClose}
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
                                type="button"
                                onClick={() => handleTabChange('text')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'text' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <FileText className="w-4 h-4" /> Text
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('image')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'image' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <ImageIcon className="w-4 h-4" /> Upload
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('camera')}
                                className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${newQuestionType === 'camera' ? 'bg-primary/[0.12] text-white border border-primary/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                            >
                                <Camera className="w-4 h-4" /> Camera
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
                            ) : newQuestionType === 'image' ? (
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
                                        {newQuestionImage ? (
                                            <div className="w-full relative min-h-[200px] flex items-center justify-center">
                                                <img src={newQuestionImage} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg relative z-0" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                                                    <span className="text-white font-medium bg-black/60 px-4 py-2 rounded-full text-[13px]">Click or Drag to change</span>
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
                                                <Scissors className="w-4 h-4" /> Recrop info
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
                            ) : (
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
                                                    className="w-full bg-surface-3/50 border border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-[11px] text-slate-300 outline-none focus:border-primary/40 appearance-none cursor-pointer hover:bg-surface-3 transition-all shadow-sm"
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
                                                className="p-1.5 rounded-lg bg-surface-3/50 border border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all active:scale-90"
                                                title="Rescan Devices"
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
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Lens overlay effect */}
                                                <div className="absolute inset-0 pointer-events-none border-[20px] border-black/20" />
                                                <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10" />

                                                {/* Controls Overlay */}
                                                <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-center">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                                                    <div className="flex items-center gap-8 z-10">
                                                        {cameras.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
                                                                    const nextIndex = (currentIndex + 1) % cameras.length;
                                                                    const nextId = cameras[nextIndex].deviceId;
                                                                    setSelectedCameraId(nextId);
                                                                    startCamera(nextId);
                                                                }}
                                                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-all active:scale-90"
                                                                title="Switch Camera"
                                                            >
                                                                <FlipHorizontal className="w-5 h-5" />
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={takePhoto}
                                                            className="relative group cursor-pointer"
                                                        >
                                                            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all group-hover:scale-110 group-active:scale-95 group-active:shadow-inner border-4 border-slate-200">
                                                                <div className="w-12 h-12 border-2 border-primary/40 rounded-full flex items-center justify-center">
                                                                    <div className="w-3 h-3 bg-primary rounded-full animate-ping" />
                                                                </div>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => startCamera(selectedCameraId)}
                                                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-all active:scale-90"
                                                            title="Refresh Stream"
                                                        >
                                                            <RefreshCcw className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Corner Decoration */}
                                                <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1 bg-black/40 rounded-md border border-white/10">
                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-center px-10 py-6">
                                                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                                                    <Camera className="w-8 h-8" />
                                                </div>
                                                <h4 className="text-white font-semibold mb-2">Camera Permission Required</h4>
                                                <p className="text-[13px] text-slate-500 mb-6">Click below to allow camera access to capture questions.</p>
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

                                    {newQuestionImage && !cameraStream && (
                                        <div className="flex items-center gap-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                                <img src={newQuestionImage} className="w-full h-full object-cover" alt="Captured" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[12px] text-slate-300 font-medium line-clamp-1">Last captured image</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setImageToCrop(newQuestionImage); setIsCropping(true); }}
                                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
                                                >
                                                    Edit / Recrop
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setNewQuestionImage('')}
                                                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] flex items-center gap-2 text-slate-400">
                                        <Hash className="w-3 h-3" /> Topic Tags
                                    </label>
                                    <div className="relative w-48">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                        <input
                                            type="text"
                                            value={topicSearchQuery}
                                            onChange={(e) => setTopicSearchQuery(e.target.value)}
                                            placeholder="Search topics..."
                                            className="w-full bg-surface-3/50 border border-white/5 rounded-lg py-1 pl-8 pr-3 text-[11px] text-slate-300 outline-none focus:border-primary/40 transition-all placeholder:text-slate-600"
                                        />
                                        {topicSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setTopicSearchQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-41 overflow-y-auto p-2 rounded-xl bg-surface-2/30 border border-white/[0.04]">
                                    {filteredTopics.map(topic => {
                                        const isSelected = tags.includes(topic.name);
                                        return (
                                            <button
                                                key={topic.id}
                                                type="button"
                                                onClick={() => toggleTag(topic.name)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border cursor-pointer
                                                    ${isSelected
                                                        ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_2px_8px_rgba(139,92,246,0.1)]'
                                                        : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'
                                                    }`}
                                            >
                                                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-40" />}
                                                {topic.depth > 0 && <span className="text-[10px] opacity-30 shrink-0">↳</span>}
                                                <span className="truncate" title={topic.path}>{topic.name}</span>
                                            </button>
                                        );
                                    })}
                                    {filteredTopics.length === 0 && (
                                        <div className="col-span-full py-4 text-center text-[12px] text-slate-500 italic">
                                            {topicSearchQuery ? 'No topics found matching your search' : 'No topics available. Add topics to regular syllabus first.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
                        <div className="flex flex-col gap-1.5">
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
                                form="add-question-form"
                                type="submit"
                                disabled={addingQuestion || (newQuestionType === 'image' && !newQuestionImage)}
                                className="btn-primary text-[13px] font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-lg flex items-center gap-2 group min-w-[140px] justify-center active:scale-[0.98] hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                            >
                                {addingQuestion ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Save Question</span>
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
                <ImageCropper
                    image={imageToCrop}
                    onCropComplete={handleApplyCrop}
                    onCancel={() => {
                        setIsCropping(false);
                        if (!newQuestionImage) setImageToCrop(null);
                    }}
                    title="Crop Question"
                    subtitle="Select the question area from your image"
                />
            )}
        </ModalPortal>
    );
};

export default AddQuestionModal;

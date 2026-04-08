import React, { useState, useRef, useEffect } from 'react';
import { notesApi, aiApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, PlusCircle, Trash2, Save, FileText, Image as ImageIcon, Camera, RefreshCcw, FlipHorizontal, ChevronDown, Scissors, Check, RotateCw, ZoomIn, ZoomOut, Wand2, Sparkles, Info, Tag, Type, LayoutGrid, Sun, Moon } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ImageCropper from '../common/ImageCropper.jsx';

const AddNoteModal = ({ isOpen, onClose, subjectId, onNoteAdded, questionId, initialTitle, initialContent, parentNoteId }) => {
    const [mainType, setMainType] = useState('text'); // 'text' or 'image'
    const [imageMethod, setImageMethod] = useState('upload'); // 'upload' or 'camera'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isFormatting, setIsFormatting] = useState(false);
    const [noteImage, setNoteImage] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    const [isLightMode, setIsLightMode] = useState(localStorage.getItem('theme') !== 'dark');

    const toggleTheme = () => {
        const newMode = !isLightMode;
        setIsLightMode(newMode);
        localStorage.setItem('theme', newMode ? 'light' : 'dark');
        window.dispatchEvent(new Event('storage'));
    };

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
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream]);

    useEffect(() => {
        if (isOpen) {
            const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                setMainType('image');
                setImageMethod('camera');
                getCameras();
            } else {
                setMainType('text');
                setImageMethod('upload');
                stopCamera();
            }
            if (initialTitle) setTitle(initialTitle);
            if (initialContent) setContent(initialContent);
            fetchAvailableTags();
        } else {
            stopCamera();
        }
    }, [isOpen, subjectId]);

    const fetchAvailableTags = async () => {
        try {
            const { tags } = await notesApi.getTags(subjectId);
            setAvailableTags(tags || []);
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    };

    React.useEffect(() => {
        return () => stopCamera();
    }, []);

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

    const handleApplyCrop = (croppedImage) => {
        setNoteImage(croppedImage);
        setMainType('image');
        setIsCropping(false);
        setImageToCrop(null);
        toast.success('Image cropped successfully');
    };

    const handleAnalyzeImage = async (image) => {
        if (!image) return;
        setIsAnalyzing(true);
        let fullResponse = '';
        try {
            await aiApi.parseNoteStream({ content: image, type: 'image' }, (chunk) => {
                fullResponse += chunk;
                // Currently just collecting JSON, but streaming prevents timeouts
            });

            const cleaned = fullResponse.replace(/```json\n?|```/g, '').trim();
            const result = JSON.parse(cleaned);

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

    const handleEnhance = async () => {
        if (!content.trim()) return;
        setIsEnhancing(true);
        let fullResponse = '';
        try {
            await aiApi.enhanceNoteStream({ title, content }, (chunk) => {
                fullResponse += chunk;
                // Try to parse the partial JSON if possible, or just wait till end
                // For now, simpler to just collect and parse at the end to avoid broken JSON issues
                // But we can show the user something is happening
            });

            // Clean JSON string - sometimes AI adds markdown fences
            const cleaned = fullResponse.replace(/```json\n?|```/g, '').trim();
            const result = JSON.parse(cleaned);

            if (result.title) setTitle(result.title);
            if (result.content) setContent(result.content);
        } catch (error) {
            console.error('Enhance error:', error);
            toast.error('Failed to enhance note');
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleFormat = async () => {
        if (!content.trim()) return;
        setIsFormatting(true);
        let streamedContent = '';
        try {
            await aiApi.formatNoteStream({ title, content }, (chunk) => {
                streamedContent += chunk;
                setContent(streamedContent);
            });
            
            // Extract title if it starts with #
            if (streamedContent.startsWith('# ')) {
                const lines = streamedContent.split('\n');
                const extractedTitle = lines[0].replace('# ', '').trim();
                if (extractedTitle) setTitle(extractedTitle);
                // Optionally remove title from content if you don't want it doubled
                // setContent(lines.slice(1).join('\n').trim());
            }
        } catch (error) {
            console.error('Format error:', error);
            toast.error('Failed to format note');
        } finally {
            setIsFormatting(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            return toast.error('Please provide both title and content');
        }
        const finalTags = [...tags];
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !finalTags.includes(trimmedTag)) {
            finalTags.push(trimmedTag);
        }
        setAddingNote(true);
        try {
            const { note } = await notesApi.create(subjectId, {
                title: title.trim(),
                content: content.trim(),
                questionId,
                sourceImageContent: mainType === 'image' ? noteImage : null,
                parentNoteId: parentNoteId || null,
                tags: finalTags
            });
            onNoteAdded(note);
            handleModalClose(true);
            toast.success('Note added successfully');
        } catch {
            toast.error('Failed to add note');
        } finally {
            setAddingNote(false);
        }
    };

    const handleModalClose = (force = false) => {
        if (!force && (title.trim() || content.trim() || noteImage)) {
            if (!window.confirm("You have unsaved changes. Are you sure you want to discard them?")) return;
        }
        stopCamera();
        setTitle('');
        setContent('');
        setTags([]);
        setTagInput('');
        setNoteImage('');
        setMainType('text');
        setImageMethod('upload');
        setIsCropping(false);
        setImageToCrop(null);
        onClose();
    };

    if (!isOpen) return null;

    const renderImagePanel = () => (
        <div className="space-y-4">
            <div className={`flex p-0.5 rounded-lg border ${isLightMode ? 'bg-black/[0.05] border-black/[0.1]' : 'bg-white/[0.025] border-white/[0.05]'}`}>
                <button
                    onClick={() => handleImageMethodChange('upload')}
                    className={`flex-1 py-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${imageMethod === 'upload' ? (isLightMode ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/[0.07] text-white shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <ImageIcon className="w-3 h-3" /> Upload
                </button>
                <button
                    onClick={() => handleImageMethodChange('camera')}
                    className={`flex-1 py-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${imageMethod === 'camera' ? (isLightMode ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/[0.07] text-white shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <Camera className="w-3 h-3" /> Camera
                </button>
            </div>

            {imageMethod === 'camera' ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <select
                                value={selectedCameraId}
                                onChange={(e) => {
                                    const newId = e.target.value;
                                    setSelectedCameraId(newId);
                                    startCamera(newId);
                                }}
                                className={`w-full border rounded-lg py-2 pl-3 pr-7 text-[11px] outline-none appearance-none cursor-pointer transition-all ${isLightMode ? 'bg-white border-slate-200 text-slate-600 focus:border-emerald-500/40' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 focus:border-emerald-500/30'}`}
                            >
                                {cameras.length > 0 ? (
                                    cameras.map(camera => (
                                        <option key={camera.deviceId} value={camera.deviceId}>
                                            {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">No Camera</option>
                                )}
                            </select>
                            <div className={`absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none ${isLightMode ? 'text-slate-400' : 'text-slate-700'}`}>
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={getCameras}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${isLightMode ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-900' : 'bg-white/[0.03] border-white/[0.06] text-slate-600 hover:text-white'}`}
                        >
                            <RefreshCcw className="w-3 h-3" />
                        </button>
                    </div>

                    <div className={`relative aspect-[4/3] rounded-xl overflow-hidden border flex items-center justify-center ${isLightMode ? 'border-slate-200 bg-slate-100' : 'border-white/[0.06] bg-[#0e0e16]'}`} style={{ background: isLightMode ? undefined : 'radial-gradient(ellipse at center, #131320 0%, #0e0e16 100%)' }}>
                        {isCameraLoading ? (
                            <div className="flex flex-col items-center gap-2.5">
                                <div className="w-7 h-7 border-[2.5px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                <span className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-[0.2em]">Starting...</span>
                            </div>
                        ) : cameraStream ? (
                            <>
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-end justify-center pb-4" style={{ background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.5))' }}>
                                    <button
                                        type="button"
                                        onClick={takePhoto}
                                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-90 transition-all border-[3px] border-white/80 cursor-pointer"
                                    >
                                        <div className="w-8 h-8 border-[1.5px] border-emerald-500/40 rounded-full" />
                                    </button>
                                </div>
                                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-white/20 rounded-tl-md" />
                                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/20 rounded-tr-md" />
                                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/20 rounded-bl-md" />
                                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-white/20 rounded-br-md" />
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-center px-6 py-8">
                                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400/80 flex items-center justify-center mb-3">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <p className={`text-[12px] mb-4 ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>Allow camera access to capture</p>
                                <button
                                    type="button"
                                    onClick={() => startCamera(selectedCameraId)}
                                    className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                                >
                                    Start Camera
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {noteImage ? (
                        <div className={`rounded-xl border overflow-hidden ${isLightMode ? 'bg-white border-slate-200' : 'border-white/[0.06] bg-[#0e0e16]'}`}>
                            <div className="p-3">
                                <img
                                    src={noteImage}
                                    alt="Note preview"
                                    className="w-full h-auto max-h-[280px] object-contain rounded-lg"
                                    style={{ background: isLightMode ? '#f8fafc' : 'repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 50% / 16px 16px' }}
                                />
                            </div>
                            <div className="flex items-center gap-2 px-3 pb-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageToCrop(noteImage);
                                        setIsCropping(true);
                                    }}
                                    className={`flex-1 text-[11px] font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all cursor-pointer ${isLightMode ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'text-emerald-400 bg-emerald-500/8 border-emerald-500/10 hover:bg-emerald-500/15'}`}
                                >
                                    <Scissors className="w-3 h-3" /> Crop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNoteImage('')}
                                    className={`flex-1 text-[11px] font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all cursor-pointer ${isLightMode ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' : 'text-red-400 bg-red-500/6 border-red-500/8 hover:bg-red-500/12'}`}
                                >
                                    <Trash2 className="w-3 h-3" /> Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`relative rounded-xl border border-dashed transition-all cursor-pointer group overflow-hidden ${isLightMode ? 'bg-white border-slate-300 hover:border-emerald-500/40 hover:bg-emerald-50/20' : 'border-white/[0.08] hover:border-emerald-500/25'}`}
                            onDragOver={e => { e.preventDefault(); }}
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
                            <div className="py-10 px-6 flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-3.5 transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 group-hover:border-emerald-200' : 'bg-white/[0.04] border-white/[0.06] text-slate-600 group-hover:text-emerald-400 group-hover:border-emerald-500/20 group-hover:bg-emerald-500/8'}`}>
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <p className={`text-[13px] font-medium mb-1 ${isLightMode ? 'text-slate-900' : 'text-slate-400'}`}>Drop image here</p>
                                <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-700'}`}>or click to browse files</p>
                            </div>
                        </div>
                    )}

                    {noteImage && !isAnalyzing && (
                        <button
                            type="button"
                            onClick={() => handleAnalyzeImage(noteImage)}
                            className={`w-full text-[12px] font-bold flex items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer ${isLightMode ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10' : 'text-emerald-400 bg-emerald-500/6 border-emerald-500/12 hover:bg-emerald-500/12 hover:border-emerald-500/20'}`}
                        >
                            <Wand2 className="w-3.5 h-3.5" /> Extract text with AI
                        </button>
                    )}
                    {isAnalyzing && (
                        <div className={`flex items-center justify-center gap-2.5 py-3 rounded-xl border ${isLightMode ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-400'}`}>
                            <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${isLightMode ? 'border-emerald-400/20 border-t-emerald-600' : 'border-emerald-400/25 border-t-emerald-400'}`} />
                            <span className="text-[11px] font-semibold">Analyzing image...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <ModalPortal>
            <div className={`fixed inset-0 z-[110] flex items-center justify-center p-0 modal-backdrop fade-in ${isLightMode ? 'bg-black/10' : 'bg-black/60'}`}>
                <div
                    className="w-full h-[100dvh] flex flex-col overflow-hidden"
                    style={{ background: isLightMode ? '#f5f7fa' : '#161625', transition: 'background 0.3s ease' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-5 sm:px-8 py-3.5 border-b shrink-0 ${isLightMode ? 'bg-[#eef2f7] border-slate-200' : 'bg-[#161625] border-white/[0.05]'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLightMode ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400'}`}>
                                <PlusCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className={`text-[15px] font-heading font-bold tracking-tight leading-none ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                    {isCropping ? 'Crop Image' : 'New Note'}
                                </h3>
                                <p className={`text-[11px] mt-0.5 hidden sm:block ${isLightMode ? 'text-slate-500' : 'text-slate-600'}`}>Create and organize your study material</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${isLightMode ? 'bg-white shadow-sm text-amber-500 border-slate-200 hover:bg-amber-50' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'}`}
                                title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                            >
                                {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </button>

                            {!isCropping && (
                                <>
                                    {(isAnalyzing || isEnhancing || isFormatting) && (
                                        <div className={`flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg border ${isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/8 border-emerald-500/15 text-emerald-400'}`}>
                                            <div className={`w-3 h-3 border-2 rounded-full animate-spin ${isLightMode ? 'border-emerald-600/20 border-t-emerald-600' : 'border-emerald-400/30 border-t-emerald-400'}`} />
                                            <span className="text-[11px] font-semibold">{isAnalyzing ? 'Analyzing...' : isEnhancing ? 'Enhancing...' : 'Formatting...'}</span>
                                        </div>
                                    )}

                                    <button
                                        form="add-note-form"
                                        type="submit"
                                        disabled={addingNote || !title.trim() || !content.trim()}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-white text-[13px] font-bold px-6 py-2 rounded-lg disabled:opacity-40 disabled:hover:bg-emerald-500 transition-all flex items-center gap-2 active:scale-[0.97] cursor-pointer shadow-lg shadow-emerald-500/20"
                                    >
                                        {addingNote ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-3.5 h-3.5" />
                                                <span>Save Note</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => handleModalClose()}
                                className={`p-2 rounded-lg transition-all cursor-pointer ml-1 ${isLightMode ? 'text-slate-600 hover:bg-slate-200/50' : 'text-slate-400 hover:bg-white/[0.05]'}`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    {!isCropping && (
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Left Sidebar */}
                            <div className={`w-full lg:w-[380px] xl:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col overflow-hidden ${isLightMode ? 'bg-[#f1f4f9] border-slate-200' : 'bg-[#1e1e2d] border-white/[0.04]'}`}>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6">
                                    {/* Type Selector */}
                                    <div>
                                        <label className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2.5 block ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Note Type</label>
                                        <div className={`flex p-1 rounded-xl border ${isLightMode ? 'bg-slate-200/50 border-slate-300/50' : 'bg-white/[0.025] border-white/[0.05]'}`}>
                                            <button
                                                onClick={() => handleMainTypeChange('text')}
                                                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${mainType === 'text' ? (isLightMode ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <Type className="w-3.5 h-3.5" /> Text
                                            </button>
                                            <button
                                                onClick={() => handleMainTypeChange('image')}
                                                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${mainType === 'image' ? (isLightMode ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 shadow-sm') : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <ImageIcon className="w-3.5 h-3.5" /> Image
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2.5 block ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="What is this note about?"
                                            className={`w-full border rounded-xl px-4 py-3.5 text-[14px] focus:outline-none transition-all ${isLightMode ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500/40 placeholder:text-slate-400' : 'bg-white/[0.03] border-white/[0.06] text-slate-100 focus:border-emerald-500/30 placeholder:text-slate-500'}`}
                                        />
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <label className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5 ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <Tag className="w-3 h-3" /> Tags
                                        </label>
                                        {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                                                {tags.map(tag => (
                                                    <span key={tag} className={`px-2.5 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1.5 border ${isLightMode ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'}`}>
                                                        {tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => setTags(t => t.filter(x => x !== tag))}
                                                            className="hover:scale-110 transition-transform cursor-pointer"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    const t = tagInput.trim();
                                                    if (t && !tags.includes(t)) setTags([...tags, t]);
                                                    setTagInput('');
                                                }
                                            }}
                                            className={`w-full border rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-1 transition-all ${isLightMode ? 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500/40 focus:ring-emerald-500/10 placeholder:text-slate-400' : 'bg-white/[0.03] border-white/[0.06] text-slate-100 focus:border-emerald-500/30 focus:ring-emerald-500/10 placeholder:text-slate-700'}`}
                                            placeholder="Add tag + Enter"
                                        />
                                        {availableTags.length > 0 && (
                                            <div className="mt-3">
                                                <div className={`text-[9px] font-bold uppercase tracking-[0.15em] mb-2 ${isLightMode ? 'text-slate-400' : 'text-slate-700'}`}>Suggestions</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {availableTags
                                                        .filter(tag => !tags.includes(tag))
                                                        .filter(tag => !tagInput || tag.toLowerCase().includes(tagInput.toLowerCase()))
                                                        .slice(0, 10)
                                                        .map(tag => (
                                                            <button
                                                                key={tag}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!tags.includes(tag)) setTags([...tags, tag]);
                                                                    setTagInput('');
                                                                }}
                                                                className={`px-2 py-1 text-[10px] font-semibold transition-all border rounded-md cursor-pointer ${isLightMode ? 'text-slate-600 bg-slate-200/50 hover:bg-emerald-500/10 hover:text-emerald-600 border-slate-300/40 hover:border-emerald-500/20' : 'text-slate-500 hover:text-emerald-400 bg-white/[0.03] hover:bg-emerald-500/8 border-white/[0.04] hover:border-emerald-500/15'}`}
                                                            >
                                                                + {tag}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {mainType === 'image' && (
                                        <div className={`pt-2 border-t ${isLightMode ? 'border-slate-200' : 'border-white/[0.04]'}`}>
                                            <label className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5 ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <ImageIcon className="w-3 h-3" /> Source Image
                                            </label>
                                            {renderImagePanel()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Editor */}
                            <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-transparent">
                                <div className={`flex items-center justify-between px-5 sm:px-8 py-3 border-b shrink-0 ${isLightMode ? 'bg-[#f8fafc] border-slate-200' : 'bg-transparent border-white/[0.04]'}`}>
                                    <div className="flex items-center gap-2">
                                        <FileText className={`w-3.5 h-3.5 ${isLightMode ? 'text-slate-400' : 'text-slate-600'}`} />
                                        <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>Content</span>
                                        <span className={`text-[10px] ml-1 ${isLightMode ? 'text-slate-400' : 'text-slate-700'}`}>— Markdown supported</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleFormat}
                                            disabled={isFormatting || !content.trim()}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all border cursor-pointer ${isLightMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'} disabled:opacity-50`}
                                        >
                                            <LayoutGrid className={`w-3.5 h-3.5 ${isFormatting ? 'animate-spin' : ''}`} />
                                            {isFormatting ? 'Formatting...' : 'Format with AI'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleEnhance}
                                            disabled={isEnhancing || !content.trim()}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all border cursor-pointer ${isLightMode ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'} disabled:opacity-50`}
                                        >
                                            <Sparkles className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                                            {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <form id="add-note-form" onSubmit={handleAddNote} className="h-full flex flex-col">
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Start writing your notes here...&#10;&#10;Use **Markdown** for formatting."
                                            className={`w-full flex-1 px-5 sm:px-8 py-6 text-[15px] focus:outline-none resize-none font-mono leading-[1.8] placeholder:text-slate-400 placeholder:leading-[1.8] ${isLightMode ? 'bg-white text-slate-800' : 'bg-[#1c1c28] text-slate-200'}`}
                                            style={{ caretColor: '#10b981' }}
                                        />
                                    </form>
                                </div>

                                <div className={`px-5 sm:px-8 py-2.5 border-t shrink-0 flex items-center justify-between ${isLightMode ? 'bg-[#f8fafc] border-slate-200' : 'bg-transparent border-white/[0.03]'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[10px] font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-700'}`}>{content.length} characters</span>
                                        <span className={`text-[10px] font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-700'}`}>{content.split(/\s+/).filter(Boolean).length} words</span>
                                        <span className={`text-[10px] font-medium ${isLightMode ? 'text-slate-500' : 'text-slate-700'}`}>{content.split('\n').length} lines</span>
                                    </div>
                                    {content.trim() && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                                            <span className={`text-[10px] font-medium ${isLightMode ? 'text-emerald-600' : 'text-emerald-500/60'}`}>Unsaved</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isCropping && (
                        <ImageCropper
                            image={imageToCrop}
                            onCropComplete={handleApplyCrop}
                            onCancel={() => {
                                setIsCropping(false);
                                if (!noteImage) setImageToCrop(null);
                            }}
                            title="Crop Note Image"
                            subtitle="Select the area you want to save as a note"
                        />
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default AddNoteModal;

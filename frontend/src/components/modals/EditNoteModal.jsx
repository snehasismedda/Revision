import React, { useState, useRef, useEffect } from 'react';
import { notesApi, aiApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Save, FileText, Image as ImageIcon, Camera, RefreshCcw, ChevronDown, Scissors, Wand2, Sparkles, Tag, Type } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ImageCropper from '../common/ImageCropper.jsx';

const EditNoteModal = ({ isOpen, onClose, subjectId, note, onNoteUpdated }) => {
    const [mainType, setMainType] = useState('text'); // 'text' or 'image'
    const [imageMethod, setImageMethod] = useState('upload'); // 'upload' or 'camera'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [noteImage, setNoteImage] = useState('');
    const [availableTags, setAvailableTags] = useState([]);

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
        if (isOpen && note) {
            setTitle(note.title || '');
            setContent(note.content || '');
            
            let t = note.tags || [];
            if (typeof t === 'string') {
                try { t = JSON.parse(t); } catch { t = []; }
            }
            setTags(Array.isArray(t) ? t : []);
            
            if (note.sourceImageContent) {
                setNoteImage(note.sourceImageContent);
                setMainType('image');
            } else {
                setNoteImage('');
                setMainType('text');
            }

            fetchAvailableTags();
        } else {
            stopCamera();
        }
    }, [isOpen, note, subjectId]);

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
            toast.error("Failed to start camera");
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
            return toast.error("Camera is not ready");
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
            toast.error('AI analysis failed');
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

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            return toast.error('Title and content are required');
        }

        setSaving(true);
        try {
            const finalTags = [...tags];
            const trimmedTag = tagInput.trim();
            if (trimmedTag && !finalTags.includes(trimmedTag)) {
                finalTags.push(trimmedTag);
            }

            const payload = {
                title: title.trim(),
                content: content.trim(),
                tags: finalTags,
                sourceImageContent: mainType === 'image' ? noteImage : null
            };

            const { note: updated } = await notesApi.update(subjectId, note.id, payload);
            onNoteUpdated(updated);
            onClose();
            toast.success('Note updated successfully');
        } catch (err) {
            toast.error('Failed to update note');
        } finally {
            setSaving(false);
        }
    };

    const handleCloseRequest = () => {
        const isChanged = title !== (note?.title || '') || 
                          content !== (note?.content || '') || 
                          (mainType === 'image' && noteImage !== (note?.sourceImageContent || '')) ||
                          (mainType === 'text' && note?.sourceImageContent);
        
        if (isChanged) {
            if (!window.confirm("You have unsaved changes. Are you sure you want to discard them?")) return;
        }
        stopCamera();
        onClose();
    };

    if (!isOpen || !note) return null;

    const renderImagePanel = () => (
        <div className="space-y-4">
            {/* Method Toggle */}
            <div className="flex bg-white/[0.025] p-0.5 rounded-lg border border-white/[0.05]">
                <button
                    onClick={() => handleImageMethodChange('upload')}
                    className={`flex-1 py-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${imageMethod === 'upload' ? 'bg-white/[0.07] text-white shadow-sm' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <ImageIcon className="w-3 h-3" /> Upload
                </button>
                <button
                    onClick={() => handleImageMethodChange('camera')}
                    className={`flex-1 py-2 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${imageMethod === 'camera' ? 'bg-white/[0.07] text-white shadow-sm' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <Camera className="w-3 h-3" /> Camera
                </button>
            </div>

            {/* Camera Mode */}
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
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg py-2 pl-3 pr-7 text-[11px] text-slate-400 outline-none focus:border-emerald-500/30 appearance-none cursor-pointer hover:bg-white/[0.05] transition-all"
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
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-700">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={getCameras}
                            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-600 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                        >
                            <RefreshCcw className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Viewfinder */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/[0.06] flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #131320 0%, #0a0a10 100%)' }}>
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
                                {/* Corner guides */}
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
                                <p className="text-[12px] text-slate-500 mb-4">Allow camera access to capture</p>
                                <button
                                    type="button"
                                    onClick={() => startCamera(selectedCameraId)}
                                    className="px-4 py-1.5 bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 rounded-lg text-[11px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                                >
                                    Start Camera
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Upload Mode */
                <div className="space-y-3">
                    {noteImage ? (
                        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(16,16,24,0.8) 0%, rgba(10,10,16,0.9) 100%)' }}>
                            <div className="p-3">
                                <img
                                    src={noteImage}
                                    alt="Note preview"
                                    className="w-full h-auto max-h-[280px] object-contain rounded-lg"
                                    style={{ background: 'repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 50% / 16px 16px' }}
                                />
                            </div>
                            <div className="flex items-center gap-2 px-3 pb-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageToCrop(noteImage);
                                        setIsCropping(true);
                                    }}
                                    className="flex-1 text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/8 hover:bg-emerald-500/15 border border-emerald-500/10 transition-all cursor-pointer"
                                >
                                    <Scissors className="w-3 h-3" /> Crop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNoteImage('')}
                                    className="flex-1 text-[11px] text-red-400/80 font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/6 hover:bg-red-500/12 border border-red-500/8 transition-all cursor-pointer"
                                >
                                    <Trash2 className="w-3 h-3" /> Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="relative rounded-xl border border-dashed border-white/[0.08] hover:border-emerald-500/25 transition-all cursor-pointer group overflow-hidden"
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
                            <div className="py-10 px-6 flex flex-col items-center text-center" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.02) 0%, transparent 100%)' }}>
                                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-600 group-hover:text-emerald-400 group-hover:border-emerald-500/20 group-hover:bg-emerald-500/8 flex items-center justify-center mb-3.5 transition-all">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <p className="text-[13px] text-slate-400 font-medium mb-1">Drop image here</p>
                                <p className="text-[11px] text-slate-700">or click to browse files</p>
                            </div>
                        </div>
                    )}

                    {/* AI Analyze CTA */}
                    {noteImage && !isAnalyzing && (
                        <button
                            type="button"
                            onClick={() => handleAnalyzeImage(noteImage)}
                            className="w-full text-[12px] font-bold text-emerald-400 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/6 border border-emerald-500/12 hover:bg-emerald-500/12 hover:border-emerald-500/20 transition-all cursor-pointer"
                        >
                            <Wand2 className="w-3.5 h-3.5" /> Extract text with AI
                        </button>
                    )}
                    {isAnalyzing && (
                        <div className="flex items-center justify-center gap-2.5 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div className="w-3.5 h-3.5 border-2 border-emerald-400/25 border-t-emerald-400 rounded-full animate-spin" />
                            <span className="text-[11px] text-emerald-400 font-semibold">Analyzing image...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 modal-backdrop fade-in">
                <div
                    className="w-full h-[100dvh] flex flex-col overflow-hidden"
                    style={{ background: '#0a0a10', willChange: 'transform, opacity' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-white/[0.05] shrink-0 bg-[#0e0e16]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 flex items-center justify-center">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-heading font-bold text-white tracking-tight leading-none">
                                    {isCropping ? 'Crop Image' : 'Edit Note'}
                                </h3>
                                <p className="text-[11px] text-slate-600 mt-0.5 hidden sm:block">Refine and organize your content</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isCropping && (
                                <>
                                    {(saving || isEnhancing || isAnalyzing) && (
                                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                                            <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                            <span className="text-[11px] text-emerald-400 font-semibold">Processing...</span>
                                        </div>
                                    )}

                                    <button
                                        form="edit-note-form"
                                        type="submit"
                                        disabled={saving || !title.trim() || !content.trim()}
                                        className="bg-emerald-500 hover:bg-emerald-400 text-white text-[13px] font-bold px-6 py-2 rounded-lg disabled:opacity-40 transition-all flex items-center gap-2 active:scale-[0.97] cursor-pointer shadow-lg shadow-emerald-500/20"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Update Note</span>
                                    </button>
                                </>
                            )}
                            <button onClick={handleCloseRequest} className="p-2 text-slate-600 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all ml-1 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!isCropping && (
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            {/* Left Sidebar */}
                            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.04] flex flex-col overflow-hidden bg-[#0a0a10]">
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                    <div>
                                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">Note Type</label>
                                        <div className="flex bg-white/[0.025] p-1 rounded-xl border border-white/[0.05]">
                                            <button onClick={() => handleMainTypeChange('text')} className={`flex-1 py-2 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${mainType === 'text' ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'}`}>
                                                <Type className="w-3.5 h-3.5" /> Text
                                            </button>
                                            <button onClick={() => handleMainTypeChange('image')} className={`flex-1 py-2 text-[12px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${mainType === 'image' ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'}`}>
                                                <ImageIcon className="w-3.5 h-3.5" /> Image
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2.5 block">Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/[0.06] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-emerald-500/30 transition-all font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5">
                                            <Tag className="w-3 h-3" /> Tags
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                                            {tags.map(tag => (
                                                <span key={tag} className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-md flex items-center gap-1.5">
                                                    {tag}
                                                    <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))} className="hover:text-white transition-colors cursor-pointer"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
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
                                            className="w-full bg-white/[0.03] border border-white/[0.06] text-slate-100 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:border-emerald-500/30 transition-all"
                                            placeholder="Add tag..."
                                        />
                                        {availableTags.length > 0 && (
                                            <div className="mt-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {availableTags.filter(tag => !tags.includes(tag)).slice(0, 8).map(tag => (
                                                        <button key={tag} type="button" onClick={() => { if (!tags.includes(tag)) setTags([...tags, tag]); setTagInput(''); }} className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-400 bg-white/[0.03] hover:bg-emerald-500/8 border border-white/[0.04] rounded-md transition-all cursor-pointer">
                                                            + {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {mainType === 'image' && (
                                        <div className="pt-2 border-t border-white/[0.04]">
                                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                                <ImageIcon className="w-3 h-3" /> Source Image
                                            </label>
                                            {renderImagePanel()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Editor */}
                            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                                <div className="flex items-center justify-between px-5 sm:px-8 py-3 border-b border-white/[0.04] shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Content</span>
                                    </div>
                                    <button type="button" onClick={handleEnhanceContent} disabled={!content.trim() || isEnhancing} className="text-[11px] font-bold text-violet-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/8 hover:bg-violet-500/15 border border-violet-500/12 transition-all cursor-pointer">
                                        <Sparkles className="w-3.5 h-3.5" /> Enhance with AI
                                    </button>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <form id="edit-note-form" onSubmit={handleUpdate} className="h-full flex flex-col">
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="w-full flex-1 bg-transparent text-slate-200 px-5 sm:px-8 py-6 text-[15px] focus:outline-none resize-none font-mono leading-[1.8]"
                                            style={{ caretColor: '#10b981' }}
                                        />
                                    </form>
                                </div>

                                <div className="px-5 sm:px-8 py-2.5 border-t border-white/[0.03] shrink-0 flex items-center justify-between text-[10px] text-slate-700">
                                    <div className="flex items-center gap-4 font-medium">
                                        <span>{content.length} characters</span>
                                        <span>{content.split(/\s+/).filter(Boolean).length} words</span>
                                    </div>
                                    {content.trim() && (title !== note.title || content !== note.content) && (
                                        <div className="flex items-center gap-1.5 text-emerald-500/60 transition-opacity">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
                                            <span>Draft unsaved</span>
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
                            onCancel={() => { setIsCropping(false); if (!noteImage) setImageToCrop(null); }}
                            title="Crop Image"
                        />
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default EditNoteModal;

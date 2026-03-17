import React, { useState, useRef, useEffect } from 'react';
import { solutionsApi } from '../../api/index.js';
import toast from 'react-hot-toast';
import { X, Save, FileText, Image as ImageIcon, Camera, RefreshCcw, Check, RotateCw, Scissors } from 'lucide-react';
import ModalPortal from '../ModalPortal.jsx';
import ImageCropper from '../common/ImageCropper.jsx';

const EditSolutionModal = ({ isOpen, onClose, subjectId, solution, onSolutionUpdated }) => {
    const [mainType, setMainType] = useState('text'); // 'text' or 'image'
    const [imageMethod, setImageMethod] = useState('upload'); // 'upload' or 'camera'
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [solutionImage, setSolutionImage] = useState('');
    const [hasExistingImage, setHasExistingImage] = useState(false);

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
        if (isOpen && solution) {
            setTitle(solution.title || '');
            setContent(solution.content || '');
            
            if (solution.source_image_id) {
                setHasExistingImage(true);
                setMainType('image');
                // We'll fetch the image if needed, or just show a placeholder "Existing Image"
                fetchImage();
            } else {
                setHasExistingImage(false);
                setMainType('text');
            }
        } else {
            stopCamera();
        }
    }, [isOpen, solution]);

    const fetchImage = async () => {
        try {
            const { image } = await solutionsApi.getImage(subjectId, solution.id);
            setSolutionImage(image);
        } catch (err) {
            console.error('Failed to fetch solution image:', err);
        }
    };

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
        if (!videoRef.current || videoRef.current.videoWidth === 0) return;
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
        setSolutionImage(croppedImage);
        setMainType('image');
        setHasExistingImage(false); // New image replaces old one
        setIsCropping(false);
        setImageToCrop(null);
        toast.success('Image cropped successfully');
    };

    const handleUpdateSolution = async (e) => {
        e.preventDefault();
        
        if (!title.trim() && !content.trim() && !solutionImage && !hasExistingImage) {
            return toast.error('Please provide either a title, content, or an image solution');
        }
        
        setSaving(true);
        try {
            const payload = {
                title: title.trim() || '',
                content: content.trim() || '',
                // Only send image if it's new (a data URL)
                sourceImageContent: (solutionImage && solutionImage.startsWith('data:')) ? solutionImage : null,
            };
            
            const { solution: updated } = await solutionsApi.update(subjectId, solution.id, payload);
            onSolutionUpdated(updated);
            handleModalClose();
            toast.success('Solution updated successfully');
        } catch {
            toast.error('Failed to update solution');
        } finally {
            setSaving(false);
        }
    };

    const handleModalClose = () => {
        stopCamera();
        setIsCropping(false);
        setImageToCrop(null);
        setSolutionImage('');
        onClose();
    };

    if (!isOpen || !solution) return null;

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" onClick={handleModalClose}>
                <div
                    className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            {isCropping ? 'Crop Solution Image' : 'Edit Solution'}
                        </h3>
                        <button onClick={handleModalClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {!isCropping && (
                        <>
                            <div className="px-7 pt-5 shrink-0">
                                <div className="flex bg-surface-2/40 p-1 rounded-xl border border-white/[0.06]">
                                    <button
                                        onClick={() => handleMainTypeChange('text')}
                                        className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${mainType === 'text' ? 'bg-blue-500/[0.12] text-white border border-blue-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                                    >
                                        <FileText className="w-4 h-4" /> Text Solution
                                    </button>
                                    <button
                                        onClick={() => handleMainTypeChange('image')}
                                        className={`flex-1 py-2.5 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${mainType === 'image' ? 'bg-blue-500/[0.12] text-white border border-blue-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-200 border border-transparent'}`}
                                    >
                                        <ImageIcon className="w-4 h-4" /> Image Solution
                                    </button>
                                </div>
                            </div>

                            <div className="px-7 py-6 overflow-y-auto custom-scrollbar flex-1">
                                {mainType === 'image' && (
                                    <div className="space-y-4 mb-6">
                                        <div className="flex bg-surface-3/30 p-1 rounded-lg border border-white/5 w-fit">
                                            <button onClick={() => handleImageMethodChange('upload')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${imageMethod === 'upload' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Upload</button>
                                            <button onClick={() => handleImageMethodChange('camera')} className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${imageMethod === 'camera' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Camera</button>
                                        </div>

                                        {imageMethod === 'camera' ? (
                                            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl flex items-center justify-center group bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0a0a0f_100%)]">
                                                {isCameraLoading ? (
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                        <span className="text-[12px] text-blue-400/80 font-bold uppercase tracking-widest animate-pulse">Initializing...</span>
                                                    </div>
                                                ) : cameraStream ? (
                                                    <>
                                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                        <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-center">
                                                            <button type="button" onClick={takePhoto} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-slate-200" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <button type="button" onClick={() => startCamera(selectedCameraId)} className="px-6 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition-all">Start Camera</button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative border-2 border-dashed border-white/[0.08] rounded-xl p-8 flex flex-col items-center justify-center bg-surface-2/30 hover:bg-surface-2/50 transition-all cursor-pointer min-h-[200px]">
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => { setImageToCrop(reader.result); setIsCropping(true); };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                                {solutionImage ? (
                                                     <div className="relative group">
                                                         <img src={solutionImage} alt="Preview" className="max-h-[300px] object-contain rounded-lg shadow-lg" />
                                                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm rounded-lg">
                                                             <p className="text-white text-xs font-bold">Click or drag to replace image</p>
                                                         </div>
                                                     </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                                        <h4 className="text-white font-semibold mb-1 text-[13px]">Upload your solution image</h4>
                                                        <p className="text-[11px] text-slate-500">Drag or click to choose a file</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <form id="edit-solution-form" onSubmit={handleUpdateSolution} className="space-y-5 flex flex-col">
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Solution Title</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><FileText className="w-4 h-4" /></div>
                                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Step-by-step solution" className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3.5 text-[14px] focus:outline-none focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/15 transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Solution Content (Markdown)</label>
                                        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type the solution here..." rows={12} className="w-full min-h-[300px] bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/15 transition-all resize-y font-mono" />
                                    </div>
                                </form>
                            </div>

                            <div className="px-7 py-5 border-t border-white/[0.06] shrink-0 flex items-center justify-end">
                                <div className="flex gap-3">
                                    <button type="button" onClick={handleModalClose} className="px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white transition-all">Cancel</button>
                                    <button form="edit-solution-form" type="submit" disabled={saving || (!title.trim() && !content.trim() && !solutionImage && !hasExistingImage)} className="bg-blue-600 text-white shadow-lg text-[13px] font-bold px-8 py-3 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Update Solution</>}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    {isCropping && (
                        <ImageCropper
                            image={imageToCrop}
                            onCropComplete={handleApplyCrop}
                            onCancel={() => {
                                setIsCropping(false);
                                if (!solutionImage) setImageToCrop(null);
                            }}
                            title="Crop Solution"
                            subtitle="Select the solution area from your image"
                        />
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default EditSolutionModal;

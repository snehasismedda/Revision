import React, { useState, useRef } from 'react';
import { X, User, Mail, Lock, CheckCircle2, Camera, Upload } from 'lucide-react';
import ImageCropper from '../common/ImageCropper.jsx';
import ModalPortal from '../ModalPortal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';


const EditProfileModal = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Image Cropper states
    // Image Cropper states
    const [imgSrc, setImgSrc] = useState('');
    const [isCropping, setIsCropping] = useState(false);
    const [profileImgData, setProfileImgData] = useState(user?.profile_picture || null);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
            reader.readAsDataURL(e.target.files[0]);
            setIsCropping(true);
        }
    };

    const applyCrop = (croppedImage) => {
        setProfileImgData(croppedImage);
        setIsCropping(false);
        setImgSrc('');
    };

    const handleRemoveImage = () => {
        setProfileImgData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        if (!email.trim()) {
            toast.error('Email cannot be empty');
            return;
        }

        const data = {};
        if (name !== user.name) data.name = name;
        if (email !== user.email) data.email = email;
        if (password) data.password = password;
        if (profileImgData !== user?.profile_picture) data.profile_picture = profileImgData || null;

        if (Object.keys(data).length === 0) {
            toast('No changes made', { icon: 'ℹ️' });
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            await updateProfile(data);
            toast.success('Profile updated successfully');
            onClose();
            setPassword('');
        } catch (error) {
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop fade-in" onClick={onClose}>
                <div
                    className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ background: 'rgba(22, 22, 34, 0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] shrink-0">
                        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <User className="w-5 h-5 text-primary-light" />
                            </div>
                            Edit Profile
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    {isCropping && (
                        <ImageCropper
                            image={imgSrc}
                            onCropComplete={applyCrop}
                            onCancel={() => {
                                setIsCropping(false);
                                setImgSrc('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            title="Crop Profile Photo"
                            subtitle="Position and zoom your photo"
                            aspect={1}
                            circularCrop={true}
                        />
                    )}
                    {!isCropping && (
                        <form id="edit-profile-form" onSubmit={handleSubmit} className="px-7 py-6 space-y-6">

                            {/* Avatar Editor Section */}
                            <div className="flex items-center gap-5">
                                <div className="relative group shrink-0">
                                    <div className="w-16 h-16 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                        {profileImgData ? (
                                            <img src={profileImgData} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-heading font-bold text-slate-400">
                                                {name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <label title="Upload image" className="absolute -bottom-1 -right-1 p-1.5 bg-primary hover:bg-primary-light text-white rounded-full cursor-pointer transition-colors shadow-lg scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100">
                                        <Camera className="w-3.5 h-3.5" />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={onSelectFile}
                                        />
                                    </label>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-1.5">Profile Picture</label>
                                    <div className="flex gap-3">
                                        <label className="text-xs font-semibold text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                                            Change
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={onSelectFile}
                                            />
                                        </label>
                                        {profileImgData && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/[0.04]" />

                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Display Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                        placeholder="Your Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                        placeholder="your.email@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-2.5">New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-surface-2/50 border border-white/[0.08] text-slate-100 rounded-xl pl-11 pr-4 py-3 text-[14px] focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:bg-surface-2/70 transition-all placeholder:text-slate-600/80"
                                        placeholder="Leave blank to keep current"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500/80 mt-2.5 font-medium leading-relaxed">
                                    If you only want to change your name or email, leave the password field empty.
                                </p>
                            </div>
                        </form>
                    )}

                    {/* Footer */}
                    {!isCropping && (
                        <div className="px-7 py-5 border-t border-white/[0.06] flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-5 py-3 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-profile-form"
                                disabled={isSubmitting || (!name.trim() || !email.trim())}
                                className="flex-[2] btn-primary flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]"
                            >
                                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                                {!isSubmitting && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default EditProfileModal;

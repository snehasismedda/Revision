import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, LibraryBig, LogOut, Activity, ChevronLeft, ChevronRight, Settings, Image as ImageIcon, Target } from 'lucide-react';
import EditProfileModal from './modals/EditProfileModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/subjects', label: 'Subjects', icon: LibraryBig },
    { to: '/tests', label: 'Tests', icon: Target },
    { to: '/images', label: 'Images', icon: ImageIcon },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768);
    const [showEditProfile, setShowEditProfile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsCollapsed(true);
            }
        };

        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                setIsCollapsed(prev => !prev);
            }
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside
            className={`flex-shrink-0 flex flex-col h-[100dvh] sticky top-0 transition-all duration-500 ease-in-out group/sidebar z-[50]
            ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}`}
            style={{
                background: 'linear-gradient(180deg, rgba(13, 13, 18, 1) 0%, rgba(9, 9, 14, 1) 100%)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
            }}
        >
            {/* Atmospheric Background Layers - static, no expensive blur/animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-primary/[0.04] to-transparent" />
                <div className="absolute bottom-0 right-0 w-full h-[40%] bg-gradient-to-t from-indigo-500/[0.03] to-transparent" />
            </div>

            {/* Toggle Button */}
            <div
                className="absolute -right-4 top-10 z-[60] transition-all duration-300 opacity-100"
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-8 h-8 rounded-full bg-primary border border-white/20 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group/btn"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <div className={`transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180'}`}>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </button>
            </div>

            {/* Logo Section */}
            <div className={`pt-7 pb-6 transition-all duration-300 z-10 ${isCollapsed ? 'px-3' : 'px-4'}`}>
                <div
                    className={`rounded-2xl relative overflow-hidden transition-all duration-500
                        ${isCollapsed ? 'p-2' : 'p-3.5'}`}
                    style={{
                        background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.4) 0%, rgba(15, 15, 25, 0.6) 100%)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 8px 32px -4px rgba(0,0,0,0.5)',
                    }}
                >
                    <div className="flex items-center gap-3 cursor-default relative z-10">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 relative overflow-hidden">
                            <Activity className="w-6.5 h-6.5 text-white" />
                        </div>
                        {!isCollapsed && (
                            <h1 className="text-xl font-heading font-bold tracking-tight text-white leading-tight">
                                Prep<span className="text-primary">Tracker</span>
                            </h1>
                        )}
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className={`flex-1 overflow-y-auto overflow-x-hidden pt-2 transition-all z-10 ${isCollapsed ? 'px-3' : 'px-4'}`}>
                <div className="space-y-1.5 font-sans pb-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                title={isCollapsed ? item.label : ''}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    `flex items-center text-[13px] font-semibold transition-all duration-300 relative rounded-xl group/nav
                                    ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'}
                                    ${isCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5 mx-1'}`
                                }
                                onClick={() => {
                                    if (window.innerWidth < 768) setIsCollapsed(true);
                                }}
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* Simple Selection Indicator */}
                                        {isActive && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-xl z-0"
                                            />
                                        )}

                                        {/* Glass Glow Edge */}
                                        {isActive && (
                                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-light/40 to-transparent z-10" />
                                        )}

                                        <Icon
                                            className={`shrink-0 w-[18px] h-[18px] transition-all duration-300 relative z-10 ${isActive ? 'text-primary-light' : 'group-hover/nav:text-primary-light'}`}
                                            strokeWidth={isActive ? 2.4 : 1.8}
                                        />
                                        {!isCollapsed && (
                                            <span className={`transition-colors duration-200 relative z-10 ${isActive ? 'tracking-tight text-white' : ''}`}>
                                                {item.label}
                                            </span>
                                        )}

                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
            </nav>

            {/* User Profile Section */}
            <div className={`mt-auto transition-all duration-300 z-10 ${isCollapsed ? 'px-3 pb-4' : 'px-4 pb-4'}`}>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-4" />

                <div
                    className={`rounded-2xl relative overflow-hidden transition-all duration-500
                        ${isCollapsed ? 'p-2' : 'p-3.5'}`}
                    style={{
                        background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.4) 0%, rgba(15, 15, 25, 0.6) 100%)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: '0 8px 32px -4px rgba(0,0,0,0.5)',
                    }}
                >
                    <div className="flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'gap-3'}">
                        <div className="relative">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-heading font-bold text-white overflow-hidden bg-gradient-to-tr from-primary to-indigo-500 shadow-lg shadow-primary/30`}>
                                {user?.profile_picture ? (
                                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0)?.toUpperCase()
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#0c0c14] rounded-full flex items-center justify-center border border-white/5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            </div>
                        </div>

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 ml-3">
                                <p className="text-[13px] font-heading font-bold text-white truncate leading-tight">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 truncate mt-1 font-medium">{user?.email}</p>
                            </div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="mt-3 flex gap-2 relative z-10">
                            <button
                                onClick={() => setShowEditProfile(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-[11px] font-bold text-slate-300 bg-white/[0.05] rounded-xl border border-white/5 transition-all hover:bg-white/[0.1] hover:text-white cursor-pointer"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                <span>Settings</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 flex items-center justify-center gap-2 px-2 py-2 text-[11px] font-bold text-slate-300 bg-white/[0.05] rounded-xl border border-white/5 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}

                    {isCollapsed && (
                        <div className="mt-4 space-y-2 relative z-10">
                            <button
                                onClick={() => setShowEditProfile(true)}
                                title="Settings"
                                className="w-full flex items-center justify-center p-2.5 text-slate-400 bg-white/[0.03] rounded-xl hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer border border-white/5"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="w-full flex items-center justify-center p-2.5 text-slate-400 bg-white/[0.03] rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer border border-white/5"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <EditProfileModal
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
            />
        </aside>
    );
};

export default Sidebar;

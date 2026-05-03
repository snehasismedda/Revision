import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, LibraryBig, LogOut, Activity, ChevronLeft, ChevronRight, Settings, Layers, Target, BookMarked, Sun, Moon, Wrench } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

import EditProfileModal from './modals/EditProfileModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';


const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/subjects', label: 'Subjects', icon: BookMarked },
    { to: '/tests', label: 'Tests', icon: Target },
    { to: '/library', label: 'Library', icon: LibraryBig },
    { to: '/tools', label: 'Tools', icon: Wrench },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

    const triggerLogout = () => {
        setShowLogoutConfirm(true);
    };

    return (
        <aside
            className={`flex-shrink-0 flex flex-col h-[100dvh] sticky top-0 transition-all duration-500 ease-in-out group/sidebar z-[50]
            ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}
            bg-surface-2 border-r border-border`}
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
                    className="w-8 h-8 rounded-full bg-primary border border-border flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group/btn"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <div className={`transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180'}`}>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </button>
            </div>

            {/* Logo Section */}
            <div className={`pt-7 pb-4 transition-all duration-300 z-10 ${isCollapsed ? 'px-3' : 'px-4'}`}>
                <div
                    className={`rounded-2xl relative overflow-hidden transition-all duration-500
                        ${isCollapsed ? 'p-2' : 'p-3.5'}
                        bg-surface-3/40 border border-border shadow-lg shadow-black/5`}
                >
                    <div className="flex items-center gap-3 cursor-default relative z-10">
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 relative overflow-hidden">
                            <Activity className="w-6.5 h-6.5 text-text" />
                        </div>
                        {!isCollapsed && (
                            <h1 className="text-xl font-heading font-bold tracking-tight text-text leading-tight">
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
                                    ${isActive ? 'text-text' : 'text-text-muted hover:text-text'}
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
                                            <div
                                                className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-xl z-0 fade-in"
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
                                            <span className={`transition-colors duration-200 relative z-10 ${isActive ? 'tracking-tight text-text' : ''}`}>
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
                <div
                    className={`rounded-2xl relative overflow-hidden transition-all duration-500
                        ${isCollapsed ? 'p-2' : 'p-3.5'}
                        bg-surface-3/40 border border-border shadow-lg shadow-black/5`}
                >
                    <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className="relative">
                            <button 
                                onClick={() => setShowEditProfile(true)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-heading font-bold text-text overflow-hidden bg-gradient-to-tr from-primary to-indigo-500 shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-offset-2 ring-offset-surface-2 hover:ring-2 hover:ring-primary/50`}
                                title="Open Settings"
                            >
                                {user?.profile_picture ? (
                                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0)?.toUpperCase()
                                )}
                            </button>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-surface rounded-full flex items-center justify-center border border-border`}>
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            </div>
                        </div>

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 ml-3">
                                <p className="text-[13px] font-heading font-bold text-text truncate leading-tight">{user?.name}</p>
                                <p className="text-[10px] text-text-muted truncate mt-1 font-medium">{user?.email}</p>
                            </div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <div className="mt-3 flex items-center gap-2 relative z-10">
                            <button
                                onClick={toggleTheme}
                                className="w-10 h-10 flex items-center justify-center shrink-0 text-text-muted bg-surface/50 rounded-xl border border-border transition-all hover:bg-surface-3 hover:text-text cursor-pointer"
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-4 h-4 text-amber-400" />
                                ) : (
                                    <Moon className="w-4 h-4 text-indigo-400" />
                                )}
                            </button>
                            <button
                                onClick={triggerLogout}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-bold text-text-muted bg-surface/50 rounded-xl border border-border transition-all hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}

                    {isCollapsed && (
                        <div className="mt-4 space-y-2 relative z-10">
                            <button
                                onClick={toggleTheme}
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                                className="w-full flex items-center justify-center p-2.5 text-text-muted bg-surface/50 rounded-xl hover:bg-surface-3 hover:text-text transition-all cursor-pointer border border-border"
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-4 h-4 text-amber-400" />
                                ) : (
                                    <Moon className="w-4 h-4 text-indigo-400" />
                                )}
                            </button>
                            <button
                                onClick={triggerLogout}
                                title="Logout"
                                className="w-full flex items-center justify-center p-2.5 text-text-muted bg-surface/50 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer border border-border"
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

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                title="Confirm Logout"
                message="Are you sure you want to log out? You will need to sign in again to access your tracker."
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
                confirmText="Logout"
                type="danger"
                icon={LogOut}
            />
        </aside>
    );
};

export default Sidebar;

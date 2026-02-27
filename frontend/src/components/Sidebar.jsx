import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, LibraryBig, LogOut, Sparkles, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/subjects', label: 'Subjects', icon: LibraryBig },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside
            className={`flex-shrink-0 flex flex-col backdrop-blur-xl h-[100dvh] sticky top-0 transition-all duration-300 ease-in-out group/sidebar
            ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}`}
            style={{
                background: 'linear-gradient(180deg, rgba(22, 22, 32, 0.92) 0%, rgba(15, 15, 20, 0.96) 100%)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-primary border border-white/10 flex items-center justify-center text-white shadow-lg opacity-0 group-hover/sidebar:opacity-100 transition-opacity z-50 cursor-pointer hover:scale-110 hover:shadow-[0_0_12px_rgba(139,92,246,0.5)] active:scale-95"
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            {/* Logo */}
            <div className={`pt-7 pb-8 transition-all ${isCollapsed ? 'px-4' : 'px-7'}`}>
                <div className="flex items-center gap-3 cursor-default group/logo">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.35)] group-hover/logo:shadow-[0_0_28px_rgba(139,92,246,0.55)] transition-shadow duration-500">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <h1 className="text-lg font-heading font-bold tracking-tight text-white leading-tight">Revision AI</h1>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className={`flex-1 transition-all ${isCollapsed ? 'px-3' : 'px-5'}`}>
                {!isCollapsed && (
                    <p className="px-4 text-[9px] font-extrabold text-slate-600 uppercase tracking-[0.2em] mb-5 select-none">
                        Main Menu
                    </p>
                )}
                <div className="space-y-1 font-sans">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                title={isCollapsed ? item.label : ''}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    `flex items-center text-[13px] font-semibold transition-all duration-200 relative overflow-hidden
                                    ${isActive
                                        ? 'text-white'
                                        : 'text-slate-500 hover:text-slate-200'
                                    }
                                    ${isCollapsed
                                        ? `justify-center p-3 rounded-xl ${isActive ? 'bg-primary/[0.12]' : 'hover:bg-white/[0.04]'}`
                                        : `gap-3.5 px-4 py-2.5 mx-2 rounded-lg ${isActive ? 'bg-primary/[0.10]' : 'hover:bg-white/[0.04]'}`
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* Vertical accent bar — left edge */}
                                        {isActive && (
                                            <div
                                                className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-primary"
                                                style={{ boxShadow: '0 0 8px rgba(139,92,246,0.8), 0 0 20px rgba(139,92,246,0.3)' }}
                                            />
                                        )}
                                        {/* Soft hover glow overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.06] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

                                        <Icon
                                            className={`shrink-0 w-[18px] h-[18px] transition-all duration-200 ${isActive ? 'text-primary-light' : ''}`}
                                            strokeWidth={isActive ? 2.4 : 1.8}
                                        />
                                        {!isCollapsed && (
                                            <span className={`transition-colors duration-200 ${isActive ? 'tracking-tight' : ''}`}>
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
            <div className={`mt-auto transition-all ${isCollapsed ? 'px-3 pb-5' : 'px-5 pb-6'}`}>
                {/* Gradient divider to separate profile from nav */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent mb-5" />

                <div
                    className={`rounded-xl relative overflow-hidden group/user transition-all
                        ${isCollapsed ? 'p-2.5' : 'p-4'}`}
                    style={{
                        background: 'rgba(30, 30, 44, 0.45)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.05] to-transparent opacity-0 group-hover/user:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className={`flex items-center relative z-10 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        {/* Avatar with purple accent glow */}
                        <div
                            className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-sm font-heading font-bold text-white"
                            style={{
                                boxShadow: '0 0 0 2px rgba(139,92,246,0.25), inset 0 1px 2px rgba(0,0,0,0.3)',
                            }}
                        >
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-heading font-semibold text-white truncate leading-tight">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                            </div>
                        )}
                    </div>

                    {!isCollapsed && (
                        <>
                            {/* Inner divider */}
                            <div className="h-px w-full bg-white/[0.05] my-3 relative z-10" />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 relative z-10 cursor-pointer border border-transparent hover:border-red-500/15 group/logout"
                            >
                                <LogOut className="w-3.5 h-3.5 transition-transform group-hover/logout:-translate-x-0.5" />
                                <span>Sign out</span>
                            </button>
                        </>
                    )}

                    {isCollapsed && (
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className="mt-2 w-full flex items-center justify-center p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all z-10 cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

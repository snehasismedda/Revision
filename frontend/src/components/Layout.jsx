import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const Layout = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const mainEl = document.getElementById('main-scroll');
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pathname]);

    return (
        <div className="flex min-h-[100dvh] bg-surface relative overflow-hidden">
            {/* Ambient Background Orbs */}
            <div className="fixed top-[-15%] left-[-5%] w-[35%] h-[35%] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />
            <div className="fixed bottom-[-15%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-500/[0.03] blur-[100px] pointer-events-none" />

            <Sidebar />

            <main
                id="main-scroll"
                className="flex-1 relative z-10 h-[100dvh] overflow-y-auto overflow-x-hidden"
            >
                <div className="w-full max-w-[1400px] mx-auto px-10 py-12 lg:px-20 lg:py-16">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;

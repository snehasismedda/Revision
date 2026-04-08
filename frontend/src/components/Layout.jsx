import { useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

const Layout = () => {
    const location = useLocation();
    const { pathname } = location;

    useEffect(() => {
        const mainEl = document.getElementById('main-scroll');
        if (mainEl) mainEl.scrollTo({ top: 0 });
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
                <div className="w-full max-w-[1400px] mx-auto px-6 py-6 lg:px-10 lg:py-10">
                    <div
                        key={pathname}
                        className="fade-in"
                    >
                        <Suspense fallback={
                            <div className="max-w-6xl mx-auto animate-pulse flex flex-col gap-8">
                                <div className="flex flex-col gap-3">
                                    <div className="w-16 h-4 bg-surface-2 rounded-lg opacity-40" />
                                    <div className="w-64 h-10 bg-surface-2 rounded-xl" />
                                    <div className="w-96 h-5 bg-surface-2 rounded-lg opacity-40" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-40 bg-surface-2/40 rounded-2xl border border-white/5" />
                                    ))}
                                </div>
                                <div className="h-64 bg-surface-2/20 rounded-[2rem] border border-white/5" />
                            </div>
                        }>
                            <Outlet />
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;

import { useEffect, useRef } from 'react';
import { timeTableApi } from '../api/index.js';

/**
 * useTimeTableNotifications
 *
 * Runs globally while the user is logged in.
 * - Requests browser notification permission on first run.
 * - Fetches the active timetable once per day (on mount + each midnight).
 * - For today's events, calculates the ms until each slot starts and
 *   fires a native browser Notification at that moment.
 * - All timers are cleared on unmount / re-run.
 */
const useTimeTableNotifications = (isAuthenticated = false) => {
    const timersRef = useRef([]);

    const clearAllTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    const scheduleNotifications = async () => {
        clearAllTimers();

        // Permission gate
        if (!('Notification' in window)) return;
        if (Notification.permission === 'denied') return;
        if (Notification.permission === 'default') {
            const result = await Notification.requestPermission();
            if (result !== 'granted') return;
        }

        // Fetch active timetable
        let all;
        try {
            all = await timeTableApi.list();
        } catch {
            return;
        }
        const active = all?.find?.(t => t.is_active);
        if (!active) return;

        const events = active.events || [];
        const type   = active.type || 'weekly'; // 'weekly' | 'monthly'
        const now    = new Date();

        // Resolve today's identifier
        // weekly: 0 (Sun) – 6 (Sat)  |  monthly: 1 – 31
        const todayKey = type === 'weekly' ? now.getDay() : now.getDate();

        // Filter events that occur today
        const todayEvents = events.filter(evt => {
            const days = evt.days ?? (evt.day != null ? [evt.day] : []);
            return days.includes(todayKey);
        });

        // Schedule a notification for each upcoming slot
        todayEvents.forEach(evt => {
            const startH   = evt.startHour ?? 0;           // e.g. 9.5 = 09:30
            const hours    = Math.floor(startH);
            const minutes  = Math.round((startH - hours) * 60);

            const slotTime = new Date(now);
            slotTime.setHours(hours, minutes, 0, 0);

            const msUntil = slotTime - now;
            if (msUntil < 0) return; // slot already passed today

            const title = `📚 Study Time: ${evt.title || 'Session'}`;
            const body  = `Your ${active.name} slot starts now (${formatHour(startH)} → ${formatHour(evt.endHour ?? startH + 1)})`;

            const tid = setTimeout(() => {
                try {
                    const n = new Notification(title, {
                        body,
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                        tag: `timetable-${evt.id ?? startH}-${todayKey}`,
                        renotify: false,
                        silent: false,
                    });
                    // Auto-close after 10 s
                    setTimeout(() => n.close(), 10_000);
                } catch (err) {
                    console.warn('[TimeTable Notif]', err);
                }
            }, msUntil);

            timersRef.current.push(tid);
        });

        console.info(
            `[TimeTable] Scheduled ${timersRef.current.length} notification(s) for today from "${active.name}"`
        );
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        scheduleNotifications();

        // Re-schedule at midnight each day
        const now       = new Date();
        const midnight  = new Date(now);
        midnight.setHours(24, 0, 1, 0);
        const msToMidnight = midnight - now;

        const midnightTid = setTimeout(() => {
            scheduleNotifications();
        }, msToMidnight);

        return () => {
            clearAllTimers();
            clearTimeout(midnightTid);
        };
    }, [isAuthenticated]);
};

/* ── helpers ──────────────────────────────────────────────────── */
const formatHour = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

export default useTimeTableNotifications;

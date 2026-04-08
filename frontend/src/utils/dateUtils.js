/**
 * Format a Date object or ISO string to the user's local time.
 * This ensures consistency across the frontend while respecting the user's browser settings.
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    
    // Default to browser locale and timezone
    const defaultOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options
    };
    
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        // Not passing a locale uses the browser's default locale
        return new Intl.DateTimeFormat(undefined, defaultOptions).format(d);
    } catch (error) {
        console.error('Error formatting date:', error);
        return String(date);
    }
};

/**
 * Format a date with time.
 */
export const formatDateWithTime = (date) => {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Get the relative time string (e.g. "2 days ago") for a given date.
 */
export const formatRelativeTime = (date) => {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return formatDate(d);
};


import React, { createContext, useContext, useState, useCallback } from 'react';

const QuickViewContext = createContext(null);

export const QuickViewProvider = ({ children }) => {
    const [minimizedItems, setMinimizedItems] = useState([]); // Array of { type, id, data, title, ... }
    const [activeItem, setActiveItem] = useState(null); // The one currently "popped up"

    const minimize = useCallback((item) => {
        if (!item) return;
        setMinimizedItems(prev => {
            const exists = prev.find(i => i.id === item.id && i.type === item.type);
            if (exists) return prev;
            return [...prev, item];
        });
        setActiveItem(null);
    }, []);

    const openItem = useCallback((item) => {
        // If there's an active item, minimize it first? 
        // User said: "quick view anothe model while in qucik view adds the state in the quick view"
        // Let's just set the new active item.
        setActiveItem(item);
        
        // If it was in minimized, remove it
        setMinimizedItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
    }, []);

    const closeMinimized = useCallback((index) => {
        setMinimizedItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const restoreMinimized = useCallback((index) => {
        const item = minimizedItems[index];
        if (!item) return;
        openItem(item);
    }, [minimizedItems, openItem]);

    const clearAll = useCallback(() => {
        setMinimizedItems([]);
    }, []);

    return (
        <QuickViewContext.Provider value={{
            minimizedItems,
            activeItem,
            minimize,
            openItem,
            closeMinimized,
            restoreMinimized,
            setActiveItem,
            clearAll
        }}>
            {children}
        </QuickViewContext.Provider>
    );
};

export const useQuickView = () => {
    const context = useContext(QuickViewContext);
    if (!context) throw new Error('useQuickView must be used within QuickViewProvider');
    return context;
};

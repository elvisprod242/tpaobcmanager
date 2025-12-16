
import { useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark';

export const useDarkMode = () => {
    const [theme, setTheme] = useState<ThemeMode>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('safefleet-theme');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                return savedTheme;
            }
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('safefleet-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return { isDarkMode: theme === 'dark', toggleTheme };
};

import { useCallback, useState } from 'react';

export type Appearance = 'light';

export function initializeTheme() {
    if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('appearance', 'light');
    }
}

export function useAppearance() {
    const [appearance] = useState<Appearance>('light');

    const updateAppearance = useCallback(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('appearance', 'light');
        }
    }, []);

    return { appearance, updateAppearance } as const;
}

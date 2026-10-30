import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import urTranslations from '../locales/ur.json';

const savedLocale = (typeof window !== 'undefined' ? localStorage.getItem('jkc_locale') : null) || 'en';

if (typeof document !== 'undefined') {
    document.documentElement.lang = savedLocale;
    document.documentElement.dir = savedLocale === 'ur' ? 'rtl' : 'ltr';
}

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslations },
            ur: { translation: urTranslations },
        },
        lng: savedLocale,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export const changeLanguage = (lng: 'en' | 'ur') => {
    i18n.changeLanguage(lng);
    if (typeof window !== 'undefined') {
        localStorage.setItem('jkc_locale', lng);
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'ur' ? 'rtl' : 'ltr';

        // Persist to backend session/user if possible
        try {
            fetch('/locale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ locale: lng }),
            }).catch(() => {});
        } catch {
            // silent catch
        }
    }
};

export default i18n;

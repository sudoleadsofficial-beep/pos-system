import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { GlobeIcon } from '@phosphor-icons/react';

interface LanguageToggleProps {
    className?: string;
    variant?: 'outline' | 'ghost' | 'default';
}

export function LanguageToggle({ className = '', variant = 'outline' }: LanguageToggleProps) {
    const { i18n } = useTranslation();
    const currentLang = i18n.language === 'ur' ? 'ur' : 'en';

    const toggle = () => {
        const nextLang = currentLang === 'ur' ? 'en' : 'ur';
        changeLanguage(nextLang);
    };

    return (
        <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={toggle}
            className={`cursor-pointer inline-flex items-center gap-1.5 font-medium px-3 py-1.5 h-8 text-xs transition-all select-none ${className}`}
            title={currentLang === 'en' ? 'Switch to Urdu (اردو)' : 'Switch to English'}
        >
            <GlobeIcon className="size-4 shrink-0" />
            <span className={currentLang === 'en' ? 'font-nastaliq text-sm leading-none' : 'font-sans'}>
                {currentLang === 'en' ? 'اردو' : 'English'}
            </span>
        </Button>
    );
}

export default LanguageToggle;

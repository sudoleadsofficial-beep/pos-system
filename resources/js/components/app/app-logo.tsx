import { useTranslation } from 'react-i18next';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    return (
        <div className="flex items-center gap-2.5 w-full overflow-hidden">
            <div className="flex size-9 aspect-square shrink-0 items-center justify-center rounded-lg shadow-xs bg-green-50 border border-green-200">
                <AppLogoIcon className="size-8" />
            </div>
            <div className="flex-1 text-start overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                <span className={`block truncate font-bold text-xs text-green-950 ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                    {t('branding.name')}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                    {t('branding.tagline')}
                </span>
            </div>
        </div>
    );
}

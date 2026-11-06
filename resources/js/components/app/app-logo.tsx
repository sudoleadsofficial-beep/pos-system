import { useTranslation } from 'react-i18next';
import useBusiness from '@/hooks/use-business';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    const { i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const business = useBusiness();

    const name = isUrdu ? business.name_ur || business.name : business.name;
    const tagline = isUrdu ? business.tagline_ur || business.tagline : business.tagline;

    return (
        <div className="flex items-center gap-2.5 w-full overflow-hidden">
            <div className="flex size-9 aspect-square shrink-0 items-center justify-center rounded-lg shadow-xs bg-green-50 border border-green-200">
                {business.logo ? (
                    <img src={`/${business.logo}`} alt={name} className="size-8 object-contain" />
                ) : (
                    <AppLogoIcon className="size-8" />
                )}
            </div>
            <div className="flex-1 text-start overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                <span className={`block truncate font-bold text-xs text-green-950 ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                    {name}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{tagline}</span>
            </div>
        </div>
    );
}

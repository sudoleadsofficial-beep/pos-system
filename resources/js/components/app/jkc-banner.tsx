import { useTranslation } from 'react-i18next';
import AppLogoIcon from './app-logo-icon';

export function JkcBanner() {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    return (
        <div className="relative overflow-hidden rounded-xl border border-emerald-700/40 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 shadow-sm">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-inner">
                        <AppLogoIcon className="size-12" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                                {t('common.year')}
                            </span>
                            <span className="text-xs text-emerald-200/80">Karachi Sabzi Mandi</span>
                        </div>
                        <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight mt-1 ${isUrdu ? 'font-nastaliq text-3xl md:text-4xl leading-relaxed' : ''}`}>
                            {t('branding.name')}
                        </h1>
                        <p className="text-sm text-emerald-100 font-medium mt-0.5">
                            {t('branding.tagline')} — {t('branding.address')}
                        </p>
                    </div>
                </div>
                <div className="text-start md:text-end text-xs text-emerald-200/90 space-y-1">
                    <div className="font-medium">{t('branding.phones')}</div>
                    <div className="text-[11px] text-emerald-300/70">JKC Commission Agent Software 2026</div>
                </div>
            </div>
        </div>
    );
}

export default JkcBanner;

import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import type { Business, SharedData } from '@/types';

/**
 * The business information the client saved in Settings.
 *
 * It falls back to the built-in branding so the screen still looks right on
 * a fresh install where nothing has been set yet.
 */
export default function useBusiness(): Business {
    const { t } = useTranslation();
    const { business } = usePage<SharedData>().props;

    return (
        business ?? {
            name: t('branding.name'),
            name_ur: '',
            tagline: t('branding.tagline'),
            tagline_ur: '',
            address: t('branding.address'),
            phone: '',
            phone2: '',
            logo: '',
            show_on_print: true,
        }
    );
}

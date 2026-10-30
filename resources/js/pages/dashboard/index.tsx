import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { DashboardStats } from './_components/stats-section';
import { JkcBanner } from '@/components/app/jkc-banner';

export default function Dashboard() {
    const { t } = useTranslation();
    const { stats } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('nav.dashboard'),
            href: '/dashboard',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.dashboard')} />
            <div className="flex flex-col gap-5">
                <JkcBanner />
                <DashboardStats stats={stats} />
            </div>
        </AppLayout>
    );
}

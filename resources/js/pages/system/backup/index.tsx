import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Backup {
    name: string;
    size: number;
    created_at: string;
}

interface Props {
    backups: Backup[];
    lastBackupAt: string | null;
    categories: Record<string, string>;
}

export default function BackupIndex({ backups, lastBackupAt, categories }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [category, setCategory] = useState<string>(Object.keys(categories)[0] ?? '');

    const restoreForm = useForm<{ backup: File | null }>({ backup: null });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.backup'), href: '/system/backup' },
    ];

    function formatSize(bytes: number) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function handleRestoreCheck(e: React.FormEvent) {
        e.preventDefault();

        if (!restoreForm.data.backup) {
            toast.error(t('backup.choose_file'));

            return;
        }

        restoreForm.post(route('system.backup.restore.check'), {
            forceFormData: true,
            preserveScroll: true,
            onError: () => toast.error(t('common.error')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.backup')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="CloudArrowUpIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('backup.title')}</h1>
                </div>

                {/* -------------------------------------------------------
                    A. Full database backup
                ------------------------------------------------------- */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('backup.full_backup')}</CardTitle>
                        <CardDescription>{t('backup.full_backup_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild>
                                <a href={route('system.backup.download')}>
                                    <Icon name="DownloadSimpleIcon" className="size-4 me-2" />
                                    {t('backup.download_full')}
                                </a>
                            </Button>

                            <span className="text-xs text-muted-foreground">
                                {lastBackupAt
                                    ? t('backup.last_backup', { date: lastBackupAt })
                                    : t('backup.never_backed_up')}
                            </span>
                        </div>

                        {backups.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                                        {t('backup.stored_backups')}
                                    </p>
                                    {backups.map((backup) => (
                                        <div
                                            key={backup.name}
                                            className="flex items-center justify-between gap-3 rounded border px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate font-mono text-xs">{backup.name}</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {backup.created_at} &middot; {formatSize(backup.size)}
                                                </p>
                                            </div>
                                            <Button asChild size="sm" variant="outline">
                                                <a href={route('system.backup.download.existing', backup.name)}>
                                                    {t('common.download')}
                                                </a>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* -------------------------------------------------------
                    B + C. Exports
                ------------------------------------------------------- */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('backup.exports')}</CardTitle>
                        <CardDescription>{t('backup.exports_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="grid gap-1.5">
                                <Label htmlFor="export-category">{t('backup.data_category')}</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger id="export-category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(categories).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2">
                                <Button asChild variant="outline">
                                    <a href={route('system.export.excel', category)}>
                                        <Icon name="FileXlsIcon" className="size-4 me-2" />
                                        Excel
                                    </a>
                                </Button>
                                <Button asChild variant="outline">
                                    <a href={route('system.export.pdf', category)}>
                                        <Icon name="FilePdfIcon" className="size-4 me-2" />
                                        PDF
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex flex-wrap items-center gap-3">
                            <Button asChild>
                                <a href={route('system.export.all')}>
                                    <Icon name="FolderOpenIcon" className="size-4 me-2" />
                                    {t('backup.export_all')}
                                </a>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={route('system.import.index')}>
                                    <Icon name="FileArrowUpIcon" className="size-4 me-2" />
                                    {t('nav.import')}
                                </Link>
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">{t('backup.export_all_hint')}</p>
                    </CardContent>
                </Card>

                {/* -------------------------------------------------------
                    E. Restore
                ------------------------------------------------------- */}
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-base text-red-700">{t('backup.restore_title')}</CardTitle>
                        <CardDescription>{t('backup.restore_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                            {t('backup.restore_warning')}
                        </div>

                        <form onSubmit={handleRestoreCheck} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="grid gap-1.5">
                                <Label htmlFor="restore-file">{t('backup.choose_backup')}</Label>
                                <Input
                                    id="restore-file"
                                    type="file"
                                    accept=".sqlite,application/vnd.sqlite3,application/octet-stream"
                                    onChange={(e) => restoreForm.setData('backup', e.target.files?.[0] ?? null)}
                                />
                                {restoreForm.errors.backup && (
                                    <span className="text-xs text-destructive">{restoreForm.errors.backup}</span>
                                )}
                            </div>

                            <Button type="submit" variant="destructive" disabled={restoreForm.processing}>
                                {t('backup.check_backup')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

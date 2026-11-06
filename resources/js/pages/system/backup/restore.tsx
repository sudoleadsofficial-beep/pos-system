import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Validation {
    valid: boolean;
    reason: string | null;
    tables: number;
    migrations: number;
}

interface Props {
    fileName: string;
    fileSize: number;
    validation: Validation;
    uploadedPath: string | null;
}

export default function RestoreConfirm({ fileName, fileSize, validation, uploadedPath }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data, setData, post, errors, processing, reset } = useForm({
        uploadedPath: uploadedPath ?? '',
        confirmation: false,
        // The server reports a rejected backup file under this key.
        backup: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.backup'), href: '/system/backup' },
        { title: t('backup.restore_title'), href: '#' },
    ];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        post(route('system.backup.restore'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                toast.success(t('backup.restored'));
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('backup.restore_title')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="ArrowCounterClockwiseIcon" className="size-5 text-red-700" />
                    <h1 className="text-xl font-bold text-red-700">{t('backup.restore_title')}</h1>
                </div>

                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t('backup.selected_file')}</CardTitle>
                        <CardDescription>{fileName}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <dl className="grid gap-2 text-sm sm:grid-cols-3">
                            <div>
                                <dt className="text-xs text-muted-foreground">{t('backup.file_size')}</dt>
                                <dd className="font-mono">{Math.round(fileSize / 1024)} KB</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">{t('backup.tables_found')}</dt>
                                <dd className="font-mono">{validation.tables}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">{t('backup.migrations_found')}</dt>
                                <dd className="font-mono">{validation.migrations}</dd>
                            </div>
                        </dl>

                        <Separator />

                        {validation.valid ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                                    <Icon name="CheckCircleIcon" className="size-5 shrink-0" />
                                    {t('backup.validation_ok')}
                                </div>

                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    {t('backup.restore_warning')}
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="confirmation"
                                            checked={data.confirmation}
                                            onCheckedChange={(checked) => setData('confirmation', checked)}
                                        />
                                        <Label htmlFor="confirmation">{t('backup.confirm_restore')}</Label>
                                    </div>

                                    {errors.backup && <p className="text-xs text-destructive">{errors.backup}</p>}

                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={!data.confirmation || processing}
                                        >
                                            {processing ? t('common.saving') : t('backup.restore_now')}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                            {t('common.cancel')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    <Icon name="WarningCircleIcon" className="size-5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">{t('backup.validation_failed')}</p>
                                        <p className="text-xs">{validation.reason}</p>
                                    </div>
                                </div>

                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    {t('common.back')}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface PreviewRow {
    status: 'add' | 'skip' | 'reject';
    reason: string | null;
    data: Record<string, string>;
}

interface Props {
    entity: string;
    entityLabel: string;
    rows: PreviewRow[];
    summary: { add: number; skip: number; reject: number };
    blockedColumns: string[];
    stagedFile: string;
}

export default function ImportPreview({
    entity,
    entityLabel,
    rows,
    summary,
    blockedColumns,
    stagedFile,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data, setData, post, errors, processing } = useForm({
        entity: entity,
        stagedFile: stagedFile,
        confirmation: false,
        // The server reports a rejected file under this key.
        file: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.import'), href: '/system/import' },
        { title: t('import.preview'), href: '#' },
    ];

    const columns = rows.length > 0 ? Object.keys(rows[0].data) : [];

    function statusVariant(status: PreviewRow['status']) {
        if (status === 'add') return 'default';
        if (status === 'skip') return 'secondary';

        return 'destructive';
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        post(route('system.import.store'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('import.done')),
            onError: () => toast.error(t('common.error')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('import.preview')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="FileArrowUpIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">
                        {t('import.preview')} &mdash; {entityLabel}
                    </h1>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">{t('import.will_add')}</p>
                            <p className="text-2xl font-bold text-green-700">{summary.add}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">{t('import.will_skip')}</p>
                            <p className="text-2xl font-bold text-gray-600">{summary.skip}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">{t('import.will_reject')}</p>
                            <p className="text-2xl font-bold text-red-700">{summary.reject}</p>
                        </CardContent>
                    </Card>
                </div>

                {blockedColumns.length > 0 && (
                    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        {t('import.blocked_columns', { columns: blockedColumns.join(', ') })}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('import.records')}</CardTitle>
                        <CardDescription>{t('import.records_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[28rem] overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">{t('import.status')}</TableHead>
                                        {columns.map((column) => (
                                            <TableHead key={column}>{column}</TableHead>
                                        ))}
                                        <TableHead className="w-64">{t('import.reason')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Badge variant={statusVariant(row.status)}>
                                                    {t(`import.status_${row.status}`)}
                                                </Badge>
                                            </TableCell>
                                            {columns.map((column) => (
                                                <TableCell key={column} className="text-xs">
                                                    {row.data[column]}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-xs text-muted-foreground">{row.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Separator className="my-4" />

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="confirmation"
                                    checked={data.confirmation}
                                    onCheckedChange={(checked) => setData('confirmation', checked)}
                                />
                                <Label htmlFor="confirmation">{t('import.confirm')}</Label>
                            </div>

                            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}

                            <div className="flex gap-2">
                                <Button type="submit" disabled={!data.confirmation || processing || summary.add === 0}>
                                    {processing ? t('common.saving') : t('import.import_now')}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

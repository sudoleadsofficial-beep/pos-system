import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
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

interface Entity {
    label: string;
    headers: string[];
    sample: (string | number)[][];
}

interface Props {
    entities: Record<string, Entity>;
}

export default function ImportIndex({ entities }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [entity, setEntity] = useState<string>(Object.keys(entities)[0] ?? '');

    const { data, setData, post, errors, processing } = useForm<{ entity: string; file: File | null }>({
        entity: entity,
        file: null,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.backup'), href: '/system/backup' },
        { title: t('nav.import'), href: '/system/import' },
    ];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!data.file) {
            toast.error(t('import.choose_file'));

            return;
        }

        post(route('system.import.preview'), {
            forceFormData: true,
            preserveScroll: true,
            onError: () => toast.error(t('common.error')),
        });
    }

    function changeEntity(value: string) {
        setEntity(value);
        setData('entity', value);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.import')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="FileArrowUpIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('import.title')}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('import.choose_type')}</CardTitle>
                        <CardDescription>{t('import.choose_type_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="import-entity">{t('import.record_type')}</Label>
                                <Select value={entity} onValueChange={changeEntity}>
                                    <SelectTrigger id="import-entity">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(entities).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="import-template">{t('import.sample_template')}</Label>
                                <div className="pt-1">
                                    <Button asChild variant="outline" size="sm">
                                        <a href={route('system.import.template', entity)}>
                                            <Icon name="DownloadSimpleIcon" className="size-4 me-2" />
                                            {t('import.download_template')}
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="import-file">{t('import.choose_file')}</Label>
                                <Input
                                    id="import-file"
                                    type="file"
                                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                                />
                                {errors.file && <span className="text-xs text-destructive">{errors.file}</span>}
                            </div>

                            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                {t('import.safety_note')}
                            </div>

                            <Button type="submit" disabled={processing}>
                                {processing ? t('common.loading') : t('import.check_file')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('import.rules')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                            <li>{t('import.rule_preview')}</li>
                            <li>{t('import.rule_duplicates')}</li>
                            <li>{t('import.rule_balances')}</li>
                            <li>{t('import.rule_no_pdf')}</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

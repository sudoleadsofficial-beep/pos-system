import React from 'react';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

interface SummaryRow {
    item_id: number;
    name_en: string;
    name_ur: string;
    unit: string;
    received_bags: number;
    received_weight: number;
    sold_bags: number;
    sold_weight: number;
    remaining_bags: number;
    remaining_weight: number;
    is_negative: boolean;
}

interface PurchaseRow {
    id: number;
    date: string;
    reference: string;
    farmer_code: number | null;
    farmer_name: string | null;
    mark_name: string | null;
    item_name: string | null;
    received_bags: number;
    received_weight: number;
    sold_bags: number;
    sold_weight: number;
    remaining_bags: number;
    remaining_weight: number;
    is_negative: boolean;
}

interface Props {
    summary: SummaryRow[];
    purchases: PurchaseRow[];
}

export default function InventoryIndex({ summary, purchases }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.farmer_side'), href: '/register-consignment' },
        { title: t('farmers.inventory'), href: '/farmers/inventory' },
    ];

    const negativeCount = summary.filter((row) => row.is_negative).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('farmers.inventory')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="StackIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('farmers.inventory')}</h1>
                    {negativeCount > 0 && (
                        <Badge variant="destructive">
                            {t('farmers.below_stock', { count: negativeCount })}
                        </Badge>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('farmers.inventory_summary')}</CardTitle>
                        <CardDescription>{t('farmers.inventory_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[30rem] overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('farmers.item')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.received_bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.received_weight')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.sold_bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.sold_weight')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.remaining_bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.remaining_weight')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        summary.map((row) => (
                                            <TableRow key={row.item_id}>
                                                <TableCell className="text-xs">
                                                    {isUrdu ? row.name_ur : row.name_en}
                                                    <span className="ms-2 text-[10px] text-muted-foreground">
                                                        {row.unit}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.received_bags}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.received_weight}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.sold_bags}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.sold_weight}</TableCell>
                                                <TableCell
                                                    className={`text-end font-mono text-xs font-semibold ${
                                                        row.is_negative ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {row.remaining_bags}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-end font-mono text-xs font-semibold ${
                                                        row.remaining_weight < 0 ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {row.remaining_weight}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('farmers.by_arrival')}</CardTitle>
                        <CardDescription>{t('farmers.by_arrival_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[30rem] overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('farmers.reference')}</TableHead>
                                        <TableHead>{t('farmers.farmer')}</TableHead>
                                        <TableHead>{t('farmers.item')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.received_bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.received_weight')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.sold_bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.remaining_bags')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchases.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                                                <TableCell className="text-xs">
                                                    {row.farmer_code} - {row.farmer_name}
                                                    {row.mark_name ? ` (${row.mark_name})` : ''}
                                                </TableCell>
                                                <TableCell className="text-xs">{row.item_name}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.received_bags}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.received_weight}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.sold_bags}</TableCell>
                                                <TableCell
                                                    className={`text-end font-mono text-xs font-semibold ${
                                                        row.is_negative ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {row.remaining_bags}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

import React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

interface HistoryRow {
    id: number;
    date: string;
    reference: string;
    farmer_name: string | null;
    farmer_name_ur: string | null;
    mark_name: string | null;
    item_name: string | null;
    nag: number;
    weight: number;
    rate: number;
    charges: number;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
}

interface OutstandingRow {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    opening_balance: number;
    current_balance: number;
}

interface InventoryRow {
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

interface DailyRow {
    date: string;
    entries: number;
    bags: number;
    weight: number;
    amount: number;
    paid: number;
    remaining: number;
}

interface Props {
    from: string;
    to: string;
    purchaseHistory: HistoryRow[];
    outstanding: OutstandingRow[];
    inventory: InventoryRow[];
    dailySummary: DailyRow[];
}

export default function FarmerReportsIndex({
    from,
    to,
    purchaseHistory,
    outstanding,
    inventory,
    dailySummary,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data, setData, get } = useForm({ from, to });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.farmer_side'), href: '/register-consignment' },
        { title: t('farmers.reports'), href: '/farmers/reports' },
    ];

    function applyFilter(e: React.FormEvent) {
        e.preventDefault();
        router.get(
            route('farmers.reports'),
            { from: data.from, to: data.to },
            { preserveState: true, preserveScroll: true }
        );
    }

    const totals = dailySummary.reduce(
        (acc, row) => ({
            bags: acc.bags + row.bags,
            weight: acc.weight + row.weight,
            amount: acc.amount + row.amount,
            paid: acc.paid + row.paid,
            remaining: acc.remaining + row.remaining,
        }),
        { bags: 0, weight: 0, amount: 0, paid: 0, remaining: 0 }
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('farmers.reports')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="ChartBarIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('farmers.reports')}</h1>
                </div>

                <Card>
                    <CardContent>
                        <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="from">{t('common.from')}</Label>
                                <Input
                                    id="from"
                                    type="date"
                                    value={data.from}
                                    onChange={(e) => setData('from', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="to">{t('common.to')}</Label>
                                <Input id="to" type="date" value={data.to} onChange={(e) => setData('to', e.target.value)} />
                            </div>
                            <Button type="submit" variant="outline">
                                {t('common.filter')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Daily purchase summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('farmers.daily_summary')}</CardTitle>
                        <CardDescription>{t('farmers.daily_summary_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                            <div className="rounded border bg-muted/40 p-2">
                                <div className="text-[11px] uppercase text-muted-foreground">{t('farmers.total_bags')}</div>
                                <div className="font-mono text-lg font-semibold">{totals.bags}</div>
                            </div>
                            <div className="rounded border bg-muted/40 p-2">
                                <div className="text-[11px] uppercase text-muted-foreground">
                                    {t('farmers.total_weight')}
                                </div>
                                <div className="font-mono text-lg font-semibold">
                                    {totals.weight.toLocaleString()}
                                </div>
                            </div>
                            <div className="rounded border bg-muted/40 p-2">
                                <div className="text-[11px] uppercase text-muted-foreground">{t('farmers.total_amount')}</div>
                                <div className="font-mono text-lg font-semibold">{totals.amount.toLocaleString()}</div>
                            </div>
                            <div className="rounded border bg-muted/40 p-2">
                                <div className="text-[11px] uppercase text-muted-foreground">{t('farmers.total_paid')}</div>
                                <div className="font-mono text-lg font-semibold">{totals.paid.toLocaleString()}</div>
                            </div>
                            <div className="rounded border bg-muted/40 p-2">
                                <div className="text-[11px] uppercase text-muted-foreground">
                                    {t('farmers.total_remaining')}
                                </div>
                                <div className="font-mono text-lg font-semibold text-red-700">
                                    {totals.remaining.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.entries')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.total_bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.total_weight')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.total_amount')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.total_paid')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.total_remaining')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dailySummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dailySummary.map((row) => (
                                            <TableRow key={row.date}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.entries}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.bags}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.weight}</TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {row.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.paid.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold text-red-700">
                                                    {row.remaining.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Farmer outstanding balances */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('farmers.outstanding')}</CardTitle>
                        <CardDescription>{t('farmers.outstanding_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-72 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('farmers.farmer')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.opening_balance')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.current_balance')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outstanding.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        outstanding.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="text-xs">
                                                    {row.code} - {isUrdu ? row.name_ur : row.name_en}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.opening_balance.toLocaleString()}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-end font-mono text-xs font-semibold ${
                                                        row.current_balance > 0 ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {row.current_balance.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Farmer purchase history */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('farmers.purchase_history')}</CardTitle>
                        <CardDescription>{t('farmers.purchase_history_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('farmers.reference')}</TableHead>
                                        <TableHead>{t('farmers.farmer')}</TableHead>
                                        <TableHead>{t('farmers.item')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.weight')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.purchase_rate')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.amount')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.paid_amount')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.remaining')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchaseHistory.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                                                <TableCell className="text-xs">
                                                    {isUrdu ? row.farmer_name_ur : row.farmer_name}
                                                    {row.mark_name ? ` (${row.mark_name})` : ''}
                                                </TableCell>
                                                <TableCell className="text-xs">{row.item_name}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.nag}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">{row.weight}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.rate.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {row.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.paid_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold text-red-700">
                                                    {row.remaining_amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Inventory summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('farmers.inventory_summary')}</CardTitle>
                        <CardDescription>{t('farmers.inventory_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-72 overflow-auto rounded border">
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
                                    {inventory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        inventory.map((row) => (
                                            <TableRow key={row.item_id}>
                                                <TableCell className="text-xs">
                                                    {isUrdu ? row.name_ur : row.name_en}
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
            </div>
        </AppLayout>
    );
}

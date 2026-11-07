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

interface DailyRow {
    date: string;
    entries: number;
    subtotal: number;
    charges: number;
    amount: number;
    paid: number;
    remaining: number;
}

interface HistoryRow {
    id: number;
    date: string;
    reference: string;
    supplier_id: number;
    supplier_code: number | null;
    supplier_name: string | null;
    supplier_name_ur: string | null;
    items: string;
    charges: number;
    total_amount: number;
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

interface PaymentRow {
    date: string;
    supplier_id: number;
    supplier_code: number | null;
    supplier_name: string | null;
    supplier_name_ur: string | null;
    amount: number;
    payment_method: string;
    reference: string | null;
    note: string | null;
    source: string;
}

interface Totals {
    purchases: number;
    purchase_total: number;
    charges_total: number;
    paid_on_purchase: number;
    paid_later: number;
    paid_total: number;
    remaining_total: number;
}

interface Props {
    from: string;
    to: string;
    dailySummary: DailyRow[];
    purchaseHistory: HistoryRow[];
    outstanding: OutstandingRow[];
    paymentHistory: PaymentRow[];
    totals: Totals;
}

export default function SupplierReportsIndex({
    from,
    to,
    dailySummary,
    purchaseHistory,
    outstanding,
    paymentHistory,
    totals,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data, setData, get } = useForm({ from, to });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.supplier_side'), href: '/supplier-purchases' },
        { title: t('suppliers.reports'), href: '/supplier-reports' },
    ];

    function applyFilter(e: React.FormEvent) {
        e.preventDefault();
        router.get(
            route('suppliers.reports'),
            { from: data.from, to: data.to },
            { preserveState: true, preserveScroll: true }
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('suppliers.reports')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="ChartBarIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('suppliers.reports')}</h1>
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
                                <Input
                                    id="to"
                                    type="date"
                                    value={data.to}
                                    onChange={(e) => setData('to', e.target.value)}
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                {t('common.filter')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.total_purchases')}
                        </div>
                        <div className="font-mono text-lg font-semibold">{totals.purchases}</div>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.total_amount')}
                        </div>
                        <div className="font-mono text-lg font-semibold">
                            {totals.purchase_total.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.total_charges')}
                        </div>
                        <div className="font-mono text-lg font-semibold">
                            {totals.charges_total.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.paid_on_purchase')}
                        </div>
                        <div className="font-mono text-lg font-semibold">
                            {totals.paid_on_purchase.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.paid_later')}
                        </div>
                        <div className="font-mono text-lg font-semibold">
                            {totals.paid_later.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.total_paid')}
                        </div>
                        <div className="font-mono text-lg font-semibold">
                            {totals.paid_total.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border bg-muted/40 p-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                            {t('suppliers.total_remaining')}
                        </div>
                        <div className="font-mono text-lg font-semibold text-red-700">
                            {totals.remaining_total.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Daily purchase summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('suppliers.daily_summary')}</CardTitle>
                        <CardDescription>{t('suppliers.daily_summary_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-72 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.entries')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.total_amount')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.total_charges')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.paid_on_purchase')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.total_remaining')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dailySummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dailySummary.map((row) => (
                                            <TableRow key={row.date}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.entries}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {row.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {row.charges.toLocaleString()}
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

                {/* Supplier outstanding balances */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('suppliers.outstanding')}</CardTitle>
                        <CardDescription>{t('suppliers.outstanding_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-72 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('suppliers.supplier')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.opening_balance')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.current_balance')}</TableHead>
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

                {/* Supplier-wise purchase history */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('suppliers.purchase_history')}</CardTitle>
                        <CardDescription>{t('suppliers.purchase_history_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('suppliers.reference')}</TableHead>
                                        <TableHead>{t('suppliers.supplier')}</TableHead>
                                        <TableHead>{t('suppliers.lines')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.total_amount')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.paid_now')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.remaining')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchaseHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchaseHistory.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                                                <TableCell className="text-xs">
                                                    {row.supplier_code} -{' '}
                                                    {isUrdu ? row.supplier_name_ur : row.supplier_name}
                                                </TableCell>
                                                <TableCell className="text-xs">{row.items}</TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {row.total_amount.toLocaleString()}
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

                {/* Payment history */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('suppliers.payment_history')}</CardTitle>
                        <CardDescription>{t('suppliers.payment_history_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-96 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('suppliers.supplier')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.amount')}</TableHead>
                                        <TableHead>{t('suppliers.payment_method')}</TableHead>
                                        <TableHead>{t('suppliers.reference')}</TableHead>
                                        <TableHead>{t('suppliers.source')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paymentHistory.map((row, index) => (
                                            <TableRow key={`${row.source}-${index}`}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="text-xs">
                                                    {row.supplier_code} -{' '}
                                                    {isUrdu ? row.supplier_name_ur : row.supplier_name}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {row.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {t(
                                                        `suppliers.methods.${row.payment_method}`,
                                                        row.payment_method
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {row.reference ?? '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {t(
                                                        `suppliers.sources.${row.source}`,
                                                        row.source
                                                    )}
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

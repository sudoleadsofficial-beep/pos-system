import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import PrintLetterhead from '@/components/app/print-letterhead';

interface Props {
    filters: {
        preset: string;
        from: string;
        to: string;
    };
    arrivalsStats: {
        count: number;
        total_nag: number;
        total_weight: number;
        total_amount: number;
        unsettled_count: number;
    };
    salesStats: {
        count: number;
        total_nag: number;
        total_amount: number;
    };
    collectionsStats: {
        naqdi: number;
        wasooli: number;
        total: number;
    };
    cashStats: {
        opening_balance: number;
        total_inflow: number;
        total_outflow: number;
        closing_balance: number;
    };
    supplierStats: {
        count: number;
        total_amount: number;
    };
    entityCounts: {
        farmers: number;
        merchants: number;
        suppliers: number;
        commission_agents: number;
    };
}

export default function ReportsDashboardIndex({
    filters,
    arrivalsStats,
    salesStats,
    collectionsStats,
    cashStats,
    supplierStats,
    entityCounts,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [preset, setPreset] = useState(filters.preset);
    const [fromDate, setFromDate] = useState(filters.from);
    const [toDate, setToDate] = useState(filters.to);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard', 'Dashboard'), href: '/dashboard' },
        { title: t('nav.reports', 'Reports'), href: '/reports' },
    ];

    const handlePresetChange = (newPreset: string) => {
        setPreset(newPreset);
        router.get(route('reports.index'), { preset: newPreset }, { preserveState: true, preserveScroll: true });
    };

    const handleCustomFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('reports.index'),
            { preset: 'custom', from: fromDate, to: toDate },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handlePrintSummary = () => {
        window.print();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('reports.title', 'Mandi Reports & Analytics')} />

            <div className="space-y-6 p-4 sm:p-6" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Print Letterhead for printed page only */}
                <div className="hidden print:block">
                    <PrintLetterhead
                        title="Sabzi Mandi Performance & Financial Summary"
                        titleUrdu="سبزی منڈی مجموعی رپورٹ و کارکردگی جائزہ"
                        from_date={filters.from}
                        to_date={filters.to}
                    />
                </div>

                {/* Header & Overall Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <h1 className="text-xl font-bold text-emerald-950 dark:text-emerald-400 flex items-center gap-2">
                            <Icon name="PrinterIcon" className="size-6 text-emerald-700" />
                            {isUrdu ? 'مرکزی رپورٹس و حسابات' : 'Mandi Reports & Accounting Dashboard'}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isUrdu
                                ? 'سبزی منڈی کے تمام شعبہ جات: زمیندار، بیوپاری، سپلائر، کمیشن ایجنٹ، اسٹاک اور روکڑ بہی'
                                : 'Comprehensive mandi reports across all party khatas, inventory, sales, arrivals and cash book.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePrintSummary}
                            className="h-8 gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                        >
                            <Icon name="PrinterIcon" className="size-3.5 text-emerald-700" />
                            {isUrdu ? 'رپورٹ پرنٹ کریں' : 'Print Summary'}
                        </Button>
                    </div>
                </div>

                {/* Date Filter & Presets Bar */}
                <Card className="border border-border/60 bg-card shadow-sm print:hidden">
                    <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                        {/* Preset buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'today', labelEn: 'Today', labelUr: 'آج' },
                                { id: 'yesterday', labelEn: 'Yesterday', labelUr: 'گزشتہ کل' },
                                { id: 'this_week', labelEn: 'This Week', labelUr: 'یہ ہفتہ' },
                                { id: 'this_month', labelEn: 'This Month', labelUr: 'یہ مہینہ' },
                            ].map((btn) => (
                                <Button
                                    key={btn.id}
                                    type="button"
                                    size="sm"
                                    variant={preset === btn.id ? 'default' : 'outline'}
                                    className={`h-7 text-xs px-2.5 ${
                                        preset === btn.id
                                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={() => handlePresetChange(btn.id)}
                                >
                                    {isUrdu ? btn.labelUr : btn.labelEn}
                                </Button>
                            ))}
                        </div>

                        {/* Custom Date Inputs */}
                        <form onSubmit={handleCustomFilter} className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="from_date" className="text-xs text-muted-foreground">
                                    {isUrdu ? 'از تاریخ' : 'From'}:
                                </Label>
                                <Input
                                    id="from_date"
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => {
                                        setFromDate(e.target.value);
                                        setPreset('custom');
                                    }}
                                    className="h-7 text-xs w-32 font-mono"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Label htmlFor="to_date" className="text-xs text-muted-foreground">
                                    {isUrdu ? 'تا تاریخ' : 'To'}:
                                </Label>
                                <Input
                                    id="to_date"
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => {
                                        setToDate(e.target.value);
                                        setPreset('custom');
                                    }}
                                    className="h-7 text-xs w-32 font-mono"
                                />
                            </div>
                            <Button type="submit" size="sm" variant="outline" className="h-7 text-xs gap-1">
                                <Icon name="FunnelIcon" className="size-3" />
                                {t('common.filter', 'Filter')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Key Mandi Performance Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Arrivals KPI */}
                    <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
                        <CardHeader className="p-3.5 pb-1">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold text-emerald-900">
                                    {isUrdu ? 'کل مال آمد (زمیندار)' : "Arrivals / Consignments"}
                                </CardTitle>
                                <Icon name="TruckIcon" className="size-4 text-emerald-700" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-emerald-950">
                                {arrivalsStats.total_nag.toLocaleString()} <span className="text-xs font-normal text-emerald-800">{isUrdu ? 'نگ' : 'nag'}</span>
                            </div>
                            <p className="text-[11px] text-emerald-800 mt-1 font-mono">
                                Rs. {arrivalsStats.total_amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                {arrivalsStats.total_weight > 0 && ` • ${arrivalsStats.total_weight.toLocaleString()} kg`}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Sales KPI */}
                    <Card className="border-border/60 bg-card shadow-sm">
                        <CardHeader className="p-3.5 pb-1">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold text-foreground">
                                    {isUrdu ? 'کل فروخت (امروزہ)' : "Total Amroza Sales"}
                                </CardTitle>
                                <Icon name="TagIcon" className="size-4 text-emerald-700" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-foreground">
                                Rs. {salesStats.total_amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                                {salesStats.total_nag.toLocaleString()} {isUrdu ? 'نگ فروخت ہوئے' : 'nag sold'} ({salesStats.count} {isUrdu ? 'اندراج' : 'sales'})
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cash Collections (Naqdi + Wasooli) */}
                    <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
                        <CardHeader className="p-3.5 pb-1">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold text-emerald-900">
                                    {isUrdu ? 'کل وصولی (نقدی + وصولی)' : 'Cash Collected (Naqdi + Wasooli)'}
                                </CardTitle>
                                <Icon name="HandCoinsIcon" className="size-4 text-emerald-700" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-emerald-950">
                                Rs. {collectionsStats.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                            </div>
                            <p className="text-[11px] text-emerald-800 mt-1 font-mono">
                                {isUrdu ? 'نقدی' : 'Naqdi'}: Rs. {collectionsStats.naqdi.toLocaleString()} • {isUrdu ? 'وصولی' : 'Recovery'}: Rs. {collectionsStats.wasooli.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Net Cash Balance */}
                    <Card className="border-border/60 bg-card shadow-sm">
                        <CardHeader className="p-3.5 pb-1">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-semibold text-foreground">
                                    {isUrdu ? 'روکڑ دراز باقی (Net Cash)' : 'Net Cash Position'}
                                </CardTitle>
                                <Icon name="BookBookmarkIcon" className="size-4 text-emerald-700" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-foreground">
                                Rs. {cashStats.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                                +Rs. {cashStats.total_inflow.toLocaleString()} / -Rs. {cashStats.total_outflow.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 6 ORGANIZED REPORT SECTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Farmer Reports */}
                    <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-4 pb-2 border-b bg-emerald-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                                            <Icon name="UserCircleIcon" className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">
                                                {isUrdu ? 'زمیندار رپورٹس' : '1. Farmer Reports'}
                                            </CardTitle>
                                            <CardDescription className="text-[11px]">
                                                {isUrdu ? 'مال آمد، کھاتہ و بیجک حساب' : 'Consignment arrivals, ledgers and Bijak'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-800">
                                        {entityCounts.farmers} {isUrdu ? 'زمیندار' : 'Farmers'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'مال آمد رجسٹر' : 'Farmer Arrivals Register'}</span>
                                    <Link href="/farmers/reports" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'زمیندار کھاتہ (لیجر)' : 'Farmer Ledgers & Khata'}</span>
                                    <Link href="/parties?type=farmer" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground">{isUrdu ? 'فصل بیجک / تصفیہ' : 'Bijak / Consignment Settlement'}</span>
                                    <Link href="/farmers/settlements" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} ({arrivalsStats.unsettled_count} {isUrdu ? 'غیر حتمی' : 'pending'}) →
                                    </Link>
                                </div>
                            </CardContent>
                        </div>
                        <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                            <Link href="/farmers/reports">
                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                    {isUrdu ? 'مکمل رپورٹ کھولیں' : 'Open Farmer Reports'}
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* 2. Merchant Reports */}
                    <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-muted text-foreground">
                                            <Icon name="UsersIcon" className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">
                                                {isUrdu ? 'بیوپاری رپورٹس' : '2. Merchant Reports'}
                                            </CardTitle>
                                            <CardDescription className="text-[11px]">
                                                {isUrdu ? 'امروزہ فروخت، وصولی و باقیات' : 'Sales, collections and balance sheets'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {entityCounts.merchants} {isUrdu ? 'بیوپاری' : 'Merchants'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'امروزہ بیوپاری رپورٹ' : 'Merchant Amroza (Daily Sales)'}</span>
                                    <Link href="/merchant-amroza" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'وصولی بیوپاری رپورٹ' : 'Merchant Wasooli (Recovery)'}</span>
                                    <Link href="/merchant-wasooli" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground">{isUrdu ? 'امروزہ و وصولی بیلنس شیٹ' : 'Daily Amroza-Wasooli Sheet'}</span>
                                    <Link href="/amroza-wasooli" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                            </CardContent>
                        </div>
                        <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                            <Link href="/amroza-wasooli">
                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                    {isUrdu ? 'بیلنس شیٹ کھولیں' : 'Daily Balance Sheet'}
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* 3. Supplier Reports */}
                    <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-muted text-foreground">
                                            <Icon name="HandshakeIcon" className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">
                                                {isUrdu ? 'سپلائر رپورٹس' : '3. Supplier Reports'}
                                            </CardTitle>
                                            <CardDescription className="text-[11px]">
                                                {isUrdu ? 'باردانہ، کرایہ و اخراجات کی خریداری' : 'Materials, bardana and services'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {entityCounts.suppliers} {isUrdu ? 'سپلائر' : 'Suppliers'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'سپلائر خریداری رجسٹر' : 'Supplier Purchases Register'}</span>
                                    <Link href="/supplier-purchases" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'سپلائر کھاتہ (لیجر)' : 'Supplier Ledgers'}</span>
                                    <Link href="/supplier-reports" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground">{isUrdu ? 'اخراجات کے زمرہ جات' : 'Category / Materials Breakdown'}</span>
                                    <Link href="/supplier-reports" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                            </CardContent>
                        </div>
                        <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                            <Link href="/supplier-reports">
                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                    {isUrdu ? 'سپلائر رپورٹس کھولیں' : 'Supplier Reports'}
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* 4. Commission Agent Reports */}
                    <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-4 pb-2 border-b bg-emerald-50/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                                            <Icon name="ScalesIcon" className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">
                                                {isUrdu ? 'کمیشن ایجنٹ رپورٹس' : '4. Commission Reports'}
                                            </CardTitle>
                                            <CardDescription className="text-[11px]">
                                                {isUrdu ? 'کمیشن کمائی، ادائیگیاں و واجبات' : 'Commissions earned, payments & balances'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-800">
                                        {entityCounts.commission_agents} {isUrdu ? 'ایجنٹ' : 'Agents'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'کمیشن رجسٹر' : 'Commission Register & History'}</span>
                                    <Link href="/commission-reports" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'ایجنٹ واجب الادا باقیات' : 'Outstanding Balances'}</span>
                                    <Link href="/commission-reports" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground">{isUrdu ? 'روزانہ کمیشن و ادائیگی خلاصہ' : 'Daily Summary & History'}</span>
                                    <Link href="/commission-reports" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                            </CardContent>
                        </div>
                        <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                            <Link href="/commission-reports">
                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                    {isUrdu ? 'کمیشن رپورٹ کھولیں' : 'Commission Reports'}
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* 5. Inventory Reports */}
                    <Card className="border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-muted text-foreground">
                                            <Icon name="PackageIcon" className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-foreground">
                                                {isUrdu ? 'اسٹاک و مال انوینٹری' : '5. Inventory Reports'}
                                            </CardTitle>
                                            <CardDescription className="text-[11px]">
                                                {isUrdu ? 'سبزی منڈی موجودہ مال، نگ اور وزن' : 'Live stock by item, bags and weight'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono">
                                        {isUrdu ? 'ریئل ٹائم' : 'Live Stock'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'موجودہ جنس وار اسٹاک' : 'Live Stock by Vegetable Item'}</span>
                                    <Link href="/farmers/inventory" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'کل نگ (بوریاں) و وزن' : 'Bags (Nag) and Weight Balances'}</span>
                                    <Link href="/farmers/inventory" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground">{isUrdu ? 'آمد و فروخت گردش' : 'Arrival In / Sale Out Turnover'}</span>
                                    <Link href="/farmers/inventory" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                            </CardContent>
                        </div>
                        <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                            <Link href="/farmers/inventory">
                                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                    {isUrdu ? 'انوینٹری شیٹ کھولیں' : 'Inventory Sheet'}
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* 6. Financial & Cash Book Reports */}
                    <Card className="border border-emerald-200 bg-emerald-50/20 shadow-sm flex flex-col justify-between">
                        <div>
                            <CardHeader className="p-4 pb-2 border-b bg-emerald-100/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-emerald-700 text-white">
                                            <Icon name="BookBookmarkIcon" className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-emerald-950">
                                                {isUrdu ? 'مالیاتی و روکڑ بہی' : '6. Cash Book & General Ledger'}
                                            </CardTitle>
                                            <CardDescription className="text-[11px] text-emerald-800">
                                                {isUrdu ? 'روزنامچہ روکڑ، روزانہ آمد و خرچ' : 'Daily Rokad, inflows, outflows & balances'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge className="text-[10px] bg-emerald-700 text-white hover:bg-emerald-800">
                                        {isUrdu ? 'نقدی روکڑ' : 'Cash Only'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'روزانہ روکڑ بہی (روزنامچہ)' : 'Daily Cash Book (روکڑ)'}</span>
                                    <Link href="/cash-book" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1 border-b border-border/40">
                                    <span className="text-muted-foreground">{isUrdu ? 'جنرل لیجر (کھاتہ جات)' : 'General Ledger & Trial Balance'}</span>
                                    <Link href="/general-ledger" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground">{isUrdu ? 'دکان کے اخراجات' : 'Shop Expenses Breakdown'}</span>
                                    <Link href="/cash-book" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                                        {isUrdu ? 'دیکھیں' : 'View'} →
                                    </Link>
                                </div>
                            </CardContent>
                        </div>
                        <div className="p-3 bg-muted/20 border-t flex justify-end gap-2">
                            <Link href="/cash-book">
                                <Button size="sm" className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
                                    {isUrdu ? 'روکڑ بہی کھولیں' : 'Open Cash Book'}
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

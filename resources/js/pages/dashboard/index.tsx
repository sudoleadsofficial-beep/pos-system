import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { WarningIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface DashboardStatsData {
    todaysSale: number;
    saleChangePct: number;
    cashSale: number;
    creditSale: number;
    cashReceived: number;
    cashPct: number;
    received: number;
    recoveryMerchantsCount: number;
    merchantsBalance: number;
    farmersBalance: number;
    cashInHand: number;
    expectedCash: number;
    cashDiff: number;
    billsToday: number;
    totalNagSold: number;
    weekChange: number;
}

interface ChartDay {
    day: string;
    val: number;
    amount: number;
    isToday: boolean;
    heightPct: number;
}

interface ChartSummary {
    total: number;
    average: number;
    bestDay: string;
}

interface TopMerchant {
    name: string;
    code: string;
    balance: number;
}

interface AlertItem {
    title: string;
    subtitle: string;
    type: string;
}

interface RecentEntry {
    time: string;
    type: string;
    isCash: boolean;
    party: string;
    item: string;
    nag: number | string;
    amount: number;
}

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';
    const pageProps = usePage().props as any;

    const stats: DashboardStatsData = pageProps.stats || {
        todaysSale: 412500,
        saleChangePct: 12.4,
        cashSale: 268000,
        creditSale: 144500,
        cashReceived: 268000,
        cashPct: 65,
        received: 96400,
        recoveryMerchantsCount: 11,
        merchantsBalance: 263346,
        farmersBalance: 282491,
        cashInHand: 364400,
        expectedCash: 364400,
        cashDiff: 0,
        billsToday: 38,
        totalNagSold: 1240,
        weekChange: 48100,
    };

    const chartData: ChartDay[] = pageProps.chartData || [
        { day: 'Mon', val: 286, amount: 286000, isToday: false, heightPct: 64 },
        { day: 'Tue', val: 301, amount: 301000, isToday: false, heightPct: 68 },
        { day: 'Wed', val: 264, amount: 264000, isToday: false, heightPct: 59 },
        { day: 'Thu', val: 335, amount: 335000, isToday: false, heightPct: 75 },
        { day: 'Fri', val: 398, amount: 398000, isToday: false, heightPct: 89 },
        { day: 'Sat', val: 188, amount: 188000, isToday: false, heightPct: 42 },
        { day: 'Sun', val: 412, amount: 412500, isToday: true, heightPct: 92 },
    ];

    const chartSummary: ChartSummary = pageProps.chartSummary || {
        total: 2184000,
        average: 312000,
        bestDay: 'Friday',
    };

    const topMerchants: TopMerchant[] = pageProps.topMerchants || [
        { name: 'Haji Gul', code: 'Code 7', balance: 89290 },
        { name: 'Baloch Trading Co', code: 'Code 3', balance: 82944 },
        { name: 'Haji Gul Merchant', code: 'Code 2', balance: 44036 },
        { name: 'Muhammad Raza & Sons', code: 'Code 4', balance: 22676 },
        { name: 'Naqdi (Cash Customer)', code: 'Code 1', balance: 16860 },
    ];

    const alerts: AlertItem[] = pageProps.alerts || [
        { title: "Haji Gulâ€™s balance is over Rs. 85,000", subtitle: "No payment in 14 days", type: "warn" },
        { title: "3 farmer bills not yet created", subtitle: "Bijak received today", type: "warn" },
        { title: "Yesterdayâ€™s day is not closed", subtitle: "Close it to lock the entries", type: "warn" },
    ];

    const recentSales: RecentEntry[] = pageProps.recentSales || [
        { time: '11:42 PM', type: 'Sale', isCash: true, party: 'Baloch Trading Co', item: 'Aloo (Potato)', nag: 40, amount: 62000 },
        { time: '11:20 PM', type: 'Recovery', isCash: false, party: 'Haji Gul', item: 'â€”', nag: 'â€”', amount: 25000 },
        { time: '10:58 PM', type: 'Cash sale', isCash: true, party: 'Naqdi (Cash Customer)', item: 'Piyaz (Onion)', nag: 12, amount: 18400 },
        { time: '10:31 PM', type: 'Farmer bill', isCash: false, party: 'Ghulam Nabi', item: 'Tamatar (Tomato)', nag: 60, amount: 0 },
        { time: '10:05 PM', type: 'Sale', isCash: true, party: 'Karachi Fresh Store', item: 'Lehsan (Garlic)', nag: 8, amount: 31200 },
    ];

    const activeRange = (pageProps.range || pageProps.activeRange || 'today') as 'today' | 'yesterday' | 'week' | 'month';
    const [range, setRange] = useState<'today' | 'yesterday' | 'week' | 'month'>(activeRange);

    useEffect(() => {
        if (pageProps.range || pageProps.activeRange) {
            setRange((pageProps.range || pageProps.activeRange) as any);
        }
    }, [pageProps.range, pageProps.activeRange]);

    // Format current date
    const formattedDate = new Intl.DateTimeFormat(isUrdu ? 'ur-PK' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: isUrdu ? 'ÚˆÛŒØ´ Ø¨ÙˆØ±Úˆ' : 'Dashboard',
            href: '/dashboard',
        },
    ];

    const handleRangeChange = (r: 'today' | 'yesterday' | 'week' | 'month', label: string) => {
        setRange(r);
        router.get('/dashboard', { range: r }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onSuccess: () => {
                toast.success(isUrdu ? `${label} Ú©Ø§ ÚˆÛŒÙ¹Ø§ Ù„ÙˆÚˆ ÛÙˆ Ú¯ÛŒØ§ ÛÛ’` : `Loaded data for ${label}`);
            },
        });
    };

    const formatRupees = (amount: number) => {
        return `Rs. ${Number(amount).toLocaleString('en-US')}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'ÚˆÛŒØ´ Ø¨ÙˆØ±Úˆ - Ø¬Û’ Ú©Û’ Ø³ÛŒ' : 'Dashboard'} />

            <div className="w-full max-w-[1400px] mx-auto space-y-4 pb-12 font-sans text-[#1a211c] dark:text-[#e7ece8]">
                {/* Title & Range Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
                    <div>
                        <h1 className={`text-[22px] font-bold tracking-tight text-[#1a211c] dark:text-[#e7ece8] ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                            {isUrdu ? 'ÚˆÛŒØ´ Ø¨ÙˆØ±Úˆ' : 'Dashboard'}
                        </h1>
                        <p className={`text-xs text-[#68736b] dark:text-[#8b968e] mt-0.5 ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {formattedDate}
                        </p>
                    </div>

                    <div className="inline-flex items-center p-0.5 border border-[#e6e9e6] dark:border-[#262d28] rounded-lg bg-white dark:bg-[#161b18] shadow-2xs self-start sm:self-auto">
                        <button
                            onClick={() => handleRangeChange('today', isUrdu ? 'Ø¢Ø¬' : 'Today')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                range === 'today'
                                    ? 'bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80]'
                                    : 'text-[#68736b] dark:text-[#8b968e] hover:text-[#1a211c] dark:hover:text-[#e7ece8]'
                            } ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'Ø¢Ø¬' : 'Today'}
                        </button>
                        <button
                            onClick={() => handleRangeChange('yesterday', isUrdu ? 'Ú©Ù„' : 'Yesterday')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                range === 'yesterday'
                                    ? 'bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80]'
                                    : 'text-[#68736b] dark:text-[#8b968e] hover:text-[#1a211c] dark:hover:text-[#e7ece8]'
                            } ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'Ú©Ù„' : 'Yesterday'}
                        </button>
                        <button
                            onClick={() => handleRangeChange('week', isUrdu ? 'ÛÙØªÛ' : 'This week')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                range === 'week'
                                    ? 'bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80]'
                                    : 'text-[#68736b] dark:text-[#8b968e] hover:text-[#1a211c] dark:hover:text-[#e7ece8]'
                            } ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'ÛÙØªÛ' : 'This week'}
                        </button>
                        <button
                            onClick={() => handleRangeChange('month', isUrdu ? 'Ù…ÛÛŒÙ†Û' : 'This month')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                range === 'month'
                                    ? 'bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80]'
                                    : 'text-[#68736b] dark:text-[#8b968e] hover:text-[#1a211c] dark:hover:text-[#e7ece8]'
                            } ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'Ù…ÛÛŒÙ†Û' : 'This month'}
                        </button>
                    </div>
                </div>

                {/* Section 1: KPIs Row (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* KPI 1: Sale */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs">
                        <span className={`text-[12.5px] font-medium text-[#68736b] dark:text-[#8b968e] block ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? (pageProps.rangeLabels?.saleTitleUr || 'Ø³ÛŒÙ„') : (pageProps.rangeLabels?.saleTitle || 'Todayâ€™s sale')}
                        </span>
                        <strong className="block text-[26px] font-bold text-[#1a211c] dark:text-[#e7ece8] tracking-tight my-1.5 tabular-nums">
                            {formatRupees(stats.todaysSale)}
                        </strong>
                        <small className="text-xs text-[#68736b] dark:text-[#8b968e] block">
                            <b className="text-[#166534] dark:text-[#4ade80] font-semibold">
                                {stats.saleChangePct >= 0 ? `+${stats.saleChangePct}%` : `${stats.saleChangePct}%`}
                            </b>{' '}
                            {isUrdu ? (pageProps.rangeLabels?.compTextUr || 'Ù¾Ú†Ú¾Ù„Û’ Ø¯ÙˆØ±Ø§Ù†ÛŒÛ Ú©Û’ Ù…Ù‚Ø§Ø¨Ù„Û’') : (pageProps.rangeLabels?.compText || 'vs yesterday')}
                        </small>
                    </div>

                    {/* KPI 2: Cash Received */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs">
                        <span className={`text-[12.5px] font-medium text-[#68736b] dark:text-[#8b968e] block ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'Ù†Ù‚Ø¯ ÙˆØµÙˆÙ„' : 'Cash received'}
                        </span>
                        <strong className="block text-[26px] font-bold text-[#1a211c] dark:text-[#e7ece8] tracking-tight my-1.5 tabular-nums">
                            {formatRupees(stats.cashReceived)}
                        </strong>
                        <small className="text-xs text-[#68736b] dark:text-[#8b968e] block">
                            {stats.cashPct}% {isUrdu ? (pageProps.rangeLabels?.cashReceivedSubUr || 'Ú©Ù„ Ø³ÛŒÙ„ Ú©Ø§') : (pageProps.rangeLabels?.cashReceivedSub || 'of todayâ€™s sale')}
                        </small>
                    </div>

                    {/* KPI 3: Recovery */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs">
                        <span className={`text-[12.5px] font-medium text-[#68736b] dark:text-[#8b968e] block ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? (pageProps.rangeLabels?.recoveryTitleUr || 'ÙˆØµÙˆÙ„ÛŒ') : (pageProps.rangeLabels?.recoveryTitle || 'Recovery today')}
                        </span>
                        <strong className="block text-[26px] font-bold text-[#1a211c] dark:text-[#e7ece8] tracking-tight my-1.5 tabular-nums">
                            {formatRupees(stats.received)}
                        </strong>
                        <small className="text-xs text-[#68736b] dark:text-[#8b968e] block">
                            {isUrdu ? `${stats.recoveryMerchantsCount} Ù…Ø±Ú†Ù†Ù¹Ø³ Ø³Û’` : `From ${stats.recoveryMerchantsCount} merchants`}
                        </small>
                    </div>

                    {/* KPI 4: Total Outstanding */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs">
                        <span className={`text-[12.5px] font-medium text-[#68736b] dark:text-[#8b968e] block ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'Ú©Ù„ Ø¨Ù‚Ø§ÛŒØ§' : 'Total outstanding'}
                        </span>
                        <strong className="block text-[26px] font-bold text-[#1a211c] dark:text-[#e7ece8] tracking-tight my-1.5 tabular-nums">
                            {formatRupees(stats.merchantsBalance)}
                        </strong>
                        <small className="text-xs text-[#68736b] dark:text-[#8b968e] block">
                            <b className="text-[#b42318] dark:text-[#f97066] font-semibold">
                                +Rs. {Number(stats.weekChange).toLocaleString()}
                            </b>{' '}
                            {isUrdu ? 'Ø³Ø³Ù¹Ù… Ø¨Ù‚Ø§ÛŒØ§ Ø¬Ø§Øª' : 'active parties'}
                        </small>
                    </div>
                </div>

                {/* Section 2: Middle Grid (2fr : 1fr) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                    {/* Left 2 Cols: Sales Last 7 Days Custom Bar Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className={`text-sm font-bold text-[#1a211c] dark:text-[#e7ece8] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                    {isUrdu ? 'Ù¾Ú†Ú¾Ù„Û’ 7 Ø¯Ù† Ú©ÛŒ Ø³ÛŒÙ„' : 'Sales, last 7 days'}
                                </h2>
                                <Link
                                    href="/reports"
                                    className="text-xs font-semibold text-[#68736b] hover:text-[#166534] dark:hover:text-[#4ade80] transition-colors"
                                >
                                    {isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹ Ø¯ÛŒÚ©Ú¾ÛŒÚº' : 'View report'}
                                </Link>
                            </div>

                            {/* Custom CSS Bar Chart */}
                            <div className="h-48 border-b border-[#e6e9e6] dark:border-[#262d28] flex items-end gap-3 pt-6 pb-0 px-2" dir="ltr">
                                {chartData.map((item, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full relative group">
                                        <em className="text-[11px] font-medium text-[#68736b] dark:text-[#8b968e] mb-1.5 transition-transform group-hover:scale-110">
                                            {item.val}k
                                        </em>
                                        <div
                                            style={{ height: `${item.heightPct}%` }}
                                            className={`w-full max-w-[44px] rounded-t-md transition-all ${
                                                item.isToday
                                                    ? 'bg-[#166534] dark:bg-[#4ade80] opacity-100 shadow-xs'
                                                    : 'bg-[#166534] dark:bg-[#4ade80] opacity-30 hover:opacity-50'
                                            }`}
                                            title={`${item.day}: Rs. ${Number(item.amount).toLocaleString()}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Days Axis */}
                            <div className="flex gap-3 mt-2 text-xs text-[#68736b] dark:text-[#8b968e] px-2" dir="ltr">
                                {chartData.map((item, idx) => (
                                    <span key={idx} className={`flex-1 text-center font-medium ${item.isToday ? 'font-bold text-[#166534] dark:text-[#4ade80]' : ''}`}>
                                        {item.day}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#68736b] dark:text-[#8b968e] mt-4 pt-2 border-t border-[#f0f2f0] dark:border-[#1e2420]">
                            <span>
                                {isUrdu ? 'Ú©Ù„:' : 'Total'}{' '}
                                <b className="text-[#1a211c] dark:text-[#e7ece8] font-bold">
                                    {formatRupees(chartSummary.total)}
                                </b>
                            </span>
                            <span>
                                {isUrdu ? 'Ø±ÙˆØ²Ø§Ù†Û Ø§ÙˆØ³Ø·:' : 'Daily average'}{' '}
                                <b className="text-[#1a211c] dark:text-[#e7ece8] font-bold">
                                    {formatRupees(chartSummary.average)}
                                </b>
                            </span>
                            <span>
                                {isUrdu ? 'Ø¨ÛØªØ±ÛŒÙ† Ø¯Ù†:' : 'Best day'}{' '}
                                <b className="text-[#1a211c] dark:text-[#e7ece8] font-bold">
                                    {chartSummary.bestDay}
                                </b>
                            </span>
                        </div>
                    </div>

                    {/* Right 1 Col: Cash vs Credit Today */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                        <div>
                            <h2 className={`text-sm font-bold text-[#1a211c] dark:text-[#e7ece8] mb-3 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'Ù†Ù‚Ø¯ Ø¨Ù…Ù‚Ø§Ø¨Ù„Û Ø§Ø¯Ú¾Ø§Ø±' : 'Cash vs credit today'}
                            </h2>

                            {/* Split progress bar */}
                            <div className="h-2 rounded-full bg-[#f0f2f0] dark:bg-[#1e2420] overflow-hidden flex my-3.5">
                                <div
                                    style={{ width: `${stats.cashPct}%` }}
                                    className="bg-[#166534] dark:bg-[#4ade80] transition-all"
                                    title={`Cash: ${stats.cashPct}%`}
                                />
                                <div
                                    style={{ width: `${100 - stats.cashPct}%` }}
                                    className="bg-[#68736b]/40 dark:bg-[#8b968e]/40 transition-all"
                                    title={`Credit: ${100 - stats.cashPct}%`}
                                />
                            </div>

                            {/* Rows */}
                            <div className="space-y-0 text-xs">
                                <div className="flex justify-between items-center py-2.5 border-t border-[#e6e9e6] dark:border-[#262d28]">
                                    <span className="text-[#1a211c] dark:text-[#e7ece8] font-medium">
                                        {isUrdu ? 'Ù†Ù‚Ø¯ Ø³ÛŒÙ„' : 'Cash sale'}
                                    </span>
                                    <b className="font-bold text-[#1a211c] dark:text-[#e7ece8] tabular-nums">
                                        {formatRupees(stats.cashSale)}
                                    </b>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-t border-[#e6e9e6] dark:border-[#262d28]">
                                    <span className="text-[#1a211c] dark:text-[#e7ece8] font-medium">
                                        {isUrdu ? 'Ø§Ø¯Ú¾Ø§Ø± Ø³ÛŒÙ„' : 'Credit sale'}
                                    </span>
                                    <b className="font-bold text-[#1a211c] dark:text-[#e7ece8] tabular-nums">
                                        {formatRupees(stats.creditSale)}
                                    </b>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-t border-[#e6e9e6] dark:border-[#262d28]">
                                    <span className="text-[#1a211c] dark:text-[#e7ece8] font-medium">
                                        {isUrdu ? 'Ø¢Ø¬ Ú©Û’ Ø¨Ù„' : 'Bills today'}
                                    </span>
                                    <b className="font-bold text-[#1a211c] dark:text-[#e7ece8] tabular-nums">
                                        {stats.billsToday}
                                    </b>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-t border-[#e6e9e6] dark:border-[#262d28]">
                                    <span className="text-[#1a211c] dark:text-[#e7ece8] font-medium">
                                        {isUrdu ? 'Ú©Ù„ ÙØ±ÙˆØ®Øª Ø´Ø¯Û Ù†Ú¯' : 'Total nag sold'}
                                    </span>
                                    <b className="font-bold text-[#1a211c] dark:text-[#e7ece8] tabular-nums">
                                        {Number(stats.totalNagSold).toLocaleString()}
                                    </b>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Bottom Grid 1 (2 Cols: Top Outstanding & Needs Attention) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Card 1: Top Outstanding Merchants */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className={`text-sm font-bold text-[#1a211c] dark:text-[#e7ece8] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                    {isUrdu ? 'Ø³Ø¨ Ø³Û’ Ø²ÛŒØ§Ø¯Û Ø§Ø¯Ú¾Ø§Ø±' : 'Top outstanding merchants'}
                                </h2>
                                <Link
                                    href="/merchant-wasooli"
                                    className="text-xs font-semibold text-[#68736b] hover:text-[#166534] dark:hover:text-[#4ade80] transition-colors"
                                >
                                    {isUrdu ? 'Ø³Ø¨ Ø¯ÛŒÚ©Ú¾ÛŒÚº' : 'View all'}
                                </Link>
                            </div>

                            <div className="space-y-0 text-xs">
                                {topMerchants.length === 0 ? (
                                    <div className="py-6 text-center text-muted-foreground text-xs">
                                        {isUrdu ? 'Ú©ÙˆØ¦ÛŒ Ø¨Ù‚Ø§ÛŒØ§ Ù…Ø±Ú†Ù†Ù¹ Ù†ÛÛŒÚº ÛÛ’' : 'No outstanding merchants'}
                                    </div>
                                ) : (
                                    topMerchants.map((m, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2 border-t border-[#e6e9e6] dark:border-[#262d28] first:border-t-0">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="w-4 text-[#68736b] dark:text-[#8b968e] text-xs font-medium shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-[#1a211c] dark:text-[#e7ece8] truncate">
                                                        {m.name}
                                                    </div>
                                                    <small className="text-[#68736b] dark:text-[#8b968e] text-[11px] block">
                                                        {m.code}
                                                    </small>
                                                </div>
                                            </div>
                                            <b className="font-bold text-[#1a211c] dark:text-[#e7ece8] tabular-nums shrink-0 ps-2">
                                                {formatRupees(m.balance)}
                                            </b>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Needs Attention */}
                    <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs">
                        <div className="mb-2">
                            <h2 className={`text-sm font-bold text-[#1a211c] dark:text-[#e7ece8] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'Ø§Ø·Ù„Ø§Ø¹Ø§Øª' : 'Needs attention'}
                            </h2>
                        </div>

                        <div className="space-y-0 text-xs">
                            {alerts.map((alert, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 py-2.5 border-t border-[#e6e9e6] dark:border-[#262d28] first:border-t-0">
                                    <WarningIcon className="size-4 shrink-0 text-[#a15c07] dark:text-[#f0b54a] mt-0.5" weight="bold" />
                                    <div className="min-w-0">
                                        <div className="font-medium text-[#1a211c] dark:text-[#e7ece8]">
                                            {alert.title}
                                        </div>
                                        <small className="text-[#68736b] dark:text-[#8b968e] text-[11px] block mt-0.5">
                                            {alert.subtitle}
                                        </small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section 4: Bottom Grid 2 (Recent Entries Table) */}
                <div className="bg-white dark:bg-[#161b18] border border-[#e6e9e6] dark:border-[#262d28] rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`text-sm font-bold text-[#1a211c] dark:text-[#e7ece8] ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'Ø­Ø§Ù„ÛŒÛ Ø§Ù†Ø¯Ø±Ø§Ø¬' : 'Recent entries'}
                        </h2>
                        <Link
                            href="/amroza-detail"
                            className="text-xs font-semibold text-[#68736b] hover:text-[#166534] dark:hover:text-[#4ade80] transition-colors"
                        >
                            {isUrdu ? 'Ø³Ø¨ Ø¯ÛŒÚ©Ú¾ÛŒÚº' : 'View all'}
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead>
                                <tr className="border-b border-[#e6e9e6] dark:border-[#262d28] text-[#68736b] dark:text-[#8b968e]">
                                    <th className="py-2 px-3 text-start font-semibold">{isUrdu ? 'ÙˆÙ‚Øª' : 'Time'}</th>
                                    <th className="py-2 px-3 text-start font-semibold">{isUrdu ? 'Ù‚Ø³Ù…' : 'Type'}</th>
                                    <th className="py-2 px-3 text-start font-semibold">{isUrdu ? 'Ù…Ø±Ú†Ù†Ù¹ / Ú©Ø³Ø§Ù†' : 'Merchant / Farmer'}</th>
                                    <th className="py-2 px-3 text-start font-semibold">{isUrdu ? 'Ø¢Ø¦Ù¹Ù…' : 'Item'}</th>
                                    <th className="py-2 px-3 text-end font-semibold">{isUrdu ? 'Ù†Ú¯' : 'Nag'}</th>
                                    <th className="py-2 px-3 text-end font-semibold">{isUrdu ? 'Ø±Ù‚Ù…' : 'Amount'}</th>
                                </tr>
                            </thead>
                            <tbody className="tabular-nums">
                                {recentSales.map((entry, idx) => (
                                    <tr key={idx} className="border-b border-[#e6e9e6] dark:border-[#262d28] last:border-b-0 hover:bg-[#f0f2f0]/60 dark:hover:bg-[#1e2420]/60 transition-colors">
                                        <td className="py-2.5 px-3 text-[#68736b] dark:text-[#8b968e]">
                                            {entry.time}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                entry.isCash
                                                    ? 'bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80]'
                                                    : 'bg-[#f0f2f0] dark:bg-[#1e2420] text-[#68736b] dark:text-[#8b968e]'
                                            }`}>
                                                {entry.type}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-semibold text-[#1a211c] dark:text-[#e7ece8]">
                                            {entry.party}
                                        </td>
                                        <td className="py-2.5 px-3 text-[#1a211c] dark:text-[#e7ece8]">
                                            {entry.item}
                                        </td>
                                        <td className="py-2.5 px-3 text-end font-medium text-[#1a211c] dark:text-[#e7ece8]">
                                            {entry.nag}
                                        </td>
                                        <td className="py-2.5 px-3 text-end font-bold text-[#1a211c] dark:text-[#e7ece8]">
                                            {entry.amount ? formatRupees(entry.amount) : 'â€”'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}


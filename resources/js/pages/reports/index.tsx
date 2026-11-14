import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import Icon from '@/components/ui/icon';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ReportItem {
    id: string;
    title: string;
    title_ur: string;
    desc: string;
    desc_ur: string;
    url: string;
    isRange?: boolean;
}

interface Category {
    id: string;
    name: string;
    name_ur: string;
    icon: string;
    reports: ReportItem[];
}

interface ReportDataResponse {
    report: string;
    date: string;
    from_date: string;
    to_date: string;
    title: string;
    title_ur: string;
    columns: string[];
    rows: any[];
    totals: string[];
}

export default function ReportsIndex() {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const categories: Category[] = [
        {
            id: 'merchants',
            name: 'Merchants',
            name_ur: 'Ø®Ø±ÛŒØ¯Ø§Ø± (Ù…Ø±Ú†Ù†Ù¹Ø³)',
            icon: 'Users',
            reports: [
                {
                    id: 'amroza_print',
                    title: 'Amroza Print',
                    title_ur: 'Ø§Ù…Ø±ÙˆØ²Û Ù¾Ø±Ù†Ù¹',
                    desc: 'Aaj ki sale ki list',
                    desc_ur: 'Ø¢Ø¬ Ú©ÛŒ Ø³ÛŒÙ„ Ú©ÛŒ Ù„Ø³Ù¹',
                    url: '/amroza',
                },
                {
                    id: 'amroza_parchi',
                    title: 'Amroza Parchi',
                    title_ur: 'Ø§Ù…Ø±ÙˆØ²Û Ù¾Ø±Ú†ÛŒ',
                    desc: 'Merchant ko dene ki parchi',
                    desc_ur: 'Ù…Ø±Ú†Ù†Ù¹ Ú©Ùˆ Ø¯ÛŒÙ†Û’ Ú©ÛŒ Ù¾Ø±Ú†ÛŒ',
                    url: '/amroza',
                },
                {
                    id: 'naqdi_print',
                    title: 'Naqdi Print',
                    title_ur: 'Ù†Ù‚Ø¯ÛŒ Ù¾Ø±Ù†Ù¹',
                    desc: 'Naqdi wasooli ki list',
                    desc_ur: 'Ù†Ù‚Ø¯ÛŒ ÙˆØµÙˆÙ„ÛŒ Ú©ÛŒ Ù„Ø³Ù¹',
                    url: '/naqdi',
                },
                {
                    id: 'wasooli_print',
                    title: 'Wasooli Print',
                    title_ur: 'ÙˆØµÙˆÙ„ÛŒ Ù¾Ø±Ù†Ù¹',
                    desc: 'Wasooli (recovery) ki list',
                    desc_ur: 'ÙˆØµÙˆÙ„ÛŒ (Ø±ÛŒÚ©ÙˆØ±ÛŒ) Ú©ÛŒ Ù„Ø³Ù¹',
                    url: '/wasooli',
                },
                {
                    id: 'merchant_amroza',
                    title: 'Merchant Amroza',
                    title_ur: 'Ù…Ø±Ú†Ù†Ù¹ Ø§Ù…Ø±ÙˆØ²Û',
                    desc: 'Merchant wise sale',
                    desc_ur: 'Ù…Ø±Ú†Ù†Ù¹ Ú©Û’ Ù…Ø·Ø§Ø¨Ù‚ Ø³ÛŒÙ„',
                    url: '/merchant-amroza',
                },
                {
                    id: 'merchant_wasooli',
                    title: 'Merchant Wasooli',
                    title_ur: 'Ù…Ø±Ú†Ù†Ù¹ ÙˆØµÙˆÙ„ÛŒ',
                    desc: 'Merchant wise wasooli',
                    desc_ur: 'Ù…Ø±Ú†Ù†Ù¹ Ú©Û’ Ù…Ø·Ø§Ø¨Ù‚ ÙˆØµÙˆÙ„ÛŒ',
                    url: '/merchant-wasooli',
                },
                {
                    id: 'amroza_tafseel',
                    title: 'Amroza Tafseel',
                    title_ur: 'Ø§Ù…Ø±ÙˆØ²Û ØªÙØµÛŒÙ„',
                    desc: 'Sale ki poori tafseel',
                    desc_ur: 'Ø³ÛŒÙ„ Ú©ÛŒ Ù¾ÙˆØ±ÛŒ ØªÙØµÛŒÙ„',
                    url: '/amroza-detail',
                    isRange: true,
                },
                {
                    id: 'wasooli_tafseel',
                    title: 'Wasooli Tafseel',
                    title_ur: 'ÙˆØµÙˆÙ„ÛŒ ØªÙØµÛŒÙ„',
                    desc: 'Wasooli ki poori tafseel',
                    desc_ur: 'ÙˆØµÙˆÙ„ÛŒ Ú©ÛŒ Ù¾ÙˆØ±ÛŒ ØªÙØµÛŒÙ„',
                    url: '/wasooli-detail',
                    isRange: true,
                },
                {
                    id: 'amroza_wasooli',
                    title: 'Amroza / Wasooli',
                    title_ur: 'Ø§Ù…Ø±ÙˆØ²Û / ÙˆØµÙˆÙ„ÛŒ Ø³Ù…Ø±ÛŒ',
                    desc: 'Sale aur wasooli ek saath',
                    desc_ur: 'Ø³ÛŒÙ„ Ø§ÙˆØ± ÙˆØµÙˆÙ„ÛŒ Ø§ÛŒÚ© Ø³Ø§ØªÚ¾',
                    url: '/amroza-wasooli',
                    isRange: true,
                },
            ],
        },
        {
            id: 'farmers',
            name: 'Farmers',
            name_ur: 'Ø²Ù…ÛŒÙ†Ø¯Ø§Ø± (Ú©Ø³Ø§Ù†)',
            icon: 'Tractor',
            reports: [
                {
                    id: 'farmer_bill',
                    title: 'Farmer Bill (Bijak)',
                    title_ur: 'Ú©Ø³Ø§Ù† Ø¨Ù„ (Ø¨ÛŒØ¬Ú©)',
                    desc: 'Kisan ka rozana ka hisab',
                    desc_ur: 'Ú©Ø³Ø§Ù† Ú©Ø§ Ø±ÙˆØ²Ø§Ù†Û Ú©Ø§ Ø­Ø³Ø§Ø¨',
                    url: '/bijak',
                },
                {
                    id: 'farmer_khata',
                    title: 'Farmer Khata',
                    title_ur: 'Ú©Ø³Ø§Ù† Ú©Ú¾Ø§ØªÛ',
                    desc: 'Farmer ka Jama / Banam (Fard Hisab)',
                    desc_ur: 'Ú©Ø³Ø§Ù† Ú©Ø§ Ø¬Ù…Ø¹ / Ø¨Ù†Ø§Ù… (ÙØ±Ø¯ Ø­Ø³Ø§Ø¨)',
                    url: '/khata',
                },
                {
                    id: 'farmer_list',
                    title: 'Farmer List',
                    title_ur: 'Ú©Ø³Ø§Ù† Ù„Ø³Ù¹',
                    desc: 'Tamaam farmers ki fehrist',
                    desc_ur: 'ØªÙ…Ø§Ù… Ú©Ø³Ø§Ù†ÙˆÚº Ú©ÛŒ ÙÛØ±Ø³Øª',
                    url: '/masters/farmers',
                },
                {
                    id: 'farmer_marks',
                    title: 'Farmer Marks',
                    title_ur: 'Ú©Ø³Ø§Ù† Ù…Ø§Ø±Ú©Ø³',
                    desc: 'Farmer marks aur bariyan',
                    desc_ur: 'Ú©Ø³Ø§Ù† Ù…Ø§Ø±Ú©Ø³ Ø§ÙˆØ± Ø¨Ø§Ú‘ÛŒØ§Úº',
                    url: '/masters/marks',
                },
                {
                    id: 'farmer_balances',
                    title: 'Farmer Balances',
                    title_ur: 'Ú©Ø³Ø§Ù† Ø¨Ù‚Ø§ÛŒØ§ Ø¬Ø§Øª',
                    desc: 'Farmer baqaya jaat',
                    desc_ur: 'Ú©Ø³Ø§Ù† Ú©Û’ Ø¨Ù‚Ø§ÛŒØ§ Ø¬Ø§Øª',
                    url: '/khata',
                },
            ],
        },
        {
            id: 'ledger',
            name: 'Ledger',
            name_ur: 'Ù„ÛŒØ¬Ø±',
            icon: 'BookBookmark',
            reports: [
                {
                    id: 'general_ledger',
                    title: 'General Ledger',
                    title_ur: 'Ø¬Ù†Ø±Ù„ Ù„ÛŒØ¬Ø± (Ø±ÙˆÚ©Ú‘)',
                    desc: 'Roker aur rozana ka lena dena',
                    desc_ur: 'Ø±ÙˆÚ©Ú‘ Ø§ÙˆØ± Ø±ÙˆØ²Ø§Ù†Û Ú©Ø§ Ù„ÛŒÙ†Ø§ Ø¯ÛŒÙ†Ø§',
                    url: '/general-ledger',
                },
                {
                    id: 'cash_book',
                    title: 'Daily Cash Book',
                    title_ur: 'Ø±ÙˆØ²Ø§Ù†Û Ú©ÛŒØ´ Ø¨Ú©',
                    desc: 'Cash aamad o kharch',
                    desc_ur: 'Ú©ÛŒØ´ Ø¢Ù…Ø¯ Ùˆ Ø®Ø±Ú†',
                    url: '/general-ledger',
                },
            ],
        },
    ];

    const [activeCategoryId, setActiveCategoryId] = useState('merchants');
    const selectedCategory = categories.find(c => c.id === activeCategoryId) || categories[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedFromDate, setSelectedFromDate] = useState(todayStr);
    const [selectedToDate, setSelectedToDate] = useState(todayStr);

    const [activeReport, setActiveReport] = useState<ReportItem | null>(null);
    const [reportData, setReportData] = useState<ReportDataResponse | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹Ø³' : 'Reports', href: '/reports' },
    ];

    async function fetchReportData(rep: ReportItem, d: string, from: string, to: string) {
        setLoading(true);
        try {
            const res = await fetch(`/reports/data?report=${rep.id}&date=${d}&from_date=${from}&to_date=${to}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data: ReportDataResponse = await res.json();
            setReportData(data);
            return data;
        } catch (err) {
            toast.error(isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹ ÚˆÛŒÙ¹Ø§ Ù„ÙˆÚˆ Ù†ÛÛŒÚº ÛÙˆ Ø³Ú©Ø§' : 'Could not load report data');
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function handlePreview(rep: ReportItem) {
        setActiveReport(rep);
        setModalOpen(true);
        await fetchReportData(rep, selectedDate, selectedFromDate, selectedToDate);
    }

    async function handlePrint(rep: ReportItem) {
        setActiveReport(rep);
        const data = await fetchReportData(rep, selectedDate, selectedFromDate, selectedToDate);
        if (data) {
            setTimeout(() => {
                window.print();
            }, 300);
        }
    }

    function triggerModalPrint() {
        window.print();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹Ø³' : 'Reports'} />

            {/* Interactive Screen UI */}
            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] dark:text-[#e7ece8] print:hidden" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Dark Green Top Header Banner */}
                <div className="bg-[#14532d] px-4 md:px-8 pt-3.5 pb-10 md:pb-12 text-white shadow-sm">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                        <div>
                            {/* Back to Dashboard Button */}
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-1.5 mb-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-medium transition-all"
                            >
                                <Icon name="ArrowLeft" className="size-3.5" weight="bold" />
                                <span>{isUrdu ? 'ڈیش بورڈ پر واپس' : 'Dashboard par wapas jayein'}</span>
                            </Link>
                            <h1 className={`text-lg md:text-xl font-bold text-white tracking-tight ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                                {isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹Ø³' : 'Reports'}
                            </h1>
                            <p className={`text-emerald-100/80 text-xs font-medium mt-0.5 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹ Ù…Ù†ØªØ®Ø¨ Ú©Ø±ÛŒÚºØŒ Ù¾Ú¾Ø± Ù¾Ø±Ù†Ù¹ Ú©Ø±ÛŒÚº' : 'Report chunein, phir print karein'}
                            </p>
                        </div>

                        {/* Date Controls */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => {
                                    setSelectedDate(e.target.value);
                                    setSelectedFromDate(e.target.value);
                                    setSelectedToDate(e.target.value);
                                    toast.success(isUrdu ? `ØªØ§Ø±ÛŒØ® Ù…Ù†ØªØ®Ø¨ ÛÙˆØ¦ÛŒ: ${e.target.value}` : `Date selected: ${e.target.value}`);
                                }}
                                className="h-9 px-3 rounded-xl bg-white text-gray-900 font-bold text-xs cursor-pointer shadow-xs border-0 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Content Area Floating Over Banner */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        
                        {/* LEFT COLUMN: Categories Card (Clean active state, no green side border) */}
                        <div className="md:col-span-4 lg:col-span-3">
                            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-2.5 space-y-1">
                                {categories.map(cat => {
                                    const isActive = cat.id === activeCategoryId;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setActiveCategoryId(cat.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs md:text-sm transition-all cursor-pointer text-start ${
                                                isActive
                                                    ? 'bg-gray-100 text-gray-900 font-bold'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Icon
                                                    name={cat.icon}
                                                    className={`size-4 ${isActive ? 'text-emerald-800' : 'text-gray-400'}`}
                                                />
                                                <span className={`truncate ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                                                    {isUrdu ? cat.name_ur : cat.name}
                                                </span>
                                            </div>
                                            <span className={`font-mono text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                                isActive
                                                    ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                                                    : 'bg-gray-100 text-gray-500 font-medium'
                                            }`}>
                                                {cat.reports.length}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Reports List Card */}
                        <div className="md:col-span-8 lg:col-span-9">
                            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {selectedCategory.reports.map(rep => (
                                        <div
                                            key={rep.id}
                                            className="p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                                        >
                                            <div className="space-y-0.5">
                                                <h3 className={`text-xs md:text-sm font-bold text-gray-900 ${isUrdu ? 'font-nastaliq text-base' : ''}`}>
                                                    {isUrdu ? rep.title_ur : rep.title}
                                                </h3>
                                                <p className="text-xs text-gray-400">
                                                    {isUrdu ? rep.desc_ur : rep.desc}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Preview Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handlePreview(rep)}
                                                    className="h-8 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                                                >
                                                    <Icon name="Eye" className="size-3.5 text-gray-500" />
                                                    <span>{isUrdu ? 'Ù¾ÛŒØ´ Ù†Ø¸Ø§Ø±Û' : 'Preview'}</span>
                                                </button>

                                                {/* Print Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handlePrint(rep)}
                                                    className="h-8 px-3.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                                                >
                                                    <Icon name="Printer" className="size-3.5" />
                                                    <span>{isUrdu ? 'Ù¾Ø±Ù†Ù¹' : 'Print'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Modal: Interactive Live Report Preview */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-4xl p-5 bg-white text-black font-sans max-h-[90vh] overflow-y-auto" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader className="border-b pb-3 mb-3 print:hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <DialogTitle className="text-base font-bold text-gray-900">
                                {isUrdu ? (reportData?.title_ur || activeReport?.title_ur) : (reportData?.title || activeReport?.title)}
                            </DialogTitle>
                            
                            {/* Live Date Filter in Modal */}
                            <div className="flex items-center gap-2">
                                {activeReport?.isRange ? (
                                    <>
                                        <div className="flex items-center gap-1 text-xs">
                                            <span>Se:</span>
                                            <input
                                                type="date"
                                                value={selectedFromDate}
                                                onChange={e => setSelectedFromDate(e.target.value)}
                                                className="h-7 px-2 border rounded text-xs"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                            <span>Tak:</span>
                                            <input
                                                type="date"
                                                value={selectedToDate}
                                                onChange={e => setSelectedToDate(e.target.value)}
                                                className="h-7 px-2 border rounded text-xs"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1 text-xs">
                                        <span>Date:</span>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={e => setSelectedDate(e.target.value)}
                                            className="h-7 px-2 border rounded text-xs"
                                        />
                                    </div>
                                )}
                                <Button
                                    size="sm"
                                    onClick={() => activeReport && fetchReportData(activeReport, selectedDate, selectedFromDate, selectedToDate)}
                                    className="h-7 text-xs bg-emerald-800 hover:bg-emerald-900 text-white"
                                >
                                    Filter
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={triggerModalPrint}
                                    className="h-7 text-xs bg-black text-white hover:bg-gray-800 flex items-center gap-1"
                                >
                                    <Icon name="Printer" className="size-3.5" />
                                    <span>Print</span>
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {loading ? (
                        <div className="py-16 text-center text-gray-500 text-sm">
                            Loading report data...
                        </div>
                    ) : reportData ? (
                        <div className="space-y-4">
                            {/* Company Letterhead */}
                            <div className="text-center border-b pb-3">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded bg-[#166534] text-white flex items-center justify-center font-bold text-xs">V</div>
                                    <h2 className="font-extrabold text-base uppercase tracking-wide text-gray-900">
                                        Vegetable POS
                                    </h2>
                                </div>
                                <div className="flex justify-between items-center text-xs font-semibold pt-2 text-gray-800">
                                    <span>{reportData.title}</span>
                                    <span>Date: {reportData.from_date !== reportData.to_date ? `${reportData.from_date} to ${reportData.to_date}` : reportData.date}</span>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border rounded overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 font-bold border-b text-gray-900">
                                        <tr>
                                            {reportData.columns.map((c, i) => (
                                                <th key={i} className="p-2 text-start">{c}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {reportData.rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={reportData.columns.length} className="p-6 text-center text-gray-400">
                                                    No records found for this period.
                                                </td>
                                            </tr>
                                        ) : (
                                            reportData.rows.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    {Object.values(r).map((val: any, j) => (
                                                        <td key={j} className="p-2 text-start">{val}</td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals Summary */}
                            {reportData.totals.length > 0 && (
                                <div className="flex flex-wrap items-center justify-end gap-3 p-2 bg-gray-50 border rounded font-mono font-bold text-xs text-gray-900">
                                    {reportData.totals.map((tot, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-white border rounded">
                                            {tot}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Printed on */}
                            <div className="text-center font-mono text-[10px] text-gray-400 pt-4">
                                Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* Dedicated Print Document for Direct Print Trigger */}
            {reportData && (
                <div id="printable-report-document" className="hidden print:block p-6 bg-white text-black font-sans text-xs print-document-container" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <div className="text-center border-b-2 border-black pb-3 mb-4">
                        <h1 className="text-xl font-bold tracking-tight text-black uppercase">
                            Vegetable POS
                        </h1>
                    </div>

                    <div className="border border-black rounded p-3 mb-4 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold uppercase tracking-wide">
                                {reportData.title}
                            </span>
                            <span className="font-mono text-xs">
                                Date: {reportData.from_date !== reportData.to_date ? `${reportData.from_date} to ${reportData.to_date}` : reportData.date}
                            </span>
                        </div>
                    </div>

                    <table className="w-full text-xs border border-black border-collapse mb-6">
                        <thead>
                            <tr className="bg-gray-200 border-b border-black font-bold">
                                {reportData.columns.map((c, i) => (
                                    <th key={i} className="p-2 text-start border-e border-black">{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={reportData.columns.length} className="p-4 text-center text-gray-500">
                                        No records found for this period.
                                    </td>
                                </tr>
                            ) : (
                                reportData.rows.map((r, i) => (
                                    <tr key={i} className="border-b border-gray-300">
                                        {Object.values(r).map((val: any, j) => (
                                            <td key={j} className="p-2 border-e border-black text-start">{val}</td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {reportData.totals.length > 0 && (
                        <div className="flex flex-wrap items-center justify-end gap-3 p-2 bg-gray-100 border border-black rounded font-mono font-bold text-xs mb-6">
                            {reportData.totals.map((tot, idx) => (
                                <span key={idx} className="px-2 py-0.5 border border-black rounded bg-white">
                                    {tot}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="text-center text-[10px] text-gray-500 font-mono pt-4 border-t border-gray-300">
                        Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}



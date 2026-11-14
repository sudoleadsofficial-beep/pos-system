import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import Icon from '@/components/ui/icon';
import MandiPageHeader from '@/components/app/mandi-page-header';
import { toast } from 'sonner';

interface Row {
    id: number;
    merchant_id: number;
    code: number;
    name: string;
    name_ur: string;
    name_en: string;
    amount: number;
    type: string;
    note?: string;
}

interface Props {
    rows: Row[];
    totals: {
        total_wasooli: number;
    };
    filters: {
        date: string;
    };
}

export default function MerchantWasooliReport({ rows, totals, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';
    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'Ø±Ù¾ÙˆØ±Ù¹Ø³' : 'Reports', href: '/reports' },
        { title: isUrdu ? 'Ù…Ø±Ú†Ù†Ù¹ ÙˆØµÙˆÙ„ÛŒ' : 'Merchant Wasooli', href: '/merchant-wasooli' },
    ];

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        router.get('/merchant-wasooli', { date: newDate }, {
            preserveState: false,
            replace: true,
            onSuccess: () => {
                toast.success(isUrdu ? 'ÙˆØµÙˆÙ„ÛŒ Ø±Ù¾ÙˆØ±Ù¹ Ù„ÙˆÚˆ ÛÙˆ Ú¯Ø¦ÛŒ' : 'Merchant wasooli report loaded');
            },
        });
    }

    function setQuickDate(offsetDays: number) {
        const target = new Date();
        target.setDate(target.getDate() + offsetDays);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        const str = `${yyyy}-${mm}-${dd}`;
        handleDateChange(str);
    }

    function triggerPrint() {
        window.print();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'Ù…Ø±Ú†Ù†Ù¹ ÙˆØµÙˆÙ„ÛŒ Ø³Ù…Ø±ÛŒ' : 'Merchant Wasooli Report'} />

            {/* Screen UI - Green Theme (Hidden in Print) */}
            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] dark:text-[#e7ece8] print:hidden" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Dark Green Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'Ù…Ø±Ú†Ù†Ù¹ ÙˆØµÙˆÙ„ÛŒ Ø³Ù…Ø±ÛŒ' : 'Merchant Wasooli Report'}
                    subtitle={isUrdu ? 'Ù…Ø§Ø´Ø§Ø®ÙˆØ± ÙˆØ§Ø± ÙˆØµÙˆÙ„ÛŒ Ú©Ø§ Ø±ÛŒÚ©Ø§Ø±Úˆ' : 'Merchant wise recovery Â· Wasooli'}
                    isUrdu={isUrdu}
                >
                    <button
                        type="button"
                        onClick={() => setQuickDate(0)}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        {isUrdu ? 'Ø¢Ø¬' : 'Today'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setQuickDate(-1)}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        {isUrdu ? 'Ú¯Ø²Ø´ØªÛ Ú©Ù„' : 'Yesterday'}
                    </button>
                    <div className="relative flex items-center">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="h-9 w-32 md:w-36 rounded-xl bg-white text-gray-900 font-bold text-xs md:text-sm cursor-pointer shadow-xs px-2.5 text-center border-0 outline-none"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={triggerPrint}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        <Icon name="Printer" className="size-4 text-emerald-800" />
                        <span>{isUrdu ? 'Ù¾Ø±Ù†Ù¹ Ú©Ø±ÛŒÚº' : 'Print'}</span>
                    </button>
                </MandiPageHeader>

                {/* 2. Content Card Floating over Banner */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
                        
                        {/* Summary Bar */}
                        <div className="p-4 bg-emerald-50/50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                                    {isUrdu ? 'ØªØ§Ø±ÛŒØ® Ú©Ø§ Ø±ÛŒÚ©Ø§Ø±Úˆ:' : 'Date:'}{' '}
                                </span>
                                <strong className="font-mono text-gray-900 text-sm ms-1">{selectedDate}</strong>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                                    {isUrdu ? 'Ú©Ù„ ÙˆØµÙˆÙ„ÛŒ Ø±Ù‚Ù…:' : 'Total Wasooli:'}{' '}
                                </span>
                                <strong className="font-mono text-base font-black text-[#14532d] ms-1">
                                    Rs. {Number(totals.total_wasooli).toLocaleString()}
                                </strong>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#14532d] text-white select-none">
                                    <tr>
                                        <th className="p-3 text-center w-12 font-bold">#</th>
                                        <th className="p-3 text-start w-24 font-bold">{isUrdu ? 'Ú©ÙˆÚˆ' : 'Code'}</th>
                                        <th className="p-3 text-start font-bold">{isUrdu ? 'Ø®Ø±ÛŒØ¯Ø§Ø± / Ù…Ø±Ú†Ù†Ù¹' : 'Merchant'}</th>
                                        <th className="p-3 text-start w-32 font-bold">{isUrdu ? 'Ù‚Ø³Ù…' : 'Type'}</th>
                                        <th className="p-3 text-start font-bold">{isUrdu ? 'ØªÙØµÛŒÙ„' : 'Details'}</th>
                                        <th className="p-3 text-end w-36 font-bold">{isUrdu ? 'ÙˆØµÙˆÙ„ÛŒ Ø±Ù‚Ù…' : 'Wasooli'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">
                                                {isUrdu ? 'Ø§Ø³ ØªØ§Ø±ÛŒØ® Ú©Ø§ Ú©ÙˆØ¦ÛŒ ÙˆØµÙˆÙ„ÛŒ Ø±ÛŒÚ©Ø§Ø±Úˆ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”' : 'No recovery records found for this date.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, idx) => (
                                            <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fbfcfb]'}`}>
                                                <td className="p-3 text-center text-gray-500 font-mono text-xs">{idx + 1}</td>
                                                <td className="p-3 font-mono font-bold text-gray-900">#{row.code}</td>
                                                <td className="p-3 font-semibold text-gray-900 text-sm">
                                                    {isUrdu ? (row.name_ur || row.name_en) : (row.name_en || row.name_ur)}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        row.type === 'same_day_cash'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-green-100 text-green-800'
                                                    }`}>
                                                        {row.type === 'same_day_cash' ? (isUrdu ? 'Ù†Ù‚Ø¯ÛŒ' : 'Naqdi') : (isUrdu ? 'ÙˆØµÙˆÙ„ÛŒ' : 'Wasooli')}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-gray-600">{row.note || 'â€”'}</td>
                                                <td className="p-3 text-end font-mono font-bold text-[#14532d]">
                                                    Rs. {Number(row.amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-900">
                                        <td colSpan={5} className="p-3 text-start font-sans text-xs">
                                            {isUrdu ? 'Ù¹ÙˆÙ¹Ù„ ÙˆØµÙˆÙ„ÛŒ:' : 'Total Wasooli:'}
                                        </td>
                                        <td className="p-3 text-end font-mono text-sm font-black text-[#14532d]">
                                            Rs. {Number(totals.total_wasooli).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dedicated Professional Print Document (A4) */}
            <div id="printable-merchant-wasooli" className="hidden print:block p-6 bg-white text-black font-sans text-xs print-document-container" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Letterhead */}
                <div className="text-center border-b-2 border-[#166534] pb-3 mb-4">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#166534] flex items-center justify-center text-white font-black text-sm">V</div>
                        <h1 className="text-xl font-bold tracking-tight text-[#166534] uppercase">Vegetable POS</h1>
                    </div>
                    <p className="text-xs font-semibold text-gray-700">Mandi System · Karachi</p>
                </div>

                {/* Report Details */}
                <div className="border border-black rounded p-3 mb-4 bg-gray-50/50">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-sm font-bold uppercase tracking-wide">
                                {isUrdu ? 'Ù…Ø±Ú†Ù†Ù¹ ÙˆØ§Ø± ÙˆØµÙˆÙ„ÛŒ Ø³Ù…Ø±ÛŒ (Merchant Wasooli Report)' : 'MERCHANT WASOOLI REPORT'}
                            </span>
                        </div>
                        <div className="text-end font-mono text-xs">
                            <span>ØªØ§Ø±ÛŒØ® / Date: </span>
                            <strong>{selectedDate}</strong>
                        </div>
                    </div>
                </div>

                {/* Printable Table */}
                <table className="w-full text-xs border border-black border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-200 border-b border-black font-bold">
                            <th className="p-2 text-center w-10 border-e border-black">#</th>
                            <th className="p-2 text-start w-16 border-e border-black">Ú©ÙˆÚˆ / Code</th>
                            <th className="p-2 text-start border-e border-black">Ù…Ø±Ú†Ù†Ù¹ / Merchant</th>
                            <th className="p-2 text-start w-24 border-e border-black">Ù‚Ø³Ù… / Type</th>
                            <th className="p-2 text-start border-e border-black">ØªÙØµÛŒÙ„ / Note</th>
                            <th className="p-2 text-end">ÙˆØµÙˆÙ„ÛŒ / Amount (Rs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-gray-500">
                                    Ø§Ø³ ØªØ§Ø±ÛŒØ® Ù…ÛŒÚº Ú©ÙˆØ¦ÛŒ ÙˆØµÙˆÙ„ÛŒ Ø±ÛŒÚ©Ø§Ø±Úˆ Ù†ÛÛŒÚº ÛÛ’ (No records)
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <tr key={row.id} className="border-b border-gray-300">
                                    <td className="p-2 text-center border-e border-black font-mono">{idx + 1}</td>
                                    <td className="p-2 border-e border-black font-mono font-bold">#{row.code}</td>
                                    <td className="p-2 border-e border-black font-semibold">
                                        {isUrdu ? (row.name_ur || row.name_en) : (row.name_en || row.name_ur)}
                                    </td>
                                    <td className="p-2 border-e border-black">
                                        {row.type === 'same_day_cash' ? 'Ù†Ù‚Ø¯ÛŒ (Naqdi)' : 'ÙˆØµÙˆÙ„ÛŒ (Recovery)'}
                                    </td>
                                    <td className="p-2 border-e border-black text-gray-700">{row.note || 'â€”'}</td>
                                    <td className="p-2 text-end font-mono font-bold">
                                        Rs. {Number(row.amount).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black font-bold bg-gray-100">
                            <td colSpan={5} className="p-2 border-e border-black">
                                Ù¹ÙˆÙ¹Ù„ ÙˆØµÙˆÙ„ÛŒ / Total Wasooli:
                            </td>
                            <td className="p-2 text-end font-mono font-bold">
                                Rs. {Number(totals.total_wasooli).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Signatures */}
                <div className="text-center text-[10px] text-gray-500 font-mono pt-4 mt-4 border-t border-gray-300">
                    Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
            </div>
        </AppLayout>
    );
}


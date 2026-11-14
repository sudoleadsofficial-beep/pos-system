import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import Icon from '@/components/ui/icon';
import MandiPageHeader from '@/components/app/mandi-page-header';
import { toast } from 'sonner';

interface Merchant {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    phone?: string;
    opening_balance: number;
    current_balance: number;
}

interface KhataRow {
    date: string;
    raw_date: string;
    sabqa: number;
    sale: number;
    wasooli: number;
    baqaya: number;
}

interface Props {
    merchants: Merchant[];
    selectedMerchantId: number;
    selectedMerchant: Merchant | null;
    summary: {
        baqaya: number;
        sabqa: number;
        total_sale: number;
        total_wasooli: number;
    };
    rows: KhataRow[];
    filters: {
        from_date: string;
        to_date: string;
    };
}

export default function MerchantKhataIndex({
    merchants,
    selectedMerchantId,
    selectedMerchant,
    summary,
    rows,
    filters,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [fromDate, setFromDate] = useState(filters.from_date || new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(filters.to_date || new Date().toISOString().split('T')[0]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'کھاتہ' : 'Khata', href: '#' },
        { title: isUrdu ? 'مرچنٹ کھاتہ' : 'Merchant Khata', href: '/merchant-khata' },
    ];

    function handleFilterChange(newMerchantId: number, from: string, to: string) {
        setFromDate(from);
        setToDate(to);
        router.get('/merchant-khata', {
            merchant_id: newMerchantId,
            from_date: from,
            to_date: to,
        }, {
            preserveState: true,
            replace: true,
            onSuccess: () => {
                toast.success(isUrdu ? 'مرچنٹ کھاتہ اپڈیٹ ہو گیا' : 'Merchant khata updated');
            },
        });
    }

    const merchantDisplayName = selectedMerchant
        ? (isUrdu ? (selectedMerchant.name_ur || selectedMerchant.name_en) : (selectedMerchant.name_en || selectedMerchant.name_ur))
        : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'مرچنٹ کھاتہ' : 'Merchant Khata'} />

            {/* Screen UI - Clean Simple Style */}
            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] print:hidden" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Greenish Top Header Banner */}
                <MandiPageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <span>Merchant Khata</span>
                            <span className="font-nastaliq font-normal text-emerald-100 text-lg md:text-xl">مشاخور کھاتہ</span>
                        </span>
                    }
                    subtitle={isUrdu ? 'ایک مرچنٹ کا پورا حساب' : 'Ek merchant ka poora hisaab'}
                    isUrdu={isUrdu}
                >
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="h-8.5 px-4 rounded-xl text-xs font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <Icon name="Printer" className="size-4 text-emerald-800" />
                        <span>Print</span>
                    </button>
                </MandiPageHeader>

                {/* 2. Floating Content Area */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    
                    {/* Filter Card: Merchant, Se, Tak */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-3.5 md:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                    Merchant
                                </label>
                                <select
                                    value={selectedMerchantId}
                                    onChange={e => handleFilterChange(Number(e.target.value), fromDate, toDate)}
                                    className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                                >
                                    {merchants.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name_en || m.name_ur} (#{m.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                    Se
                                </label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={e => handleFilterChange(selectedMerchantId, e.target.value, toDate)}
                                    className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                    Tak
                                </label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={e => handleFilterChange(selectedMerchantId, fromDate, e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Card: Pure White Card with 4 columns divided by vertical borders */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 items-center divide-y md:divide-y-0 md:divide-x md:divide-gray-100">
                        {/* 1. Baqaya (aakhri) */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Baqaya (aakhri)
                            </span>
                            <div className="text-xl md:text-2xl font-black font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.baqaya).toLocaleString()}
                            </div>
                            <span className="text-[11px] text-gray-400 block pt-0.5 truncate">
                                {merchantDisplayName}
                            </span>
                        </div>

                        {/* 2. Sabqa (shuru ka) */}
                        <div className="md:ps-5 pt-3 md:pt-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Sabqa (shuru ka)
                            </span>
                            <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.sabqa).toLocaleString()}
                            </div>
                        </div>

                        {/* 3. Total sale */}
                        <div className="md:ps-5 pt-3 md:pt-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Total sale
                            </span>
                            <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.total_sale).toLocaleString()}
                            </div>
                        </div>

                        {/* 4. Total wasooli */}
                        <div className="md:ps-5 pt-3 md:pt-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Total wasooli
                            </span>
                            <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.total_wasooli).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* Table Card: Pure white, clean muted headers, simple borders */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs font-sans">
                                <thead>
                                    <tr className="text-gray-400 border-b border-gray-200 font-semibold bg-gray-50/50">
                                        <th className="px-4 py-3 text-start w-32">Date</th>
                                        <th className="px-4 py-3 text-end">Sabqa</th>
                                        <th className="px-4 py-3 text-end">Sale</th>
                                        <th className="px-4 py-3 text-end">Wasooli</th>
                                        <th className="px-4 py-3 text-end">Baqaya</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                No records found for this period
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-4 py-3 font-mono text-gray-600">
                                                    {row.date}
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono text-gray-800">
                                                    {Number(row.sabqa).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono text-gray-900 font-medium">
                                                    {row.sale > 0 ? Number(row.sale).toLocaleString() : '–'}
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono text-gray-900 font-medium">
                                                    {row.wasooli > 0 ? Number(row.wasooli).toLocaleString() : '–'}
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono font-bold text-gray-900">
                                                    {Number(row.baqaya).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-900 bg-gray-50/80 font-bold text-gray-900">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-end font-mono">
                                            Rs. {Number(summary.total_sale).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-end font-mono">
                                            Rs. {Number(summary.total_wasooli).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-end font-mono">
                                            Rs. {Number(summary.baqaya).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thermal 80mm Print Document */}
            <div id="printable-merchant-khata" className="hidden print:block p-4 bg-white text-black font-sans text-xs max-w-[80mm] mx-auto print-document-container" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Header: Green V Logo + Vegetable POS */}
                <div className="text-center border-b-2 border-[#166534] pb-2 mb-3">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <div className="w-6 h-6 rounded bg-[#166534] flex items-center justify-center text-white font-black text-xs">V</div>
                        <h1 className="text-base font-extrabold tracking-tight text-[#166534] uppercase">
                            Vegetable POS
                        </h1>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700">
                        {isUrdu ? 'مرچنٹ کھاتہ · مشاخور کھاتہ' : 'Merchant Khata · Customer Ledger'}
                    </p>
                </div>

                {/* Merchant Details */}
                <div className="border border-gray-400 rounded p-2 mb-3 text-[11px] space-y-1 bg-gray-50/50">
                    <div className="flex justify-between font-bold">
                        <span>{selectedMerchant?.name_en || selectedMerchant?.name_ur || '—'}</span>
                        <span className="font-mono">#{selectedMerchant?.code}</span>
                    </div>
                    {selectedMerchant?.phone && (
                        <div className="text-gray-600 font-mono text-[10px]">
                            Ph: {selectedMerchant.phone}
                        </div>
                    )}
                    <div className="text-[10px] text-gray-600 font-mono pt-0.5 border-t border-gray-200 flex justify-between">
                        <span>Period:</span>
                        <span>{fromDate} to {toDate}</span>
                    </div>
                </div>

                {/* Baqaya Box */}
                <div className="border border-black rounded p-2 mb-3 text-center bg-gray-50">
                    <span className="text-[10px] text-gray-600 uppercase font-bold block">Final Baqaya (بقایا)</span>
                    <strong className="text-base font-mono font-black text-gray-900">
                        Rs. {Number(summary.baqaya).toLocaleString()}
                    </strong>
                    <div className="flex justify-between text-[10px] pt-1 mt-1 border-t border-gray-300">
                        <span>Sale: Rs. {Number(summary.total_sale).toLocaleString()}</span>
                        <span>Wasooli: Rs. {Number(summary.total_wasooli).toLocaleString()}</span>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full text-[10px] border border-black border-collapse mb-3">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                            <th className="p-1 text-start border-e border-black">Date</th>
                            <th className="p-1 text-end border-e border-black">Sale</th>
                            <th className="p-1 text-end border-e border-black">Wasooli</th>
                            <th className="p-1 text-end">Baqaya</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-3 text-center text-gray-500">
                                    No records
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, i) => (
                                <tr key={i} className="border-b border-gray-300">
                                    <td className="p-1 border-e border-black font-mono">{r.date}</td>
                                    <td className="p-1 text-end border-e border-black font-mono">{r.sale > 0 ? Number(r.sale).toLocaleString() : '–'}</td>
                                    <td className="p-1 text-end border-e border-black font-mono">{r.wasooli > 0 ? Number(r.wasooli).toLocaleString() : '–'}</td>
                                    <td className="p-1 text-end font-mono font-bold">{Number(r.baqaya).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black font-bold bg-gray-100">
                            <td className="p-1 border-e border-black">Total</td>
                            <td className="p-1 text-end border-e border-black font-mono">Rs. {Number(summary.total_sale).toLocaleString()}</td>
                            <td className="p-1 text-end border-e border-black font-mono">Rs. {Number(summary.total_wasooli).toLocaleString()}</td>
                            <td className="p-1 text-end font-mono">Rs. {Number(summary.baqaya).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Print Footer: Only "Printed on", NO signatures */}
                <div className="text-center text-[9px] text-gray-500 font-mono pt-2 border-t border-gray-300">
                    Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
            </div>
        </AppLayout>
    );
}

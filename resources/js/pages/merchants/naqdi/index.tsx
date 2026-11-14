import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import MandiPageHeader from '@/components/app/mandi-page-header';
import { toast } from 'sonner';

interface NaqdiRow {
    merchant_id: number;
    code: number;
    name: string;
    name_ur: string;
    name_en: string;
    total_nag: number;
    kham_bikri: number;
    naqdi_wasooli: number;
    receipt_id?: number | null;
    total_baqaya: number;
}

interface Totals {
    total_nag: number;
    total_kham_bikri: number;
    total_cash_received: number;
    total_baqaya: number;
}

interface Props {
    rows: NaqdiRow[];
    totals: Totals;
    filters: {
        date: string;
    };
}

export default function NaqdiIndex({ rows, totals, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(rows.length > 0 ? 0 : -1);

    // Track input edits for cash received
    const [editedAmounts, setEditedAmounts] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        rows.forEach(r => {
            initial[r.merchant_id] = r.naqdi_wasooli > 0 ? String(r.naqdi_wasooli) : '';
        });
        return initial;
    });

    useEffect(() => {
        const initial: Record<number, string> = {};
        rows.forEach(r => {
            initial[r.merchant_id] = r.naqdi_wasooli > 0 ? String(r.naqdi_wasooli) : '';
        });
        setEditedAmounts(initial);
    }, [rows, selectedDate]);

    const [savingId, setSavingId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.naqdi'), href: '/naqdi' },
    ];

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        router.get('/naqdi', { date: newDate }, { preserveState: false, replace: true });
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

    function handleAmountChange(merchantId: number, val: string) {
        setEditedAmounts(prev => ({
            ...prev,
            [merchantId]: val,
        }));
    }

    function saveCashReceipt(merchantId: number) {
        const amount = parseFloat(editedAmounts[merchantId]) || 0;
        setSavingId(merchantId);

        router.post('/merchants/naqdi', {
            merchant_id: merchantId,
            date: selectedDate,
            amount: amount,
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                toast.success(isUrdu ? 'نقدی وصولی محفوظ ہو گئی' : 'Naqdi receipt saved successfully');
                setSavingId(null);
            },
            onError: () => {
                toast.error(isUrdu ? 'محفوظ نہیں ہو سکا' : 'Could not save receipt');
                setSavingId(null);
            },
        });
    }

    // Action Bar Navigation
    function navTop() {
        if (rows.length > 0) setSelectedRowIndex(0);
    }
    function navBottom() {
        if (rows.length > 0) setSelectedRowIndex(rows.length - 1);
    }
    function navPrev() {
        if (selectedRowIndex > 0) setSelectedRowIndex(selectedRowIndex - 1);
    }
    function navNext() {
        if (selectedRowIndex < rows.length - 1) setSelectedRowIndex(selectedRowIndex + 1);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('naqdi.title')} />

            <div className="-mt-3 md:-mt-6 -mx-3 md:-mx-6 pb-24 bg-[#eef2ee] min-h-screen font-sans text-[#1a211c] dark:text-[#e7ece8]" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* 1. Dark Green Top Header Banner */}
                <MandiPageHeader
                    title={t('naqdi.title')}
                    subtitle={isUrdu ? 'آج کی نقدی اینٹری · نقدی' : 'Aaj ki naqdi entry · Naqdi'}
                    isUrdu={isUrdu}
                >
                    <button
                        type="button"
                        onClick={() => setQuickDate(0)}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        {isUrdu ? 'آج' : 'Today'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setQuickDate(-1)}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        {isUrdu ? 'گزشتہ کل' : 'Yesterday'}
                    </button>
                    <div className="relative flex items-center">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="h-9 w-32 md:w-36 rounded-xl bg-white text-gray-900 font-bold text-xs md:text-sm cursor-pointer shadow-xs px-2.5 text-center border-0 outline-none"
                        />
                    </div>
                </MandiPageHeader>

                {/* Content Container (Floating over header with clean spacing) */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    {/* Table Card */}
                    <div className="rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#f0f4f1] text-[#14532d] border-b border-gray-200 select-none">
                                    <tr>
                                        <th className="p-3 text-center w-12 font-bold">#</th>
                                        <th className="p-3 text-start w-20 font-bold">{t('common.code')}</th>
                                        <th className="p-3 text-start font-bold">{t('merchants.merchant')}</th>
                                        <th className="p-3 text-end w-24 font-bold">{t('naqdi.total_nag')}</th>
                                        <th className="p-3 text-end w-36 font-bold">{t('naqdi.kham_bikri')}</th>
                                        <th className="p-3 text-end w-48 font-bold">{t('naqdi.naqdi_wasooli')} ({t('common.save')})</th>
                                        <th className="p-3 text-end w-36 font-bold">{t('naqdi.total_baqaya')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-muted-foreground text-sm">
                                                {t('common.no_records')}
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, idx) => {
                                            const isSelected = selectedRowIndex === idx;
                                            const isNaqdi = Number(row.code) === 1;
                                            const currentInputVal = editedAmounts[row.merchant_id] ?? (row.naqdi_wasooli > 0 ? String(row.naqdi_wasooli) : '');
                                            const currentNumVal = parseFloat(currentInputVal) || 0;
                                            const liveBaqaya = Math.round((row.kham_bikri - currentNumVal) * 100) / 100;

                                            return (
                                                <tr
                                                    key={row.merchant_id}
                                                    onClick={() => setSelectedRowIndex(idx)}
                                                    className="bg-white hover:bg-gray-50/60 transition-colors cursor-pointer"
                                                >
                                                    <td className="p-3 text-center text-gray-400 font-mono tabular-nums text-xs">{idx + 1}</td>
                                                    <td className="p-3 font-mono tabular-nums font-bold text-gray-900 text-xs">
                                                        #{row.code}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`font-semibold text-gray-900 text-sm ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                            {isUrdu ? (row.name_ur || row.name_en) : (row.name_en || row.name_ur)}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-end font-mono tabular-nums font-bold text-gray-800">{row.total_nag}</td>
                                                    <td className="p-3 text-end font-mono tabular-nums font-bold text-gray-900">
                                                        Rs. {Number(row.kham_bikri).toLocaleString()}
                                                    </td>
                                                    <td className="p-2 text-end" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={currentInputVal}
                                                                onChange={e => handleAmountChange(row.merchant_id, e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        saveCashReceipt(row.merchant_id);
                                                                    }
                                                                }}
                                                                className="h-9 w-28 text-end font-mono tabular-nums text-xs font-bold rounded-xl border-gray-200 bg-white focus:border-[#1e713e]"
                                                                placeholder="0.00"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                className="h-9 w-9 p-0 rounded-xl bg-[#1e713e] hover:bg-[#165a31] text-white flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                                                                disabled={savingId === row.merchant_id}
                                                                onClick={() => saveCashReceipt(row.merchant_id)}
                                                            >
                                                                <Icon name="Check" className="w-4 h-4" weight="bold" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-end font-mono tabular-nums font-black text-[#14532d] text-sm">
                                                        Rs. {liveBaqaya.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 4. Sticky Live Footer */}
                <div className="fixed bottom-0 start-0 end-0 bg-green-950 text-white px-4 py-2 shadow-xl border-t border-green-700 z-30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold bg-emerald-800/90 border border-emerald-600 px-3 py-1 rounded-lg text-white">
                            {t('common.record_x_of_y', {
                                current: selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0,
                                total: rows.length,
                            })}
                        </span>
                        <span className="text-gray-300">
                            {t('naqdi.total_nag')}: <strong className="text-white font-mono text-sm">{totals.total_nag}</strong>
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-xs">
                        <div className="bg-emerald-800/90 border border-emerald-600 px-3 py-1 rounded-lg flex items-center gap-1">
                            <span className="text-emerald-200 font-semibold font-sans">{t('naqdi.kham_bikri')}:</span>
                            <span className="font-bold text-white">Rs. {Number(totals.total_kham_bikri).toLocaleString()}</span>
                        </div>

                        <div className="bg-blue-900/90 border border-blue-600 px-3 py-1 rounded-lg flex items-center gap-1">
                            <span className="text-blue-200 font-semibold font-sans">{t('naqdi.naqdi_wasooli')}:</span>
                            <span className="font-bold text-blue-100">Rs. {Number(totals.total_cash_received).toLocaleString()}</span>
                        </div>

                        <div className="bg-amber-600 px-3.5 py-1 rounded-lg font-bold text-white shadow-xs flex items-center gap-1">
                            <span className="text-amber-100 font-sans">{t('naqdi.total_baqaya')}:</span>
                            <span>Rs. {Number(totals.total_baqaya).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

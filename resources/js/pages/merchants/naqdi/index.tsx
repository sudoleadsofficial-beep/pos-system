import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
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

    const [savingId, setSavingId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.naqdi'), href: '/naqdi' },
    ];

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        router.get('/naqdi', { date: newDate }, { preserveState: true, replace: true });
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
            onSuccess: () => {
                toast.success(t('common.saved'));
                setSavingId(null);
            },
            onError: () => {
                toast.error(t('common.error'));
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

            <div className="p-3 space-y-3 pb-24" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div>
                        <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                            <Icon name="Coins" className="w-5 h-5 text-emerald-700" />
                            {t('naqdi.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">{t('branding.name')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="naqdi-date" className="text-xs font-semibold">
                            {t('common.date')}:
                        </Label>
                        <Input
                            id="naqdi-date"
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="w-40 h-8 text-sm font-mono"
                        />
                    </div>
                </div>

                {/* Action Bar (Section 9.2: Top, Previous, Next, Bottom, Refresh, Exit) */}
                <div className="flex flex-wrap items-center justify-between gap-1 bg-gray-100 p-2 rounded-lg border text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={navTop}>
                            <Icon name="ChevronsUp" className="w-3.5 h-3.5 me-1" />
                            {t('common.top')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={navPrev}>
                            <Icon name="ChevronUp" className="w-3.5 h-3.5 me-1" />
                            {t('common.previous')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={navNext}>
                            <Icon name="ChevronDown" className="w-3.5 h-3.5 me-1" />
                            {t('common.next')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={navBottom}>
                            <Icon name="ChevronsDown" className="w-3.5 h-3.5 me-1" />
                            {t('common.bottom')}
                        </Button>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => router.get('/naqdi', { date: selectedDate })}
                        >
                            <Icon name="RefreshCw" className="w-3.5 h-3.5 me-1" />
                            {t('common.refresh')}
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 text-red-600 hover:bg-red-50"
                            onClick={() => router.visit('/dashboard')}
                        >
                            <Icon name="LogOut" className="w-3.5 h-3.5 me-1" />
                            {t('common.exit')}
                        </Button>
                    </div>
                </div>

                {/* Table (Section 9.2: code, name, total nag, kham bikri, naqdi wasooli, total baqaya) */}
                <div className="rounded-lg border overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-xs">
                        <thead className="bg-emerald-800 text-white select-none">
                            <tr>
                                <th className="p-2.5 text-center w-10">#</th>
                                <th className="p-2.5 text-start w-20">{t('common.code')}</th>
                                <th className="p-2.5 text-start">{t('merchants.merchant')}</th>
                                <th className="p-2.5 text-end w-24">{t('naqdi.total_nag')}</th>
                                <th className="p-2.5 text-end w-36">{t('naqdi.kham_bikri')}</th>
                                <th className="p-2.5 text-end w-44">{t('naqdi.naqdi_wasooli')} ({t('common.save')})</th>
                                <th className="p-2.5 text-end w-36">{t('naqdi.total_baqaya')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
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
                                            className={`transition-colors border-b ${
                                                isSelected
                                                    ? 'bg-amber-100/80 font-medium'
                                                    : idx % 2 === 0
                                                    ? 'bg-white hover:bg-gray-50'
                                                    : 'bg-emerald-50/30 hover:bg-emerald-50'
                                            }`}
                                        >
                                            <td className="p-2.5 text-center text-gray-500 font-mono">{idx + 1}</td>
                                            <td className="p-2.5 font-mono font-bold text-emerald-900">{row.code}</td>
                                            <td className="p-2.5">
                                                <span className="font-nastaliq text-sm">
                                                    {isUrdu ? row.name_ur : row.name_en}
                                                </span>
                                                {isNaqdi && (
                                                    <span className="ms-2 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-sans font-medium">
                                                        {t('merchants.cash_customer')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-end font-mono font-semibold">{row.total_nag}</td>
                                            <td className="p-2.5 text-end font-mono font-bold text-gray-800">
                                                Rs. {Number(row.kham_bikri).toLocaleString()}
                                            </td>
                                            <td className="p-2 text-end">
                                                <div className="flex items-center justify-end gap-1">
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
                                                        className="h-8 w-28 text-end font-mono text-xs font-semibold"
                                                        placeholder="0.00"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-2 bg-emerald-700 hover:bg-emerald-800 text-white"
                                                        disabled={savingId === row.merchant_id}
                                                        onClick={() => saveCashReceipt(row.merchant_id)}
                                                    >
                                                        <Icon name="Check" className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="p-2.5 text-end font-mono font-bold text-emerald-900">
                                                Rs. {liveBaqaya.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sticky Live Footer (Section 9.2: total kham bikri, total cash received, total baqaya) */}
                <div className="fixed bottom-0 start-0 end-0 bg-emerald-950 text-white px-4 py-2.5 shadow-lg border-t border-emerald-800 z-30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold bg-emerald-900 px-3 py-1 rounded">
                            {t('common.record_x_of_y', {
                                current: selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0,
                                total: rows.length,
                            })}
                        </span>
                        <span className="text-gray-300">
                            {t('naqdi.total_nag')}: <strong className="text-white font-mono">{totals.total_nag}</strong>
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 font-mono text-sm">
                        <div className="bg-emerald-900/90 px-3 py-1 rounded">
                            <span className="text-emerald-300 text-xs font-sans me-1">{t('naqdi.kham_bikri')}:</span>
                            <span className="font-bold text-white">Rs. {Number(totals.total_kham_bikri).toLocaleString()}</span>
                        </div>

                        <div className="bg-emerald-800 px-3 py-1 rounded">
                            <span className="text-emerald-200 text-xs font-sans me-1">{t('naqdi.naqdi_wasooli')}:</span>
                            <span className="font-bold text-emerald-100">Rs. {Number(totals.total_cash_received).toLocaleString()}</span>
                        </div>

                        <div className="bg-amber-700 px-3 py-1 rounded font-bold text-white shadow-xs">
                            <span className="text-amber-100 text-xs font-sans me-1">{t('naqdi.total_baqaya')}:</span>
                            <span>Rs. {Number(totals.total_baqaya).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

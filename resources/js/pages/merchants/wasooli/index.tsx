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

interface WasooliRow {
    merchant_id: number;
    code: number;
    name: string;
    name_ur: string;
    name_en: string;
    phone?: string;
    sabiqa: number;
    amroza: number;
    wasooli: number;
    receipt_id?: number | null;
    total_baqaya: number;
}

interface Totals {
    total_sabiqa: number;
    total_amroza: number;
    total_wasooli: number;
    total_baqaya: number;
}

interface Props {
    rows: WasooliRow[];
    totals: Totals;
    filters: {
        date: string;
        search?: string;
    };
}

export default function WasooliIndex({ rows, totals, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [searchFilter, setSearchFilter] = useState(filters.search || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(rows.length > 0 ? 0 : -1);

    // Track input edits for Wasooli amount
    const [editedAmounts, setEditedAmounts] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        rows.forEach(r => {
            initial[r.merchant_id] = r.wasooli > 0 ? String(r.wasooli) : '';
        });
        return initial;
    });

    const [savingId, setSavingId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.wasooli'), href: '/wasooli' },
    ];

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        router.get('/wasooli', { date: newDate, search: searchFilter }, { preserveState: true, replace: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/wasooli', { date: selectedDate, search: searchFilter }, { preserveState: true, replace: true });
    }

    function handleAmountChange(merchantId: number, val: string) {
        setEditedAmounts(prev => ({
            ...prev,
            [merchantId]: val,
        }));
    }

    function saveWasooliReceipt(merchantId: number) {
        const amount = parseFloat(editedAmounts[merchantId]) || 0;
        setSavingId(merchantId);

        router.post('/merchants/wasooli', {
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
            <Head title={t('wasooli.title')} />

            <div className="p-3 space-y-3 pb-24" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Header Title + Date Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div>
                        <h1 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                            <Icon name="HandCoins" className="w-5 h-5 text-blue-700" />
                            {t('wasooli.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">{t('branding.name')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="wasooli-date" className="text-xs font-semibold">
                            {t('common.date')}:
                        </Label>
                        <Input
                            id="wasooli-date"
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="w-40 h-8 text-sm font-mono"
                        />
                    </div>
                </div>

                {/* Action Bar (Section 9.3: Top, Previous, Next, Bottom, Filter, Refresh, Exit) */}
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
                        {/* Search Filter */}
                        <form onSubmit={handleSearch} className="flex items-center gap-1">
                            <Input
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                placeholder={t('common.search') + '...'}
                                className="h-7 text-xs w-36"
                            />
                            <Button type="submit" size="sm" variant="outline" className="h-7 px-2">
                                <Icon name="Search" className="w-3.5 h-3.5" />
                            </Button>
                            {searchFilter && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="h-7 px-1 text-gray-500"
                                    onClick={() => {
                                        setSearchFilter('');
                                        router.get('/wasooli', { date: selectedDate });
                                    }}
                                >
                                    <Icon name="X" className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </form>

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => router.get('/wasooli', { date: selectedDate })}
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

                {/* Table (Section 9.3: code, name, Sabiqa, Amroza, Wasooli, Total Baqaya = Sabiqa + Amroza - Wasooli) */}
                <div className="rounded-lg border overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-xs">
                        <thead className="bg-blue-900 text-white select-none">
                            <tr>
                                <th className="p-2.5 text-center w-10">#</th>
                                <th className="p-2.5 text-start w-20">{t('common.code')}</th>
                                <th className="p-2.5 text-start">{t('merchants.merchant')}</th>
                                <th className="p-2.5 text-end w-32">{t('wasooli.sabiqa')}</th>
                                <th className="p-2.5 text-end w-32">{t('wasooli.amroza')}</th>
                                <th className="p-2.5 text-end w-44">{t('wasooli.wasooli')} ({t('common.save')})</th>
                                <th className="p-2.5 text-end w-36">{t('wasooli.total_baqaya')}</th>
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
                                    const currentInputVal = editedAmounts[row.merchant_id] ?? (row.wasooli > 0 ? String(row.wasooli) : '');
                                    const currentNumVal = parseFloat(currentInputVal) || 0;

                                    // Total Baqaya = Sabiqa + Amroza - Wasooli
                                    // Example: 16100 + 8500 - 8000 = 16600
                                    const liveBaqaya = Math.round((row.sabiqa + row.amroza - currentNumVal) * 100) / 100;

                                    return (
                                        <tr
                                            key={row.merchant_id}
                                            onClick={() => setSelectedRowIndex(idx)}
                                            className={`transition-colors border-b ${
                                                isSelected
                                                    ? 'bg-amber-100/80 font-medium'
                                                    : idx % 2 === 0
                                                    ? 'bg-white hover:bg-gray-50'
                                                    : 'bg-blue-50/30 hover:bg-blue-50'
                                            }`}
                                        >
                                            <td className="p-2.5 text-center text-gray-500 font-mono">{idx + 1}</td>
                                            <td className="p-2.5 font-mono font-bold text-blue-900">{row.code}</td>
                                            <td className="p-2.5 font-nastaliq text-sm">
                                                {isUrdu ? row.name_ur : row.name_en}
                                            </td>
                                            <td className="p-2.5 text-end font-mono">
                                                Rs. {Number(row.sabiqa).toLocaleString()}
                                            </td>
                                            <td className="p-2.5 text-end font-mono font-semibold text-green-800">
                                                {row.amroza > 0 ? `Rs. ${Number(row.amroza).toLocaleString()}` : '-'}
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
                                                                saveWasooliReceipt(row.merchant_id);
                                                            }
                                                        }}
                                                        className="h-8 w-28 text-end font-mono text-xs font-semibold"
                                                        placeholder="0.00"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-2 bg-blue-700 hover:bg-blue-800 text-white"
                                                        disabled={savingId === row.merchant_id}
                                                        onClick={() => saveWasooliReceipt(row.merchant_id)}
                                                    >
                                                        <Icon name="Check" className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className={`p-2.5 text-end font-mono font-bold ${
                                                liveBaqaya > 0 ? 'text-blue-900' : 'text-gray-500'
                                            }`}>
                                                Rs. {liveBaqaya.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sticky Live Footer (Section 9.3: total sabiqa 10374838, amroza 281200, wasooli 149920, baqaya 10506118) */}
                <div className="fixed bottom-0 start-0 end-0 bg-slate-900 text-white px-4 py-2.5 shadow-lg border-t border-slate-700 z-30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold bg-slate-800 px-3 py-1 rounded">
                            {t('common.record_x_of_y', {
                                current: selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0,
                                total: rows.length,
                            })}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                        <div className="bg-slate-800 px-3 py-1 rounded">
                            <span className="text-slate-300 text-xs font-sans me-1">{t('wasooli.sabiqa')}:</span>
                            <span className="font-semibold text-white">Rs. {Number(totals.total_sabiqa).toLocaleString()}</span>
                        </div>

                        <div className="bg-emerald-900/90 px-3 py-1 rounded">
                            <span className="text-emerald-200 text-xs font-sans me-1">{t('wasooli.amroza')}:</span>
                            <span className="font-semibold text-emerald-100">Rs. {Number(totals.total_amroza).toLocaleString()}</span>
                        </div>

                        <div className="bg-blue-900/90 px-3 py-1 rounded">
                            <span className="text-blue-200 text-xs font-sans me-1">{t('wasooli.wasooli')}:</span>
                            <span className="font-semibold text-blue-100">Rs. {Number(totals.total_wasooli).toLocaleString()}</span>
                        </div>

                        <div className="bg-amber-700 px-3 py-1 rounded font-bold text-white shadow-xs">
                            <span className="text-amber-100 text-xs font-sans me-1">{t('wasooli.total_baqaya')}:</span>
                            <span>Rs. {Number(totals.total_baqaya).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

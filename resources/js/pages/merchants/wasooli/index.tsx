import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import MandiPageHeader from '@/components/app/mandi-page-header';
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
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(rows.length > 0 ? 0 : -1);

    // Track input edits for Wasooli amount
    const [editedAmounts, setEditedAmounts] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        rows.forEach(r => {
            initial[r.merchant_id] = r.wasooli > 0 ? String(r.wasooli) : '';
        });
        return initial;
    });

    useEffect(() => {
        const initial: Record<number, string> = {};
        rows.forEach(r => {
            initial[r.merchant_id] = r.wasooli > 0 ? String(r.wasooli) : '';
        });
        setEditedAmounts(initial);
    }, [rows, selectedDate]);

    const [savingId, setSavingId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'روزانہ کام' : 'Daily Kaam', href: '#' },
        { title: isUrdu ? 'وصولی' : 'Wasooli', href: '/wasooli' },
    ];

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        router.get('/wasooli', { date: newDate }, { preserveState: false, replace: true });
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

    function saveWasooliReceipt(merchantId: number) {
        const amount = parseFloat(editedAmounts[merchantId]) || 0;
        setSavingId(merchantId);

        router.post('/merchants/wasooli', {
            merchant_id: merchantId,
            date: selectedDate,
            amount: amount,
        }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                toast.success(isUrdu ? 'وصولی کامیابی سے محفوظ ہو گئی' : 'Wasooli saved successfully');
                setSavingId(null);
            },
            onError: () => {
                toast.error(isUrdu ? 'محفوظ کرنے میں خرابی ہوئی' : 'Could not save wasooli');
                setSavingId(null);
            },
        });
    }

    // Filter merchants for left list
    const filteredRows = rows.filter(r => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        const nameEn = (r.name_en || '').toLowerCase();
        const nameUr = (r.name_ur || '').toLowerCase();
        const code = String(r.code);
        return nameEn.includes(q) || nameUr.includes(q) || code.includes(q);
    });

    const selectedRow = rows[selectedRowIndex] || (rows.length > 0 ? rows[0] : null);

    // Live baqaya for selected merchant
    const currentInputVal = selectedRow ? (editedAmounts[selectedRow.merchant_id] ?? '') : '';
    const currentNumVal = parseFloat(currentInputVal) || (selectedRow?.wasooli || 0);
    const liveBaqaya = selectedRow ? Math.round((selectedRow.sabiqa + selectedRow.amroza - currentNumVal) * 100) / 100 : 0;
    const totalOutstanding = selectedRow ? Math.max(0, selectedRow.sabiqa + selectedRow.amroza) : 0;

    // Cleared count calculation
    const clearedCount = rows.filter(r => {
        const val = parseFloat(editedAmounts[r.merchant_id]) || r.wasooli || 0;
        return (r.sabiqa + r.amroza - val) <= 0;
    }).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'وصولی فارم - جے کے سی' : 'Wasooli Form (Recovery)'} />

            {/* Main Outer Container without horizontal overflow */}
            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-24 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] dark:text-[#e7ece8]" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Dark Green Top Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'وصولی فارم (ریکوری)' : 'Wasooli Form (Recovery)'}
                    subtitle={isUrdu ? 'مرچنٹس سے وصولی · ریکوری' : 'Merchants se wasooli · Recovery'}
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

                {/* 2. Main Master-Detail Floating Card */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8">
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 md:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        
                        {/* LEFT COLUMN: Clean Professional Search & Merchant List */}
                        <div className="md:col-span-4 lg:col-span-4 border-b md:border-b-0 md:border-e border-gray-100 pb-4 md:pb-0 md:pe-4 space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {isUrdu ? 'خریدار فہرست' : 'Merchants List'}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                    {filteredRows.length} {isUrdu ? 'پارٹیاں' : 'parties'}
                                </span>
                            </div>

                            {/* Clean Search Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder={isUrdu ? 'مرچنٹ یا کوڈ تلاش کریں...' : 'Search merchant or code...'}
                                    className={`w-full h-8.5 px-3 ps-8 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all ${isUrdu ? 'font-nastaliq ps-3 pe-8' : ''}`}
                                />
                                <Icon name="MagnifyingGlass" className="size-3.5 text-gray-400 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            {/* Merchant Items List - Professional selection without chunky side bar */}
                            <div className="space-y-0.5 max-h-[400px] overflow-y-auto pe-1">
                                {filteredRows.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-xs">
                                        {isUrdu ? 'کوئی مرچنٹ نہیں ملا' : 'No merchant found'}
                                    </div>
                                ) : (
                                    filteredRows.map(m => {
                                        const originalIndex = rows.findIndex(x => x.merchant_id === m.merchant_id);
                                        const isSelected = selectedRow?.merchant_id === m.merchant_id;
                                        const mInputVal = editedAmounts[m.merchant_id] ?? (m.wasooli > 0 ? String(m.wasooli) : '');
                                        const mNumVal = parseFloat(mInputVal) || (m.wasooli || 0);
                                        const mBaqaya = Math.round((m.sabiqa + m.amroza - mNumVal) * 100) / 100;
                                        const displayName = isUrdu ? (m.name_ur || m.name_en) : (m.name_en || m.name_ur);

                                        return (
                                            <button
                                                key={m.merchant_id}
                                                type="button"
                                                onClick={() => setSelectedRowIndex(originalIndex)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-start ${
                                                    isSelected
                                                        ? 'bg-emerald-50 text-emerald-950 font-semibold'
                                                        : 'text-gray-700 hover:bg-gray-100/70 hover:text-gray-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                                                        isSelected
                                                            ? 'bg-emerald-200/80 text-emerald-900 font-bold'
                                                            : 'bg-gray-100 text-gray-500 font-medium'
                                                    }`}>
                                                        #{m.code}
                                                    </span>
                                                    <span className={`truncate ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                        {displayName}
                                                    </span>
                                                </div>
                                                <span className={`font-mono tabular-nums text-xs ms-2 shrink-0 ${
                                                    mBaqaya <= 0
                                                        ? 'text-emerald-700 font-bold'
                                                        : isSelected
                                                        ? 'text-emerald-900 font-bold'
                                                        : 'text-gray-500'
                                                }`}>
                                                    {Number(mBaqaya).toLocaleString()}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Merchant Details & Wasooli Entry */}
                        <div className="md:col-span-8 lg:col-span-8 space-y-4">
                            {selectedRow ? (
                                <>
                                    {/* 1. Header: Merchant Name + Code + Phone Icon + Status */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                                                    #{selectedRow.code}
                                                </span>
                                                <h2 className={`text-xl font-bold text-gray-900 tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                                                    {isUrdu ? (selectedRow.name_ur || selectedRow.name_en) : (selectedRow.name_en || selectedRow.name_ur)}
                                                </h2>
                                            </div>
                                            {selectedRow.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono mt-1">
                                                    <Icon name="Phone" className="size-3 text-gray-400" />
                                                    <span>{selectedRow.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center">
                                            {liveBaqaya <= 0 ? (
                                                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md font-medium">
                                                    <Icon name="CheckCircle" className="size-3.5 text-emerald-600" weight="fill" />
                                                    <span>{isUrdu ? 'مکمل کلئیر' : 'Cleared'}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md font-medium">
                                                    <Icon name="Clock" className="size-3.5 text-amber-600" />
                                                    <span>{isUrdu ? 'بقایا واجب الادا' : 'Pending Payment'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Clean Flat Balance Breakdown (3 Cards - No Gradients / No Glows) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
                                            <span className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider block ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'سابقہ رقم (Sabiqa)' : 'Previous Balance (Sabiqa)'}
                                            </span>
                                            <span className="text-lg font-bold font-mono tabular-nums text-gray-900 mt-1 block">
                                                Rs. {Number(selectedRow.sabiqa).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
                                            <span className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider block ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'آج کی بکری (Amroza)' : "Today's Sale (Amroza)"}
                                            </span>
                                            <span className="text-lg font-bold font-mono tabular-nums text-gray-900 mt-1 block">
                                                Rs. {Number(selectedRow.amroza).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
                                            <span className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider block ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'اب تک موصول' : 'Received so far'}
                                            </span>
                                            <span className="text-lg font-bold font-mono tabular-nums text-gray-900 mt-1 block">
                                                Rs. {Number(selectedRow.wasooli).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 3. Net Baqaya Card - Flat & Elegant */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                                        <div>
                                            <span className={`text-xs font-bold text-gray-500 uppercase tracking-wider block ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'کل بقایا رقم (NET BAQAYA)' : 'NET BAQAYA (OUTSTANDING)'}
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                                Sabiqa + Amroza − Wasooli
                                            </span>
                                        </div>
                                        <div className="text-xl md:text-2xl font-black font-mono tabular-nums text-emerald-800" dir="ltr">
                                            Rs. {Number(liveBaqaya).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* 4. Wasooli Entry Form - Clean Flat Box with Real Icons */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 space-y-3.5 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon name="HandCoins" className="size-4 text-emerald-700" />
                                                <label className={`text-xs font-bold text-gray-800 uppercase tracking-wider ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                                                    {isUrdu ? 'نئی وصولی درج کریں (WASOOLI RECEIVED)' : 'ENTER WASOOLI RECEIVED'}
                                                </label>
                                            </div>
                                            {currentNumVal > 0 && (
                                                <span className="text-xs text-emerald-700 font-semibold font-mono tabular-nums">
                                                    New Baqaya: Rs. {Number(liveBaqaya).toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Input + Save Button */}
                                        <div className="flex items-center gap-2.5">
                                            <div className="relative flex-1">
                                                <span className="absolute start-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-gray-400">
                                                    Rs.
                                                </span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={currentInputVal}
                                                    onChange={e => handleAmountChange(selectedRow.merchant_id, e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            saveWasooliReceipt(selectedRow.merchant_id);
                                                        }
                                                    }}
                                                    placeholder="0.00"
                                                    className="w-full h-11 ps-10 pe-4 rounded-xl border border-gray-300 bg-white text-base md:text-lg font-bold font-mono tabular-nums text-gray-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                                                />
                                            </div>

                                            <Button
                                                type="button"
                                                disabled={savingId === selectedRow.merchant_id}
                                                onClick={() => saveWasooliReceipt(selectedRow.merchant_id)}
                                                className="h-11 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs md:text-sm flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                                            >
                                                <Icon name="Check" className="size-4" weight="bold" />
                                                <span>{isUrdu ? 'محفوظ کریں' : 'Save Wasooli'}</span>
                                            </Button>
                                        </div>

                                        {/* Quick Amount Helper Pills */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <div className="flex items-center gap-1 text-xs text-gray-400 font-medium me-1">
                                                <Icon name="Lightning" className="size-3 text-amber-600" weight="fill" />
                                                <span>Quick:</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAmountChange(selectedRow.merchant_id, String(totalOutstanding))}
                                                className="px-3 py-1 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-xs cursor-pointer transition-colors border border-gray-200/80"
                                            >
                                                {isUrdu ? 'مکمل رقم' : 'Full Balance'} ({Number(totalOutstanding).toLocaleString()})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAmountChange(selectedRow.merchant_id, String(Math.round(totalOutstanding / 2)))}
                                                className="px-3 py-1 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-xs cursor-pointer transition-colors border border-gray-200/80"
                                            >
                                                {isUrdu ? 'نصف رقم' : 'Half'} ({Number(Math.round(totalOutstanding / 2)).toLocaleString()})
                                            </button>
                                            {currentInputVal && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAmountChange(selectedRow.merchant_id, '')}
                                                    className="px-2.5 py-1 rounded-md text-gray-400 hover:text-red-600 text-xs cursor-pointer transition-colors"
                                                >
                                                    {isUrdu ? 'خالی کریں' : 'Clear'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground text-sm">
                                    {t('common.no_records')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Sticky Live Footer - Clean, Unified, Professional */}
                <div className="fixed bottom-0 start-0 end-0 bg-[#0e2416] text-white px-4 md:px-8 py-2.5 shadow-xl border-t border-[#1b4329] z-30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-emerald-200">
                            {isUrdu ? `اندراج: ${selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0} از ${rows.length}` : `Record ${selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0} of ${rows.length}`}
                        </span>
                        <span className="text-emerald-500/60 hidden sm:inline">|</span>
                        <span className="text-emerald-300/80 hidden sm:inline">
                            {isUrdu ? `${clearedCount} کلئیرڈ` : `${clearedCount} of ${rows.length} Cleared`}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono tabular-nums text-xs">
                        <div>
                            <span className="text-emerald-300/70 font-sans me-1.5">{isUrdu ? 'کل سابقہ:' : 'Total Sabiqa:'}</span>
                            <span className="font-semibold text-white">Rs. {Number(totals.total_sabiqa).toLocaleString()}</span>
                        </div>

                        <div>
                            <span className="text-emerald-300/70 font-sans me-1.5">{isUrdu ? 'کل بکری:' : "Today's Sale:"}</span>
                            <span className="font-semibold text-emerald-300">Rs. {Number(totals.total_amroza).toLocaleString()}</span>
                        </div>

                        <div>
                            <span className="text-emerald-300/70 font-sans me-1.5">{isUrdu ? 'کل وصولی:' : 'Total Wasooli:'}</span>
                            <span className="font-semibold text-blue-300">Rs. {Number(totals.total_wasooli).toLocaleString()}</span>
                        </div>

                        <div>
                            <span className="text-emerald-300/70 font-sans me-1.5">{isUrdu ? 'بقایا:' : 'Net Baqaya:'}</span>
                            <span className="font-bold text-white text-sm">Rs. {Number(totals.total_baqaya).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import ListPicker, { type PickerItem } from '@/components/app/list-picker';
import { toast } from 'sonner';

interface MerchantOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    current_balance: number;
}

interface ItemOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    unit: string;
    default_rate: number;
    default_bardana: number;
}

interface Sale {
    id: number;
    date: string;
    merchant_id: number;
    item_id: number;
    nag: number;
    weight: number;
    rate: number;
    bardana: number;
    gross_amount: number;
    merchant?: {
        id: number;
        code: number;
        name_en: string;
        name_ur: string;
        name: string;
    };
    item?: {
        id: number;
        code: number;
        name_en: string;
        name_ur: string;
        name: string;
        unit: string;
    };
}

interface Summary {
    total_records: number;
    total_gross: number;
    total_nag: number;
    cash_nag: number;
    cash_amount: number;
    credit_nag: number;
    credit_amount: number;
}

interface Props {
    sales: Sale[];
    summary: Summary;
    merchants: MerchantOption[];
    items: ItemOption[];
    filters: {
        date: string;
        search?: string;
    };
}

export default function AmrozaIndex({ sales, summary, merchants, items, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [searchFilter, setSearchFilter] = useState(filters.search || '');
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(sales.length > 0 ? 0 : -1);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Sale | null>(null);

    // Am Total modal state
    const [amTotalOpen, setAmTotalOpen] = useState(false);
    const [amTotalData, setAmTotalData] = useState<{
        by_merchant: any[];
        by_item: any[];
        summary: Summary;
    } | null>(null);
    const [loadingAmTotal, setLoadingAmTotal] = useState(false);

    // Refs for input auto-advancement on Enter key
    const nagRef = useRef<HTMLInputElement>(null);
    const weightRef = useRef<HTMLInputElement>(null);
    const rateRef = useRef<HTMLInputElement>(null);
    const bardanaRef = useRef<HTMLInputElement>(null);
    const submitBtnRef = useRef<HTMLButtonElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.amroza'), href: '/amroza' },
    ];

    const { data, setData, post, put, processing, reset } = useForm({
        date: selectedDate,
        merchant_id: '',
        merchant_code: '',
        item_id: items.length > 0 ? String(items[0].id) : '',
        nag: '',
        weight: '',
        rate: '',
        bardana: '0',
    });

    // Active selected merchant in form
    const currentMerchant = merchants.find(m => String(m.id) === String(data.merchant_id));
    const currentItem = items.find(i => String(i.id) === String(data.item_id));

    // Calculate line & gross live
    const numNag = parseFloat(data.nag) || 0;
    const numWeight = parseFloat(data.weight) || 0;
    const numRate = parseFloat(data.rate) || 0;
    const numBardana = parseFloat(data.bardana) || 0;

    // Line amount = Nag x Rate, or Weight x Rate when Weight > 0
    const lineAmount = numWeight > 0 ? (numWeight * numRate) : (numNag * numRate);
    const grossAmount = Math.round((lineAmount + numBardana) * 100) / 100;

    // merchants are already PickerItem-compatible (id, code, name_en, name_ur, current_balance)

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        setData('date', newDate);
        router.get('/amroza', { date: newDate, search: searchFilter }, { preserveState: true, replace: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/amroza', { date: selectedDate, search: searchFilter }, { preserveState: true, replace: true });
    }

    function handleItemChange(itemId: string) {
        setData('item_id', itemId);
        const selected = items.find(i => String(i.id) === itemId);
        if (selected) {
            if (Number(selected.default_rate) > 0 && !data.rate) {
                setData(d => ({ ...d, item_id: itemId, rate: String(selected.default_rate) }));
            }
            if (Number(selected.default_bardana) > 0 && (!data.bardana || data.bardana === '0')) {
                setData(d => ({ ...d, item_id: itemId, bardana: String(selected.default_bardana) }));
            }
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!data.merchant_id) {
            toast.error(t('merchants.list_picker'));
            return;
        }
        if (!data.item_id) {
            toast.error(t('items.item'));
            return;
        }

        if (editingSale) {
            put(`/merchants/amroza/${editingSale.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('common.saved'));
                    setEditingSale(null);
                    resetForm();
                },
            });
        } else {
            post('/merchants/amroza', {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('common.saved'));
                    resetForm();
                },
            });
        }
    }

    function resetForm() {
        setData({
            date: selectedDate,
            merchant_id: '',
            merchant_code: '',
            item_id: items.length > 0 ? String(items[0].id) : '',
            nag: '',
            weight: '',
            rate: '',
            bardana: '0',
        });
        setEditingSale(null);
    }

    function startEdit(sale: Sale) {
        setEditingSale(sale);
        setData({
            date: sale.date,
            merchant_id: String(sale.merchant_id),
            merchant_code: String(sale.merchant?.code || ''),
            item_id: String(sale.item_id),
            nag: String(sale.nag),
            weight: String(sale.weight || ''),
            rate: String(sale.rate),
            bardana: String(sale.bardana || '0'),
        });
    }

    function handleDelete(sale: Sale) {
        router.delete(`/merchants/amroza/${sale.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteConfirm(null);
                toast.success(t('common.deleted'));
            },
        });
    }

    // Load and display Am Total popup
    function openAmTotal() {
        setLoadingAmTotal(true);
        setAmTotalOpen(true);
        fetch(`/merchants/amroza/totals?date=${selectedDate}`)
            .then(res => res.json())
            .then(data => {
                setAmTotalData(data);
                setLoadingAmTotal(false);
            })
            .catch(() => {
                toast.error(t('common.error'));
                setLoadingAmTotal(false);
            });
    }

    // Action Bar Navigation
    function navTop() {
        if (sales.length > 0) setSelectedRowIndex(0);
    }
    function navBottom() {
        if (sales.length > 0) setSelectedRowIndex(sales.length - 1);
    }
    function navPrev() {
        if (selectedRowIndex > 0) setSelectedRowIndex(selectedRowIndex - 1);
    }
    function navNext() {
        if (selectedRowIndex < sales.length - 1) setSelectedRowIndex(selectedRowIndex + 1);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('amroza.title')} />

            <div className="p-3 space-y-3 pb-24" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Header Title + Date Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                    <div>
                        <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
                            <Icon name="Tag" className="w-5 h-5 text-green-700" />
                            {t('amroza.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">{t('branding.name')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Label htmlFor="sale-date" className="text-xs font-semibold">
                            {t('common.date')}:
                        </Label>
                        <Input
                            id="sale-date"
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="w-40 h-8 text-sm font-mono"
                        />
                    </div>
                </div>

                {/* Fast Entry Form (Section 9.1) */}
                <div className="bg-green-50/60 border border-green-200 rounded-lg p-3 shadow-xs">
                    <div className="text-xs font-semibold text-green-900 mb-2 flex items-center justify-between">
                        <span>{editingSale ? t('common.edit') : t('amroza.making_amroza')}</span>
                        {editingSale && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-red-600" onClick={resetForm}>
                                <Icon name="X" className="w-3.5 h-3.5 me-1" />
                                {t('common.cancel')}
                            </Button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Merchant Code & Picker */}
                            <div className="md:col-span-4">
                                <Label className="text-xs">{t('amroza.merchant')} *</Label>
                                <ListPicker
                                    items={merchants}
                                    selectedId={data.merchant_id ? Number(data.merchant_id) : null}
                                    onChange={(item: PickerItem | null) => {
                                        if (item) {
                                            setData(d => ({
                                                ...d,
                                                merchant_id: String(item.id),
                                                merchant_code: String(item.code),
                                            }));
                                            nagRef.current?.focus();
                                        } else {
                                            setData(d => ({ ...d, merchant_id: '', merchant_code: '' }));
                                        }
                                    }}
                                    placeholder="Code..."
                                />
                                {currentMerchant && (
                                    <p className="text-[11px] text-green-700 mt-0.5 truncate">
                                        {isUrdu ? currentMerchant.name_ur : currentMerchant.name_en}
                                        {Number(currentMerchant.code) === 1 ? ` (${t('amroza.naqdi')})` : ` (${t('common.balance')}: Rs. ${Number(currentMerchant.current_balance).toLocaleString()})`}
                                    </p>
                                )}
                            </div>

                            {/* Item Dropdown */}
                            <div className="md:col-span-2">
                                <Label htmlFor="item_id" className="text-xs">{t('amroza.item')} *</Label>
                                <select
                                    id="item_id"
                                    value={data.item_id}
                                    onChange={e => handleItemChange(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
                                    required
                                >
                                    {items.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.code} - {isUrdu ? item.name_ur : item.name_en}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Nag */}
                            <div className="md:col-span-1">
                                <Label htmlFor="nag" className="text-xs">{t('amroza.nag')} *</Label>
                                <Input
                                    ref={nagRef}
                                    id="nag"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={data.nag}
                                    onChange={e => setData('nag', e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            weightRef.current?.focus();
                                        }
                                    }}
                                    className="h-9 font-mono text-center"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Weight */}
                            <div className="md:col-span-1">
                                <Label htmlFor="weight" className="text-xs">{t('amroza.weight')}</Label>
                                <Input
                                    ref={weightRef}
                                    id="weight"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.weight}
                                    onChange={e => setData('weight', e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            rateRef.current?.focus();
                                        }
                                    }}
                                    className="h-9 font-mono text-center"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Rate */}
                            <div className="md:col-span-1">
                                <Label htmlFor="rate" className="text-xs">{t('amroza.rate')} *</Label>
                                <Input
                                    ref={rateRef}
                                    id="rate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.rate}
                                    onChange={e => setData('rate', e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            bardanaRef.current?.focus();
                                        }
                                    }}
                                    className="h-9 font-mono text-center"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            {/* Bardana */}
                            <div className="md:col-span-1">
                                <Label htmlFor="bardana" className="text-xs">{t('amroza.bardana')}</Label>
                                <Input
                                    ref={bardanaRef}
                                    id="bardana"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.bardana}
                                    onChange={e => setData('bardana', e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            submitBtnRef.current?.click();
                                        }
                                    }}
                                    className="h-9 font-mono text-center"
                                    placeholder="0"
                                />
                            </div>

                            {/* Gross (Auto) */}
                            <div className="md:col-span-1">
                                <Label className="text-xs">{t('amroza.gross_amount')}</Label>
                                <div className="h-9 flex items-center justify-center font-mono font-bold text-green-900 bg-white border rounded-md px-2 text-sm shadow-inner">
                                    {grossAmount.toLocaleString()}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="md:col-span-1">
                                <Button
                                    ref={submitBtnRef}
                                    type="submit"
                                    disabled={processing}
                                    className="w-full h-9 bg-green-700 hover:bg-green-800 text-white font-medium"
                                >
                                    {editingSale ? t('common.save') : t('common.add')}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Action Bar (Section 9.1: Top, Previous, Next, Bottom, Add, Edit, Delete, Filter, Am Total, Refresh, Exit) */}
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

                        <div className="h-4 w-px bg-gray-300 mx-1" />

                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={resetForm}>
                            <Icon name="Plus" className="w-3.5 h-3.5 me-1 text-green-700" />
                            {t('common.add')}
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            disabled={selectedRowIndex < 0 || !sales[selectedRowIndex]}
                            onClick={() => selectedRowIndex >= 0 && startEdit(sales[selectedRowIndex])}
                        >
                            <Icon name="Pencil" className="w-3.5 h-3.5 me-1 text-blue-700" />
                            {t('common.edit')}
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            disabled={selectedRowIndex < 0 || !sales[selectedRowIndex]}
                            onClick={() => selectedRowIndex >= 0 && setDeleteConfirm(sales[selectedRowIndex])}
                        >
                            <Icon name="Trash2" className="w-3.5 h-3.5 me-1 text-red-600" />
                            {t('common.delete')}
                        </Button>

                        <div className="h-4 w-px bg-gray-300 mx-1" />

                        <Button size="sm" variant="secondary" className="h-7 text-xs px-2 bg-emerald-700 hover:bg-emerald-800 text-white" onClick={openAmTotal}>
                            <Icon name="Calculator" className="w-3.5 h-3.5 me-1" />
                            {t('amroza.am_total')}
                        </Button>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Search Filter Form */}
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
                        </form>

                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => router.get('/amroza', { date: selectedDate })}
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

                {/* Entries Table (Section 9.1: newest first) */}
                <div className="rounded-lg border overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-xs">
                        <thead className="bg-green-800 text-white select-none">
                            <tr>
                                <th className="p-2 text-center w-10">#</th>
                                <th className="p-2 text-start w-16">{t('common.code')}</th>
                                <th className="p-2 text-start">{t('amroza.merchant')}</th>
                                <th className="p-2 text-start">{t('amroza.item')}</th>
                                <th className="p-2 text-end w-16">{t('amroza.nag')}</th>
                                <th className="p-2 text-end w-20">{t('amroza.weight')}</th>
                                <th className="p-2 text-end w-20">{t('amroza.rate')}</th>
                                <th className="p-2 text-end w-16">{t('amroza.bardana')}</th>
                                <th className="p-2 text-end w-28">{t('amroza.gross_amount')}</th>
                                <th className="p-2 text-center w-16">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-muted-foreground text-sm">
                                        {t('common.no_records')}
                                    </td>
                                </tr>
                            ) : (
                                sales.map((sale, idx) => {
                                    const isSelected = selectedRowIndex === idx;
                                    const isNaqdi = Number(sale.merchant?.code) === 1;

                                    return (
                                        <tr
                                            key={sale.id}
                                            onClick={() => setSelectedRowIndex(idx)}
                                            onDoubleClick={() => startEdit(sale)}
                                            className={`cursor-pointer transition-colors border-b ${
                                                isSelected
                                                    ? 'bg-amber-100/80 font-medium'
                                                    : idx % 2 === 0
                                                    ? 'bg-white hover:bg-gray-50'
                                                    : 'bg-green-50/40 hover:bg-green-50'
                                            }`}
                                        >
                                            <td className="p-2 text-center text-gray-500 font-mono">{idx + 1}</td>
                                            <td className="p-2 font-mono font-semibold text-green-900">
                                                {sale.merchant?.code}
                                            </td>
                                            <td className="p-2">
                                                <span className="font-nastaliq text-sm">
                                                    {isUrdu ? sale.merchant?.name_ur : sale.merchant?.name_en}
                                                </span>
                                                {isNaqdi && (
                                                    <span className="ms-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-sans">
                                                        {t('amroza.naqdi')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <span className="font-nastaliq text-sm">
                                                    {isUrdu ? sale.item?.name_ur : sale.item?.name_en}
                                                </span>
                                                <span className="ms-1 text-[10px] text-gray-500">
                                                    ({sale.item?.unit})
                                                </span>
                                            </td>
                                            <td className="p-2 text-end font-mono font-semibold">{sale.nag}</td>
                                            <td className="p-2 text-end font-mono">{Number(sale.weight) > 0 ? Number(sale.weight).toFixed(2) : '-'}</td>
                                            <td className="p-2 text-end font-mono">{Number(sale.rate).toLocaleString()}</td>
                                            <td className="p-2 text-end font-mono">{Number(sale.bardana) > 0 ? Number(sale.bardana).toLocaleString() : '-'}</td>
                                            <td className="p-2 text-end font-mono font-bold text-green-900">
                                                {Number(sale.gross_amount).toLocaleString()}
                                            </td>
                                            <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-1 justify-center">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 text-blue-600 hover:text-blue-800"
                                                        onClick={() => startEdit(sale)}
                                                    >
                                                        <Icon name="Pencil" className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 text-red-600 hover:text-red-800"
                                                        onClick={() => setDeleteConfirm(sale)}
                                                    >
                                                        <Icon name="Trash2" className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sticky Live Footer (Section 9.1: Record x of y, Total gross, Cash nag and amount, Credit nag and amount) */}
                <div className="fixed bottom-0 start-0 end-0 bg-green-900 text-white px-4 py-2 shadow-lg border-t border-green-700 z-30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-4">
                        <span className="font-medium bg-green-950/60 px-2.5 py-1 rounded">
                            {t('common.record_x_of_y', {
                                current: selectedRowIndex >= 0 ? selectedRowIndex + 1 : 0,
                                total: summary.total_records,
                            })}
                        </span>
                        <span className="text-gray-300">
                            {t('common.total')}: <strong className="text-white font-mono">{summary.total_nag}</strong> {t('amroza.nag')}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 font-mono text-sm">
                        <div className="bg-emerald-800/80 px-3 py-1 rounded">
                            <span className="text-emerald-200 text-xs font-sans me-1">{t('amroza.naqdi')}:</span>
                            <span className="text-white">{summary.cash_nag} {t('amroza.nag')}</span>
                            <span className="text-emerald-300 mx-1">|</span>
                            <span className="font-bold text-emerald-100">Rs. {Number(summary.cash_amount).toLocaleString()}</span>
                        </div>

                        <div className="bg-blue-900/80 px-3 py-1 rounded">
                            <span className="text-blue-200 text-xs font-sans me-1">{t('amroza.udhaari')}:</span>
                            <span className="text-white">{summary.credit_nag} {t('amroza.nag')}</span>
                            <span className="text-blue-300 mx-1">|</span>
                            <span className="font-bold text-blue-100">Rs. {Number(summary.credit_amount).toLocaleString()}</span>
                        </div>

                        <div className="bg-amber-700 px-3 py-1 rounded font-bold text-white shadow-xs">
                            <span className="text-amber-100 text-xs font-sans me-1">{t('amroza.total_gross')}:</span>
                            <span>Rs. {Number(summary.total_gross).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Am Total Popup Dialog (Section 9.1) */}
            <Dialog open={amTotalOpen} onOpenChange={setAmTotalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="text-green-800 flex items-center gap-2">
                            <Icon name="Calculator" className="w-5 h-5" />
                            {t('amroza.am_total')} — {selectedDate}
                        </DialogTitle>
                    </DialogHeader>

                    {loadingAmTotal ? (
                        <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>
                    ) : amTotalData ? (
                        <div className="space-y-4 text-xs">
                            {/* Summary Bar */}
                            <div className="grid grid-cols-3 gap-2 bg-green-50 p-2 rounded-lg border text-center">
                                <div>
                                    <div className="text-muted-foreground">{t('amroza.total_gross')}</div>
                                    <div className="font-mono font-bold text-sm text-green-900">
                                        Rs. {Number(amTotalData.summary.total_gross).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">{t('amroza.naqdi')}</div>
                                    <div className="font-mono font-bold text-sm text-emerald-700">
                                        Rs. {Number(amTotalData.summary.cash_amount).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">{t('amroza.udhaari')}</div>
                                    <div className="font-mono font-bold text-sm text-blue-700">
                                        Rs. {Number(amTotalData.summary.credit_amount).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Totals By Merchant */}
                            <div>
                                <h3 className="font-bold text-green-900 mb-1">{t('merchants.title')}</h3>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 font-semibold text-gray-700">
                                            <tr>
                                                <th className="p-1.5 text-start w-12">{t('common.code')}</th>
                                                <th className="p-1.5 text-start">{t('common.name')}</th>
                                                <th className="p-1.5 text-end w-16">{t('amroza.nag')}</th>
                                                <th className="p-1.5 text-end w-20">{t('amroza.weight')}</th>
                                                <th className="p-1.5 text-end w-24">{t('amroza.gross_amount')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {amTotalData.by_merchant.map((m, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-1.5 font-mono text-green-800">{m.code}</td>
                                                    <td className="p-1.5 font-nastaliq">{isUrdu ? m.name_ur : m.name_en}</td>
                                                    <td className="p-1.5 text-end font-mono">{m.nag}</td>
                                                    <td className="p-1.5 text-end font-mono">{m.weight > 0 ? Number(m.weight).toFixed(2) : '-'}</td>
                                                    <td className="p-1.5 text-end font-mono font-semibold">
                                                        {Number(m.gross).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals By Item */}
                            <div>
                                <h3 className="font-bold text-green-900 mb-1">{t('items.title')}</h3>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100 font-semibold text-gray-700">
                                            <tr>
                                                <th className="p-1.5 text-start w-12">{t('common.code')}</th>
                                                <th className="p-1.5 text-start">{t('common.name')}</th>
                                                <th className="p-1.5 text-end w-16">{t('amroza.nag')}</th>
                                                <th className="p-1.5 text-end w-20">{t('amroza.weight')}</th>
                                                <th className="p-1.5 text-end w-24">{t('amroza.gross_amount')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {amTotalData.by_item.map((item, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-1.5 font-mono text-green-800">{item.code}</td>
                                                    <td className="p-1.5 font-nastaliq">{isUrdu ? item.name_ur : item.name_en}</td>
                                                    <td className="p-1.5 text-end font-mono">{item.nag}</td>
                                                    <td className="p-1.5 text-end font-mono">{item.weight > 0 ? Number(item.weight).toFixed(2) : '-'}</td>
                                                    <td className="p-1.5 text-end font-mono font-semibold">
                                                        {Number(item.gross).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAmTotalOpen(false)}>
                            {t('common.exit')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>{t('common.confirm_delete')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {t('common.delete_warning')}{' '}
                        <strong>
                            {isUrdu ? deleteConfirm?.merchant?.name_ur : deleteConfirm?.merchant?.name_en} - {isUrdu ? deleteConfirm?.item?.name_ur : deleteConfirm?.item?.name_en} (Rs. {Number(deleteConfirm?.gross_amount).toLocaleString()})
                        </strong>?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        >
                            {t('common.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

import React, { useState } from 'react';
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
import MandiPageHeader from '@/components/app/mandi-page-header';
import { toast } from 'sonner';

interface Area {
    id: number;
    name_en: string;
    name_ur: string;
    name: string;
}

interface FarmerMark {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
}

interface Farmer {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    name: string;
    phone: string;
    area_id?: number;
    area?: Area;
    marks?: FarmerMark[];
    opening_balance: number;
    current_balance: number;
    status: string;
}

interface Merchant {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    name: string;
    phone: string;
    opening_balance: number;
    current_balance: number;
    status: string;
}

interface PaginatedData<T> {
    data: T[];
    total: number;
    current_page: number;
    last_page: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    merchants: PaginatedData<Merchant>;
    farmers?: PaginatedData<Farmer>;
    areas?: Area[];
    currentTab?: 'merchants' | 'farmers';
    filters: {
        search?: string;
        tab?: string;
    };
}

export default function MerchantsIndex({
    merchants,
    farmers = { data: [], total: 0, current_page: 1, last_page: 1, links: [] },
    areas = [],
    currentTab = 'merchants',
    filters,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [activeTab, setActiveTab] = useState<'merchants' | 'farmers'>(
        (filters.tab as 'merchants' | 'farmers') || currentTab || 'merchants'
    );
    const [search, setSearch] = useState(filters.search || '');

    // Merchant Modal State
    const [merchantModalOpen, setMerchantModalOpen] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

    // Farmer Modal State
    const [farmerModalOpen, setFarmerModalOpen] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'سیٹ اپ' : 'Setup', href: '#' },
        { title: isUrdu ? 'مرچنٹس و کسان' : 'Merchants & Farmers', href: '/masters/merchants' },
    ];

    // Merchant Form
    const merchantForm = useForm({
        code: '',
        name_ur: '',
        name_en: '',
        phone: '',
        opening_balance: 0,
        status: 'active',
    });

    // Farmer Form
    const farmerForm = useForm({
        code: '',
        name_ur: '',
        name_en: '',
        phone: '',
        area_id: '',
        opening_balance: 0,
        status: 'active',
    });

    const handleTabChange = (tab: 'merchants' | 'farmers') => {
        setActiveTab(tab);
        setSearch('');
        router.get('/masters/merchants', { tab }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/masters/merchants', { search, tab: activeTab }, { preserveState: true });
    };

    // --- Merchant Actions ---
    const openAddMerchant = () => {
        setEditingMerchant(null);
        merchantForm.reset();
        merchantForm.setData({
            code: '',
            name_ur: '',
            name_en: '',
            phone: '',
            opening_balance: 0,
            status: 'active',
        });
        setMerchantModalOpen(true);
    };

    const openEditMerchant = (m: Merchant) => {
        setEditingMerchant(m);
        merchantForm.setData({
            code: String(m.code),
            name_ur: m.name_ur || '',
            name_en: m.name_en || '',
            phone: m.phone || '',
            opening_balance: m.opening_balance || 0,
            status: m.status || 'active',
        });
        setMerchantModalOpen(true);
    };

    const handleMerchantSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMerchant) {
            merchantForm.put(`/masters/merchants/${editingMerchant.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'مرچنٹ تبدیل ہو گیا' : 'Merchant updated successfully');
                    setMerchantModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to update merchant'),
            });
        } else {
            merchantForm.post('/masters/merchants', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'نیا مرچنٹ شامل ہو گیا' : 'Merchant created successfully');
                    setMerchantModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to create merchant'),
            });
        }
    };

    const toggleMerchantStatus = (m: Merchant) => {
        const nextStatus = m.status === 'active' ? 'inactive' : 'active';
        router.put(`/masters/merchants/${m.id}`, {
            code: m.code,
            name_ur: m.name_ur,
            name_en: m.name_en,
            phone: m.phone,
            opening_balance: m.opening_balance,
            status: nextStatus,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(isUrdu ? `اسٹیٹس: ${nextStatus}` : `Status updated to ${nextStatus}`),
        });
    };

    const deleteMerchant = (m: Merchant) => {
        if (m.code === 1) {
            toast.error(isUrdu ? 'کیش کسٹمر ڈیلیٹ نہیں ہو سکتا' : 'Cash customer cannot be deleted');
            return;
        }
        if (!confirm(isUrdu ? 'کیا آپ واقعی اس مرچنٹ کو حذف کرنا چاہتے ہیں؟' : `Are you sure you want to delete ${m.name_ur || m.name_en}?`)) {
            return;
        }
        router.delete(`/masters/merchants/${m.id}`, {
            onSuccess: () => toast.success(isUrdu ? 'مرچنٹ حذف ہو گیا' : 'Merchant deleted successfully'),
            onError: (err: any) => toast.error(err?.message || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Could not delete')),
        });
    };

    // --- Farmer Actions ---
    const openAddFarmer = () => {
        setEditingFarmer(null);
        farmerForm.reset();
        farmerForm.setData({
            code: '',
            name_ur: '',
            name_en: '',
            phone: '',
            area_id: '',
            opening_balance: 0,
            status: 'active',
        });
        setFarmerModalOpen(true);
    };

    const openEditFarmer = (f: Farmer) => {
        setEditingFarmer(f);
        farmerForm.setData({
            code: String(f.code),
            name_ur: f.name_ur || '',
            name_en: f.name_en || '',
            phone: f.phone || '',
            area_id: f.area_id ? String(f.area_id) : '',
            opening_balance: f.opening_balance || 0,
            status: f.status || 'active',
        });
        setFarmerModalOpen(true);
    };

    const handleFarmerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingFarmer) {
            farmerForm.put(`/masters/farmers/${editingFarmer.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'کسان تبدیل ہو گیا' : 'Farmer updated successfully');
                    setFarmerModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to update farmer'),
            });
        } else {
            farmerForm.post('/masters/farmers', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'نیا کسان شامل ہو گیا' : 'Farmer created successfully');
                    setFarmerModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to create farmer'),
            });
        }
    };

    const toggleFarmerStatus = (f: Farmer) => {
        const nextStatus = f.status === 'active' ? 'inactive' : 'active';
        router.put(`/masters/farmers/${f.id}`, {
            code: f.code,
            name_ur: f.name_ur,
            name_en: f.name_en,
            phone: f.phone,
            area_id: f.area_id,
            opening_balance: f.opening_balance,
            status: nextStatus,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(isUrdu ? `اسٹیٹس: ${nextStatus}` : `Status updated to ${nextStatus}`),
        });
    };

    const deleteFarmer = (f: Farmer) => {
        if (!confirm(isUrdu ? 'کیا آپ واقعی اس کسان کو حذف کرنا چاہتے ہیں؟' : `Are you sure you want to delete ${f.name_ur || f.name_en}?`)) {
            return;
        }
        router.delete(`/masters/farmers/${f.id}`, {
            onSuccess: () => toast.success(isUrdu ? 'کسان حذف ہو گیا' : 'Farmer deleted successfully'),
            onError: (err: any) => toast.error(err?.message || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Could not delete')),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'مرچنٹس و کسان' : 'Merchants & Farmers'} />

            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] print:hidden" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Dark Green Top Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'مرچنٹس اور کسان' : 'Merchants & Farmers'}
                    subtitle={isUrdu ? 'خریدار اور زمیندار ماسٹرز ریکارڈ' : 'Buyers (Merchants) & Growers (Farmers)'}
                    isUrdu={isUrdu}
                >
                    <button
                        type="button"
                        onClick={activeTab === 'merchants' ? openAddMerchant : openAddFarmer}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        <Icon name="Plus" className="size-4 text-emerald-800" weight="bold" />
                        <span>
                            {activeTab === 'merchants'
                                ? (isUrdu ? 'نیا مرچنٹ' : '+ Naya Merchant')
                                : (isUrdu ? 'نیا کسان' : '+ Naya Farmer')}
                        </span>
                    </button>
                </MandiPageHeader>

                {/* 2. Floating Content Area */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    
                    {/* Tab Bar & Search Card */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
                        {/* 2 Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-lg">
                            <button
                                type="button"
                                onClick={() => handleTabChange('merchants')}
                                className={`px-4 py-2 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'merchants'
                                        ? 'bg-[#14532d] text-white shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon name="Users" className="size-4" />
                                <span>{isUrdu ? 'مرچنٹس (خریدار)' : 'Merchants (Buyers)'}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeTab === 'merchants' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {merchants.total}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTabChange('farmers')}
                                className={`px-4 py-2 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'farmers'
                                        ? 'bg-[#14532d] text-white shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon name="Tractor" className="size-4" />
                                <span>{isUrdu ? 'زمیندار (کسان)' : 'Farmers (Growers)'}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeTab === 'farmers' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {farmers.total}
                                </span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Icon name="MagnifyingGlass" className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={
                                        activeTab === 'merchants'
                                            ? (isUrdu ? 'مرچنٹ تلاش کریں...' : 'Search merchant...')
                                            : (isUrdu ? 'کسان تلاش کریں...' : 'Search farmer...')
                                    }
                                    className="w-full h-9 ps-9 pe-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                className="h-9 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold cursor-pointer"
                            >
                                {isUrdu ? 'تلاش' : 'Search'}
                            </button>
                        </form>
                    </div>

                    {/* TAB 1: MERCHANTS TABLE */}
                    {activeTab === 'merchants' && (
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans">
                                    <thead>
                                        <tr className="bg-[#14532d] text-white font-bold select-none">
                                            <th className="px-4 py-3 text-start w-20">{isUrdu ? 'کوڈ' : 'Code'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'نام (اردو)' : 'Naam (Urdu)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'نام (انگلش)' : 'Name (English)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'فون' : 'Phone'}</th>
                                            <th className="px-4 py-3 text-end">{isUrdu ? 'سابقہ (Rs.)' : 'Opening (Rs.)'}</th>
                                            <th className="px-4 py-3 text-end">{isUrdu ? 'بقایا (Rs.)' : 'Current Baqaya'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'حالت' : 'Status'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {merchants.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                    {isUrdu ? 'کوئی مرچنٹ موجود نہیں ہے' : 'No merchants found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            merchants.data.map(m => (
                                                <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                                        #{m.code}
                                                        {m.code === 1 && (
                                                            <span className="ms-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold uppercase">
                                                                Naqdi
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-nastaliq font-bold text-gray-900 text-sm">
                                                        {m.name_ur || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">
                                                        {m.name_en || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-gray-600">
                                                        {m.phone || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-end font-mono text-gray-700">
                                                        {Number(m.opening_balance || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-end font-mono font-bold text-gray-900">
                                                        Rs. {Number(m.current_balance || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleMerchantStatus(m)}
                                                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                                                                m.status === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {m.status === 'active' ? (isUrdu ? 'فعال' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditMerchant(m)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600 hover:text-gray-900 cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <Icon name="PencilSimple" className="size-4" />
                                                            </button>
                                                            {m.code !== 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteMerchant(m)}
                                                                    className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                                                                    title="Delete"
                                                                >
                                                                    <Icon name="Trash" className="size-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {merchants.last_page > 1 && (
                                <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Total {merchants.total} records · Page {merchants.current_page} of {merchants.last_page}
                                    </span>
                                    <div className="flex gap-1">
                                        {merchants.links.map((link, idx) => (
                                            <button
                                                key={idx}
                                                disabled={!link.url}
                                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                                                    link.active
                                                        ? 'bg-[#14532d] text-white font-bold'
                                                        : 'hover:bg-gray-100 text-gray-700 disabled:opacity-30'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: FARMERS TABLE */}
                    {activeTab === 'farmers' && (
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans">
                                    <thead>
                                        <tr className="bg-[#14532d] text-white font-bold select-none">
                                            <th className="px-4 py-3 text-start w-20">{isUrdu ? 'کوڈ' : 'Code'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'نام (اردو)' : 'Naam (Urdu)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'نام (انگلش)' : 'Name (English)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'علاقہ' : 'Area (Ilaqa)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'فون' : 'Phone'}</th>
                                            <th className="px-4 py-3 text-end">{isUrdu ? 'سابقہ (Rs.)' : 'Opening (Rs.)'}</th>
                                            <th className="px-4 py-3 text-end">{isUrdu ? 'بقایا (Rs.)' : 'Current Baqaya'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'حالت' : 'Status'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {farmers.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                    {isUrdu ? 'کوئی کسان موجود نہیں ہے' : 'No farmers found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            farmers.data.map(f => {
                                                const isNeg = (f.current_balance || 0) < 0;
                                                return (
                                                    <tr key={f.id} className="hover:bg-gray-50/70 transition-colors">
                                                        <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                                            #{f.code}
                                                        </td>
                                                        <td className="px-4 py-3 font-nastaliq font-bold text-gray-900 text-sm">
                                                            {f.name_ur || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 font-medium">
                                                            {f.name_en || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600">
                                                            {f.area ? (isUrdu ? (f.area.name_ur || f.area.name_en) : (f.area.name_en || f.area.name_ur)) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-gray-600">
                                                            {f.phone || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-end font-mono text-gray-700">
                                                            {Number(f.opening_balance || 0).toLocaleString()}
                                                        </td>
                                                        <td className={`px-4 py-3 text-end font-mono font-bold ${isNeg ? 'text-red-600' : 'text-gray-900'}`}>
                                                            {isNeg ? `- Rs. ${Math.abs(f.current_balance).toLocaleString()}` : `Rs. ${Number(f.current_balance || 0).toLocaleString()}`}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleFarmerStatus(f)}
                                                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                                                                    f.status === 'active'
                                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                }`}
                                                            >
                                                                {f.status === 'active' ? (isUrdu ? 'فعال' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditFarmer(f)}
                                                                    className="h-7 w-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600 hover:text-gray-900 cursor-pointer"
                                                                    title="Edit"
                                                                >
                                                                    <Icon name="PencilSimple" className="size-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteFarmer(f)}
                                                                    className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                                                                    title="Delete"
                                                                >
                                                                    <Icon name="Trash" className="size-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {farmers.last_page > 1 && (
                                <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Total {farmers.total} records · Page {farmers.current_page} of {farmers.last_page}
                                    </span>
                                    <div className="flex gap-1">
                                        {farmers.links.map((link, idx) => (
                                            <button
                                                key={idx}
                                                disabled={!link.url}
                                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
                                                    link.active
                                                        ? 'bg-[#14532d] text-white font-bold'
                                                        : 'hover:bg-gray-100 text-gray-700 disabled:opacity-30'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Merchant Add/Edit Modal */}
            <Dialog open={merchantModalOpen} onOpenChange={setMerchantModalOpen}>
                <DialogContent className="max-w-md font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {editingMerchant
                                ? (isUrdu ? 'مرچنٹ تبدیل کریں' : 'Edit Merchant')
                                : (isUrdu ? '+ نیا مرچنٹ شامل کریں' : '+ Add New Merchant')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleMerchantSubmit} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'کوڈ' : 'Code'}</Label>
                                <Input
                                    type="number"
                                    value={merchantForm.data.code}
                                    onChange={e => merchantForm.setData('code', e.target.value)}
                                    placeholder="Auto"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'فون نمبر' : 'Phone'}</Label>
                                <Input
                                    value={merchantForm.data.phone}
                                    onChange={e => merchantForm.setData('phone', e.target.value)}
                                    placeholder="0300-1234567"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'نام (اردو)' : 'Name (Urdu)'} *</Label>
                            <Input
                                value={merchantForm.data.name_ur}
                                onChange={e => merchantForm.setData('name_ur', e.target.value)}
                                placeholder="مثلاً: حاجی نور محمد"
                                className="h-9 text-xs font-nastaliq"
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'نام (انگلش)' : 'Name (English)'}</Label>
                            <Input
                                value={merchantForm.data.name_en}
                                onChange={e => merchantForm.setData('name_en', e.target.value)}
                                placeholder="e.g. Haji Noor Muhammad"
                                className="h-9 text-xs"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'سابقہ بقایا (Opening Balance Rs.)' : 'Opening Balance (Rs.)'}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={merchantForm.data.opening_balance}
                                onChange={e => merchantForm.setData('opening_balance', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="h-9 text-xs font-mono"
                            />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setMerchantModalOpen(false)} className="text-xs">
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={merchantForm.processing} className="bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-semibold">
                                {isUrdu ? 'محفوظ کریں' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Farmer Add/Edit Modal */}
            <Dialog open={farmerModalOpen} onOpenChange={setFarmerModalOpen}>
                <DialogContent className="max-w-md font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {editingFarmer
                                ? (isUrdu ? 'کسان تبدیل کریں' : 'Edit Farmer')
                                : (isUrdu ? '+ نیا کسان شامل کریں' : '+ Add New Farmer')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFarmerSubmit} className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'کوڈ' : 'Code'}</Label>
                                <Input
                                    type="number"
                                    value={farmerForm.data.code}
                                    onChange={e => farmerForm.setData('code', e.target.value)}
                                    placeholder="Auto"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'فون نمبر' : 'Phone'}</Label>
                                <Input
                                    value={farmerForm.data.phone}
                                    onChange={e => farmerForm.setData('phone', e.target.value)}
                                    placeholder="0300-1234567"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'نام (اردو)' : 'Name (Urdu)'} *</Label>
                            <Input
                                value={farmerForm.data.name_ur}
                                onChange={e => farmerForm.setData('name_ur', e.target.value)}
                                placeholder="مثلاً: وڈیرہ علی محمد"
                                className="h-9 text-xs font-nastaliq"
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'نام (انگلش)' : 'Name (English)'}</Label>
                            <Input
                                value={farmerForm.data.name_en}
                                onChange={e => farmerForm.setData('name_en', e.target.value)}
                                placeholder="e.g. Wadera Ali Muhammad"
                                className="h-9 text-xs"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'علاقہ (Ilaqa)' : 'Area (Ilaqa)'}</Label>
                            <select
                                value={farmerForm.data.area_id}
                                onChange={e => farmerForm.setData('area_id', e.target.value)}
                                className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none"
                            >
                                <option value="">{isUrdu ? 'علاقہ منتخب کریں...' : 'Select area...'}</option>
                                {areas.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {isUrdu ? (a.name_ur || a.name_en) : (a.name_en || a.name_ur)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'سابقہ بقایا (Opening Balance Rs.)' : 'Opening Balance (Rs.)'}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={farmerForm.data.opening_balance}
                                onChange={e => farmerForm.setData('opening_balance', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="h-9 text-xs font-mono"
                            />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setFarmerModalOpen(false)} className="text-xs">
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={farmerForm.processing} className="bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-semibold">
                                {isUrdu ? 'محفوظ کریں' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

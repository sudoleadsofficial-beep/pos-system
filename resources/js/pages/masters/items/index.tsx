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

interface Item {
    id: number;
    name_en: string;
    name_ur: string;
    name: string;
    unit: string;
    default_rate?: number;
    default_bardana?: number;
    status: string;
}

interface Farmer {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
}

interface FarmerMark {
    id: number;
    code: number;
    farmer_id: number;
    farmer?: Farmer;
    name_en: string;
    name_ur: string;
    name: string;
}

interface Area {
    id: number;
    code?: number;
    name_ur: string;
    name_en: string;
    name: string;
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
    items: PaginatedData<Item>;
    marks?: PaginatedData<FarmerMark>;
    areas?: PaginatedData<Area>;
    farmers?: Farmer[];
    currentTab?: 'items' | 'marks' | 'areas';
    filters: {
        search?: string;
        tab?: string;
    };
}

export default function ItemsIndex({
    items,
    marks = { data: [], total: 0, current_page: 1, last_page: 1, links: [] },
    areas = { data: [], total: 0, current_page: 1, last_page: 1, links: [] },
    farmers = [],
    currentTab = 'items',
    filters,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [activeTab, setActiveTab] = useState<'items' | 'marks' | 'areas'>(
        (filters.tab as 'items' | 'marks' | 'areas') || currentTab || 'items'
    );
    const [search, setSearch] = useState(filters.search || '');

    // Modals
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);

    const [markModalOpen, setMarkModalOpen] = useState(false);
    const [editingMark, setEditingMark] = useState<FarmerMark | null>(null);

    const [areaModalOpen, setAreaModalOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'سیٹ اپ' : 'Setup', href: '#' },
        { title: isUrdu ? 'اجناس و مارکس و علاقے' : 'Items, Marks & Areas', href: '/masters/items' },
    ];

    // Item Form
    const itemForm = useForm({
        name_ur: '',
        name_en: '',
        unit: 'kg',
        default_rate: 0,
        default_bardana: 0,
        status: 'active',
    });

    // Mark Form
    const markForm = useForm({
        code: '',
        farmer_id: '',
        name_ur: '',
        name_en: '',
    });

    // Area Form
    const areaForm = useForm({
        name_ur: '',
        name_en: '',
        status: 'active',
    });

    const handleTabChange = (tab: 'items' | 'marks' | 'areas') => {
        setActiveTab(tab);
        setSearch('');
        router.get('/masters/items', { tab }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/masters/items', { search, tab: activeTab }, { preserveState: true });
    };

    // --- ITEM ACTIONS ---
    const openAddItem = () => {
        setEditingItem(null);
        itemForm.reset();
        itemForm.setData({
            name_ur: '',
            name_en: '',
            unit: 'kg',
            default_rate: 0,
            default_bardana: 0,
            status: 'active',
        });
        setItemModalOpen(true);
    };

    const openEditItem = (it: Item) => {
        setEditingItem(it);
        itemForm.setData({
            name_ur: it.name_ur || '',
            name_en: it.name_en || '',
            unit: it.unit || 'kg',
            default_rate: it.default_rate || 0,
            default_bardana: it.default_bardana || 0,
            status: it.status || 'active',
        });
        setItemModalOpen(true);
    };

    const handleItemSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            itemForm.put(`/masters/items/${editingItem.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'جنس تبدیل ہو گئی' : 'Item updated successfully');
                    setItemModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to update item'),
            });
        } else {
            itemForm.post('/masters/items', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'نئی جنس شامل ہو گئی' : 'Item created successfully');
                    setItemModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to create item'),
            });
        }
    };

    const toggleItemStatus = (it: Item) => {
        const nextStatus = it.status === 'active' ? 'inactive' : 'active';
        router.put(`/masters/items/${it.id}`, {
            name_ur: it.name_ur,
            name_en: it.name_en,
            unit: it.unit,
            default_rate: it.default_rate,
            default_bardana: it.default_bardana,
            status: nextStatus,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(isUrdu ? `اسٹیٹس: ${nextStatus}` : `Status updated to ${nextStatus}`),
        });
    };

    const deleteItem = (it: Item) => {
        if (!confirm(isUrdu ? 'کیا آپ واقعی اس جنس کو حذف کرنا چاہتے ہیں؟' : `Are you sure you want to delete ${it.name_ur || it.name_en}?`)) {
            return;
        }
        router.delete(`/masters/items/${it.id}`, {
            onSuccess: () => toast.success(isUrdu ? 'جنس حذف ہو گئی' : 'Item deleted successfully'),
            onError: (err: any) => toast.error(err?.message || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Could not delete')),
        });
    };

    // --- MARK ACTIONS ---
    const openAddMark = () => {
        setEditingMark(null);
        markForm.reset();
        markForm.setData({
            code: '',
            farmer_id: '',
            name_ur: '',
            name_en: '',
        });
        setMarkModalOpen(true);
    };

    const openEditMark = (m: FarmerMark) => {
        setEditingMark(m);
        markForm.setData({
            code: String(m.code || ''),
            farmer_id: String(m.farmer_id || ''),
            name_ur: m.name_ur || '',
            name_en: m.name_en || '',
        });
        setMarkModalOpen(true);
    };

    const handleMarkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMark) {
            markForm.put(`/masters/marks/${editingMark.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'مارک تبدیل ہو گیا' : 'Mark updated successfully');
                    setMarkModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to update mark'),
            });
        } else {
            markForm.post('/masters/marks', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'نیا مارک شامل ہو گیا' : 'Mark created successfully');
                    setMarkModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to create mark'),
            });
        }
    };

    const deleteMark = (m: FarmerMark) => {
        if (!confirm(isUrdu ? 'کیا آپ واقعی اس مارک کو حذف کرنا چاہتے ہیں؟' : `Are you sure you want to delete ${m.name_ur || m.name_en}?`)) {
            return;
        }
        router.delete(`/masters/marks/${m.id}`, {
            onSuccess: () => toast.success(isUrdu ? 'مارک حذف ہو گیا' : 'Mark deleted successfully'),
            onError: (err: any) => toast.error(err?.message || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Could not delete')),
        });
    };

    // --- AREA ACTIONS ---
    const openAddArea = () => {
        setEditingArea(null);
        areaForm.reset();
        areaForm.setData({
            name_ur: '',
            name_en: '',
            status: 'active',
        });
        setAreaModalOpen(true);
    };

    const openEditArea = (a: Area) => {
        setEditingArea(a);
        areaForm.setData({
            name_ur: a.name_ur || '',
            name_en: a.name_en || '',
            status: a.status || 'active',
        });
        setAreaModalOpen(true);
    };

    const handleAreaSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingArea) {
            areaForm.put(`/masters/areas/${editingArea.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'علاقہ تبدیل ہو گیا' : 'Area updated successfully');
                    setAreaModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to update area'),
            });
        } else {
            areaForm.post('/masters/areas', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'نیا علاقہ شامل ہو گیا' : 'Area created successfully');
                    setAreaModalOpen(false);
                },
                onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Failed to create area'),
            });
        }
    };

    const toggleAreaStatus = (a: Area) => {
        const nextStatus = a.status === 'active' ? 'inactive' : 'active';
        router.put(`/masters/areas/${a.id}`, {
            name_ur: a.name_ur,
            name_en: a.name_en,
            status: nextStatus,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(isUrdu ? `اسٹیٹس: ${nextStatus}` : `Status updated to ${nextStatus}`),
        });
    };

    const deleteArea = (a: Area) => {
        if (!confirm(isUrdu ? 'کیا آپ واقعی اس علاقے کو حذف کرنا چاہتے ہیں؟' : `Are you sure you want to delete ${a.name_ur || a.name_en}?`)) {
            return;
        }
        router.delete(`/masters/areas/${a.id}`, {
            onSuccess: () => toast.success(isUrdu ? 'علاقہ حذف ہو گیا' : 'Area deleted successfully'),
            onError: (err: any) => toast.error(err?.message || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Could not delete')),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'اجناس و مارکس و علاقے' : 'Items, Marks & Areas'} />

            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] print:hidden" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Dark Green Top Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'اجناس، مارکس اور علاقے' : 'Items, Marks & Areas'}
                    subtitle={isUrdu ? 'سبزی اجناس، کسان باڑیاں اور علاقہ جات' : 'Produce Items, Farmer Marks & Geographic Areas'}
                    isUrdu={isUrdu}
                >
                    <button
                        type="button"
                        onClick={() => {
                            if (activeTab === 'items') openAddItem();
                            else if (activeTab === 'marks') openAddMark();
                            else openAddArea();
                        }}
                        className={`h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${isUrdu ? 'font-nastaliq' : ''}`}
                    >
                        <Icon name="Plus" className="size-4 text-emerald-800" weight="bold" />
                        <span>
                            {activeTab === 'items' && (isUrdu ? 'نئی جنس' : '+ Nayi Jins')}
                            {activeTab === 'marks' && (isUrdu ? 'نیا مارک' : '+ Naya Mark')}
                            {activeTab === 'areas' && (isUrdu ? 'نیا علاقہ' : '+ Naya Area')}
                        </span>
                    </button>
                </MandiPageHeader>

                {/* 2. Floating Content Area */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    
                    {/* Tab Bar & Search Card */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-3">
                        {/* 3 Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-lg">
                            <button
                                type="button"
                                onClick={() => handleTabChange('items')}
                                className={`px-3.5 py-2 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'items'
                                        ? 'bg-[#14532d] text-white shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon name="Basket" className="size-4" />
                                <span>{isUrdu ? 'اجناس (Items)' : 'Items (Jins)'}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeTab === 'items' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {items.total}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTabChange('marks')}
                                className={`px-3.5 py-2 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'marks'
                                        ? 'bg-[#14532d] text-white shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon name="Tag" className="size-4" />
                                <span>{isUrdu ? 'مارکس (باڑیاں)' : 'Marks (Bari)'}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeTab === 'marks' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {marks.total}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTabChange('areas')}
                                className={`px-3.5 py-2 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                    activeTab === 'areas'
                                        ? 'bg-[#14532d] text-white shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <Icon name="MapPin" className="size-4" />
                                <span>{isUrdu ? 'علاقہ جات (ایریاز)' : 'Areas (Ilaqa)'}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeTab === 'areas' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {areas.total}
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
                                        activeTab === 'items'
                                            ? (isUrdu ? 'جنس تلاش کریں...' : 'Search item...')
                                            : activeTab === 'marks'
                                            ? (isUrdu ? 'مارک یا کسان تلاش کریں...' : 'Search mark or farmer...')
                                            : (isUrdu ? 'علاقہ تلاش کریں...' : 'Search area...')
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

                    {/* TAB 1: ITEMS TABLE */}
                    {activeTab === 'items' && (
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans">
                                    <thead>
                                        <tr className="bg-[#14532d] text-white font-bold select-none">
                                            <th className="px-4 py-3 text-start w-20">{isUrdu ? 'کوڈ' : 'Code'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'نام (اردو)' : 'Naam (Urdu)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'نام (انگلش)' : 'Name (English)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'اکائی' : 'Unit'}</th>
                                            <th className="px-4 py-3 text-end">{isUrdu ? 'ڈیفالٹ ریٹ' : 'Default Rate'}</th>
                                            <th className="px-4 py-3 text-end">{isUrdu ? 'باردانہ' : 'Bardana'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'حالت' : 'Status'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                    {isUrdu ? 'کوئی جنس موجود نہیں ہے' : 'No items found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            items.data.map(it => (
                                                <tr key={it.id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                                        #{it.id}
                                                    </td>
                                                    <td className="px-4 py-3 font-nastaliq font-bold text-gray-900 text-sm">
                                                        {it.name_ur || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">
                                                        {it.name_en || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-gray-600">
                                                        {it.unit || 'kg'}
                                                    </td>
                                                    <td className="px-4 py-3 text-end font-mono text-gray-700">
                                                        {it.default_rate ? `Rs. ${Number(it.default_rate).toLocaleString()}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-end font-mono text-gray-700">
                                                        {it.default_bardana ? `Rs. ${Number(it.default_bardana).toLocaleString()}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleItemStatus(it)}
                                                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                                                                it.status === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {it.status === 'active' ? (isUrdu ? 'فعال' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditItem(it)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600 hover:text-gray-900 cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <Icon name="PencilSimple" className="size-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteItem(it)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                                                                title="Delete"
                                                            >
                                                                <Icon name="Trash" className="size-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {items.last_page > 1 && (
                                <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Total {items.total} records · Page {items.current_page} of {items.last_page}
                                    </span>
                                    <div className="flex gap-1">
                                        {items.links.map((link, idx) => (
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

                    {/* TAB 2: MARKS TABLE */}
                    {activeTab === 'marks' && (
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans">
                                    <thead>
                                        <tr className="bg-[#14532d] text-white font-bold select-none">
                                            <th className="px-4 py-3 text-start w-20">{isUrdu ? 'کوڈ' : 'Code'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'مارک (اردو)' : 'Mark (Urdu)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'مارک (انگلش)' : 'Mark (English)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'کسان (زمیندار)' : 'Farmer (Grower)'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {marks.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                    {isUrdu ? 'کوئی مارک موجود نہیں ہے' : 'No marks found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            marks.data.map(m => (
                                                <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                                        #{m.code}
                                                    </td>
                                                    <td className="px-4 py-3 font-nastaliq font-bold text-gray-900 text-sm">
                                                        {m.name_ur || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">
                                                        {m.name_en || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-800">
                                                        {m.farmer ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <strong className="font-mono text-emerald-800">#{m.farmer.code}</strong>
                                                                <span>{isUrdu ? (m.farmer.name_ur || m.farmer.name_en) : (m.farmer.name_en || m.farmer.name_ur)}</span>
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditMark(m)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600 hover:text-gray-900 cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <Icon name="PencilSimple" className="size-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteMark(m)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                                                                title="Delete"
                                                            >
                                                                <Icon name="Trash" className="size-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {marks.last_page > 1 && (
                                <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Total {marks.total} records · Page {marks.current_page} of {marks.last_page}
                                    </span>
                                    <div className="flex gap-1">
                                        {marks.links.map((link, idx) => (
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

                    {/* TAB 3: AREAS TABLE */}
                    {activeTab === 'areas' && (
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans">
                                    <thead>
                                        <tr className="bg-[#14532d] text-white font-bold select-none">
                                            <th className="px-4 py-3 text-start w-20">{isUrdu ? 'کوڈ' : 'Code'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'علاقہ (اردو)' : 'Area (Urdu)'}</th>
                                            <th className="px-4 py-3 text-start">{isUrdu ? 'علاقہ (انگلش)' : 'Area (English)'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'حالت' : 'Status'}</th>
                                            <th className="px-4 py-3 text-center w-24">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {areas.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                    {isUrdu ? 'کوئی علاقہ موجود نہیں ہے' : 'No areas found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            areas.data.map(a => (
                                                <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                                        #{a.code || a.id}
                                                    </td>
                                                    <td className="px-4 py-3 font-nastaliq font-bold text-gray-900 text-sm">
                                                        {a.name_ur || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 font-medium">
                                                        {a.name_en || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAreaStatus(a)}
                                                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                                                                a.status === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {a.status === 'active' ? (isUrdu ? 'فعال' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditArea(a)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-600 hover:text-gray-900 cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <Icon name="PencilSimple" className="size-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteArea(a)}
                                                                className="h-7 w-7 rounded flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                                                                title="Delete"
                                                            >
                                                                <Icon name="Trash" className="size-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {areas.last_page > 1 && (
                                <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Total {areas.total} records · Page {areas.current_page} of {areas.last_page}
                                    </span>
                                    <div className="flex gap-1">
                                        {areas.links.map((link, idx) => (
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

            {/* Item Add/Edit Modal */}
            <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
                <DialogContent className="max-w-md font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {editingItem
                                ? (isUrdu ? 'جنس تبدیل کریں' : 'Edit Item')
                                : (isUrdu ? '+ نئی جنس شامل کریں' : '+ Add New Item')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleItemSubmit} className="space-y-3 pt-2">
                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'نام (اردو)' : 'Name (Urdu)'} *</Label>
                            <Input
                                value={itemForm.data.name_ur}
                                onChange={e => itemForm.setData('name_ur', e.target.value)}
                                placeholder="مثلاً: ٹماٹر"
                                className="h-9 text-xs font-nastaliq"
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'نام (انگلش)' : 'Name (English)'}</Label>
                            <Input
                                value={itemForm.data.name_en}
                                onChange={e => itemForm.setData('name_en', e.target.value)}
                                placeholder="e.g. Tomato"
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'اکائی (Unit)' : 'Unit'}</Label>
                                <Input
                                    value={itemForm.data.unit}
                                    onChange={e => itemForm.setData('unit', e.target.value)}
                                    placeholder="kg"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'ڈیفالٹ ریٹ' : 'Default Rate'}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={itemForm.data.default_rate}
                                    onChange={e => itemForm.setData('default_rate', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'باردانہ' : 'Bardana'}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={itemForm.data.default_bardana}
                                    onChange={e => itemForm.setData('default_bardana', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setItemModalOpen(false)} className="text-xs">
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={itemForm.processing} className="bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-semibold">
                                {isUrdu ? 'محفوظ کریں' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Mark Add/Edit Modal */}
            <Dialog open={markModalOpen} onOpenChange={setMarkModalOpen}>
                <DialogContent className="max-w-md font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {editingMark
                                ? (isUrdu ? 'مارک تبدیل کریں' : 'Edit Mark')
                                : (isUrdu ? '+ نیا مارک شامل کریں' : '+ Add New Mark')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleMarkSubmit} className="space-y-3 pt-2">
                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'کسان منتخب کریں' : 'Select Farmer'} *</Label>
                            <select
                                required
                                value={markForm.data.farmer_id}
                                onChange={e => markForm.setData('farmer_id', e.target.value)}
                                className="w-full h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none"
                            >
                                <option value="">{isUrdu ? 'کسان منتخب کریں...' : 'Select farmer...'}</option>
                                {farmers.map(f => (
                                    <option key={f.id} value={f.id}>
                                        #{f.code} — {isUrdu ? (f.name_ur || f.name_en) : (f.name_en || f.name_ur)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'مارک کوڈ' : 'Mark Code'}</Label>
                                <Input
                                    type="number"
                                    value={markForm.data.code}
                                    onChange={e => markForm.setData('code', e.target.value)}
                                    placeholder="Auto"
                                    className="h-9 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">{isUrdu ? 'مارک (انگلش)' : 'Mark (English)'}</Label>
                                <Input
                                    value={markForm.data.name_en}
                                    onChange={e => markForm.setData('name_en', e.target.value)}
                                    placeholder="e.g. Bari Red"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'مارک (اردو)' : 'Mark (Urdu)'} *</Label>
                            <Input
                                value={markForm.data.name_ur}
                                onChange={e => markForm.setData('name_ur', e.target.value)}
                                placeholder="مثلاً: خود / باری ریڈ"
                                className="h-9 text-xs font-nastaliq"
                                dir="rtl"
                            />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setMarkModalOpen(false)} className="text-xs">
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={markForm.processing} className="bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-semibold">
                                {isUrdu ? 'محفوظ کریں' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Area Add/Edit Modal */}
            <Dialog open={areaModalOpen} onOpenChange={setAreaModalOpen}>
                <DialogContent className="max-w-md font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {editingArea
                                ? (isUrdu ? 'علاقہ تبدیل کریں' : 'Edit Area')
                                : (isUrdu ? '+ نیا علاقہ شامل کریں' : '+ Add New Area')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAreaSubmit} className="space-y-3 pt-2">
                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'علاقہ کا نام (اردو)' : 'Area Name (Urdu)'} *</Label>
                            <Input
                                value={areaForm.data.name_ur}
                                onChange={e => areaForm.setData('name_ur', e.target.value)}
                                placeholder="مثلاً: سانگھڑ"
                                className="h-9 text-xs font-nastaliq"
                                dir="rtl"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">{isUrdu ? 'علاقہ کا نام (انگلش)' : 'Area Name (English)'}</Label>
                            <Input
                                value={areaForm.data.name_en}
                                onChange={e => areaForm.setData('name_en', e.target.value)}
                                placeholder="e.g. Sanghar"
                                className="h-9 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setAreaModalOpen(false)} className="text-xs">
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={areaForm.processing} className="bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-semibold">
                                {isUrdu ? 'محفوظ کریں' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

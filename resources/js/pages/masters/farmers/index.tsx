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

interface Props {
    farmers: {
        data: Farmer[];
        total: number;
        current_page: number;
        last_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    areas: Area[];
    filters: {
        search?: string;
    };
}

export default function FarmersIndex({ farmers, areas, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'سیٹ اپ' : 'Setup', href: '#' },
        { title: isUrdu ? 'زمیندار (کسان)' : 'Farmers', href: '/masters/farmers' },
    ];

    const { data, setData, post, put, processing, reset, errors } = useForm({
        code: '',
        name_ur: '',
        name_en: '',
        phone: '',
        area_id: '',
        opening_balance: 0,
        status: 'active',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/masters/farmers', { search }, { preserveState: true });
    };

    const openAddModal = () => {
        setEditingFarmer(null);
        reset();
        setData({
            code: '',
            name_ur: '',
            name_en: '',
            phone: '',
            area_id: '',
            opening_balance: 0,
            status: 'active',
        });
        setModalOpen(true);
    };

    const openEditModal = (f: Farmer) => {
        setEditingFarmer(f);
        setData({
            code: String(f.code),
            name_ur: f.name_ur || '',
            name_en: f.name_en || '',
            phone: f.phone || '',
            area_id: f.area_id ? String(f.area_id) : '',
            opening_balance: f.opening_balance || 0,
            status: f.status || 'active',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name_ur && !data.name_en) {
            toast.error(isUrdu ? 'براہ کرم کسان کا نام درج کریں' : 'Barae meherbani kisan ka naam darj karein');
            return;
        }

        if (editingFarmer) {
            put(`/masters/farmers/${editingFarmer.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'کسان کا ریکارڈ اپڈیٹ ہو گیا' : 'Farmer record update ho gaya');
                    setModalOpen(false);
                    reset();
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || (isUrdu ? 'خرابی پیش آ گئی' : 'Ghalti pesh aa gayi'));
                },
            });
        } else {
            post('/masters/farmers', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'کسان کامیابی سے شامل ہو گیا' : 'Farmer kamyabi se shamil ho gaya');
                    setModalOpen(false);
                    reset();
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || (isUrdu ? 'خرابی پیش آ گئی' : 'Ghalti pesh aa gayi'));
                },
            });
        }
    };

    const handleToggleStatus = (f: Farmer) => {
        const newStatus = f.status === 'active' ? 'inactive' : 'active';
        router.put(`/masters/farmers/${f.id}`, {
            code: f.code,
            name_ur: f.name_ur,
            name_en: f.name_en,
            phone: f.phone,
            area_id: f.area_id,
            opening_balance: f.opening_balance,
            status: newStatus,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(isUrdu ? 'اسٹیٹس تبدیل ہو گیا' : 'Status tabdeel ho gaya'),
            onError: () => toast.error(isUrdu ? 'اسٹیٹس تبدیل نہیں ہو سکا' : 'Status tabdeel nahi ho saka'),
        });
    };

    const handleDelete = (f: Farmer) => {
        if (confirm(isUrdu ? `کیا آپ واقعی "${f.name_en || f.name_ur}" کو ڈیلیٹ کرنا چاہتے ہیں؟` : `Kya aap waqai "${f.name_en || f.name_ur}" ko delete karna chahte hain?`)) {
            router.delete(`/masters/farmers/${f.id}`, {
                onSuccess: () => toast.success(isUrdu ? 'کسان ڈیلیٹ ہو گیا' : 'Farmer delete ho gaya'),
                onError: (err: any) => toast.error(err?.error || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Delete nahi ho saka')),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'زمیندار سیٹ اپ' : 'Farmers Setup'} />

            <div className="-mt-3 md:-mt-6 -mx-3 md:-mx-6 pb-24 bg-[#eef2ee] min-h-screen font-sans text-[#1a211c] dark:text-[#e7ece8]" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* 1. Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'زمیندار (کسان)' : 'Farmers Setup'}
                    subtitle={isUrdu ? 'تمام زمینداروں کی فہرست، باری (مارکہ) اور کھاتہ سیٹ اپ' : 'Tamam zamindaron ki list aur khata setup'}
                    isUrdu={isUrdu}
                >
                    <Button
                        type="button"
                        onClick={openAddModal}
                        className="h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <Icon name="Plus" className="w-4 h-4" weight="bold" />
                        <span>{isUrdu ? 'نیا زمیندار' : 'Naya Farmer'}</span>
                    </Button>
                </MandiPageHeader>

                {/* 2. Floating Content Area */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    {/* Search & Meta Bar Card */}
                    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                                {isUrdu ? 'کل ریکارڈز:' : 'Records:'}
                            </span>
                            <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                                {farmers.total}
                            </span>
                        </div>

                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={isUrdu ? "کوڈ یا نام تلاش کریں..." : "Code ya naam likhein..."}
                                className="h-9 w-48 sm:w-64 text-xs rounded-xl border-gray-200 bg-white"
                            />
                            <Button type="submit" variant="secondary" size="sm" className="h-9 rounded-xl border-gray-200 cursor-pointer text-xs">
                                <Icon name="MagnifyingGlass" className="size-3.5 me-1" />
                                {isUrdu ? 'تلاش' : 'Search'}
                            </Button>
                        </form>
                    </div>

                    {/* Table Card */}
                    <div className="rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#f0f4f1] text-[#14532d] border-b border-gray-200 select-none">
                                    <tr>
                                        <th className="py-3 px-4 text-start w-20 font-bold">{isUrdu ? 'کوڈ' : 'Code'}</th>
                                        <th className="py-3 px-4 text-start font-bold">{isUrdu ? 'اردو نام' : 'Naam (Urdu)'}</th>
                                        <th className="py-3 px-4 text-start font-bold">{isUrdu ? 'انگریزی نام' : 'Name (English)'}</th>
                                        <th className="py-3 px-4 text-start w-28 font-bold">{isUrdu ? 'علاقہ' : 'Area'}</th>
                                        <th className="py-3 px-4 text-start w-36 font-bold">{isUrdu ? 'مارکہ / باری' : 'Marks'}</th>
                                        <th className="py-3 px-4 text-start w-32 font-bold">{isUrdu ? 'فون' : 'Phone'}</th>
                                        <th className="py-3 px-4 text-end w-32 font-bold">{isUrdu ? 'ابتدائی بقایا' : 'Opening (Rs)'}</th>
                                        <th className="py-3 px-4 text-end w-32 font-bold">{isUrdu ? 'موجودہ بقایا' : 'Current (Rs)'}</th>
                                        <th className="py-3 px-4 text-center w-24 font-bold">{isUrdu ? 'اسٹیٹس' : 'Status'}</th>
                                        <th className="py-3 px-4 text-center w-24 font-bold">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {farmers.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                                                {isUrdu ? 'کوئی کسان نہیں ملا' : 'Koi farmer nahi mila'}
                                            </td>
                                        </tr>
                                    ) : (
                                        farmers.data.map((f, idx) => (
                                            <tr
                                                key={f.id}
                                                className={`hover:bg-gray-50/80 transition-colors ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-[#fbfcfb]'
                                                }`}
                                            >
                                                <td className="py-3 px-4">
                                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg text-xs">
                                                        #{f.code}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold font-nastaliq text-sm text-gray-900">
                                                    {f.name_ur || '—'}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    {f.name_en || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">
                                                    {f.area ? (isUrdu ? f.area.name_ur || f.area.name_en : f.area.name_en || f.area.name_ur) : '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {f.marks?.map(m => (
                                                            <span key={m.id} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-[#14532d] border border-emerald-200/60 font-medium">
                                                                {m.code === 0 ? (isUrdu ? 'خود (0)' : 'Khud (0)') : `${m.name_ur || m.name_en} (${m.code})`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-gray-600">
                                                    {f.phone || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-end font-mono tabular-nums text-gray-700">
                                                    Rs. {Number(f.opening_balance || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-end font-mono tabular-nums font-bold text-[#14532d]">
                                                    Rs. {Number(f.current_balance || 0).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(f)}
                                                        title={isUrdu ? 'اسٹیٹس تبدیل کرنے کیلئے کلک کریں' : 'Click to toggle status'}
                                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                                                            f.status === 'active'
                                                                ? 'bg-emerald-100 text-[#14532d] hover:bg-emerald-200'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {f.status === 'active' ? (isUrdu ? 'ایکٹو' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(f)}
                                                            className="h-8 w-8 text-gray-500 hover:text-[#14532d] hover:bg-emerald-50 rounded-lg cursor-pointer"
                                                            title={isUrdu ? 'تبدیل کریں' : 'Edit'}
                                                        >
                                                            <Icon name="PencilSimple" className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(f)}
                                                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                                            title={isUrdu ? 'ڈیلیٹ کریں' : 'Delete'}
                                                        >
                                                            <Icon name="Trash" className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {farmers.last_page > 1 && (
                            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span>{isUrdu ? `صفحہ ${farmers.current_page} از ${farmers.last_page}` : `Page ${farmers.current_page} of ${farmers.last_page}`}</span>
                                <div className="flex items-center gap-1">
                                    {farmers.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            className={`px-3 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${
                                                link.active
                                                    ? 'bg-[#14532d] text-white border-[#14532d] font-bold'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                            } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md bg-white rounded-2xl border-0 shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className={`text-base md:text-lg font-bold text-gray-900 ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                            {editingFarmer ? (isUrdu ? 'زمیندار تبدیل کریں' : 'Edit Farmer') : (isUrdu ? 'نیا زمیندار شامل کریں' : 'Add New Farmer')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-2">
                        {/* Urdu Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_ur" className="text-xs font-semibold text-gray-700">
                                {isUrdu ? 'اردو نام' : 'Naam (Urdu)'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name_ur"
                                autoFocus
                                value={data.name_ur}
                                onChange={e => setData('name_ur', e.target.value)}
                                placeholder="مثلاً وڈیرہ علی محمد"
                                className="font-nastaliq text-start h-9 rounded-xl border-gray-200 focus:border-[#14532d]"
                            />
                            {errors.name_ur && <span className="text-xs text-red-500">{errors.name_ur}</span>}
                        </div>

                        {/* English Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_en" className="text-xs font-semibold text-gray-700">
                                {isUrdu ? 'انگریزی نام' : 'Name (English)'}
                            </Label>
                            <Input
                                id="name_en"
                                value={data.name_en}
                                onChange={e => setData('name_en', e.target.value)}
                                placeholder="e.g. Wadera Ali Muhammad"
                                className="text-start h-9 rounded-xl border-gray-200 focus:border-[#14532d]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="code" className="text-xs font-semibold text-gray-700">
                                    {isUrdu ? 'کوڈ' : 'Code'}
                                </Label>
                                <Input
                                    id="code"
                                    type="number"
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder="Auto"
                                    className="font-mono text-start h-9 rounded-xl border-gray-200"
                                />
                                {errors.code && <span className="text-xs text-red-500">{errors.code}</span>}
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">
                                    {isUrdu ? 'فون نمبر' : 'Phone'}
                                </Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="0300-1122334"
                                    className="font-mono text-start h-9 rounded-xl border-gray-200"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="area_id" className="text-xs font-semibold text-gray-700">
                                    {isUrdu ? 'علاقہ' : 'Area'}
                                </Label>
                                <select
                                    id="area_id"
                                    value={data.area_id}
                                    onChange={e => setData('area_id', e.target.value)}
                                    className="h-9 px-3 text-xs rounded-xl border border-gray-200 bg-white"
                                >
                                    <option value="">{isUrdu ? 'علاقہ منتخب کریں' : 'Select Area'}</option>
                                    {areas.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {isUrdu ? (a.name_ur || a.name_en) : (a.name_en || a.name_ur)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="opening_balance" className="text-xs font-semibold text-gray-700">
                                    {isUrdu ? 'ابتدائی بقایا' : 'Opening (Rs)'}
                                </Label>
                                <Input
                                    id="opening_balance"
                                    type="number"
                                    value={data.opening_balance}
                                    onChange={e => setData('opening_balance', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="font-mono text-start h-9 rounded-xl border-gray-200"
                                />
                            </div>
                        </div>

                        <div className="text-[11px] text-gray-600 bg-emerald-50/70 border border-emerald-200/60 p-2.5 rounded-xl">
                            {isUrdu ? 'نئے زمیندار کے لیے کوڈ 0 (خود) کی ڈیفالٹ باری خودکار طور پر بن جائے گی۔' : 'Naye kisan ke liye code 0 (Khud/Self) mark automatically ban jayega.'}
                        </div>

                        <DialogFooter className="pt-3 gap-2 flex items-center justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setModalOpen(false)}
                                className="rounded-xl border-gray-200 text-xs h-9 cursor-pointer"
                            >
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                                className="rounded-xl bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs h-9 px-5 cursor-pointer"
                            >
                                {isUrdu ? 'محفوظ کریں' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
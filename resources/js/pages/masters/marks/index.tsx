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

interface Farmer {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    name: string;
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

interface Props {
    marks: {
        data: FarmerMark[];
        total: number;
        current_page: number;
        last_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    farmers: Farmer[];
    filters: {
        search?: string;
        farmer_id?: string;
    };
}

export default function MarksIndex({ marks, farmers, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [selectedFarmerId, setSelectedFarmerId] = useState(filters.farmer_id || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMark, setEditingMark] = useState<FarmerMark | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'سیٹ اپ' : 'Setup', href: '#' },
        { title: isUrdu ? 'مارکہ / باری' : 'Marks', href: '/masters/marks' },
    ];

    const { data, setData, post, put, processing, reset, errors } = useForm({
        farmer_id: '',
        code: '',
        name_ur: '',
        name_en: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/masters/marks', { search, farmer_id: selectedFarmerId }, { preserveState: true });
    };

    const handleFarmerFilter = (farmerId: string) => {
        setSelectedFarmerId(farmerId);
        router.get('/masters/marks', { search, farmer_id: farmerId }, { preserveState: true });
    };

    const openAddModal = () => {
        setEditingMark(null);
        reset();
        setData({
            farmer_id: selectedFarmerId || (farmers.length > 0 ? String(farmers[0].id) : ''),
            code: '',
            name_ur: '',
            name_en: '',
        });
        setModalOpen(true);
    };

    const openEditModal = (m: FarmerMark) => {
        setEditingMark(m);
        setData({
            farmer_id: String(m.farmer_id),
            code: String(m.code),
            name_ur: m.name_ur || '',
            name_en: m.name_en || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.name_ur && !data.name_en) {
            toast.error(isUrdu ? 'براہ کرم مارکہ کا نام درج کریں' : 'Barae meherbani mark ka naam darj karein');
            return;
        }

        if (editingMark) {
            put(`/masters/marks/${editingMark.id}`, {
                onSuccess: () => {
                    toast.success(isUrdu ? 'مارکہ کا ریکارڈ اپڈیٹ ہو گیا' : 'Mark record update ho gaya');
                    setModalOpen(false);
                    reset();
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || (isUrdu ? 'خرابی پیش آ گئی' : 'Ghalti pesh aa gayi'));
                },
            });
        } else {
            post('/masters/marks', {
                onSuccess: () => {
                    toast.success(isUrdu ? 'مارکہ کامیابی سے شامل ہو گیا' : 'Mark kamyabi se shamil ho gaya');
                    setModalOpen(false);
                    reset();
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || (isUrdu ? 'خرابی پیش آ گئی' : 'Ghalti pesh aa gayi'));
                },
            });
        }
    };

    const handleDelete = (m: FarmerMark) => {
        if (m.code === 0) {
            toast.error(isUrdu ? "خود (0) کا ڈیفالٹ مارکہ حذف نہیں کیا جا سکتا۔" : "Default Mark (0 = Khud) delete nahi kiya ja sakta.");
            return;
        }
        if (confirm(isUrdu ? `کیا آپ واقعی اس مارکہ کو ڈیلیٹ کرنا چاہتے ہیں؟` : `Kya aap waqai is mark ko delete karna chahte hain?`)) {
            router.delete(`/masters/marks/${m.id}`, {
                onSuccess: () => toast.success(isUrdu ? 'مارکہ ڈیلیٹ ہو گیا' : 'Mark delete ho gaya'),
                onError: (err: any) => toast.error(err?.error || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Delete nahi ho saka')),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'مارکہ سیٹ اپ' : 'Marks Setup'} />

            <div className="-mt-3 md:-mt-6 -mx-3 md:-mx-6 pb-24 bg-[#eef2ee] min-h-screen font-sans text-[#1a211c] dark:text-[#e7ece8]" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* 1. Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'مارکہ / باری سیٹ اپ' : 'Farmer Marks Setup'}
                    subtitle={isUrdu ? 'کسان کے مارکہ کوڈز اور تفصیلات' : 'Farmer mark codes aur tafseelat'}
                    isUrdu={isUrdu}
                >
                    <Button
                        type="button"
                        onClick={openAddModal}
                        className="h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <Icon name="Plus" className="w-4 h-4" weight="bold" />
                        <span>{isUrdu ? 'نیا مارکہ' : 'Naya Mark'}</span>
                    </Button>
                </MandiPageHeader>

                {/* 2. Floating Content Area */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    {/* Search & Filter Bar Card */}
                    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                                {isUrdu ? 'کل ریکارڈز:' : 'Records:'}
                            </span>
                            <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                                {marks.total}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={selectedFarmerId}
                                onChange={e => handleFarmerFilter(e.target.value)}
                                className="h-9 px-3 text-xs rounded-xl border border-gray-200 bg-white"
                            >
                                <option value="">{isUrdu ? 'تمام کسان' : 'All Farmers'}</option>
                                {farmers.map(f => (
                                    <option key={f.id} value={f.id}>
                                        #{f.code} - {isUrdu ? (f.name_ur || f.name_en) : (f.name_en || f.name_ur)}
                                    </option>
                                ))}
                            </select>

                            <form onSubmit={handleSearch} className="flex items-center gap-1.5">
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={isUrdu ? "تلاش کریں..." : "Search..."}
                                    className="h-9 w-36 sm:w-48 text-xs rounded-xl border-gray-200 bg-white"
                                />
                                <Button type="submit" variant="secondary" size="sm" className="h-9 rounded-xl border-gray-200 cursor-pointer text-xs">
                                    <Icon name="MagnifyingGlass" className="size-3.5 me-1" />
                                    {isUrdu ? 'تلاش' : 'Search'}
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#f0f4f1] text-[#14532d] border-b border-gray-200 select-none">
                                    <tr>
                                        <th className="py-3 px-4 text-start font-bold">{isUrdu ? 'کسان (زمیندار)' : 'Farmer'}</th>
                                        <th className="py-3 px-4 text-start w-24 font-bold">{isUrdu ? 'مارکہ کوڈ' : 'Mark Code'}</th>
                                        <th className="py-3 px-4 text-start font-bold">{isUrdu ? 'اردو نام' : 'Naam (Urdu)'}</th>
                                        <th className="py-3 px-4 text-start font-bold">{isUrdu ? 'انگریزی نام' : 'Name (English)'}</th>
                                        <th className="py-3 px-4 text-center w-24 font-bold">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {marks.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                                                {isUrdu ? 'کوئی مارکہ نہیں ملا' : 'Koi mark nahi mila'}
                                            </td>
                                        </tr>
                                    ) : (
                                        marks.data.map((m, idx) => {
                                            const isKhud = m.code === 0;
                                            return (
                                                <tr
                                                    key={m.id}
                                                    className={`hover:bg-gray-50/80 transition-colors ${
                                                        idx % 2 === 0 ? 'bg-white' : 'bg-[#fbfcfb]'
                                                    }`}
                                                >
                                                    <td className="py-3 px-4 font-semibold text-gray-900">
                                                        {m.farmer ? `#${m.farmer.code} - ${isUrdu ? (m.farmer.name_ur || m.farmer.name_en) : (m.farmer.name_en || m.farmer.name_ur)}` : '—'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg text-xs">
                                                            {m.code}
                                                        </span>
                                                        {isKhud && (
                                                            <span className="ms-1.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-[#14532d] font-bold">
                                                                {isUrdu ? 'خود' : 'Self'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold font-nastaliq text-sm text-gray-900">
                                                        {m.name_ur || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 font-medium text-gray-900">
                                                        {m.name_en || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEditModal(m)}
                                                                className="h-8 w-8 text-gray-500 hover:text-[#14532d] hover:bg-emerald-50 rounded-lg cursor-pointer"
                                                                title={isUrdu ? 'تبدیل کریں' : 'Edit'}
                                                            >
                                                                <Icon name="PencilSimple" className="w-4 h-4" />
                                                            </Button>
                                                            {!isKhud && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(m)}
                                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                                                    title={isUrdu ? 'ڈیلیٹ کریں' : 'Delete'}
                                                                >
                                                                    <Icon name="Trash" className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {marks.last_page > 1 && (
                            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span>{isUrdu ? `صفحہ ${marks.current_page} از ${marks.last_page}` : `Page ${marks.current_page} of ${marks.last_page}`}</span>
                                <div className="flex items-center gap-1">
                                    {marks.links.map((link, idx) => (
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
                            {editingMark ? (isUrdu ? 'مارکہ تبدیل کریں' : 'Edit Mark') : (isUrdu ? 'نیا مارکہ شامل کریں' : 'Add New Mark')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-2">
                        {!editingMark && (
                            <div className="grid gap-1">
                                <Label htmlFor="farmer_id" className="text-xs font-semibold text-gray-700">
                                    {isUrdu ? 'کسان (زمیندار)' : 'Farmer'} <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="farmer_id"
                                    value={data.farmer_id}
                                    onChange={e => setData('farmer_id', e.target.value)}
                                    className="h-9 px-3 text-xs rounded-xl border border-gray-200 bg-white"
                                    required
                                >
                                    <option value="">{isUrdu ? 'کسان منتخب کریں' : 'Select Farmer'}</option>
                                    {farmers.map(f => (
                                        <option key={f.id} value={f.id}>
                                            #{f.code} - {isUrdu ? (f.name_ur || f.name_en) : (f.name_en || f.name_ur)}
                                        </option>
                                    ))}
                                </select>
                                {errors.farmer_id && <span className="text-xs text-red-500">{errors.farmer_id}</span>}
                            </div>
                        )}

                        <div className="grid gap-1">
                            <Label htmlFor="code" className="text-xs font-semibold text-gray-700">
                                {isUrdu ? 'مارکہ کوڈ' : 'Mark Code'}
                            </Label>
                            <Input
                                id="code"
                                type="number"
                                value={data.code}
                                disabled={editingMark?.code === 0}
                                onChange={e => setData('code', e.target.value)}
                                placeholder="Auto"
                                className="font-mono text-start h-9 rounded-xl border-gray-200"
                            />
                        </div>

                        {/* Urdu Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_ur" className="text-xs font-semibold text-gray-700">
                                {isUrdu ? 'مارکہ نام (اردو)' : 'Mark Name (Urdu)'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name_ur"
                                autoFocus
                                value={data.name_ur}
                                onChange={e => setData('name_ur', e.target.value)}
                                placeholder="مثلاً باری سرخ"
                                className="font-nastaliq text-start h-9 rounded-xl border-gray-200 focus:border-[#14532d]"
                            />
                        </div>

                        {/* English Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_en" className="text-xs font-semibold text-gray-700">
                                {isUrdu ? 'مارکہ نام (انگریزی)' : 'Mark Name (English)'}
                            </Label>
                            <Input
                                id="name_en"
                                value={data.name_en}
                                onChange={e => setData('name_en', e.target.value)}
                                placeholder="e.g. Bari Red"
                                className="text-start h-9 rounded-xl border-gray-200 focus:border-[#14532d]"
                            />
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
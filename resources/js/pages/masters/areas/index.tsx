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
    code: number;
    name_ur: string;
    name_en: string;
    name: string;
    status: string;
}

interface Props {
    areas: {
        data: Area[];
        total: number;
        current_page: number;
        last_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search?: string;
    };
}

export default function AreasIndex({ areas, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'سیٹ اپ' : 'Setup', href: '#' },
        { title: isUrdu ? 'علاقہ جات (ایریاز)' : 'Areas', href: '/masters/areas' },
    ];

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name_ur: '',
        name_en: '',
        status: 'active',
    });

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/masters/areas', { search }, { preserveState: true, replace: true });
    }

    function openAdd() {
        setEditingArea(null);
        reset();
        setData({ name_ur: '', name_en: '', status: 'active' });
        setModalOpen(true);
    }

    function openEdit(area: Area) {
        setEditingArea(area);
        setData({
            name_ur: area.name_ur || '',
            name_en: area.name_en || '',
            status: area.status || 'active',
        });
        setModalOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!data.name_ur && !data.name_en) {
            toast.error(isUrdu ? 'براہ کرم علاقہ کا نام درج کریں' : 'Barae meherbani area ka naam darj karein');
            return;
        }

        if (editingArea) {
            put(`/masters/areas/${editingArea.id}`, {
                onSuccess: () => {
                    setModalOpen(false);
                    toast.success(isUrdu ? 'علاقہ کا ریکارڈ اپڈیٹ ہو گیا' : 'Area record update ho gaya');
                    reset();
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || (isUrdu ? 'خرابی پیش آ گئی' : 'Ghalti pesh aa gayi'));
                },
            });
        } else {
            post('/masters/areas', {
                onSuccess: () => {
                    setModalOpen(false);
                    toast.success(isUrdu ? 'علاقہ کامیابی سے شامل ہو گیا' : 'Area kamyabi se shamil ho gaya');
                    reset();
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || (isUrdu ? 'خرابی پیش آ گئی' : 'Ghalti pesh aa gayi'));
                },
            });
        }
    }

    function handleToggleStatus(area: Area) {
        const newStatus = area.status === 'active' ? 'inactive' : 'active';
        router.put(`/masters/areas/${area.id}`, {
            name_ur: area.name_ur,
            name_en: area.name_en,
            status: newStatus,
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success(isUrdu ? 'اسٹیٹس تبدیل ہو گیا' : 'Status tabdeel ho gaya'),
            onError: () => toast.error(isUrdu ? 'اسٹیٹس تبدیل نہیں ہو سکا' : 'Status tabdeel nahi ho saka'),
        });
    }

    function handleDelete(area: Area) {
        if (confirm(isUrdu ? `کیا آپ واقعی "${area.name_ur || area.name_en}" کو ڈیلیٹ کرنا چاہتے ہیں؟` : `Kya aap waqai "${area.name_en || area.name_ur}" ko delete karna chahte hain?`)) {
            router.delete(`/masters/areas/${area.id}`, {
                onSuccess: () => toast.success(isUrdu ? 'علاقہ ڈیلیٹ ہو گیا' : 'Area delete ho gaya'),
                onError: (err: any) => toast.error(err?.error || (isUrdu ? 'ڈیلیٹ نہیں ہو سکا' : 'Delete nahi ho saka')),
            });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'علاقہ جات سیٹ اپ' : 'Areas Setup'} />

            <div className="-mt-3 md:-mt-6 -mx-3 md:-mx-6 pb-24 bg-[#eef2ee] min-h-screen font-sans text-[#1a211c] dark:text-[#e7ece8]" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* 1. Header Banner */}
                <MandiPageHeader
                    title={isUrdu ? 'علاقہ جات (ایریاز)' : 'Areas Setup'}
                    subtitle={isUrdu ? 'تمام زرعی علاقوں کی فہرست اور سیٹ اپ' : 'Tamam areas ki list aur setup'}
                    isUrdu={isUrdu}
                >
                    <Button
                        type="button"
                        onClick={openAdd}
                        className="h-9 px-4 rounded-xl text-xs md:text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <Icon name="Plus" className="w-4 h-4" weight="bold" />
                        <span>{isUrdu ? 'نیا علاقہ' : 'Naya Area'}</span>
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
                                {areas.total}
                            </span>
                        </div>

                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={isUrdu ? "نام تلاش کریں..." : "Area ka naam likhein..."}
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
                                        <th className="py-3 px-4 text-center w-24 font-bold">{isUrdu ? 'اسٹیٹس' : 'Status'}</th>
                                        <th className="py-3 px-4 text-center w-24 font-bold">{isUrdu ? 'ایکشن' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {areas.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                                                {isUrdu ? 'کوئی علاقہ نہیں ملا' : 'Koi area nahi mila'}
                                            </td>
                                        </tr>
                                    ) : (
                                        areas.data.map((area, idx) => (
                                            <tr
                                                key={area.id}
                                                className={`hover:bg-gray-50/80 transition-colors ${
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-[#fbfcfb]'
                                                }`}
                                            >
                                                <td className="py-3 px-4">
                                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg text-xs">
                                                        #{area.code || area.id}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold font-nastaliq text-sm text-gray-900">
                                                    {area.name_ur || '—'}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    {area.name_en || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(area)}
                                                        title={isUrdu ? 'اسٹیٹس تبدیل کرنے کیلئے کلک کریں' : 'Click to toggle status'}
                                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                                                            area.status === 'active'
                                                                ? 'bg-emerald-100 text-[#14532d] hover:bg-emerald-200'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {area.status === 'active' ? (isUrdu ? 'ایکٹو' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEdit(area)}
                                                            className="h-8 w-8 text-gray-500 hover:text-[#14532d] hover:bg-emerald-50 rounded-lg cursor-pointer"
                                                            title={isUrdu ? 'تبدیل کریں' : 'Edit'}
                                                        >
                                                            <Icon name="PencilSimple" className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(area)}
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
                        {areas.last_page > 1 && (
                            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <span>{isUrdu ? `صفحہ ${areas.current_page} از ${areas.last_page}` : `Page ${areas.current_page} of ${areas.last_page}`}</span>
                                <div className="flex items-center gap-1">
                                    {areas.links.map((link, idx) => (
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

            {/* Add/Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md bg-white rounded-2xl border-0 shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className={`text-base md:text-lg font-bold text-gray-900 ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                            {editingArea ? (isUrdu ? 'علاقہ تبدیل کریں' : 'Edit Area') : (isUrdu ? 'نیا علاقہ شامل کریں' : 'Add New Area')}
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
                                placeholder="مثلاً بدین، ٹھٹھہ، حیدرآباد"
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
                                placeholder="e.g. Badin, Thatta, Hyderabad"
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
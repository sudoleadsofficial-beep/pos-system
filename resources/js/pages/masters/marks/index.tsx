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
        links: any[];
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
        { title: t('nav.home'), href: '/dashboard' },
        { title: t('nav.masters'), href: '#' },
        { title: t('marks.title'), href: '/masters/marks' },
    ];

    const { data, setData, post, put, processing, reset, errors } = useForm({
        farmer_id: '',
        code: '',
        name_ur: '',
        name_en: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('masters.marks.index'), { search, farmer_id: selectedFarmerId }, { preserveState: true });
    };

    const handleFarmerFilter = (farmerId: string) => {
        setSelectedFarmerId(farmerId);
        router.get(route('masters.marks.index'), { search, farmer_id: farmerId }, { preserveState: true });
    };

    const openAddModal = () => {
        setEditingMark(null);
        reset();
        if (selectedFarmerId) {
            setData('farmer_id', selectedFarmerId);
        }
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
        if (editingMark) {
            put(route('masters.marks.update', editingMark.id), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route('masters.marks.store'), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (m: FarmerMark) => {
        if (m.code === 0) {
            toast.error(isUrdu ? "خود (0) کا ڈیفالٹ مارکہ حذف نہیں کیا جا سکتا۔" : "Default Mark (0 = Khud) cannot be deleted.");
            return;
        }
        if (confirm(t('common.confirm_delete'))) {
            router.delete(route('masters.marks.destroy', m.id), {
                onSuccess: () => toast.success(t('common.success')),
                onError: (err) => toast.error(err.error || 'Cannot delete'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('marks.title')} />

            <div className="flex flex-col gap-4">
                {/* Header & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div>
                        <h1 className={`text-xl font-bold tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                            {t('marks.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {t('common.record_x_of_y', { current: marks.data.length, total: marks.total })}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Farmer dropdown filter */}
                        <select
                            value={selectedFarmerId}
                            onChange={e => handleFarmerFilter(e.target.value)}
                            className="h-9 px-3 text-xs rounded-md border bg-background"
                        >
                            <option value="">{t('common.all')} {t('farmers.title')}</option>
                            {farmers.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.code} - {isUrdu ? (f.name_ur || f.name_en) : (f.name_en || f.name_ur)}
                                </option>
                            ))}
                        </select>

                        <form onSubmit={handleSearch} className="flex items-center gap-1.5">
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={isUrdu ? "تلاش کریں..." : "Search..."}
                                className="h-9 w-40 sm:w-48 text-xs"
                            />
                            <Button type="submit" variant="secondary" size="sm" className="h-9 cursor-pointer">
                                <Icon name="MagnifyingGlassIcon" className="size-4 me-1" />
                                {t('common.search')}
                            </Button>
                        </form>

                        <Button onClick={openAddModal} size="sm" className="h-9 cursor-pointer bg-primary text-primary-foreground">
                            <Icon name="PlusIcon" className="size-4 me-1" weight="bold" />
                            {t('marks.add_mark')}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4 text-start w-28">{t('farmers.farmer')}</th>
                                    <th className="py-3 px-4 text-start w-20">{t('marks.code')}</th>
                                    <th className="py-3 px-4 text-start">{t('marks.name_ur')}</th>
                                    <th className="py-3 px-4 text-start">{t('marks.name_en')}</th>
                                    <th className="py-3 px-4 text-center w-28">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {marks.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                                            {t('common.no')} marks found.
                                        </td>
                                    </tr>
                                ) : (
                                    marks.data.map(m => {
                                        const isKhud = m.code === 0;
                                        return (
                                            <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="py-3 px-4 font-semibold">
                                                    {m.farmer ? `${m.farmer.code} - ${isUrdu ? (m.farmer.name_ur || m.farmer.name_en) : (m.farmer.name_en || m.farmer.name_ur)}` : '-'}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold">
                                                    {m.code}
                                                    {isKhud && (
                                                        <span className="ms-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-sans border border-emerald-500/20">
                                                            {isUrdu ? 'خود' : 'Self'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-semibold font-nastaliq text-sm">
                                                    {m.name_ur || '-'}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-foreground">
                                                    {m.name_en || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(m)}
                                                            className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                            title={t('common.edit')}
                                                        >
                                                            <Icon name="PencilSimpleIcon" className="size-4" />
                                                        </Button>
                                                        {!isKhud && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(m)}
                                                                className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                                                title={t('common.delete')}
                                                            >
                                                                <Icon name="TrashIcon" className="size-4" />
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
                </div>
            </div>

            {/* Modal Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className={`text-lg font-bold ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                            {editingMark ? t('marks.edit_mark') : t('marks.add_mark')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
                        {!editingMark && (
                            <div className="grid gap-1">
                                <Label htmlFor="farmer_id" className="text-xs font-semibold">
                                    {t('farmers.farmer')} <span className="text-destructive">*</span>
                                </Label>
                                <select
                                    id="farmer_id"
                                    value={data.farmer_id}
                                    onChange={e => setData('farmer_id', e.target.value)}
                                    className="h-9 px-3 text-xs rounded-md border bg-background"
                                    required
                                >
                                    <option value="">{t('common.select')}</option>
                                    {farmers.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.code} - {isUrdu ? (f.name_ur || f.name_en) : (f.name_en || f.name_ur)}
                                        </option>
                                    ))}
                                </select>
                                {errors.farmer_id && <span className="text-xs text-destructive">{errors.farmer_id}</span>}
                            </div>
                        )}

                        <div className="grid gap-1">
                            <Label htmlFor="code" className="text-xs font-semibold">
                                {t('marks.code')}
                            </Label>
                            <Input
                                id="code"
                                type="number"
                                value={data.code}
                                disabled={editingMark?.code === 0}
                                onChange={e => setData('code', e.target.value)}
                                placeholder="Auto"
                                className="font-mono text-start"
                            />
                        </div>

                        {/* Urdu Name First */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_ur" className="text-xs font-semibold">
                                {t('marks.name_ur')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name_ur"
                                autoFocus
                                value={data.name_ur}
                                onChange={e => setData('name_ur', e.target.value)}
                                placeholder="مثلاً باری سرخ"
                                className="font-nastaliq text-start"
                            />
                        </div>

                        {/* English Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_en" className="text-xs font-semibold">
                                {t('marks.name_en')}
                            </Label>
                            <Input
                                id="name_en"
                                value={data.name_en}
                                onChange={e => setData('name_en', e.target.value)}
                                placeholder="e.g. Bari Red"
                                className="text-start"
                            />
                        </div>

                        <DialogFooter className="pt-3 gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" size="sm" disabled={processing} className="cursor-pointer bg-primary">
                                {t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

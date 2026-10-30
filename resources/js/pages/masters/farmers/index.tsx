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
        links: any[];
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
        { title: t('nav.home'), href: '/dashboard' },
        { title: t('nav.masters'), href: '#' },
        { title: t('farmers.title'), href: '/masters/farmers' },
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
        router.get(route('masters.farmers.index'), { search }, { preserveState: true });
    };

    const openAddModal = () => {
        setEditingFarmer(null);
        reset();
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
        if (editingFarmer) {
            put(route('masters.farmers.update', editingFarmer.id), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route('masters.farmers.store'), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (f: Farmer) => {
        if (confirm(t('common.confirm_delete'))) {
            router.delete(route('masters.farmers.destroy', f.id), {
                onSuccess: () => toast.success(t('common.success')),
                onError: (err) => toast.error(err.error || 'Cannot delete'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('farmers.title')} />

            <div className="flex flex-col gap-4">
                {/* Header & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div>
                        <h1 className={`text-xl font-bold tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                            {t('farmers.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {t('common.record_x_of_y', { current: farmers.data.length, total: farmers.total })}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <form onSubmit={handleSearch} className="flex items-center gap-1.5">
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={isUrdu ? "کوڈ یا نام تلاش کریں..." : "Search code or name..."}
                                className="h-9 w-48 sm:w-64 text-xs"
                            />
                            <Button type="submit" variant="secondary" size="sm" className="h-9 cursor-pointer">
                                <Icon name="MagnifyingGlassIcon" className="size-4 me-1" />
                                {t('common.search')}
                            </Button>
                        </form>

                        <Button onClick={openAddModal} size="sm" className="h-9 cursor-pointer bg-primary text-primary-foreground">
                            <Icon name="PlusIcon" className="size-4 me-1" weight="bold" />
                            {t('farmers.add_farmer')}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4 text-start w-20">{t('farmers.code')}</th>
                                    <th className="py-3 px-4 text-start">{t('farmers.name_ur')}</th>
                                    <th className="py-3 px-4 text-start">{t('farmers.name_en')}</th>
                                    <th className="py-3 px-4 text-start w-28">{t('farmers.area')}</th>
                                    <th className="py-3 px-4 text-start w-32">{t('marks.title')}</th>
                                    <th className="py-3 px-4 text-start w-32">{t('farmers.phone')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('farmers.opening_balance')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('farmers.current_balance')}</th>
                                    <th className="py-3 px-4 text-center w-28">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {farmers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">
                                            {t('common.no')} farmers found.
                                        </td>
                                    </tr>
                                ) : (
                                    farmers.data.map(f => (
                                        <tr key={f.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold">{f.code}</td>
                                            <td className="py-3 px-4 font-semibold font-nastaliq text-sm">
                                                {f.name_ur || '-'}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-foreground">
                                                {f.name_en || '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {f.area ? (isUrdu ? f.area.name_ur || f.area.name_en : f.area.name_en || f.area.name_ur) : '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {f.marks?.map(m => (
                                                        <span key={m.id} className="px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground border">
                                                            {m.code === 0 ? (isUrdu ? 'خود (0)' : 'Khud (0)') : `${m.name_ur || m.name_en} (${m.code})`}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">{f.phone || '-'}</td>
                                            <td className="py-3 px-4 text-end font-mono">Rs. {f.opening_balance}</td>
                                            <td className="py-3 px-4 text-end font-mono font-bold text-primary">Rs. {f.current_balance}</td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditModal(f)}
                                                        className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                        title={t('common.edit')}
                                                    >
                                                        <Icon name="PencilSimpleIcon" className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(f)}
                                                        className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                                        title={t('common.delete')}
                                                    >
                                                        <Icon name="TrashIcon" className="size-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
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
                            {editingFarmer ? t('farmers.edit_farmer') : t('farmers.add_farmer')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
                        {/* Urdu Name First */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_ur" className="text-xs font-semibold">
                                {t('farmers.name_ur')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name_ur"
                                autoFocus
                                value={data.name_ur}
                                onChange={e => setData('name_ur', e.target.value)}
                                placeholder="مثلاً وڈیرہ علی محمد"
                                className="font-nastaliq text-start"
                            />
                            {errors.name_ur && <span className="text-xs text-destructive">{errors.name_ur}</span>}
                        </div>

                        {/* English Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_en" className="text-xs font-semibold">
                                {t('farmers.name_en')}
                            </Label>
                            <Input
                                id="name_en"
                                value={data.name_en}
                                onChange={e => setData('name_en', e.target.value)}
                                placeholder="e.g. Wadera Ali Muhammad"
                                className="text-start"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="code" className="text-xs font-semibold">
                                    {t('farmers.code')}
                                </Label>
                                <Input
                                    id="code"
                                    type="number"
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder="Auto"
                                    className="font-mono text-start"
                                />
                                {errors.code && <span className="text-xs text-destructive">{errors.code}</span>}
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="phone" className="text-xs font-semibold">
                                    {t('farmers.phone')}
                                </Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="0300-1122334"
                                    className="font-mono text-start"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="area_id" className="text-xs font-semibold">
                                    {t('farmers.area')}
                                </Label>
                                <select
                                    id="area_id"
                                    value={data.area_id}
                                    onChange={e => setData('area_id', e.target.value)}
                                    className="h-9 px-3 text-xs rounded-md border bg-background"
                                >
                                    <option value="">{t('common.select')}</option>
                                    {areas.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {isUrdu ? (a.name_ur || a.name_en) : (a.name_en || a.name_ur)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="opening_balance" className="text-xs font-semibold">
                                    {t('farmers.opening_balance')} (Rs)
                                </Label>
                                <Input
                                    id="opening_balance"
                                    type="number"
                                    value={data.opening_balance}
                                    onChange={e => setData('opening_balance', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="font-mono text-start"
                                />
                            </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-md">
                            ℹ️ {isUrdu ? "نئے زمیندار کے لیے کوڈ 0 (خود) کی ڈیفالٹ باری خودکار طور پر بن جائے گی۔" : "A default Mark code 0 (Khud/Self) will be created automatically."}
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

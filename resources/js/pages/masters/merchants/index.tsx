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

interface Props {
    merchants: {
        data: Merchant[];
        total: number;
        current_page: number;
        last_page: number;
        links: any[];
    };
    filters: {
        search?: string;
    };
}

export default function MerchantsIndex({ merchants, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: '/dashboard' },
        { title: t('nav.masters'), href: '#' },
        { title: t('merchants.title'), href: '/masters/merchants' },
    ];

    const { data, setData, post, put, processing, reset, errors } = useForm({
        code: '',
        name_ur: '',
        name_en: '',
        phone: '',
        opening_balance: 0,
        status: 'active',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('masters.merchants.index'), { search }, { preserveState: true });
    };

    const openAddModal = () => {
        setEditingMerchant(null);
        reset();
        setModalOpen(true);
    };

    const openEditModal = (m: Merchant) => {
        setEditingMerchant(m);
        setData({
            code: String(m.code),
            name_ur: m.name_ur || '',
            name_en: m.name_en || '',
            phone: m.phone || '',
            opening_balance: m.opening_balance || 0,
            status: m.status || 'active',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMerchant) {
            put(route('masters.merchants.update', editingMerchant.id), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route('masters.merchants.store'), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (m: Merchant) => {
        if (m.code === 1) {
            toast.error(t('merchants.cash_customer'));
            return;
        }
        if (confirm(t('common.confirm_delete'))) {
            router.delete(route('masters.merchants.destroy', m.id), {
                onSuccess: () => toast.success(t('common.success')),
                onError: (err) => toast.error(err.error || 'Cannot delete'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('merchants.title')} />

            <div className="flex flex-col gap-4">
                {/* Header & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div>
                        <h1 className={`text-xl font-bold tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                            {t('merchants.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {t('common.record_x_of_y', { current: merchants.data.length, total: merchants.total })}
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
                            {t('merchants.add_merchant')}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4 text-start w-20">{t('merchants.code')}</th>
                                    <th className="py-3 px-4 text-start">{t('merchants.name_ur')}</th>
                                    <th className="py-3 px-4 text-start">{t('merchants.name_en')}</th>
                                    <th className="py-3 px-4 text-start w-32">{t('merchants.phone')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('merchants.opening_balance')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('merchants.current_balance')}</th>
                                    <th className="py-3 px-4 text-center w-20">{t('common.status')}</th>
                                    <th className="py-3 px-4 text-center w-28">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {merchants.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                                            {t('common.no')} merchants found.
                                        </td>
                                    </tr>
                                ) : (
                                    merchants.data.map(m => {
                                        const isNaqdi = m.code === 1;
                                        return (
                                            <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="py-3 px-4 font-mono font-bold">
                                                    {m.code}
                                                    {isNaqdi && (
                                                        <span className="ms-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-sans border border-amber-500/20">
                                                            نقدی
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-semibold font-nastaliq text-sm">
                                                    {m.name_ur || '-'}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-foreground">
                                                    {m.name_en || '-'}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground">
                                                    {m.phone || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-end font-mono">
                                                    Rs. {m.opening_balance}
                                                </td>
                                                <td className="py-3 px-4 text-end font-mono font-bold text-primary">
                                                    Rs. {m.current_balance}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        m.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                        {m.status === 'active' ? t('common.active') : t('common.inactive')}
                                                    </span>
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
                                                        {!isNaqdi && (
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
                            {editingMerchant ? t('merchants.edit_merchant') : t('merchants.add_merchant')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
                        {/* Urdu Name Comes First as specified in brief */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_ur" className="text-xs font-semibold">
                                {t('merchants.name_ur')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name_ur"
                                autoFocus
                                value={data.name_ur}
                                onChange={e => setData('name_ur', e.target.value)}
                                placeholder="مثلاً حاجی گل ماشاخور"
                                className="font-nastaliq text-start"
                            />
                            {errors.name_ur && <span className="text-xs text-destructive">{errors.name_ur}</span>}
                        </div>

                        {/* English Name */}
                        <div className="grid gap-1">
                            <Label htmlFor="name_en" className="text-xs font-semibold">
                                {t('merchants.name_en')}
                            </Label>
                            <Input
                                id="name_en"
                                value={data.name_en}
                                onChange={e => setData('name_en', e.target.value)}
                                placeholder="e.g. Haji Gul Merchant"
                                className="text-start"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="code" className="text-xs font-semibold">
                                    {t('merchants.code')}
                                </Label>
                                <Input
                                    id="code"
                                    type="number"
                                    value={data.code}
                                    disabled={editingMerchant?.code === 1}
                                    onChange={e => setData('code', e.target.value)}
                                    placeholder="Auto"
                                    className="font-mono text-start"
                                />
                                {errors.code && <span className="text-xs text-destructive">{errors.code}</span>}
                            </div>

                            <div className="grid gap-1">
                                <Label htmlFor="phone" className="text-xs font-semibold">
                                    {t('merchants.phone')}
                                </Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="0300-1234567"
                                    className="font-mono text-start"
                                />
                            </div>
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="opening_balance" className="text-xs font-semibold">
                                {t('merchants.opening_balance')} (Rs)
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

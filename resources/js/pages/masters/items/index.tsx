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

interface Item {
    id: number;
    code: number;
    name_ur: string;
    name_en: string;
    name: string;
    unit: string;
    default_rate: number;
    default_bardana: number;
    status: string;
}

interface Props {
    items: {
        data: Item[];
        total: number;
        current_page: number;
        last_page: number;
        links: any[];
    };
    filters: {
        search?: string;
    };
}

export default function ItemsIndex({ items, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.masters'), href: '#' },
        { title: t('nav.items'), href: '/masters/items' },
    ];

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name_ur: '',
        name_en: '',
        unit: 'Mun',
        default_rate: '',
        default_bardana: '',
        status: 'active',
    });

    function openAdd() {
        setEditingItem(null);
        reset();
        setData({
            name_ur: '',
            name_en: '',
            unit: 'Mun',
            default_rate: '',
            default_bardana: '',
            status: 'active',
        });
        setModalOpen(true);
    }

    function openEdit(item: Item) {
        setEditingItem(item);
        setData({
            name_ur: item.name_ur,
            name_en: item.name_en,
            unit: item.unit,
            default_rate: String(item.default_rate),
            default_bardana: String(item.default_bardana),
            status: item.status,
        });
        setModalOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editingItem) {
            put(`/masters/items/${editingItem.id}`, {
                onSuccess: () => {
                    setModalOpen(false);
                    toast.success(t('common.saved'));
                    reset();
                },
            });
        } else {
            post('/masters/items', {
                onSuccess: () => {
                    setModalOpen(false);
                    toast.success(t('common.saved'));
                    reset();
                },
            });
        }
    }

    function handleDelete(item: Item) {
        router.delete(`/masters/items/${item.id}`, {
            onSuccess: () => {
                setDeleteConfirm(null);
                toast.success(t('common.deleted'));
            },
            onError: (err) => {
                setDeleteConfirm(null);
                toast.error(Object.values(err)[0] as string);
            },
        });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/masters/items', { search }, { preserveState: true, replace: true });
    }

    const units = ['Mun', 'Kg', 'Box', 'Crate', 'Dozen', 'Piece'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.items')} />

            <div className="p-4 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-green-800">{t('nav.items')}</h1>
                    <Button onClick={openAdd} className="bg-green-700 hover:bg-green-800 text-white">
                        <Icon name="Plus" className="w-4 h-4 me-1" />
                        {t('common.add')}
                    </Button>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('common.search') + '...'}
                        className="flex-1"
                    />
                    <Button type="submit" variant="outline">
                        <Icon name="Search" className="w-4 h-4" />
                    </Button>
                    {search && (
                        <Button variant="ghost" type="button" onClick={() => {
                            setSearch('');
                            router.get('/masters/items', {}, { preserveState: true, replace: true });
                        }}>
                            <Icon name="X" className="w-4 h-4" />
                        </Button>
                    )}
                </form>

                {/* Table */}
                <div className="rounded-lg border overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-green-700 text-white">
                            <tr>
                                <th className="p-3 text-start w-16">{t('common.code')}</th>
                                <th className="p-3 text-start">{t('items.name_ur')}</th>
                                <th className="p-3 text-start">{t('items.name_en')}</th>
                                <th className="p-3 text-start w-20">{t('items.unit')}</th>
                                <th className="p-3 text-end w-28">{t('items.default_rate')}</th>
                                <th className="p-3 text-end w-28">{t('items.default_bardana')}</th>
                                <th className="p-3 text-center w-24">{t('common.status')}</th>
                                <th className="p-3 text-center w-24">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        {t('common.no_records')}
                                    </td>
                                </tr>
                            ) : items.data.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                                    <td className="p-3 font-mono text-green-800">{item.code}</td>
                                    <td className="p-3 font-nastaliq">{item.name_ur}</td>
                                    <td className="p-3">{item.name_en}</td>
                                    <td className="p-3">{item.unit}</td>
                                    <td className="p-3 text-end font-mono">
                                        {Number(item.default_rate).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-end font-mono">
                                        {Number(item.default_bardana).toLocaleString()}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            item.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {item.status === 'active' ? t('common.active') : t('common.inactive')}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex gap-1 justify-center">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                onClick={() => openEdit(item)}
                                            >
                                                <Icon name="Pencil" className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                onClick={() => setDeleteConfirm(item)}
                                            >
                                                <Icon name="Trash2" className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {items.last_page > 1 && (
                    <div className="flex gap-1 justify-center">
                        {items.links.map((link: any, i: number) => (
                            <Button
                                key={i}
                                size="sm"
                                variant={link.active ? 'default' : 'outline'}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                className={link.active ? 'bg-green-700 hover:bg-green-800' : ''}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-lg" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? t('items.edit_item') : t('items.add_item')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="name_ur">{t('items.name_ur')} *</Label>
                                <Input
                                    id="name_ur"
                                    value={data.name_ur}
                                    onChange={e => setData('name_ur', e.target.value)}
                                    dir="rtl"
                                    className="font-nastaliq"
                                    required
                                />
                                {errors.name_ur && <p className="text-xs text-red-500">{errors.name_ur}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="name_en">{t('items.name_en')} *</Label>
                                <Input
                                    id="name_en"
                                    value={data.name_en}
                                    onChange={e => setData('name_en', e.target.value)}
                                    dir="ltr"
                                    required
                                />
                                {errors.name_en && <p className="text-xs text-red-500">{errors.name_en}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="unit">{t('items.unit')} *</Label>
                                <select
                                    id="unit"
                                    value={data.unit}
                                    onChange={e => setData('unit', e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                >
                                    {units.map(u => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
                                </select>
                                {errors.unit && <p className="text-xs text-red-500">{errors.unit}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="default_rate">{t('items.default_rate')}</Label>
                                <Input
                                    id="default_rate"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.default_rate}
                                    onChange={e => setData('default_rate', e.target.value)}
                                    dir="ltr"
                                />
                                {errors.default_rate && <p className="text-xs text-red-500">{errors.default_rate}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="default_bardana">{t('items.default_bardana')}</Label>
                                <Input
                                    id="default_bardana"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.default_bardana}
                                    onChange={e => setData('default_bardana', e.target.value)}
                                    dir="ltr"
                                />
                                {errors.default_bardana && <p className="text-xs text-red-500">{errors.default_bardana}</p>}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>{t('common.status')}</Label>
                            <div className="flex gap-4">
                                {['active', 'inactive'].map(s => (
                                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value={s}
                                            checked={data.status === s}
                                            onChange={() => setData('status', s)}
                                            className="accent-green-700"
                                        />
                                        <span className="text-sm">
                                            {s === 'active' ? t('common.active') : t('common.inactive')}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-green-700 hover:bg-green-800">
                                {processing ? t('common.saving') : t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>{t('common.confirm_delete')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        {t('common.delete_warning')} <strong>{deleteConfirm?.name_ur}</strong>?
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

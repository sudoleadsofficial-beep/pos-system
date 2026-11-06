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
}

interface CommissionAgent {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    phone: string;
    area_id?: number;
    area?: Area;
    opening_balance: number;
    current_balance: number;
    commission_percent?: number;
    status: string;
}

interface Props {
    agents: {
        data: CommissionAgent[];
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

export default function CommissionAgentsIndex({ agents, areas, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<CommissionAgent | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: '/dashboard' },
        { title: t('nav.masters'), href: '#' },
        { title: t('parties.commission_agents.title'), href: '/masters/commission-agents' },
    ];

    const { data, setData, post, put, processing, reset, errors } = useForm({
        code: '',
        name_ur: '',
        name_en: '',
        phone: '',
        area_id: '',
        opening_balance: 0,
        commission_percent: '',
        status: 'active',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('masters.commission-agents.index'), { search }, { preserveState: true });
    };

    const openAddModal = () => {
        setEditingAgent(null);
        reset();
        setModalOpen(true);
    };

    const openEditModal = (a: CommissionAgent) => {
        setEditingAgent(a);
        setData({
            code: String(a.code),
            name_ur: a.name_ur || '',
            name_en: a.name_en || '',
            phone: a.phone || '',
            area_id: a.area_id ? String(a.area_id) : '',
            opening_balance: a.opening_balance || 0,
            commission_percent:
                a.commission_percent !== null && a.commission_percent !== undefined ? String(a.commission_percent) : '',
            status: a.status || 'active',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAgent) {
            put(route('masters.commission-agents.update', editingAgent.id), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        } else {
            post(route('masters.commission-agents.store'), {
                onSuccess: () => {
                    toast.success(t('common.success'));
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (a: CommissionAgent) => {
        if (confirm(t('common.confirm_delete'))) {
            router.delete(route('masters.commission-agents.destroy', a.id), {
                onSuccess: () => toast.success(t('common.success')),
                onError: (err) => toast.error(err.error || 'Cannot delete'),
            });
        }
    };

    const openLedger = (a: CommissionAgent) => {
        router.get(route('parties.show', { type: 'commission_agent', id: a.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('parties.commission_agents.title')} />

            <div className="flex flex-col gap-4">
                {/* Header & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div>
                        <h1 className={`text-xl font-bold tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                            {t('parties.commission_agents.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {t('common.record_x_of_y', { current: agents.data.length, total: agents.total })}
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
                            {t('parties.commission_agents.add_agent')}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4 text-start w-20">{t('parties.code')}</th>
                                    <th className="py-3 px-4 text-start">{t('parties.name_ur')}</th>
                                    <th className="py-3 px-4 text-start">{t('parties.name_en')}</th>
                                    <th className="py-3 px-4 text-start w-28">{t('parties.area')}</th>
                                    <th className="py-3 px-4 text-start w-32">{t('parties.phone')}</th>
                                    <th className="py-3 px-4 text-center w-24">{t('parties.commission_agents.commission_percent')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('parties.opening_balance')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('parties.current_balance')}</th>
                                    <th className="py-3 px-4 text-center w-32">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {agents.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">
                                            {t('common.no_records')}
                                        </td>
                                    </tr>
                                ) : (
                                    agents.data.map(a => (
                                        <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold">{a.code}</td>
                                            <td className="py-3 px-4 font-semibold font-nastaliq text-sm">
                                                {a.name_ur || '-'}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-foreground">
                                                {a.name_en || '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {a.area ? (isUrdu ? a.area.name_ur || a.area.name_en : a.area.name_en || a.area.name_ur) : '-'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">{a.phone || '-'}</td>
                                            <td className="py-3 px-4 text-center font-mono">
                                                {a.commission_percent !== null && a.commission_percent !== undefined
                                                    ? `${a.commission_percent}%`
                                                    : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-end font-mono">Rs. {a.opening_balance}</td>
                                            <td className="py-3 px-4 text-end font-mono font-bold text-primary">Rs. {a.current_balance}</td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openLedger(a)}
                                                        className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                        title={t('parties.view_ledger')}
                                                    >
                                                        <Icon name="BookOpenTextIcon" className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditModal(a)}
                                                        className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                        title={t('common.edit')}
                                                    >
                                                        <Icon name="PencilSimpleIcon" className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(a)}
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

                    {/* Pagination */}
                    {agents.last_page > 1 && (
                        <div className="flex gap-1 justify-center p-3 border-t">
                            {agents.links.map((link: any, i: number) => (
                                <Button
                                    key={i}
                                    size="sm"
                                    variant={link.active ? 'default' : 'outline'}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className={`text-lg font-bold ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                            {editingAgent
                                ? t('parties.commission_agents.edit_agent')
                                : t('parties.commission_agents.add_agent')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
                        <div className="grid gap-1">
                            <Label htmlFor="name_ur" className="text-xs font-semibold">
                                {t('parties.name_ur')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name_ur"
                                autoFocus
                                value={data.name_ur}
                                onChange={e => setData('name_ur', e.target.value)}
                                placeholder={isUrdu ? "مثلاً حاجی گل" : "e.g. Haji Gul"}
                                className="font-nastaliq text-start"
                            />
                            {errors.name_ur && <span className="text-xs text-destructive">{errors.name_ur}</span>}
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="name_en" className="text-xs font-semibold">
                                {t('parties.name_en')}
                            </Label>
                            <Input
                                id="name_en"
                                value={data.name_en}
                                onChange={e => setData('name_en', e.target.value)}
                                placeholder="e.g. Haji Gul"
                                className="text-start"
                            />
                            {errors.name_en && <span className="text-xs text-destructive">{errors.name_en}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="code" className="text-xs font-semibold">
                                    {t('parties.code')}
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
                                    {t('parties.phone')}
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

                        <div className="grid grid-cols-3 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="area_id" className="text-xs font-semibold">
                                    {t('parties.area')}
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
                                    {t('parties.opening_balance')}
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

                            <div className="grid gap-1">
                                <Label htmlFor="commission_percent" className="text-xs font-semibold">
                                    {t('parties.commission_agents.commission_percent')}
                                </Label>
                                <Input
                                    id="commission_percent"
                                    type="number"
                                    step="0.01"
                                    value={data.commission_percent}
                                    onChange={e => setData('commission_percent', e.target.value)}
                                    placeholder="0"
                                    className="font-mono text-start"
                                />
                                {errors.commission_percent && (
                                    <span className="text-xs text-destructive">{errors.commission_percent}</span>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="status" className="text-xs font-semibold">
                                {t('parties.status')}
                            </Label>
                            <select
                                id="status"
                                value={data.status}
                                onChange={e => setData('status', e.target.value)}
                                className="h-9 px-3 text-xs rounded-md border bg-background"
                            >
                                <option value="active">{t('common.active')}</option>
                                <option value="inactive">{t('common.inactive')}</option>
                            </select>
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

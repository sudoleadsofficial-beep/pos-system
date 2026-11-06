import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface Area {
    id: number;
    name_en: string;
    name_ur: string;
}

interface Party {
    type: string;
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    name: string;
    phone: string;
    area_id?: number;
    area?: Area;
    opening_balance: number;
    current_balance: number;
    status: string;
}

interface Props {
    parties: {
        data: Party[];
        total: number;
        current_page: number;
        last_page: number;
        per_page: number;
        links: any[];
    };
    filters: {
        search?: string;
        type?: string;
        area_id?: string;
        status?: string;
        balance?: string;
    };
    areas: Area[];
    types: string[];
}

const TYPE_STYLES: Record<string, string> = {
    farmer: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900',
    supplier: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900',
    buyer: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
    commission_agent:
        'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900',
};

const TYPE_ICONS: Record<string, string> = {
    farmer: 'UserCircleIcon',
    supplier: 'HandshakeIcon',
    buyer: 'UsersIcon',
    commission_agent: 'ScalesIcon',
};

const TYPE_MANAGE_URL: Record<string, string> = {
    farmer: '/masters/farmers',
    supplier: '/masters/suppliers',
    buyer: '/masters/merchants',
    commission_agent: '/masters/commission-agents',
};

export default function PartiesIndex({ parties, filters, areas, types }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [search, setSearch] = useState(filters.search || '');
    const [type, setType] = useState(filters.type || '');
    const [areaId, setAreaId] = useState(filters.area_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [balance, setBalance] = useState(filters.balance || '');
    const [addOpen, setAddOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: '/dashboard' },
        { title: t('nav.parties'), href: '/parties' },
    ];

    const buildParams = (overrides: Record<string, any> = {}) => {
        const params: Record<string, any> = {
            search,
            type,
            area_id: areaId,
            status,
            balance,
            ...overrides,
        };

        Object.keys(params).forEach((key) => {
            if (params[key] === undefined || params[key] === '') {
                delete params[key];
            }
        });

        return params;
    };

    const visit = (overrides: Record<string, any> = {}) => {
        router.get(route('parties.index'), buildParams(overrides), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const debouncedSearch = useDebouncedCallback((value: string) => {
        router.get(route('parties.index'), buildParams({ search: value }), {
            preserveState: true,
            preserveScroll: true,
        });
    }, 600);

    useEffect(() => {
        if ((filters.search || '') !== search) {
            debouncedSearch(search);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const typeLabel = (key: string) => {
        switch (key) {
            case 'farmer':
                return t('parties.farmer');
            case 'supplier':
                return t('parties.supplier');
            case 'buyer':
                return t('parties.buyer');
            case 'commission_agent':
                return t('parties.commission_agent');
            default:
                return key;
        }
    };

    const typeTabs = [
        { key: '', label: t('parties.all_types') },
        ...types.map((key) => ({ key, label: typeLabel(key) })),
    ];

    const balanceLabel = (partyType: string) =>
        partyType === 'buyer' ? t('parties.receivable') : t('parties.payable');

    const openLedger = (party: Party) => {
        router.get(route('parties.show', { type: party.type, id: party.id }));
    };

    const goToType = (key: string) => {
        setAddOpen(false);
        router.get(TYPE_MANAGE_URL[key] || '/parties');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('parties.title')} />

            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                            <h1 className={`text-xl font-bold tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                                {t('parties.title')}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {t('parties.subtitle')} ·{' '}
                                {t('common.record_x_of_y', { current: parties.data.length, total: parties.total })}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Icon
                                    name="MagnifyingGlassIcon"
                                    className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                                />
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={
                                        isUrdu
                                            ? "کوڈ، نام یا فون تلاش کریں..."
                                            : "Search code, name or phone..."
                                    }
                                    className="h-9 w-56 sm:w-72 text-xs ps-8"
                                />
                            </div>

                            <Button
                                onClick={() => setAddOpen(true)}
                                size="sm"
                                className="h-9 cursor-pointer bg-primary text-primary-foreground"
                            >
                                <Icon name="PlusIcon" className="size-4 me-1" weight="bold" />
                                {t('parties.add_party')}
                            </Button>
                        </div>
                    </div>

                    {/* Type tabs */}
                    <div className="flex flex-wrap gap-1.5">
                        {typeTabs.map((tab) => (
                            <Button
                                key={tab.key || 'all'}
                                size="sm"
                                variant={type === tab.key ? 'default' : 'outline'}
                                onClick={() => {
                                    setType(tab.key);
                                    visit({ type: tab.key });
                                }}
                                className={`h-8 cursor-pointer text-xs ${
                                    type === tab.key ? 'bg-primary text-primary-foreground' : ''
                                }`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={areaId}
                            onChange={e => {
                                setAreaId(e.target.value);
                                visit({ area_id: e.target.value });
                            }}
                            className="h-9 px-3 text-xs rounded-md border bg-background"
                        >
                            <option value="">{t('parties.area')}: {t('common.all')}</option>
                            {areas.map(a => (
                                <option key={a.id} value={a.id}>
                                    {isUrdu ? a.name_ur || a.name_en : a.name_en || a.name_ur}
                                </option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={e => {
                                setStatus(e.target.value);
                                visit({ status: e.target.value });
                            }}
                            className="h-9 px-3 text-xs rounded-md border bg-background"
                        >
                            <option value="">{t('parties.status')}: {t('common.all')}</option>
                            <option value="active">{t('common.active')}</option>
                            <option value="inactive">{t('common.inactive')}</option>
                        </select>

                        <select
                            value={balance}
                            onChange={e => {
                                setBalance(e.target.value);
                                visit({ balance: e.target.value });
                            }}
                            className="h-9 px-3 text-xs rounded-md border bg-background"
                        >
                            <option value="">{t('common.all')}</option>
                            <option value="with_balance">{t('parties.has_balance')}</option>
                            <option value="without_balance">{t('parties.no_balance')}</option>
                        </select>

                        {(search || type || areaId || status || balance) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearch('');
                                    setType('');
                                    setAreaId('');
                                    setStatus('');
                                    setBalance('');
                                    router.get(route('parties.index'), {}, { preserveState: true });
                                }}
                                className="h-9 cursor-pointer text-xs"
                            >
                                <Icon name="XIcon" className="size-3.5 me-1" />
                                {t('common.refresh')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/70 text-muted-foreground font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4 text-start w-20">{t('parties.code')}</th>
                                    <th className="py-3 px-4 text-start w-36">{t('parties.type')}</th>
                                    <th className="py-3 px-4 text-start">{t('parties.name_ur')}</th>
                                    <th className="py-3 px-4 text-start">{t('parties.name_en')}</th>
                                    <th className="py-3 px-4 text-start w-32">{t('parties.phone')}</th>
                                    <th className="py-3 px-4 text-start w-28">{t('parties.area')}</th>
                                    <th className="py-3 px-4 text-end w-28">{t('parties.opening_balance')}</th>
                                    <th className="py-3 px-4 text-end w-32">{t('parties.current_balance')}</th>
                                    <th className="py-3 px-4 text-center w-28">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {parties.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">
                                            {t('common.no_records')}
                                        </td>
                                    </tr>
                                ) : (
                                    parties.data.map(party => (
                                        <tr key={`${party.type}-${party.id}`} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold">{party.code}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                                                        TYPE_STYLES[party.type] ?? ''
                                                    }`}
                                                >
                                                    <Icon
                                                        name={TYPE_ICONS[party.type] as any}
                                                        className="size-3"
                                                    />
                                                    {typeLabel(party.type)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-semibold font-nastaliq text-sm">
                                                {party.name_ur || '-'}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-foreground">
                                                {party.name_en || '-'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-muted-foreground">
                                                {party.phone || '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {party.area
                                                    ? isUrdu
                                                        ? party.area.name_ur || party.area.name_en
                                                        : party.area.name_en || party.area.name_ur
                                                    : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-end font-mono">
                                                Rs. {party.opening_balance}
                                            </td>
                                            <td className="py-3 px-4 text-end">
                                                <div className="font-mono font-bold text-primary">
                                                    Rs. {party.current_balance}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {balanceLabel(party.type)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openLedger(party)}
                                                        className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                        title={t('parties.view_ledger')}
                                                    >
                                                        <Icon name="BookOpenTextIcon" className="size-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => goToType(party.type)}
                                                        className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                        title={t('parties.manage')}
                                                    >
                                                        <Icon name="GearIcon" className="size-4" />
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
                    {parties.last_page > 1 && (
                        <div className="flex gap-1 justify-center p-3 border-t">
                            {parties.links.map((link: any, i: number) => (
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

            {/* Add Party chooser */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className={`text-lg font-bold ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                            {t('parties.add_party')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-2 py-2">
                        {types.map(key => (
                            <Button
                                key={key}
                                variant="outline"
                                onClick={() => goToType(key)}
                                className="h-10 cursor-pointer justify-start gap-2"
                            >
                                <Icon name={TYPE_ICONS[key] as any} className="size-4" />
                                {typeLabel(key)}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

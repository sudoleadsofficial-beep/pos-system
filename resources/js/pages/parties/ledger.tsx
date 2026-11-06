import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import PrintLetterhead from '@/components/app/print-letterhead';
import LedgerEntryDialog, { type LedgerEntry } from './_components/ledger-entry-dialog';
import { toast } from 'sonner';

interface Party {
    type: string;
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    name: string;
    phone: string;
    area_id?: number;
    area?: { id: number; name_en: string; name_ur: string; name: string } | null;
    opening_balance: number;
    current_balance: number;
    status: string;
}

interface LedgerRow {
    id: number | null;
    date: string;
    kind: string;
    description: string | null;
    reference: string | null;
    jama: number;
    banam: number;
    sabiqa: number | null;
    balance: number;
}

interface Props {
    party: Party;
    ledger: {
        opening_balance: number;
        entries: LedgerRow[];
        totals: { jama: number; banam: number };
        current_balance: number;
    };
    filters: {
        from_date?: string;
        to_date?: string;
    };
    can_write: boolean;
}

const TYPE_LABELS: Record<string, string> = {
    farmer: 'parties.farmer',
    supplier: 'parties.supplier',
    buyer: 'parties.buyer',
    commission_agent: 'parties.commission_agent',
};

export default function PartyLedger({ party, ledger, filters, can_write }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.home'), href: '/dashboard' },
        { title: t('nav.parties'), href: '/parties' },
        { title: t('parties.ledger'), href: route('parties.show', { type: party.type, id: party.id }) },
    ];

    const typeLabel = t(TYPE_LABELS[party.type] ?? 'parties.buyer');

    const entryLabel = (row: LedgerRow) => {
        if (row.kind === 'amroza') {
            return t('amroza.title');
        }
        if (row.kind === 'wasooli') {
            return t('wasooli.title');
        }
        if (row.kind === 'amroza_wasooli') {
            return t('nav.amroza_wasooli');
        }

        const key = `parties.categories.${row.kind}`;
        const translated = t(key);

        return translated === key ? row.description || row.kind : translated;
    };

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('parties.show', { type: party.type, id: party.id }),
            { from_date: fromDate, to_date: toDate },
            { preserveState: true, replace: true }
        );
    };

    const triggerPrint = () => {
        window.print();
    };

    const openAdd = () => {
        setEditingEntry(null);
        setDialogOpen(true);
    };

    const openEdit = (row: LedgerRow) => {
        setEditingEntry({
            id: row.id,
            date: row.date,
            direction: row.jama > 0 ? 'jama' : 'banam',
            amount: row.jama > 0 ? row.jama : row.banam,
            category: row.kind,
            description: row.description,
            reference: row.reference,
        });
        setDialogOpen(true);
    };

    const removeEntry = (row: LedgerRow) => {
        if (!row.id) {
            return;
        }

        if (confirm(t('common.confirm_delete'))) {
            router.delete(route('parties.entries.destroy', { type: party.type, id: party.id, entry: row.id }), {
                onSuccess: () => toast.success(t('common.success')),
                onError: (err) => toast.error(err.error || 'Cannot delete'),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${typeLabel} - ${t('parties.ledger')}`} />

            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div className="flex items-start gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon name="UserCircleIcon" className="size-5" />
                        </div>
                        <div>
                            <h1 className={`text-xl font-bold tracking-tight ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                                {party.name_ur || party.name_en || '-'}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {party.name_en || '-'} · {t('parties.code')} {party.code} · {typeLabel}
                                {party.phone ? ` · ${party.phone}` : ''}
                                {party.area
                                    ? ` · ${isUrdu ? party.area.name_ur || party.area.name_en : party.area.name_en || party.area.name_ur}`
                                    : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={triggerPrint} className="h-9 cursor-pointer">
                            <Icon name="PrinterIcon" className="size-4 me-1" />
                            {t('parties.print')}
                        </Button>

                        {can_write && (
                            <Button
                                onClick={openAdd}
                                size="sm"
                                className="h-9 cursor-pointer bg-primary text-primary-foreground"
                            >
                                <Icon name="PlusIcon" className="size-4 me-1" weight="bold" />
                                {t('parties.add_entry')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary + date filter */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('parties.opening_balance')}</p>
                            <p className="text-sm font-mono font-semibold">Rs. {ledger.opening_balance}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('parties.total_jama')}</p>
                            <p className="text-sm font-mono font-semibold text-green-700 dark:text-green-400">
                                Rs. {ledger.totals.jama}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('parties.total_banam')}</p>
                            <p className="text-sm font-mono font-semibold text-red-700 dark:text-red-400">
                                Rs. {ledger.totals.banam}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground">{t('parties.current_balance')}</p>
                            <p className="text-sm font-mono font-bold text-primary">Rs. {ledger.current_balance}</p>
                        </div>
                    </div>

                    <form onSubmit={handleFilter} className="flex items-end gap-2">
                        <div className="grid gap-1">
                            <Label htmlFor="from_date" className="text-[11px] font-semibold">
                                {t('parties.from_date')}
                            </Label>
                            <Input
                                id="from_date"
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                className="h-9 w-36 text-xs font-mono"
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="to_date" className="text-[11px] font-semibold">
                                {t('parties.to_date')}
                            </Label>
                            <Input
                                id="to_date"
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                className="h-9 w-36 text-xs font-mono"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm" className="h-9 cursor-pointer">
                            <Icon name="MagnifyingGlassIcon" className="size-4 me-1" />
                            {t('common.filter')}
                        </Button>
                    </form>
                </div>

                {!can_write && (
                    <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-md">
                        ℹ️ {t('parties.read_only_ledger')}
                    </div>
                )}

                {/* Ledger */}
                <div className="bg-white dark:bg-card rounded-xl border shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
                    <div className="px-4 pt-4 print:px-0 print:pt-0">
                        <PrintLetterhead
                            title={`${typeLabel} - ${t('parties.ledger')}`}
                            titleUrdu={party.name_ur || undefined}
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/70 text-muted-foreground font-semibold border-y">
                                <tr>
                                    <th className="py-3 px-4 text-start w-32">{t('parties.entry_date')}</th>
                                    <th className="py-3 px-4 text-start">{t('parties.particulars')}</th>
                                    <th className="py-3 px-4 text-end w-32">{t('parties.jama')}</th>
                                    <th className="py-3 px-4 text-end w-32">{t('parties.banam')}</th>
                                    <th className="py-3 px-4 text-end w-36">{t('parties.balance')}</th>
                                    {can_write && <th className="py-3 px-4 text-center w-24 print:hidden">{t('common.actions')}</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {/* Opening balance row */}
                                <tr className="bg-muted/30">
                                    <td className="py-3 px-4 font-mono text-muted-foreground">-</td>
                                    <td className="py-3 px-4 font-semibold">{t('parties.opening_row')}</td>
                                    <td className="py-3 px-4 text-end font-mono">-</td>
                                    <td className="py-3 px-4 text-end font-mono">-</td>
                                    <td className="py-3 px-4 text-end font-mono font-semibold">
                                        Rs. {ledger.opening_balance}
                                    </td>
                                    {can_write && <td className="py-3 px-4 print:hidden" />}
                                </tr>

                                {ledger.entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={can_write ? 6 : 5} className="py-8 text-center text-muted-foreground text-sm">
                                            {t('parties.no_entries')}
                                        </td>
                                    </tr>
                                ) : (
                                    ledger.entries.map((row, index) => (
                                        <tr key={row.id ?? `row-${index}`} className="hover:bg-muted/40 transition-colors">
                                            <td className="py-3 px-4 font-mono text-muted-foreground">{row.date}</td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium">{entryLabel(row)}</span>
                                                {row.description && row.kind !== 'amroza' && row.kind !== 'wasooli' && (
                                                    <span className="block text-[11px] text-muted-foreground">
                                                        {row.description}
                                                    </span>
                                                )}
                                                {row.reference && (
                                                    <span className="block text-[11px] font-mono text-muted-foreground">
                                                        {row.reference}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-end font-mono text-green-700 dark:text-green-400">
                                                {row.jama > 0 ? row.jama : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-end font-mono text-red-700 dark:text-red-400">
                                                {row.banam > 0 ? row.banam : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-end font-mono font-semibold">
                                                Rs. {row.balance}
                                            </td>
                                            {can_write && (
                                                <td className="py-3 px-4 text-center print:hidden">
                                                    {row.id && (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEdit(row)}
                                                                className="size-7 cursor-pointer text-muted-foreground hover:text-primary"
                                                                title={t('common.edit')}
                                                            >
                                                                <Icon name="PencilSimpleIcon" className="size-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeEntry(row)}
                                                                className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                                                title={t('common.delete')}
                                                            >
                                                                <Icon name="TrashIcon" className="size-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}

                                {/* Totals */}
                                <tr className="bg-muted/50 font-semibold border-t">
                                    <td className="py-3 px-4" colSpan={2}>
                                        {t('common.total')}
                                    </td>
                                    <td className="py-3 px-4 text-end font-mono">Rs. {ledger.totals.jama}</td>
                                    <td className="py-3 px-4 text-end font-mono">Rs. {ledger.totals.banam}</td>
                                    <td className="py-3 px-4 text-end font-mono font-bold text-primary">
                                        Rs. {ledger.current_balance}
                                    </td>
                                    {can_write && <td className="py-3 px-4 print:hidden" />}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <LedgerEntryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                partyType={party.type}
                partyId={party.id}
                entry={editingEntry}
            />
        </AppLayout>
    );
}

import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface DailyRow {
    date: string;
    entries: number;
    purchase_amount: number;
    commission_amount: number;
    paid_amount: number;
}

interface HistoryRow {
    id: number;
    date: string;
    reference: string;
    agent_id: number;
    agent_code: number | null;
    agent_name: string | null;
    agent_name_ur: string | null;
    farmer_name: string | null;
    farmer_name_ur: string | null;
    item_name: string | null;
    item_name_ur: string | null;
    nag: number;
    amount: number;
    commission_percent: number;
    commission_amount: number;
}

interface OutstandingRow {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    phone: string | null;
    area: string | null;
    area_ur: string | null;
    commission_percent: number | null;
    opening_balance: number;
    current_balance: number;
}

interface PaymentRow {
    id: number;
    date: string;
    agent_id: number;
    agent_code: number | null;
    agent_name: string | null;
    agent_name_ur: string | null;
    amount: number;
    reference: string | null;
    description: string | null;
}

interface Totals {
    entries: number;
    total_purchase_amount: number;
    total_commission: number;
    total_paid: number;
    total_outstanding: number;
}

interface AgentOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    commission_percent: number | null;
    current_balance: number;
}

interface Props {
    from: string;
    to: string;
    dailySummary: DailyRow[];
    commissionHistory: HistoryRow[];
    outstanding: OutstandingRow[];
    paymentHistory: PaymentRow[];
    totals: Totals;
    agents: AgentOption[];
}

export default function CommissionReportsIndex({
    from,
    to,
    dailySummary,
    commissionHistory,
    outstanding,
    paymentHistory,
    totals,
    agents,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data: filterData, setData: setFilterData, get } = useForm({ from, to });

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const {
        data: paymentData,
        setData: setPaymentData,
        post: postPayment,
        processing: paying,
        reset: resetPayment,
        errors: paymentErrors,
    } = useForm({
        commission_agent_id: '',
        date: dateToday(),
        amount: '',
        reference: '',
        description: '',
    });

    function dateToday(): string {
        return new Date().toISOString().slice(0, 10);
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('parties.commission_agents.title'), href: '/masters/commission-agents' },
        { title: t('commission_reports.title'), href: '/commission-reports' },
    ];

    function applyFilter(e: React.FormEvent) {
        e.preventDefault();
        get(route('commission-agents.reports'), { preserveState: true });
    }

    function openPaymentForAgent(agentId: number) {
        setPaymentData({
            commission_agent_id: String(agentId),
            date: dateToday(),
            amount: '',
            reference: '',
            description: '',
        });
        setPaymentModalOpen(true);
    }

    function handlePaymentSubmit(e: React.FormEvent) {
        e.preventDefault();
        postPayment(route('commission-agents.payments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('commission_reports.payment_saved'));
                setPaymentModalOpen(false);
                resetPayment();
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('commission_reports.title')} />

            <div className="space-y-6 p-4 sm:p-6">
                {/* Header & Date Range Filter */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-emerald-950 dark:text-emerald-400">{t('commission_reports.title', 'Commission Agent Reports')}</h1>
                        <p className="text-xs text-muted-foreground">{t('commission_reports.subtitle', 'Commission earned and payments settled')}</p>
                    </div>

                    <form onSubmit={applyFilter} className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="from" className="text-xs font-semibold">{t('commission_reports.from_date', 'From')}</Label>
                            <Input
                                id="from"
                                type="date"
                                value={filterData.from}
                                onChange={(e) => setFilterData('from', e.target.value)}
                                className="h-8 text-xs w-36 font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Label htmlFor="to" className="text-xs font-semibold">{t('commission_reports.to_date', 'To')}</Label>
                            <Input
                                id="to"
                                type="date"
                                value={filterData.to}
                                onChange={(e) => setFilterData('to', e.target.value)}
                                className="h-8 text-xs w-36 font-mono"
                            />
                        </div>
                        <Button type="submit" size="sm" variant="outline" className="h-8 gap-1 text-xs">
                            <Icon name="FunnelIcon" className="size-3.5" />
                            {t('common.filter', 'Filter')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                            onClick={() => {
                                resetPayment();
                                setPaymentModalOpen(true);
                            }}
                        >
                            <Icon name="PlusIcon" className="size-3.5" />
                            {t('commission_reports.record_payment', 'Record Payment')}
                        </Button>
                    </form>
                </div>

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Card className="border-border/60 bg-card shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs text-muted-foreground">{t('commission_reports.total_consignments', 'Total Arrivals')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-xl font-bold font-mono text-foreground">{totals.entries}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs text-muted-foreground">{t('commission_reports.total_purchase_amount', 'Purchase Value')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-xl font-bold font-mono text-foreground">Rs. {totals.total_purchase_amount.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs text-emerald-800">{t('commission_reports.total_commission', 'Total Commission')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-xl font-bold font-mono text-emerald-950">Rs. {totals.total_commission.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs text-amber-800">{t('commission_reports.total_paid', 'Total Paid')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-xl font-bold font-mono text-amber-950">Rs. {totals.total_paid.toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50/50 shadow-sm col-span-2 sm:col-span-1">
                        <CardHeader className="p-4 pb-1">
                            <CardTitle className="text-xs text-red-800">{t('commission_reports.total_outstanding', 'Total Outstanding')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-xl font-bold font-mono text-red-950">Rs. {totals.total_outstanding.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section 1: Commission Register */}
                <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="p-4 pb-2 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-foreground">{t('commission_reports.commission_history', 'Commission History')}</CardTitle>
                                <CardDescription className="text-xs">{t('commission_reports.subtitle', 'Commission earned and payments settled')}</CardDescription>
                            </div>
                            <span className="text-xs font-mono font-medium text-muted-foreground">
                                {commissionHistory.length} {t('common.records', 'records')}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-96 overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 text-xs">
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('farmers.reference')}</TableHead>
                                        <TableHead>{t('commission_reports.agent')}</TableHead>
                                        <TableHead>{t('commission_reports.farmer')}</TableHead>
                                        <TableHead>{t('commission_reports.item')}</TableHead>
                                        <TableHead className="text-end">{t('commission_reports.bags')}</TableHead>
                                        <TableHead className="text-end">{t('commission_reports.arrival_amount')}</TableHead>
                                        <TableHead className="text-end">{t('commission_reports.commission_percent')}</TableHead>
                                        <TableHead className="text-end">{t('commission_reports.commission_amount')}</TableHead>
                                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {commissionHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center text-xs py-8 text-muted-foreground">
                                                {t('commission_reports.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        commissionHistory.map((row) => (
                                            <TableRow key={row.id} className="text-xs hover:bg-muted/30">
                                                <TableCell className="font-mono">{row.date}</TableCell>
                                                <TableCell className="font-mono font-medium">{row.reference}</TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-foreground">
                                                        {row.agent_code} - {isUrdu ? row.agent_name_ur : row.agent_name}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{isUrdu ? row.farmer_name_ur : row.farmer_name}</TableCell>
                                                <TableCell>{isUrdu ? row.item_name_ur : row.item_name}</TableCell>
                                                <TableCell className="text-end font-mono">{row.nag}</TableCell>
                                                <TableCell className="text-end font-mono">Rs. {row.amount.toLocaleString()}</TableCell>
                                                <TableCell className="text-end font-mono">{row.commission_percent}%</TableCell>
                                                <TableCell className="text-end font-mono font-bold text-emerald-800">
                                                    Rs. {row.commission_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 text-muted-foreground hover:text-emerald-700 cursor-pointer"
                                                        onClick={() => router.get(`/parties/commission_agent/${row.agent_id}/ledger`)}
                                                        title={t('parties.view_ledger', 'View Ledger')}
                                                    >
                                                        <Icon name="BookOpenTextIcon" className="size-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Agent Outstanding Balances */}
                <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="p-4 pb-2 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold text-foreground">{t('commission_reports.outstanding', 'Outstanding Balances')}</CardTitle>
                                <CardDescription className="text-xs">{t('parties.commission_agents.title', 'Commission Agents')}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-80 overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40 text-xs">
                                        <TableHead>{t('parties.code')}</TableHead>
                                        <TableHead>{t('parties.name')}</TableHead>
                                        <TableHead>{t('parties.area')}</TableHead>
                                        <TableHead>{t('parties.phone')}</TableHead>
                                        <TableHead className="text-center">{t('commission_reports.commission_percent')}</TableHead>
                                        <TableHead className="text-end">{t('parties.opening_balance')}</TableHead>
                                        <TableHead className="text-end">{t('parties.current_balance')}</TableHead>
                                        <TableHead className="text-center">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outstanding.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-xs py-6 text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        outstanding.map((agent) => (
                                            <TableRow key={agent.id} className="text-xs hover:bg-muted/30">
                                                <TableCell className="font-mono font-bold">{agent.code}</TableCell>
                                                <TableCell className="font-medium">
                                                    {isUrdu ? agent.name_ur || agent.name_en : agent.name_en || agent.name_ur}
                                                </TableCell>
                                                <TableCell>{isUrdu ? agent.area_ur || agent.area : agent.area || agent.area_ur || '-'}</TableCell>
                                                <TableCell className="font-mono text-muted-foreground">{agent.phone || '-'}</TableCell>
                                                <TableCell className="text-center font-mono">
                                                    {agent.commission_percent !== null ? `${agent.commission_percent}%` : '-'}
                                                </TableCell>
                                                <TableCell className="text-end font-mono">Rs. {agent.opening_balance.toLocaleString()}</TableCell>
                                                <TableCell
                                                    className={`text-end font-mono font-bold ${
                                                        agent.current_balance > 0 ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    Rs. {agent.current_balance.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-primary cursor-pointer"
                                                            onClick={() => router.get(`/parties/commission_agent/${agent.id}/ledger`)}
                                                            title={t('parties.view_ledger')}
                                                        >
                                                            <Icon name="BookOpenTextIcon" className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-muted-foreground hover:text-emerald-700 cursor-pointer"
                                                            onClick={() => openPaymentForAgent(agent.id)}
                                                            title={t('commission_reports.record_payment', 'Record Payment')}
                                                        >
                                                            <Icon name="CurrencyDollarIcon" className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 3: Daily Summary & Payment History (Side by side on lg) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Daily Summary */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b">
                            <CardTitle className="text-sm font-semibold text-foreground">{t('commission_reports.daily_summary', 'Daily Summary')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-72 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 text-xs">
                                            <TableHead>{t('common.date')}</TableHead>
                                            <TableHead className="text-center">{t('commission_reports.total_consignments')}</TableHead>
                                            <TableHead className="text-end">{t('commission_reports.arrival_amount')}</TableHead>
                                            <TableHead className="text-end">{t('commission_reports.commission_amount')}</TableHead>
                                            <TableHead className="text-end">{t('commission_reports.paid_amount')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dailySummary.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-xs py-6 text-muted-foreground">
                                                    {t('commission_reports.no_records')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            dailySummary.map((day) => (
                                                <TableRow key={day.date} className="text-xs">
                                                    <TableCell className="font-mono">{day.date}</TableCell>
                                                    <TableCell className="text-center font-mono">{day.entries}</TableCell>
                                                    <TableCell className="text-end font-mono">Rs. {day.purchase_amount.toLocaleString()}</TableCell>
                                                    <TableCell className="text-end font-mono font-bold text-emerald-800">
                                                        Rs. {day.commission_amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-end font-mono text-purple-800">
                                                        Rs. {day.paid_amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment History */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader className="p-4 pb-2 border-b">
                            <CardTitle className="text-sm font-semibold text-foreground">{t('commission_reports.payment_history', 'Payment History')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-72 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 text-xs">
                                            <TableHead>{t('common.date')}</TableHead>
                                            <TableHead>{t('commission_reports.agent')}</TableHead>
                                            <TableHead>{t('common.reference')}</TableHead>
                                            <TableHead className="text-end">{t('commission_reports.paid_amount')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paymentHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-xs py-6 text-muted-foreground">
                                                    {t('commission_reports.no_records')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paymentHistory.map((pmt) => (
                                                <TableRow key={pmt.id} className="text-xs">
                                                    <TableCell className="font-mono">{pmt.date}</TableCell>
                                                    <TableCell>
                                                        {pmt.agent_code} - {isUrdu ? pmt.agent_name_ur : pmt.agent_name}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-muted-foreground">{pmt.reference || '-'}</TableCell>
                                                    <TableCell className="text-end font-mono font-bold text-purple-900">
                                                        Rs. {pmt.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Record Payment Dialog */}
                <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-base text-emerald-950 dark:text-emerald-400">{t('commission_reports.record_payment', 'Record Commission Agent Payment')}</DialogTitle>
                            <DialogDescription className="text-xs">{t('commission_reports.record_payment_hint', 'Enter payment details to settle agent commission')}</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handlePaymentSubmit} className="space-y-3 py-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="pmt-agent" className="text-xs font-semibold">{t('commission_reports.agent')}</Label>
                                <Select
                                    value={paymentData.commission_agent_id}
                                    onValueChange={(val) => setPaymentData('commission_agent_id', val)}
                                >
                                    <SelectTrigger id="pmt-agent" className="text-xs">
                                        <SelectValue placeholder={t('parties.commission_agents.title')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agents.map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                                                {a.code} - {isUrdu ? a.name_ur : a.name_en} (Rs. {a.current_balance.toLocaleString()})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {paymentErrors.commission_agent_id && (
                                    <span className="text-xs text-destructive">{paymentErrors.commission_agent_id}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="pmt-date" className="text-xs font-semibold">{t('common.date')}</Label>
                                    <Input
                                        id="pmt-date"
                                        type="date"
                                        value={paymentData.date}
                                        onChange={(e) => setPaymentData('date', e.target.value)}
                                        className="text-xs font-mono"
                                        required
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="pmt-amount" className="text-xs font-semibold">{t('farmers.amount')}</Label>
                                    <Input
                                        id="pmt-amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        dir="ltr"
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData('amount', e.target.value)}
                                        placeholder="0.00"
                                        className="text-xs font-mono"
                                        required
                                    />
                                </div>
                            </div>
                            {paymentErrors.amount && (
                                <span className="text-xs text-destructive">{paymentErrors.amount}</span>
                            )}

                            <div className="grid gap-1.5">
                                <Label htmlFor="pmt-ref" className="text-xs font-semibold">{t('common.reference')}</Label>
                                <Input
                                    id="pmt-ref"
                                    type="text"
                                    value={paymentData.reference}
                                    onChange={(e) => setPaymentData('reference', e.target.value)}
                                    placeholder="Receipt / Voucher #"
                                    className="text-xs"
                                />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="pmt-desc" className="text-xs font-semibold">{t('parties.description')}</Label>
                                <Input
                                    id="pmt-desc"
                                    type="text"
                                    value={paymentData.description}
                                    onChange={(e) => setPaymentData('description', e.target.value)}
                                    placeholder="Cash paid, bank transfer, etc."
                                    className="text-xs"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="text-xs"
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={paying}
                                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
                                >
                                    {paying ? t('common.saving', 'Saving...') : t('commission_reports.save_payment', 'Save Payment')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

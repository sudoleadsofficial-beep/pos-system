import React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

interface ExpenseCategoryItem {
    category: string;
    title: string;
    total: number;
    count: number;
}

interface TrialBalance {
    as_of_date: string;
    assets: {
        cash_in_hand: number;
        accounts_receivable: number;
        total: number;
    };
    liabilities: {
        farmers_payable: number;
        suppliers_payable: number;
        agents_payable: number;
        total: number;
    };
    expenses: {
        total: number;
        by_category: ExpenseCategoryItem[];
    };
    revenue: {
        total_sales: number;
        agent_commission_earned: number;
    };
    net_position: number;
}

interface AccountHead {
    code: string;
    name: string;
    name_ur: string;
    type: 'asset' | 'liability' | 'expense' | 'revenue';
    balance: number;
    url: string;
    description: string;
}

interface Props {
    trialBalance: TrialBalance;
    accountHeads: AccountHead[];
    filters: {
        date: string;
    };
    baselineSettings: {
        opening_cash_balance: number;
        cash_book_start_date: string;
    };
}

export default function GeneralLedgerPage({ trialBalance, accountHeads, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.cash_book'), href: '/cash-book' },
        { title: t('accounting.general_ledger_title'), href: '/general-ledger' },
    ];

    const { data: filterData, setData: setFilterData } = useForm({
        date: filters.date,
    });

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/general-ledger', {
            date: filterData.date,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('accounting.general_ledger_title')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Icon name="ChartBarIcon" className="size-6 text-emerald-700" />
                            {t('accounting.general_ledger_title')}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('accounting.general_ledger_subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/cash-book">
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                <Icon name="BookBookmarkIcon" className="size-3.5" />
                                {t('accounting.cash_book_title')}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Date Filter */}
                <Card className="border border-border/60 bg-muted/20">
                    <CardContent className="p-3">
                        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">{isUrdu ? 'تاریخ تا اختتام:' : 'As of Date:'}</Label>
                                <Input
                                    type="date"
                                    value={filterData.date}
                                    onChange={(e) => setFilterData('date', e.target.value)}
                                    className="h-8 text-xs w-36 font-mono"
                                />
                            </div>

                            <Button type="submit" size="sm" variant="secondary" className="h-8 gap-1 text-xs">
                                <Icon name="FunnelIcon" className="size-3.5" />
                                {t('common.filter') || 'Filter'}
                            </Button>

                            <div className="ml-auto text-xs text-muted-foreground font-mono">
                                {isUrdu ? 'حسابات تا تاریخ:' : 'Financials as of:'} {trialBalance.as_of_date}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Top 4 Financial Position Overview Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardHeader className="p-3.5 pb-1">
                            <CardTitle className="text-xs font-semibold text-emerald-900">{t('accounting.assets')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-emerald-950">
                                Rs. {trialBalance.assets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-emerald-700/90 mt-1 space-y-0.5">
                                <div>Cash: Rs. {trialBalance.assets.cash_in_hand.toLocaleString()}</div>
                                <div>Receivables: Rs. {trialBalance.assets.accounts_receivable.toLocaleString()}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200 bg-rose-50/50">
                        <CardHeader className="p-3.5 pb-1">
                            <CardTitle className="text-xs font-semibold text-rose-900">{t('accounting.liabilities')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-rose-950">
                                Rs. {trialBalance.liabilities.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-rose-700/90 mt-1 space-y-0.5">
                                <div>Farmers: Rs. {trialBalance.liabilities.farmers_payable.toLocaleString()}</div>
                                <div>Suppliers: Rs. {trialBalance.liabilities.suppliers_payable.toLocaleString()}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardHeader className="p-3.5 pb-1">
                            <CardTitle className="text-xs font-semibold text-purple-900">{t('accounting.shop_expenses')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className="text-xl font-bold font-mono text-purple-950">
                                Rs. {trialBalance.expenses.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-purple-700/80 mt-1">
                                {trialBalance.expenses.by_category.length} {isUrdu ? 'مختلف اقسام کے اخراجات' : 'expense categories'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
                        <CardHeader className="p-3.5 pb-1">
                            <CardTitle className="text-xs font-semibold text-emerald-950">{t('accounting.net_position')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                            <div className={`text-xl font-bold font-mono ${trialBalance.net_position >= 0 ? 'text-emerald-950' : 'text-rose-600'}`}>
                                Rs. {trialBalance.net_position.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-emerald-800/80 mt-1 font-semibold">
                                {isUrdu ? 'اثاثہ جات منہا واجبات' : 'Assets minus Liabilities'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Core Account Heads Table */}
                <Card className="border-border/60 shadow-sm overflow-hidden">
                    <CardHeader className="p-3.5 bg-muted/40 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Icon name="ListNumbersIcon" className="size-4 text-emerald-700" />
                            {t('accounting.account_heads')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/20">
                                <TableRow className="text-xs">
                                    <TableHead className="w-20">{t('accounting.account_code')}</TableHead>
                                    <TableHead>{t('accounting.account_name')}</TableHead>
                                    <TableHead className="w-28">{t('accounting.account_type')}</TableHead>
                                    <TableHead className="text-right font-semibold">{t('accounting.account_balance')}</TableHead>
                                    <TableHead className="w-28 text-center">{t('common.action') || 'Action'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accountHeads.map((head) => (
                                    <TableRow key={head.code} className="text-xs hover:bg-muted/30">
                                        <TableCell className="font-mono font-semibold text-muted-foreground py-2.5">
                                            {head.code}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            <div className="font-semibold text-foreground">
                                                {isUrdu ? head.name_ur : head.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                {head.description}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                head.type === 'asset'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : head.type === 'liability'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : head.type === 'expense'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-teal-100 text-teal-800'
                                            }`}>
                                                {head.type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold py-2.5">
                                            Rs. {head.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center py-2.5">
                                            <Link href={head.url}>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50">
                                                    {t('accounting.view_khata')} →
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Operating Expenses Breakdown */}
                {trialBalance.expenses.by_category.length > 0 && (
                    <Card className="border-border/60 shadow-sm overflow-hidden">
                        <CardHeader className="p-3.5 bg-muted/40 border-b">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Icon name="TagIcon" className="size-4 text-purple-700" />
                                {t('accounting.expense_breakdown')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/20">
                                    <TableRow className="text-xs">
                                        <TableHead>{isUrdu ? 'خرچے کی مد / شعبہ' : 'Expense Category'}</TableHead>
                                        <TableHead className="w-28 text-center">{isUrdu ? 'تعداد' : 'Count'}</TableHead>
                                        <TableHead className="text-right font-semibold">{isUrdu ? 'کل رقم (روپے)' : 'Total (Rs)'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trialBalance.expenses.by_category.map((cat) => (
                                        <TableRow key={cat.category} className="text-xs hover:bg-muted/30">
                                            <TableCell className="font-medium py-2">
                                                {cat.title}
                                            </TableCell>
                                            <TableCell className="text-center font-mono py-2 text-muted-foreground">
                                                {cat.count}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-purple-900 py-2">
                                                Rs. {cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import PrintLetterhead from '@/components/app/print-letterhead';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import ReceiptModal, { type ReceiptData } from '@/components/app/receipt-modal';
import { toast } from 'sonner';

interface EntryItem {
    id: string;
    date: string;
    time: string;
    category: string;
    sub_category?: string;
    title: string;
    title_ur: string;
    party_name: string;
    reference: string;
    payment_method: string;
    description: string;
    amount: number;
}

interface InflowSummary {
    same_day_cash: number;
    recovery: number;
    cash_sales: number;
    other_inflows: number;
    total: number;
}

interface OutflowSummary {
    farmer_payments: number;
    supplier_payments: number;
    agent_payments: number;
    expenses: number;
    total: number;
}

interface BookData {
    from: string;
    to: string;
    is_single_day: boolean;
    method: string;
    opening_balance: number;
    inflows: EntryItem[];
    outflows: EntryItem[];
    total_inflow: number;
    total_outflow: number;
    closing_balance: number;
    inflow_summary: InflowSummary;
    outflow_summary: OutflowSummary;
}

interface Props {
    bookData: BookData;
    filters: {
        date: string;
        from: string;
        to: string;
    };
    categories: Record<string, string>;
    baselineSettings: {
        opening_cash_balance: number;
        cash_book_start_date: string;
    };
}

export default function CashBookPage({ bookData, filters, categories, baselineSettings }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.cash_book'), href: '/cash-book' },
        { title: t('accounting.cash_book_title'), href: '/cash-book' },
    ];

    // Filter Form
    const { data: filterData, setData: setFilterData } = useForm({
        from: filters.from || filters.date,
        to: filters.to || filters.date,
    });

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/cash-book', {
            from: filterData.from,
            to: filterData.to,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    // Expense Modal
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const {
        data: expenseData,
        setData: setExpenseData,
        post: postExpense,
        processing: expenseProcessing,
        reset: resetExpense,
    } = useForm({
        date: filterData.from,
        title: '',
        amount: '',
        category: 'rent',
        reference: '',
        description: '',
    });

    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptModalData, setReceiptModalData] = useState<ReceiptData | null>(null);

    const openPrintForOutflow = (item: EntryItem) => {
        setReceiptModalData({
            receiptType: item.category === 'expense' ? 'expense_voucher' : 'party_payment',
            titleEn: item.category === 'expense' ? 'Cash Expense Voucher' : 'Cash Payment Voucher',
            titleUr: item.category === 'expense' ? 'واؤچر نقد اخراجات' : 'واؤچر نقد ادائیگی',
            receiptNo: item.reference || `OUT-${item.id}`,
            date: item.date,
            time: item.time,
            partyName: item.party_name,
            partyType: isUrdu ? item.title_ur : item.title,
            totalAmount: item.amount,
            paidAmount: item.amount,
            notes: item.description,
        });
        setReceiptModalOpen(true);
    };

    const openPrintForInflow = (item: EntryItem) => {
        setReceiptModalData({
            receiptType: 'merchant_receipt',
            titleEn: 'Cash Receipt Voucher (روکڑ وصولی)',
            titleUr: 'رسید وصولی نقدی',
            receiptNo: item.reference || `IN-${item.id}`,
            date: item.date,
            time: item.time,
            partyName: item.party_name,
            partyType: isUrdu ? item.title_ur : item.title,
            totalAmount: item.amount,
            paidAmount: item.amount,
            notes: item.description,
        });
        setReceiptModalOpen(true);
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(expenseData.amount) || 0;
        const catObj = expenseCategories.find((c) => c.slug === expenseData.category);
        const expReceipt: ReceiptData = {
            receiptType: 'expense_voucher',
            titleEn: 'Cash Expense Voucher',
            titleUr: 'واؤچر نقد اخراجات',
            receiptNo: expenseData.reference || `EXP-${Date.now().toString().slice(-6)}`,
            date: expenseData.date,
            partyName: expenseData.payee || (catObj ? (isUrdu ? catObj.name_ur : catObj.name_en) : 'Shop Expense'),
            partyType: isUrdu ? (catObj ? catObj.name_ur : 'دکان خرچہ') : (catObj ? catObj.name_en : 'Shop Expense'),
            totalAmount: amt,
            paidAmount: amt,
            notes: expenseData.description || undefined,
        };

        postExpense(route('accounting.expenses.store'), {
            onSuccess: () => {
                toast.success(isUrdu ? 'خرچہ کامیابی سے درج ہو گیا۔' : 'Expense recorded successfully.');
                setReceiptModalData(expReceipt);
                setReceiptModalOpen(true);
                setExpenseModalOpen(false);
                resetExpense();
            },
            onError: () => {
                toast.error(isUrdu ? 'خرچہ درج کرتے وقت خرابی پیش آئی۔' : 'Failed to record expense.');
            },
        });
    };

    // Baseline Balance Modal
    const [openingModalOpen, setOpeningModalOpen] = useState(false);
    const {
        data: openingData,
        setData: setOpeningData,
        post: postOpening,
        processing: openingProcessing,
    } = useForm({
        opening_cash_balance: String(baselineSettings.opening_cash_balance || 0),
        cash_book_start_date: baselineSettings.cash_book_start_date || '2026-01-01',
    });

    const handleOpeningSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postOpening(route('accounting.opening-balances.update'), {
            onSuccess: () => {
                toast.success(isUrdu ? 'ابتدائی نقدی باقیات محفوظ ہو گئیں۔' : 'Opening cash balance updated.');
                setOpeningModalOpen(false);
            },
            onError: () => {
                toast.error(isUrdu ? 'ابتدائی باقیات محفوظ نہیں ہو سکیں۔' : 'Failed to update opening balance.');
            },
        });
    };

    const handleDeleteExpense = (idString: string) => {
        const expenseId = idString.replace('expense-', '');
        if (!confirm(isUrdu ? 'کیا آپ اس خرچے کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this expense?')) {
            return;
        }
        router.delete(route('accounting.expenses.destroy', expenseId), {
            onSuccess: () => toast.success(isUrdu ? 'خرچہ حذف کر دیا گیا۔' : 'Expense deleted.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('accounting.cash_book_title')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6 print:p-0">
                {/* Printable Letterhead (visible on print only) */}
                <div className="hidden print:block mb-4">
                    <PrintLetterhead
                        title={isUrdu ? 'روزنامچہ کیش بک (روکڑ)' : 'Daily Cash Book (Rokad)'}
                        titleUrdu="روزنامچہ کیش بک (روکڑ)"
                        date={bookData.is_single_day ? bookData.from : undefined}
                        from_date={!bookData.is_single_day ? bookData.from : undefined}
                        to_date={!bookData.is_single_day ? bookData.to : undefined}
                    />
                </div>

                {/* Header & Controls (hidden in print) */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Icon name="BookBookmarkIcon" className="size-6 text-emerald-700" />
                            {t('accounting.cash_book_title')}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('accounting.cash_book_subtitle')}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={() => window.print()}
                        >
                            <Icon name="PrinterIcon" className="size-3.5" />
                            {t('common.print') || 'Print'}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setOpeningModalOpen(true)}
                        >
                            <Icon name="GearIcon" className="size-3.5" />
                            {t('accounting.set_opening_balance')}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                            onClick={() => {
                                resetExpense();
                                setExpenseModalOpen(true);
                            }}
                        >
                            <Icon name="PlusIcon" className="size-3.5" />
                            {t('accounting.record_expense')}
                        </Button>
                    </div>
                </div>

                {/* Filter Bar (hidden in print) */}
                <Card className="border border-border/60 bg-muted/20 print:hidden">
                    <CardContent className="p-3">
                        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">{t('common.from') || 'From'}:</Label>
                                <Input
                                    type="date"
                                    value={filterData.from}
                                    onChange={(e) => setFilterData('from', e.target.value)}
                                    className="h-8 text-xs w-36 font-mono"
                                />
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Label className="text-xs text-muted-foreground">{t('common.to') || 'To'}:</Label>
                                <Input
                                    type="date"
                                    value={filterData.to}
                                    onChange={(e) => setFilterData('to', e.target.value)}
                                    className="h-8 text-xs w-36 font-mono"
                                />
                            </div>

                            <Button type="submit" size="sm" variant="secondary" className="h-8 gap-1 text-xs">
                                <Icon name="FunnelIcon" className="size-3.5" />
                                {t('common.filter') || 'Filter'}
                            </Button>

                            <div className="ml-auto text-xs text-muted-foreground font-mono">
                                {bookData.is_single_day ? bookData.from : `${bookData.from} → ${bookData.to}`}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="border-border/60 bg-card shadow-sm">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-semibold text-muted-foreground">{t('accounting.opening_balance', 'Opening Cash Balance')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="text-xl font-bold font-mono text-foreground">
                                Rs. {bookData.opening_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isUrdu ? 'صبح کی باقی روکڑ' : 'Starting cash in hand'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-semibold text-emerald-900">{t('accounting.total_inflows')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="text-xl font-bold font-mono text-emerald-950">
                                + Rs. {bookData.total_inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-emerald-700/80 mt-0.5">
                                {bookData.inflows.length} {isUrdu ? 'وصولیاں درج ہوئیں' : 'cash received'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-rose-200 bg-rose-50/50">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-semibold text-rose-900">{t('accounting.total_outflows')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="text-xl font-bold font-mono text-rose-950">
                                - Rs. {bookData.total_outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-rose-700/80 mt-0.5">
                                {bookData.outflows.length} {isUrdu ? 'ادائیگیاں و اخراجات' : 'cash paid & expenses'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-300 bg-amber-50/60 shadow-sm">
                        <CardHeader className="p-3 pb-1">
                            <CardTitle className="text-xs font-semibold text-amber-950">{t('accounting.closing_balance')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                            <div className="text-xl font-bold font-mono text-amber-950">
                                Rs. {bookData.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] text-amber-800/80 mt-0.5 font-semibold">
                                {isUrdu ? 'شام کی باقی روکڑ / کیش ان ہینڈ' : 'Net cash in drawer'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Traditional Side-by-Side Rokad Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* LEFT SIDE: آمد (Inflows / Receipts / Jama) */}
                    <Card className="border-emerald-200/70 shadow-sm overflow-hidden">
                        <CardHeader className="p-3.5 bg-emerald-700 text-white flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <Icon name="ArrowDownLeftIcon" className="size-4 text-emerald-200" />
                                    {t('accounting.inflows_table_title')}
                                </CardTitle>
                                <p className="text-[11px] text-emerald-100 mt-0.5">
                                    {isUrdu ? 'آمد، وصولیاں و نقد فروخت' : 'All incoming cash receipts'}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono text-emerald-100">{isUrdu ? 'کل آمد' : 'Total Inflow'}</div>
                                <div className="text-base font-bold font-mono text-white">
                                    Rs. {bookData.total_inflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-auto print:max-h-none">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0">
                                        <TableRow className="text-xs">
                                            <TableHead className="w-16"># / {isUrdu ? 'تاریخ' : 'Date'}</TableHead>
                                            <TableHead>{isUrdu ? 'مد / قسم' : 'Type / Category'}</TableHead>
                                            <TableHead>{isUrdu ? 'نام / بیوپاری' : 'Party / Detail'}</TableHead>
                                            <TableHead className="text-right font-semibold">{isUrdu ? 'رقم (روپے)' : 'Amount (Rs)'}</TableHead>
                                            <TableHead className="w-10 text-center print:hidden">{isUrdu ? 'پرنٹ' : 'Print'}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookData.inflows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                                                    {t('accounting.no_inflows')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            bookData.inflows.map((item) => (
                                                <TableRow key={item.id} className="text-xs hover:bg-emerald-50/30">
                                                    <TableCell className="font-mono text-[11px] text-muted-foreground py-2">
                                                        {item.date}
                                                        {item.time && <span className="block text-[10px] text-muted-foreground/70">{item.time}</span>}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                            item.category === 'same_day_cash'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : item.category === 'recovery'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-teal-100 text-teal-800'
                                                        }`}>
                                                            {isUrdu ? item.title_ur : item.title}
                                                        </span>
                                                        <span className="block text-[10px] font-mono text-muted-foreground">{item.reference}</span>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="font-medium text-foreground">{item.party_name}</div>
                                                        {item.description && (
                                                            <div className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-emerald-700 py-2">
                                                        +{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-center print:hidden">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-emerald-700"
                                                            onClick={() => openPrintForInflow(item)}
                                                            title={isUrdu ? 'رسید پرنٹ کریں' : 'Print Receipt'}
                                                        >
                                                            <Icon name="PrinterIcon" className="size-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Inflow Subtotals Footer */}
                            <div className="bg-emerald-50/50 p-2.5 border-t border-emerald-100 text-[11px] flex flex-wrap items-center justify-between gap-2 text-emerald-900">
                                <div>
                                    <span className="font-semibold">{t('accounting.receipts_merchant')}:</span>{' '}
                                    <span className="font-mono">Rs. {bookData.inflow_summary.same_day_cash.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="font-semibold">{t('accounting.recoveries_merchant')}:</span>{' '}
                                    <span className="font-mono">Rs. {bookData.inflow_summary.recovery.toLocaleString()}</span>
                                </div>
                                {bookData.inflow_summary.cash_sales > 0 && (
                                    <div>
                                        <span className="font-semibold">{t('accounting.direct_cash_sales')}:</span>{' '}
                                        <span className="font-mono">Rs. {bookData.inflow_summary.cash_sales.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* RIGHT SIDE: خرچ (Outflows / Payments / Banam) */}
                    <Card className="border-rose-200/70 shadow-sm overflow-hidden">
                        <CardHeader className="p-3.5 bg-rose-700 text-white flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <Icon name="ArrowUpRightIcon" className="size-4 text-rose-200" />
                                    {t('accounting.outflows_table_title')}
                                </CardTitle>
                                <p className="text-[11px] text-rose-100 mt-0.5">
                                    {isUrdu ? 'ادائیگیاں، اخراجات و نقد خرچ' : 'All outgoing cash payments & expenses'}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono text-rose-100">{isUrdu ? 'کل خرچ' : 'Total Outflow'}</div>
                                <div className="text-base font-bold font-mono text-white">
                                    Rs. {bookData.total_outflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-auto print:max-h-none">
                                <Table>
                                    <TableHeader className="bg-muted/40 sticky top-0">
                                        <TableRow className="text-xs">
                                            <TableHead className="w-16"># / {isUrdu ? 'تاریخ' : 'Date'}</TableHead>
                                            <TableHead>{isUrdu ? 'مد / قسم' : 'Type / Category'}</TableHead>
                                            <TableHead>{isUrdu ? 'تفصیل / کھاتہ' : 'Party / Detail'}</TableHead>
                                            <TableHead className="text-right font-semibold">{isUrdu ? 'رقم (روپے)' : 'Amount (Rs)'}</TableHead>
                                            <TableHead className="w-10 text-center print:hidden"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookData.outflows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                                                    {t('accounting.no_outflows')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            bookData.outflows.map((item) => (
                                                <TableRow key={item.id} className="text-xs hover:bg-rose-50/30">
                                                    <TableCell className="font-mono text-[11px] text-muted-foreground py-2">
                                                        {item.date}
                                                        {item.time && <span className="block text-[10px] text-muted-foreground/70">{item.time}</span>}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                            item.category === 'farmer_payment'
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : item.category === 'supplier_payment'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : item.category === 'agent_payment'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {isUrdu ? item.title_ur : item.title}
                                                        </span>
                                                        <span className="block text-[10px] font-mono text-muted-foreground">{item.reference}</span>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="font-medium text-foreground">{item.party_name}</div>
                                                        {item.description && (
                                                            <div className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-rose-700 py-2">
                                                        -{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-center print:hidden">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-muted-foreground hover:text-rose-700"
                                                                onClick={() => openPrintForOutflow(item)}
                                                                title={isUrdu ? 'واؤچر پرنٹ کریں' : 'Print Voucher'}
                                                            >
                                                                <Icon name="PrinterIcon" className="size-3.5" />
                                                            </Button>
                                                            {item.category === 'expense' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                                                                    onClick={() => handleDeleteExpense(item.id)}
                                                                    title={isUrdu ? 'حذف کریں' : 'Delete'}
                                                                >
                                                                    <Icon name="TrashIcon" className="size-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Outflow Subtotals Footer */}
                            <div className="bg-rose-50/50 p-2.5 border-t border-rose-100 text-[11px] flex flex-wrap items-center justify-between gap-2 text-rose-900">
                                <div>
                                    <span className="font-semibold">{t('accounting.farmer_payments')}:</span>{' '}
                                    <span className="font-mono">Rs. {bookData.outflow_summary.farmer_payments.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="font-semibold">{t('accounting.supplier_payments')}:</span>{' '}
                                    <span className="font-mono">Rs. {bookData.outflow_summary.supplier_payments.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="font-semibold">{t('accounting.agent_payments')}:</span>{' '}
                                    <span className="font-mono">Rs. {bookData.outflow_summary.agent_payments.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="font-semibold">{t('accounting.shop_expenses')}:</span>{' '}
                                    <span className="font-mono">Rs. {bookData.outflow_summary.expenses.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Mandi Rokad Reconciliation Equation */}
                <Card className="border border-amber-200/80 bg-amber-50/40 p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <Icon name="ScalesIcon" className="size-5 text-amber-700 shrink-0" />
                            <div>
                                <span className="font-bold text-amber-950">
                                    {isUrdu ? 'روکڑ میزان مساوات:' : 'Cash Book Balancing Equation:'}
                                </span>
                                <span className="text-muted-foreground ml-1.5 font-mono">
                                    [Opening Rs. {bookData.opening_balance.toLocaleString()}] + [Inflow Rs. {bookData.total_inflow.toLocaleString()}] - [Outflow Rs. {bookData.total_outflow.toLocaleString()}] =
                                </span>
                            </div>
                        </div>
                        <div className="font-mono font-bold text-base text-amber-950 bg-amber-100/80 px-3 py-1 rounded border border-amber-300">
                            {isUrdu ? 'باقی روکڑ (کیش ان ہینڈ): ' : 'Net Closing Cash: '} Rs. {bookData.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Record Expense Dialog (Cash-Only) */}
            <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Icon name="MoneyIcon" className="size-5 text-emerald-700" />
                            {t('accounting.record_expense')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('accounting.record_expense_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleExpenseSubmit} className="space-y-3.5">
                        <div className="space-y-1">
                            <Label className="text-xs">{isUrdu ? 'تاریخ' : 'Date'}</Label>
                            <Input
                                type="date"
                                value={expenseData.date}
                                onChange={(e) => setExpenseData('date', e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">{isUrdu ? 'خرچے کی قسم / شعبہ' : 'Category'}</Label>
                            <Select
                                value={expenseData.category}
                                onValueChange={(val) => setExpenseData('category', val)}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(categories).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">{isUrdu ? 'عنوان / خرچے کی مد' : 'Title / Expense Head'}</Label>
                            <Input
                                type="text"
                                value={expenseData.title}
                                onChange={(e) => setExpenseData('title', e.target.value)}
                                placeholder={isUrdu ? 'مثلاً دکان کا کرایہ، بجلی بل، چائے، مزدوری' : 'e.g. Shop rent, Electricity, Tea, Labour'}
                                className="h-8 text-xs"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{isUrdu ? 'رقم (روپے - نقد)' : 'Amount (Rs - Cash)'}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={expenseData.amount}
                                    onChange={(e) => setExpenseData('amount', e.target.value)}
                                    placeholder="0.00"
                                    className="h-8 text-xs font-mono"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">{isUrdu ? 'رسید نمبر / حوالہ' : 'Reference / Receipt #'}</Label>
                                <Input
                                    type="text"
                                    value={expenseData.reference}
                                    onChange={(e) => setExpenseData('reference', e.target.value)}
                                    placeholder="Optional"
                                    className="h-8 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">{isUrdu ? 'مزید تفصیل / نوٹ' : 'Description / Notes'}</Label>
                            <Textarea
                                value={expenseData.description}
                                onChange={(e) => setExpenseData('description', e.target.value)}
                                rows={2}
                                className="text-xs"
                                placeholder={isUrdu ? 'اختیاری تفصیل درج کریں' : 'Optional notes'}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setExpenseModalOpen(false)}
                            >
                                {t('common.cancel') || 'Cancel'}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={expenseProcessing}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                                {expenseProcessing ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...') : (isUrdu ? 'خرچہ محفوظ کریں' : 'Save Expense')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Baseline Opening Cash Balance Dialog */}
            <Dialog open={openingModalOpen} onOpenChange={setOpeningModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-950 dark:text-emerald-400">
                            <Icon name="GearIcon" className="size-5 text-emerald-700" />
                            {t('accounting.set_opening_balance', 'Set Baseline Opening Cash Balance')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('accounting.set_opening_balance_desc', 'Set starting cash balance in shop drawer')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleOpeningSubmit} className="space-y-3.5">
                        <div className="space-y-1">
                            <Label className="text-xs">{isUrdu ? 'حساب کا ابتدائی آغاز' : 'Calculation Baseline Date'}</Label>
                            <Input
                                type="date"
                                value={openingData.cash_book_start_date}
                                onChange={(e) => setOpeningData('cash_book_start_date', e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {isUrdu ? 'اس تاریخ پر موجود نقد دراز کی رقم مقرر کریں' : 'The date when this starting cash amount applies'}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">{isUrdu ? 'ابتدائی نقدی دراز (Opening Cash in Hand)' : 'Opening Cash in Hand (Rs)'}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={openingData.opening_cash_balance}
                                onChange={(e) => setOpeningData('opening_cash_balance', e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setOpeningModalOpen(false)}
                            >
                                {t('common.cancel') || 'Cancel'}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={openingProcessing}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                                {openingProcessing ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...') : (isUrdu ? 'محفوظ کریں' : 'Save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ReceiptModal
                open={receiptModalOpen}
                onOpenChange={setReceiptModalOpen}
                data={receiptModalData}
            />
        </AppLayout>
    );
}

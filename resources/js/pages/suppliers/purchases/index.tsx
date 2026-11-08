import React, { useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import ReceiptModal, { type ReceiptData } from '@/components/app/receipt-modal';
import { toast } from 'sonner';

interface SupplierOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    area: string | null;
    current_balance: number;
}

interface ItemOption {
    id: number;
    name_en: string;
    name_ur: string;
    unit: string;
}

interface PurchaseLine {
    id: number | null;
    description: string;
    item_id: string;
    quantity: string;
    unit: string;
    rate: string;
}

interface PurchaseRow {
    id: number;
    date: string;
    reference: string;
    supplier_id: number;
    supplier_code: number | null;
    supplier_name: string | null;
    supplier_name_ur: string | null;
    charges: number;
    subtotal: number;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    payment_method: string | null;
    notes: string | null;
    items: PurchaseLine[];
}

interface PaymentRow {
    id: number;
    date: string;
    supplier_id: number;
    supplier_code: number | null;
    supplier_name: string | null;
    supplier_name_ur: string | null;
    amount: number;
    payment_method: string;
    reference: string | null;
    note: string | null;
}

interface OutstandingRow {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    current_balance: number;
}

interface Props {
    date: string;
    suppliers: SupplierOption[];
    items: ItemOption[];
    units: string[];
    paymentMethods: string[];
    purchases: PurchaseRow[];
    payments: PaymentRow[];
    outstanding: OutstandingRow[];
}

const emptyLine = (unit = 'piece'): PurchaseLine => ({
    id: null,
    description: '',
    item_id: '',
    quantity: '',
    unit,
    rate: '',
});

export default function SupplierPurchasesIndex({
    date,
    suppliers,
    items,
    units,
    paymentMethods,
    purchases,
    payments,
    outstanding,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, errors, processing, reset } = useForm({
        date: date,
        supplier_id: '',
        charges: '0',
        paid_amount: '0',
        payment_method: 'cash',
        notes: '',
        items: [emptyLine()] as PurchaseLine[],
    });

    const {
        data: payment,
        setData: setPayment,
        post: postPayment,
        errors: paymentErrors,
        processing: paying,
    } = useForm({
        supplier_id: '',
        date: date,
        amount: '',
        payment_method: 'cash',
        reference: '',
        note: '',
    });

    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptModalData, setReceiptModalData] = useState<ReceiptData | null>(null);

    const openPrintForPurchase = (purchase: PurchaseRow) => {
        setReceiptModalData({
            receiptType: 'supplier_purchase',
            titleEn: 'Supplier Purchase Bill',
            titleUr: 'بل خریداری سپلائر',
            receiptNo: purchase.reference,
            date: purchase.date,
            partyName: (isUrdu ? purchase.supplier_name_ur || purchase.supplier_name : purchase.supplier_name) || 'Supplier',
            partyCode: purchase.supplier_code ? String(purchase.supplier_code) : undefined,
            partyType: isUrdu ? 'سپلائر' : 'Supplier',
            items: purchase.items.map((line) => {
                const qty = Number(line.quantity) || 0;
                const r = Number(line.rate) || 0;
                return {
                    description: line.description,
                    nag: line.quantity,
                    rate: line.rate,
                    amount: Math.round(qty * r * 100) / 100,
                };
            }),
            subtotal: purchase.subtotal,
            bardana: purchase.charges,
            totalAmount: purchase.total_amount,
            paidAmount: purchase.paid_amount,
            remainingBalance: purchase.remaining_amount,
            notes: purchase.notes ?? undefined,
        });
        setReceiptModalOpen(true);
    };

    const openPrintForPayment = (row: PaymentRow) => {
        setReceiptModalData({
            receiptType: 'party_payment',
            titleEn: 'Supplier Payment Voucher',
            titleUr: 'واؤچر ادائیگی سپلائر',
            receiptNo: row.reference || `SPMT-${row.id}`,
            date: row.date,
            partyName: (isUrdu ? row.supplier_name_ur || row.supplier_name : row.supplier_name) || 'Supplier',
            partyCode: row.supplier_code ? String(row.supplier_code) : undefined,
            partyType: isUrdu ? 'سپلائر' : 'Supplier',
            totalAmount: row.amount,
            paidAmount: row.amount,
            notes: row.note ?? undefined,
        });
        setReceiptModalOpen(true);
    };

    // Amount = quantity x rate, per line.
    const lineAmounts = useMemo(
        () =>
            data.items.map((line) => {
                const quantity = Number(line.quantity) || 0;
                const rate = Number(line.rate) || 0;
                return Math.round(quantity * rate * 100) / 100;
            }),
        [data.items]
    );

    const subtotal = Math.round(lineAmounts.reduce((sum, amount) => sum + amount, 0) * 100) / 100;
    const charges = Number(data.charges) || 0;
    const total = Math.round((subtotal + charges) * 100) / 100;
    const paid = Number(data.paid_amount) || 0;
    const remaining = Math.round((total - paid) * 100) / 100;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.supplier_side'), href: '/supplier-purchases' },
        { title: t('suppliers.purchase_title'), href: '/supplier-purchases' },
    ];

    function resetForm() {
        reset();
        setData({
            date: date,
            supplier_id: '',
            charges: '0',
            paid_amount: '0',
            payment_method: 'cash',
            notes: '',
            items: [emptyLine()],
        });
        setEditingId(null);
    }

    function updateLine(index: number, field: keyof PurchaseLine, value: string) {
        const next = [...data.items];
        next[index] = { ...next[index], [field]: value };
        setData('items', next);
    }

    function addLine() {
        setData('items', [...data.items, emptyLine()]);
    }

    function removeLine(index: number) {
        if (data.items.length === 1) {
            return;
        }
        setData(
            'items',
            data.items.filter((_, i) => i !== index)
        );
    }

    function startEdit(purchase: PurchaseRow) {
        setEditingId(purchase.id);
        setData({
            date: purchase.date,
            supplier_id: String(purchase.supplier_id),
            charges: String(purchase.charges),
            paid_amount: String(purchase.paid_amount),
            payment_method: purchase.payment_method || 'cash',
            notes: purchase.notes ?? '',
            items: purchase.items.map((line) => ({
                id: line.id,
                description: line.description,
                item_id: line.item_id ? String(line.item_id) : '',
                quantity: String(line.quantity),
                unit: line.unit,
                rate: String(line.rate),
            })),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        const payload = {
            date: data.date,
            supplier_id: data.supplier_id,
            charges: data.charges,
            paid_amount: data.paid_amount,
            payment_method: data.payment_method,
            notes: data.notes,
            items: data.items.map((line) => ({
                id: line.id,
                description: line.description,
                item_id: line.item_id || null,
                quantity: line.quantity,
                unit: line.unit,
                rate: line.rate,
            })),
        };

        const supplierObj = suppliers.find((s) => String(s.id) === String(data.supplier_id));
        const purchaseReceipt: ReceiptData = {
            receiptType: 'supplier_purchase',
            titleEn: 'Supplier Purchase Bill',
            titleUr: 'بل خریداری سپلائر',
            receiptNo: `SPUR-${Date.now().toString().slice(-6)}`,
            date: data.date,
            partyName: supplierObj ? (isUrdu ? supplierObj.name_ur || supplierObj.name_en : supplierObj.name_en) : 'Supplier',
            partyCode: supplierObj ? String(supplierObj.code) : undefined,
            partyType: isUrdu ? 'سپلائر' : 'Supplier',
            partyArea: supplierObj?.city ?? undefined,
            partyPhone: supplierObj?.phone ?? undefined,
            items: data.items.map((line) => {
                const qty = Number(line.quantity) || 0;
                const r = Number(line.rate) || 0;
                return {
                    description: line.description || 'Materials',
                    nag: line.quantity,
                    rate: line.rate,
                    amount: Math.round(qty * r * 100) / 100,
                };
            }),
            subtotal: subtotal,
            bardana: charges,
            totalAmount: total,
            paidAmount: paid,
            remainingBalance: remaining,
            notes: data.notes || undefined,
        };

        if (editingId) {
            put(route('suppliers.purchases.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('suppliers.purchase_updated'));
                    setReceiptModalData(purchaseReceipt);
                    setReceiptModalOpen(true);
                    resetForm();
                },
                onError: () => toast.error(t('common.error')),
            });

            return;
        }

        post(route('suppliers.purchases.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('suppliers.purchase_saved'));
                setReceiptModalData(purchaseReceipt);
                setReceiptModalOpen(true);
                resetForm();
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    function remove(purchase: PurchaseRow) {
        if (!confirm(t('suppliers.purchase_delete_confirm'))) {
            return;
        }

        router.delete(route('suppliers.purchases.destroy', purchase.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('suppliers.purchase_deleted'));
                if (editingId === purchase.id) {
                    resetForm();
                }
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    function submitPayment(e: React.FormEvent) {
        e.preventDefault();

        const pmtSupplier = suppliers.find((s) => String(s.id) === String(payment.supplier_id));
        const pmtAmount = Number(payment.amount) || 0;
        const pmtReceipt: ReceiptData = {
            receiptType: 'party_payment',
            titleEn: 'Supplier Payment Voucher',
            titleUr: 'واؤچر ادائیگی سپلائر',
            receiptNo: payment.reference || `SPMT-${Date.now().toString().slice(-6)}`,
            date: payment.date,
            partyName: pmtSupplier ? (isUrdu ? pmtSupplier.name_ur || pmtSupplier.name_en : pmtSupplier.name_en) : 'Supplier',
            partyCode: pmtSupplier ? String(pmtSupplier.code) : undefined,
            partyType: isUrdu ? 'سپلائر' : 'Supplier',
            partyArea: pmtSupplier?.city ?? undefined,
            partyPhone: pmtSupplier?.phone ?? undefined,
            totalAmount: pmtAmount,
            paidAmount: pmtAmount,
            notes: payment.note || undefined,
        };

        postPayment(route('suppliers.payments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('suppliers.payment_saved'));
                setReceiptModalData(pmtReceipt);
                setReceiptModalOpen(true);
                setPayment({
                    supplier_id: '',
                    date: payment.date,
                    amount: '',
                    payment_method: 'cash',
                    reference: '',
                    note: '',
                });
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    function removePayment(row: PaymentRow) {
        if (!confirm(t('suppliers.payment_delete_confirm'))) {
            return;
        }

        router.delete(route('suppliers.payments.destroy', row.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('suppliers.payment_deleted')),
            onError: () => toast.error(t('common.error')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('suppliers.purchase_title')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="TruckIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('suppliers.purchase_title')}</h1>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {/* ---------------------------------------------------
                        The purchase form
                    ------------------------------------------------------- */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {editingId ? t('suppliers.edit_purchase') : t('suppliers.new_purchase')}
                            </CardTitle>
                            <CardDescription>{t('suppliers.purchase_hint')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="date">{t('common.date')}</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={data.date}
                                            onChange={(e) => setData('date', e.target.value)}
                                            required
                                        />
                                        {errors.date && (
                                            <span className="text-xs text-destructive">{errors.date}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="supplier_id">{t('suppliers.supplier')}</Label>
                                        <Select
                                            value={String(data.supplier_id)}
                                            onValueChange={(value) => setData('supplier_id', value)}
                                        >
                                            <SelectTrigger id="supplier_id">
                                                <SelectValue placeholder={t('suppliers.select_supplier')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                        {supplier.code} -{' '}
                                                        {isUrdu ? supplier.name_ur : supplier.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.supplier_id && (
                                            <span className="text-xs text-destructive">{errors.supplier_id}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Purchase lines */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold">{t('suppliers.lines')}</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                            <Icon name="PlusIcon" className="size-3.5 me-1" />
                                            {t('suppliers.add_line')}
                                        </Button>
                                    </div>

                                    <div className="overflow-x-auto rounded border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="min-w-44">
                                                        {t('suppliers.description')}
                                                    </TableHead>
                                                    <TableHead className="min-w-32">
                                                        {t('suppliers.item_reference')}
                                                    </TableHead>
                                                    <TableHead className="w-24 text-end">
                                                        {t('suppliers.quantity')}
                                                    </TableHead>
                                                    <TableHead className="w-28">
                                                        {t('suppliers.unit')}
                                                    </TableHead>
                                                    <TableHead className="w-28 text-end">
                                                        {t('suppliers.rate')}
                                                    </TableHead>
                                                    <TableHead className="w-28 text-end">
                                                        {t('suppliers.line_amount')}
                                                    </TableHead>
                                                    <TableHead className="w-10" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.items.map((line, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <Input
                                                                value={line.description}
                                                                onChange={(e) =>
                                                                    updateLine(index, 'description', e.target.value)
                                                                }
                                                                placeholder={t('suppliers.description_placeholder')}
                                                                className="h-8 text-xs"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={String(line.item_id)}
                                                                onValueChange={(value) =>
                                                                    updateLine(index, 'item_id', value)
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue placeholder={t('common.select')} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {items.map((item) => (
                                                                        <SelectItem
                                                                            key={item.id}
                                                                            value={String(item.id)}
                                                                        >
                                                                            {isUrdu ? item.name_ur : item.name_en}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                dir="ltr"
                                                                value={line.quantity}
                                                                onChange={(e) =>
                                                                    updateLine(index, 'quantity', e.target.value)
                                                                }
                                                                className="h-8 text-xs text-end font-mono"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={line.unit}
                                                                onValueChange={(value) =>
                                                                    updateLine(index, 'unit', value)
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue placeholder={t('suppliers.unit')} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {units.map((unit) => (
                                                                        <SelectItem key={unit} value={unit}>
                                                                            {t(`suppliers.units.${unit}`, unit)}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                dir="ltr"
                                                                value={line.rate}
                                                                onChange={(e) =>
                                                                    updateLine(index, 'rate', e.target.value)
                                                                }
                                                                className="h-8 text-xs text-end font-mono"
                                                                required
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-end font-mono text-xs font-semibold">
                                                            {lineAmounts[index].toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                                                onClick={() => removeLine(index)}
                                                                disabled={data.items.length === 1}
                                                                title={t('common.delete')}
                                                            >
                                                                <Icon name="TrashIcon" className="size-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {errors['items'] && (
                                        <span className="text-xs text-destructive">{errors['items']}</span>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="charges">{t('suppliers.charges')}</Label>
                                        <Input
                                            id="charges"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            dir="ltr"
                                            value={data.charges}
                                            onChange={(e) => setData('charges', e.target.value)}
                                            className="text-end font-mono"
                                        />
                                        {errors.charges && (
                                            <span className="text-xs text-destructive">{errors.charges}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="paid_amount">{t('suppliers.paid_now')}</Label>
                                        <Input
                                            id="paid_amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            dir="ltr"
                                            value={data.paid_amount}
                                            onChange={(e) => setData('paid_amount', e.target.value)}
                                            className="text-end font-mono"
                                        />
                                        {errors.paid_amount && (
                                            <span className="text-xs text-destructive">{errors.paid_amount}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="payment_method">{t('suppliers.payment_method')}</Label>
                                        <Select
                                            value={data.payment_method}
                                            onValueChange={(value) => setData('payment_method', value)}
                                        >
                                            <SelectTrigger id="payment_method">
                                                <SelectValue placeholder={t('suppliers.payment_method')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods.map((method) => (
                                                    <SelectItem key={method} value={method}>
                                                        {t(`suppliers.methods.${method}`, method)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* The calculation */}
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                    <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
                                        <span className="font-sans text-xs font-semibold uppercase text-green-800">
                                            {t('suppliers.calculation')}:
                                        </span>
                                        <span>
                                            {subtotal.toLocaleString()} + {charges.toLocaleString()} ={' '}
                                            <span className="text-base font-bold text-green-900">
                                                {total.toLocaleString()}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-mono">
                                        <span className="font-sans text-xs font-semibold uppercase text-green-800">
                                            {t('suppliers.remaining')}:
                                        </span>
                                        <span className="font-bold">{remaining.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="notes">{t('suppliers.notes')}</Label>
                                    <Textarea
                                        id="notes"
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                    />
                                    {errors.notes && (
                                        <span className="text-xs text-destructive">{errors.notes}</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? t('common.saving') : t('suppliers.save_purchase')}
                                    </Button>
                                    {editingId && (
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            {t('common.cancel')}
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ---------------------------------------------------
                        Supplier balances and payment
                    ------------------------------------------------------- */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('suppliers.outstanding')}</CardTitle>
                                <CardDescription>{t('suppliers.outstanding_hint')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {outstanding.map((supplier) => (
                                    <div
                                        key={supplier.id}
                                        className="flex items-center justify-between gap-2 text-sm"
                                    >
                                        <span className="truncate">
                                            {supplier.code} - {isUrdu ? supplier.name_ur : supplier.name_en}
                                        </span>
                                        <span
                                            className={`font-mono font-semibold ${
                                                supplier.current_balance > 0 ? 'text-red-700' : 'text-green-700'
                                            }`}
                                        >
                                            {supplier.current_balance.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('suppliers.record_payment')}</CardTitle>
                                <CardDescription>{t('suppliers.record_payment_hint')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitPayment} className="space-y-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="pay-supplier">{t('suppliers.supplier')}</Label>
                                        <Select
                                            value={String(payment.supplier_id)}
                                            onValueChange={(value) => setPayment('supplier_id', value)}
                                        >
                                            <SelectTrigger id="pay-supplier">
                                                <SelectValue placeholder={t('suppliers.select_supplier')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                                                        {supplier.code} -{' '}
                                                        {isUrdu ? supplier.name_ur : supplier.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {paymentErrors.supplier_id && (
                                            <span className="text-xs text-destructive">
                                                {paymentErrors.supplier_id}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="pay-date">{t('common.date')}</Label>
                                            <Input
                                                id="pay-date"
                                                type="date"
                                                value={payment.date}
                                                onChange={(e) => setPayment('date', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="pay-amount">{t('suppliers.amount')}</Label>
                                            <Input
                                                id="pay-amount"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                dir="ltr"
                                                value={payment.amount}
                                                onChange={(e) => setPayment('amount', e.target.value)}
                                                className="text-end font-mono"
                                                required
                                            />
                                            {paymentErrors.amount && (
                                                <span className="text-xs text-destructive">
                                                    {paymentErrors.amount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="pay-method">{t('suppliers.payment_method')}</Label>
                                            <Select
                                                value={payment.payment_method}
                                                onValueChange={(value) => setPayment('payment_method', value)}
                                            >
                                                <SelectTrigger id="pay-method">
                                                    <SelectValue placeholder={t('suppliers.payment_method')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods.map((method) => (
                                                        <SelectItem key={method} value={method}>
                                                            {t(`suppliers.methods.${method}`, method)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="pay-reference">{t('suppliers.reference')}</Label>
                                            <Input
                                                id="pay-reference"
                                                value={payment.reference}
                                                onChange={(e) => setPayment('reference', e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" size="sm" disabled={paying}>
                                        {t('suppliers.save_payment')}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ---------------------------------------------------
                    Purchase history
                ------------------------------------------------------- */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('suppliers.purchase_history')}</CardTitle>
                        <CardDescription>{t('suppliers.purchase_history_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[32rem] overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('suppliers.reference')}</TableHead>
                                        <TableHead>{t('suppliers.supplier')}</TableHead>
                                        <TableHead>{t('suppliers.lines')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.charges')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.total')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.paid_now')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.remaining')}</TableHead>
                                        <TableHead>{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchases.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="font-mono text-xs">{purchase.date}</TableCell>
                                                <TableCell className="font-mono text-xs">{purchase.reference}</TableCell>
                                                <TableCell className="text-xs">
                                                    {purchase.supplier_code} -{' '}
                                                    {isUrdu ? purchase.supplier_name_ur : purchase.supplier_name}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {purchase.items
                                                        .map((line) => line.description)
                                                        .join(', ')}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {purchase.charges.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {purchase.total_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {purchase.paid_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold text-red-700">
                                                    {purchase.remaining_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 cursor-pointer text-muted-foreground hover:text-emerald-700"
                                                            onClick={() => openPrintForPurchase(purchase)}
                                                            title={t('common.print', 'Print Bill')}
                                                        >
                                                            <Icon name="PrinterIcon" className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 cursor-pointer"
                                                            onClick={() => startEdit(purchase)}
                                                            title={t('common.edit')}
                                                        >
                                                            <Icon name="PencilSimpleIcon" className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                                            onClick={() => remove(purchase)}
                                                            title={t('common.delete')}
                                                        >
                                                            <Icon name="TrashIcon" className="size-3.5" />
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

                {/* ---------------------------------------------------
                    Later payments
                ------------------------------------------------------- */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('suppliers.payment_history')}</CardTitle>
                        <CardDescription>{t('suppliers.payment_history_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-80 overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('suppliers.supplier')}</TableHead>
                                        <TableHead className="text-end">{t('suppliers.amount')}</TableHead>
                                        <TableHead>{t('suppliers.payment_method')}</TableHead>
                                        <TableHead>{t('suppliers.reference')}</TableHead>
                                        <TableHead>{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-mono text-xs">{row.date}</TableCell>
                                                <TableCell className="text-xs">
                                                    {row.supplier_code} -{' '}
                                                    {isUrdu ? row.supplier_name_ur : row.supplier_name}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {row.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {t(`suppliers.methods.${row.payment_method}`, row.payment_method)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {row.reference ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 cursor-pointer text-muted-foreground hover:text-emerald-700"
                                                            onClick={() => openPrintForPayment(row)}
                                                            title={t('common.print', 'Print Voucher')}
                                                        >
                                                            <Icon name="PrinterIcon" className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 cursor-pointer text-muted-foreground hover:text-destructive"
                                                            onClick={() => removePayment(row)}
                                                            title={t('common.delete')}
                                                        >
                                                            <Icon name="TrashIcon" className="size-3.5" />
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
            </div>

            <ReceiptModal
                open={receiptModalOpen}
                onOpenChange={setReceiptModalOpen}
                data={receiptModalData}
            />
        </AppLayout>
    );
}

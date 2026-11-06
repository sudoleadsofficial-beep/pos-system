import React, { useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface FarmerOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    area: string | null;
    current_balance: number;
}

interface MarkOption {
    id: number;
    farmer_id: number;
    code: number;
    name_en: string;
    name_ur: string;
}

interface ItemOption {
    id: number;
    name_en: string;
    name_ur: string;
    unit: string;
    default_rate: number;
}

interface PurchaseRow {
    id: number;
    date: string;
    reference: string;
    farmer_id: number;
    farmer_code: number | null;
    farmer_name: string | null;
    farmer_name_ur: string | null;
    mark_name: string | null;
    item_id: number;
    item_name: string | null;
    item_name_ur: string | null;
    nag: number;
    weight: number;
    rate: number;
    charges: number;
    amount: number;
    paid_amount: number;
    remaining_amount: number;
    notes: string | null;
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
    farmers: FarmerOption[];
    marks: MarkOption[];
    items: ItemOption[];
    purchases: PurchaseRow[];
    outstanding: OutstandingRow[];
    availableStock: Record<string, number>;
}

export default function FarmerPurchasesIndex({
    date,
    farmers,
    marks,
    items,
    purchases,
    outstanding,
    availableStock,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [editingId, setEditingId] = useState<number | null>(null);

    const { data, setData, post, put, errors, processing, reset } = useForm({
        date: date,
        farmer_id: '',
        farmer_mark_id: '',
        item_id: '',
        nag: '',
        weight: '',
        rate: '',
        charges: '0',
        paid_amount: '0',
        notes: '',
    });

    const { data: payment, setData: setPayment, post: postPayment, errors: paymentErrors, processing: paying } = useForm({
        farmer_id: '',
        date: date,
        amount: '',
        notes: '',
    });

    // Only the marks of the selected farmer can be picked.
    const farmerMarks = useMemo(
        () => marks.filter((mark) => String(mark.farmer_id) === String(data.farmer_id)),
        [marks, data.farmer_id]
    );

    const selectedItem = items.find((item) => String(item.id) === String(data.item_id));

    // POS V1 unit pricing: amount = (nag x rate) + charges.
    const amount = (Number(data.nag) || 0) * (Number(data.rate) || 0) + (Number(data.charges) || 0);
    const paid = Number(data.paid_amount) || 0;
    const remaining = Math.round((amount - paid) * 100) / 100;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard'), href: '/dashboard' },
        { title: t('nav.farmer_side'), href: '/register-consignment' },
        { title: t('farmers.purchase_title'), href: '/register-consignment' },
    ];

    function resetForm() {
        reset();
        setData({
            date: date,
            farmer_id: '',
            farmer_mark_id: '',
            item_id: '',
            nag: '',
            weight: '',
            rate: '',
            charges: '0',
            paid_amount: '0',
            notes: '',
        });
        setEditingId(null);
    }

    function startEdit(purchase: PurchaseRow) {
        setEditingId(purchase.id);
        setData({
            date: purchase.date,
            farmer_id: String(purchase.farmer_id),
            farmer_mark_id: '',
            item_id: String(purchase.item_id),
            nag: String(purchase.nag),
            weight: String(purchase.weight),
            rate: String(purchase.rate),
            charges: String(purchase.charges),
            paid_amount: String(purchase.paid_amount),
            notes: purchase.notes ?? '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        if (editingId) {
            put(route('farmers.purchases.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(t('farmers.purchase_updated'));
                    resetForm();
                },
                onError: () => toast.error(t('common.error')),
            });

            return;
        }

        post(route('farmers.purchases.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('farmers.purchase_saved'));
                resetForm();
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    function remove(purchase: PurchaseRow) {
        if (!confirm(t('farmers.purchase_delete_confirm'))) {
            return;
        }

        router.delete(route('farmers.purchases.destroy', purchase.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('farmers.purchase_deleted'));
                if (editingId === purchase.id) {
                    resetForm();
                }
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    function submitPayment(e: React.FormEvent) {
        e.preventDefault();

        postPayment(route('farmers.payments.store'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('farmers.payment_saved'));
                setPayment({ farmer_id: '', date: payment.date, amount: '', notes: '' });
            },
            onError: () => toast.error(t('common.error')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('farmers.purchase_title')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b pb-2">
                    <Icon name="TruckIcon" className="size-5 text-blue-700" />
                    <h1 className="text-xl font-bold text-blue-900">{t('farmers.purchase_title')}</h1>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {/* ---------------------------------------------------
                        The purchase form
                    ------------------------------------------------------- */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base">
                                {editingId ? t('farmers.edit_purchase') : t('farmers.new_purchase')}
                            </CardTitle>
                            <CardDescription>{t('farmers.purchase_hint')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="date">{t('common.date')}</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={data.date}
                                            onChange={(e) => setData('date', e.target.value)}
                                            required
                                        />
                                        {errors.date && <span className="text-xs text-destructive">{errors.date}</span>}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="farmer_id">{t('farmers.farmer')}</Label>
                                        <Select
                                            value={String(data.farmer_id)}
                                            onValueChange={(value) => {
                                                setData('farmer_id', value);
                                                setData('farmer_mark_id', '');
                                            }}
                                        >
                                            <SelectTrigger id="farmer_id">
                                                <SelectValue placeholder={t('farmers.select_farmer')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {farmers.map((farmer) => (
                                                    <SelectItem key={farmer.id} value={String(farmer.id)}>
                                                        {farmer.code} - {isUrdu ? farmer.name_ur : farmer.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.farmer_id && (
                                            <span className="text-xs text-destructive">{errors.farmer_id}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="farmer_mark_id">{t('farmers.mark')}</Label>
                                        <Select
                                            value={String(data.farmer_mark_id)}
                                            onValueChange={(value) => setData('farmer_mark_id', value)}
                                            disabled={!data.farmer_id}
                                        >
                                            <SelectTrigger id="farmer_mark_id">
                                                <SelectValue placeholder={t('farmers.select_mark')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {farmerMarks.map((mark) => (
                                                    <SelectItem key={mark.id} value={String(mark.id)}>
                                                        {mark.code} - {isUrdu ? mark.name_ur : mark.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.farmer_mark_id && (
                                            <span className="text-xs text-destructive">{errors.farmer_mark_id}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="item_id">{t('farmers.item')}</Label>
                                        <Select
                                            value={String(data.item_id)}
                                            onValueChange={(value) => {
                                                setData('item_id', value);
                                                const item = items.find((i) => String(i.id) === value);
                                                if (item && !editingId) {
                                                    setData('rate', String(item.default_rate || ''));
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="item_id">
                                                <SelectValue placeholder={t('farmers.select_item')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {items.map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {isUrdu ? item.name_ur : item.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.item_id && <span className="text-xs text-destructive">{errors.item_id}</span>}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="nag">{t('farmers.bags')}</Label>
                                        <Input
                                            id="nag"
                                            type="number"
                                            min="1"
                                            step="1"
                                            dir="ltr"
                                            value={data.nag}
                                            onChange={(e) => setData('nag', e.target.value)}
                                            required
                                        />
                                        {errors.nag && <span className="text-xs text-destructive">{errors.nag}</span>}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="weight">{t('farmers.weight')}</Label>
                                        <Input
                                            id="weight"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            dir="ltr"
                                            value={data.weight}
                                            onChange={(e) => setData('weight', e.target.value)}
                                        />
                                        {errors.weight && (
                                            <span className="text-xs text-destructive">{errors.weight}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="rate">{t('farmers.purchase_rate')}</Label>
                                        <Input
                                            id="rate"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            dir="ltr"
                                            value={data.rate}
                                            onChange={(e) => setData('rate', e.target.value)}
                                            required
                                        />
                                        {errors.rate && <span className="text-xs text-destructive">{errors.rate}</span>}
                                        {selectedItem && (
                                            <span className="text-[11px] text-muted-foreground">
                                                {t('farmers.rate_per_unit', { unit: selectedItem.unit })}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="charges">{t('farmers.charges')}</Label>
                                        <Input
                                            id="charges"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            dir="ltr"
                                            value={data.charges}
                                            onChange={(e) => setData('charges', e.target.value)}
                                        />
                                        {errors.charges && (
                                            <span className="text-xs text-destructive">{errors.charges}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="paid_amount">{t('farmers.paid_amount')}</Label>
                                        <Input
                                            id="paid_amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            dir="ltr"
                                            value={data.paid_amount}
                                            onChange={(e) => setData('paid_amount', e.target.value)}
                                        />
                                        {errors.paid_amount && (
                                            <span className="text-xs text-destructive">{errors.paid_amount}</span>
                                        )}
                                    </div>

                                    <div className="grid gap-1.5 sm:col-span-2 lg:col-span-3">
                                        <Label htmlFor="notes">{t('farmers.notes')}</Label>
                                        <Textarea
                                            id="notes"
                                            rows={2}
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                        />
                                        {errors.notes && <span className="text-xs text-destructive">{errors.notes}</span>}
                                    </div>
                                </div>

                                {/* The calculation, shown the same way the sale screen shows it */}
                                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                    <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
                                        <span className="font-sans text-xs font-semibold uppercase text-green-800">
                                            {t('farmers.calculation')}:
                                        </span>
                                        <span>
                                            {Number(data.nag) || 0} × {Number(data.rate) || 0} ={' '}
                                            {((Number(data.nag) || 0) * (Number(data.rate) || 0)).toLocaleString()}
                                        </span>
                                        {(Number(data.charges) || 0) > 0 && (
                                            <span>+ {Number(data.charges).toLocaleString()}</span>
                                        )}
                                        <span className="text-base font-bold text-green-900">
                                            = Rs. {amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-mono">
                                        <span className="font-sans text-xs font-semibold uppercase text-green-800">
                                            {t('farmers.remaining')}:
                                        </span>
                                        <span className="font-bold">Rs. {remaining.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? t('common.saving') : t('farmers.save_purchase')}
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
                        Farmer balances and payment
                    ------------------------------------------------------- */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('farmers.outstanding')}</CardTitle>
                                <CardDescription>{t('farmers.outstanding_hint')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {outstanding.map((farmer) => (
                                    <div
                                        key={farmer.id}
                                        className="flex items-center justify-between gap-2 text-sm"
                                    >
                                        <span className="truncate">
                                            {farmer.code} - {isUrdu ? farmer.name_ur : farmer.name_en}
                                        </span>
                                        <span
                                            className={`font-mono font-semibold ${
                                                farmer.current_balance > 0 ? 'text-red-700' : 'text-green-700'
                                            }`}
                                        >
                                            {farmer.current_balance.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('farmers.record_payment')}</CardTitle>
                                <CardDescription>{t('farmers.record_payment_hint')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitPayment} className="space-y-3">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="pay-farmer">{t('farmers.farmer')}</Label>
                                        <Select
                                            value={String(payment.farmer_id)}
                                            onValueChange={(value) => setPayment('farmer_id', value)}
                                        >
                                            <SelectTrigger id="pay-farmer">
                                                <SelectValue placeholder={t('farmers.select_farmer')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {farmers.map((farmer) => (
                                                    <SelectItem key={farmer.id} value={String(farmer.id)}>
                                                        {farmer.code} - {isUrdu ? farmer.name_ur : farmer.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {paymentErrors.farmer_id && (
                                            <span className="text-xs text-destructive">{paymentErrors.farmer_id}</span>
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
                                            <Label htmlFor="pay-amount">{t('farmers.amount')}</Label>
                                            <Input
                                                id="pay-amount"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                dir="ltr"
                                                value={payment.amount}
                                                onChange={(e) => setPayment('amount', e.target.value)}
                                                required
                                            />
                                            {paymentErrors.amount && (
                                                <span className="text-xs text-destructive">{paymentErrors.amount}</span>
                                            )}
                                        </div>
                                    </div>

                                    <Button type="submit" size="sm" disabled={paying}>
                                        {t('farmers.save_payment')}
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
                        <CardTitle className="text-base">{t('farmers.purchase_history')}</CardTitle>
                        <CardDescription>{t('farmers.purchase_history_hint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[32rem] overflow-auto rounded border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.date')}</TableHead>
                                        <TableHead>{t('farmers.reference')}</TableHead>
                                        <TableHead>{t('farmers.farmer')}</TableHead>
                                        <TableHead>{t('farmers.item')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.bags')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.weight')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.purchase_rate')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.amount')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.paid_amount')}</TableHead>
                                        <TableHead className="text-end">{t('farmers.remaining')}</TableHead>
                                        <TableHead>{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center text-muted-foreground">
                                                {t('common.no_records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchases.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="font-mono text-xs">{purchase.date}</TableCell>
                                                <TableCell className="font-mono text-xs">{purchase.reference}</TableCell>
                                                <TableCell className="text-xs">
                                                    {purchase.farmer_code} -{' '}
                                                    {isUrdu ? purchase.farmer_name_ur : purchase.farmer_name}
                                                    {purchase.mark_name ? ` (${purchase.mark_name})` : ''}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {isUrdu ? purchase.item_name_ur : purchase.item_name}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">{purchase.nag}</TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {purchase.weight}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs">
                                                    {purchase.rate.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-end font-mono text-xs font-semibold">
                                                    {purchase.amount.toLocaleString()}
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
            </div>
        </AppLayout>
    );
}

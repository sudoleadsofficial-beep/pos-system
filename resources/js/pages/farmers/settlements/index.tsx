import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
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
import { toast } from 'sonner';

interface UnsettledArrival {
    id: number;
    reference: string;
    date: string;
    farmer_id: number;
    farmer_name: string;
    farmer_name_ur: string | null;
    farmer_code: number;
    item_id: number;
    item_name: string;
    item_name_ur: string | null;
    mark_id: number | null;
    mark_name: string | null;
    nag: number;
    weight: number;
    rate: number;
    arrival_amount: number;
    paid_amount: number;
    remaining_amount: number;
    sales_count: number;
    sold_nag: number;
    sales_total: number;
    suggested_sale_amount: number;
}

interface SettledRow {
    id: number;
    settlement_no: string;
    date: string;
    farmer: {
        id: number;
        name: string;
        name_ur: string | null;
        code: number;
    };
    farmer_purchase: {
        id: number;
        reference: string;
        item?: { name: string; name_ur: string | null };
        mark?: { name: string };
    };
    nag: number;
    weight: number;
    gross_sale_amount: number;
    commission_amount: number;
    total_deductions: number;
    net_payable: number;
    paid_amount: number;
    remaining_payable: number;
}

interface Props {
    unsettled: UnsettledArrival[];
    settled: {
        data: SettledRow[];
        links: any[];
        total: number;
    };
    farmers: Array<{ id: number; name: string; name_ur: string | null; code: number }>;
    filters: {
        farmer_id: number | null;
        date: string | null;
    };
}

export default function FarmerSettlementIndex({ unsettled, settled, farmers, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.farmer_side'), href: '/register-consignment' },
        { title: t('settlement.title'), href: '/farmers/settlements' },
    ];

    const [activeTab, setActiveTab] = useState<'unsettled' | 'settled'>('unsettled');
    const [selectedArrival, setSelectedArrival] = useState<UnsettledArrival | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Filter state
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
        filters.farmer_id ? String(filters.farmer_id) : 'all'
    );

    const handleFarmerFilter = (val: string) => {
        setSelectedFarmerId(val);
        router.get('/farmers/settlements', {
            farmer_id: val === 'all' ? null : val,
        }, { preserveState: true, replace: true });
    };

    // Settlement Form
    const { data, setData, post, processing, reset, errors } = useForm({
        farmer_purchase_id: 0,
        date: new Date().toISOString().split('T')[0],
        gross_sale_amount: '',
        commission_rate: '6.00',
        mazdoori: '0',
        carriage: '0',
        chungi: '0',
        bardana: '0',
        other_deductions: '0',
        charges: '0',
        paid_amount: '0',
        nag: 0,
        weight: 0,
        notes: '',
    });

    const openSettlementModal = (arrival: UnsettledArrival) => {
        setSelectedArrival(arrival);
        setData({
            farmer_purchase_id: arrival.id,
            date: new Date().toISOString().split('T')[0],
            gross_sale_amount: String(arrival.suggested_sale_amount || arrival.arrival_amount),
            commission_rate: '6.00',
            mazdoori: '0',
            carriage: '0',
            chungi: '0',
            bardana: '0',
            other_deductions: '0',
            charges: '0',
            paid_amount: String(arrival.paid_amount || 0),
            nag: arrival.nag,
            weight: arrival.weight,
            notes: '',
        });
        setModalOpen(true);
    };

    // Live calculations
    const grossSale = parseFloat(data.gross_sale_amount) || 0;
    const commRate = parseFloat(data.commission_rate) || 0;
    const commAmount = Math.round((grossSale * commRate) / 100 * 100) / 100;

    const mazdoori = parseFloat(data.mazdoori) || 0;
    const carriage = parseFloat(data.carriage) || 0;
    const chungi = parseFloat(data.chungi) || 0;
    const bardana = parseFloat(data.bardana) || 0;
    const otherDeductions = parseFloat(data.other_deductions) || 0;
    const charges = parseFloat(data.charges) || 0;
    const paidAmount = parseFloat(data.paid_amount) || 0;

    const totalDeductions = Math.round((commAmount + mazdoori + carriage + chungi + bardana + otherDeductions) * 100) / 100;
    const netPayable = Math.round((grossSale - totalDeductions + charges) * 100) / 100;
    const remainingPayable = Math.round((netPayable - paidAmount) * 100) / 100;

    const handleSettlementSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('farmers.settlements.store'), {
            onSuccess: () => {
                setModalOpen(false);
                reset();
                toast.success(isUrdu ? 'بیجک کامیابی سے تیار ہو گیا۔' : 'Bijak created successfully.');
            },
            onError: () => {
                toast.error(isUrdu ? 'بیجک بنانے میں خرابی پیش آئی۔' : 'Failed to create settlement.');
            },
        });
    };

    const handleDeleteSettlement = (id: number) => {
        if (!confirm(isUrdu ? 'کیا آپ اس بیجک کو منسوخ کرنا چاہتے ہیں؟' : 'Are you sure you want to cancel this settlement?')) {
            return;
        }
        router.delete(route('farmers.settlements.destroy', id), {
            onSuccess: () => toast.success(isUrdu ? 'بیجک منسوخ کر دیا گیا۔' : 'Settlement cancelled.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settlement.title')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Icon name="ReceiptIcon" className="size-6 text-green-700" />
                            {t('settlement.title')}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {t('settlement.subtitle')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={selectedFarmerId} onValueChange={handleFarmerFilter}>
                            <SelectTrigger className="h-8 text-xs w-48">
                                <SelectValue placeholder={t('common.select_farmer') || 'Filter by Farmer'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isUrdu ? 'تمام کسان (All Farmers)' : 'All Farmers'}</SelectItem>
                                {farmers.map((farmer) => (
                                    <SelectItem key={farmer.id} value={String(farmer.id)}>
                                        {isUrdu ? farmer.name_ur || farmer.name : farmer.name} ({farmer.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('unsettled')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === 'unsettled'
                                ? 'border-green-700 text-green-800 bg-green-50/50'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Icon name="ClockIcon" className="size-3.5" />
                        {t('settlement.unsettled_arrivals')}
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-mono">
                            {unsettled.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('settled')}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                            activeTab === 'settled'
                                ? 'border-green-700 text-green-800 bg-green-50/50'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Icon name="CheckCircleIcon" className="size-3.5" />
                        {t('settlement.settled_history')}
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-green-100 text-green-900 font-mono">
                            {settled.total}
                        </span>
                    </button>
                </div>

                {/* TAB 1: Unsettled Consignments */}
                {activeTab === 'unsettled' && (
                    <Card className="border border-border/70 shadow-sm overflow-hidden">
                        <CardHeader className="p-3.5 bg-muted/30 border-b">
                            <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span>{t('settlement.unsettled_arrivals')}</span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                    {isUrdu ? 'وہ مال جس کا بیجک بنانا باقی ہے' : 'Arrivals awaiting final sale settlement'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/10">
                                    <TableRow className="text-xs">
                                        <TableHead className="w-24"># / {isUrdu ? 'حوالہ' : 'Ref'}</TableHead>
                                        <TableHead>{isUrdu ? 'کسان' : 'Farmer'}</TableHead>
                                        <TableHead>{isUrdu ? 'جنس و مارکہ' : 'Item & Mark'}</TableHead>
                                        <TableHead className="text-center">{isUrdu ? 'بوریاں (تعداد)' : 'Bags (Nag)'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'آمد مالیت' : 'Arrival Est.'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'فروخت شدہ' : 'Sales Recorded'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'ادا شدہ' : 'Paid'}</TableHead>
                                        <TableHead className="w-32 text-center">{t('common.action') || 'Action'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unsettled.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                                                {t('settlement.no_unsettled')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        unsettled.map((arr) => (
                                            <TableRow key={arr.id} className="text-xs hover:bg-muted/30">
                                                <TableCell className="font-mono text-muted-foreground py-2.5">
                                                    <span className="font-semibold text-foreground">{arr.reference}</span>
                                                    <span className="block text-[10px]">{arr.date}</span>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="font-semibold text-foreground">
                                                        {isUrdu ? arr.farmer_name_ur || arr.farmer_name : arr.farmer_name}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">Code: {arr.farmer_code}</span>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="font-medium text-foreground">
                                                        {isUrdu ? arr.item_name_ur || arr.item_name : arr.item_name}
                                                    </div>
                                                    {arr.mark_name && (
                                                        <span className="text-[10px] text-muted-foreground">Mark: {arr.mark_name}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-mono py-2.5 font-bold">
                                                    {arr.nag}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 text-muted-foreground">
                                                    Rs. {arr.arrival_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 font-semibold text-emerald-700">
                                                    {arr.sales_count > 0 ? (
                                                        <>
                                                            Rs. {arr.sales_total.toLocaleString()}
                                                            <span className="block text-[10px] text-muted-foreground">
                                                                ({arr.sales_count} {isUrdu ? 'سیلز' : 'sales'})
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px]">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 text-rose-700">
                                                    Rs. {arr.paid_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center py-2.5">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white gap-1"
                                                        onClick={() => openSettlementModal(arr)}
                                                    >
                                                        <Icon name="ReceiptIcon" className="size-3" />
                                                        {t('settlement.create_bijak')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* TAB 2: Settled History */}
                {activeTab === 'settled' && (
                    <Card className="border border-border/70 shadow-sm overflow-hidden">
                        <CardHeader className="p-3.5 bg-muted/30 border-b">
                            <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span>{t('settlement.settled_history')}</span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                    {isUrdu ? 'مکمل تصفیہ شدہ بیجک ریکارڈ' : 'All finalized farmer account sale statements'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/10">
                                    <TableRow className="text-xs">
                                        <TableHead className="w-24"># / {isUrdu ? 'بیجک نمبر' : 'Bijak #'}</TableHead>
                                        <TableHead>{isUrdu ? 'کسان' : 'Farmer'}</TableHead>
                                        <TableHead>{isUrdu ? 'آمد حوالہ' : 'Consignment'}</TableHead>
                                        <TableHead className="text-center">{isUrdu ? 'بوریاں' : 'Bags'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'کل فروخت' : 'Gross Sale'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'کل منہائیاں' : 'Deductions'}</TableHead>
                                        <TableHead className="text-right font-semibold">{isUrdu ? 'خالص رقم' : 'Net Payable'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'ادا شدہ' : 'Paid'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'بقایا' : 'Remaining'}</TableHead>
                                        <TableHead className="w-28 text-center">{t('common.action') || 'Action'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settled.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="h-32 text-center text-xs text-muted-foreground">
                                                {t('settlement.no_settled')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        settled.data.map((row) => (
                                            <TableRow key={row.id} className="text-xs hover:bg-muted/30">
                                                <TableCell className="font-mono text-muted-foreground py-2.5">
                                                    <span className="font-semibold text-foreground">{row.settlement_no}</span>
                                                    <span className="block text-[10px]">{row.date}</span>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <div className="font-semibold text-foreground">
                                                        {isUrdu ? row.farmer.name_ur || row.farmer.name : row.farmer.name}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">Code: {row.farmer.code}</span>
                                                </TableCell>
                                                <TableCell className="py-2.5 font-mono text-muted-foreground">
                                                    {row.farmer_purchase.reference}
                                                </TableCell>
                                                <TableCell className="text-center font-mono py-2.5 font-bold">
                                                    {row.nag}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 font-semibold text-foreground">
                                                    Rs. {row.gross_sale_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 text-rose-700">
                                                    -Rs. {row.total_deductions.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 font-bold text-green-900 bg-green-50/50">
                                                    Rs. {row.net_payable.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 text-blue-700">
                                                    Rs. {row.paid_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono py-2.5 font-bold text-foreground">
                                                    Rs. {row.remaining_payable.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center py-2.5">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Link href={route('farmers.settlements.show', row.id)}>
                                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-300 text-green-800 hover:bg-green-50">
                                                                <Icon name="PrinterIcon" className="size-3" />
                                                                {isUrdu ? 'بیجک' : 'Bijak'}
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                                                            onClick={() => handleDeleteSettlement(row.id)}
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
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Create Bijak / Settlement Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-900">
                            <Icon name="ReceiptIcon" className="size-5 text-green-700" />
                            {t('settlement.create_bijak')} — {selectedArrival?.reference}
                        </DialogTitle>
                        <DialogDescription>
                            {t('settlement.create_bijak_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedArrival && (
                        <form onSubmit={handleSettlementSubmit} className="space-y-4">
                            {/* Summary Banner of Arrival */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-green-950 font-mono">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'کسان' : 'Farmer'}:</span>
                                    <span className="font-bold font-sans">{selectedArrival.farmer_name}</span> ({selectedArrival.farmer_code})
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'جنس' : 'Item'}:</span>
                                    <span className="font-bold font-sans">{selectedArrival.item_name}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'بوریاں' : 'Bags'}:</span>
                                    <span className="font-bold">{selectedArrival.nag}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'نقد ادائیگی' : 'Paid at Arrival'}:</span>
                                    <span className="font-bold text-rose-700">Rs. {selectedArrival.paid_amount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Section 1: Gross Sales */}
                            <div className="space-y-2 border-b pb-3">
                                <h3 className="text-xs font-bold uppercase text-foreground">
                                    1. {t('settlement.gross_sale_proceeds')}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">{isUrdu ? 'تاریخ تصفیہ / بیجک' : 'Settlement Date'}</Label>
                                        <Input
                                            type="date"
                                            value={data.date}
                                            onChange={(e) => setData('date', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">{isUrdu ? 'کل مالیت فروخت (پختہ رقم - روپے)' : 'Gross Sale Proceeds (Rs)'}</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.gross_sale_amount}
                                            onChange={(e) => setData('gross_sale_amount', e.target.value)}
                                            className="h-8 text-xs font-mono font-bold"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Deductions & Commission */}
                            <div className="space-y-2 border-b pb-3">
                                <h3 className="text-xs font-bold uppercase text-rose-800">
                                    2. {t('settlement.total_deductions')}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('settlement.commission_aarhat')} (%):</Label>
                                        <div className="flex items-center gap-1.5">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={data.commission_rate}
                                                onChange={(e) => setData('commission_rate', e.target.value)}
                                                className="h-8 text-xs font-mono w-20"
                                            />
                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                = Rs. {commAmount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('settlement.mazdoori')}:</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.mazdoori}
                                            onChange={(e) => setData('mazdoori', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('settlement.carriage')}:</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.carriage}
                                            onChange={(e) => setData('carriage', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('settlement.chungi')}:</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.chungi}
                                            onChange={(e) => setData('chungi', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('settlement.bardana')}:</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.bardana}
                                            onChange={(e) => setData('bardana', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('settlement.other_deductions')}:</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.other_deductions}
                                            onChange={(e) => setData('other_deductions', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Additions & Advance */}
                            <div className="grid grid-cols-2 gap-3 border-b pb-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">{t('settlement.charges')} (اضافی رقم):</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={data.charges}
                                        onChange={(e) => setData('charges', e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">{t('settlement.paid_amount')} (ادا شدہ نقد):</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={data.paid_amount}
                                        onChange={(e) => setData('paid_amount', e.target.value)}
                                        className="h-8 text-xs font-mono"
                                    />
                                </div>
                            </div>

                            {/* Live Calculation Result Summary Card */}
                            <div className="rounded-lg border-2 border-green-700 bg-green-50/80 p-3 space-y-1.5 text-xs font-mono">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>{t('settlement.gross_sale_proceeds')}:</span>
                                    <span>Rs. {grossSale.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-rose-700">
                                    <span>- {t('settlement.total_deductions')}:</span>
                                    <span>- Rs. {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {charges > 0 && (
                                    <div className="flex justify-between items-center text-blue-700">
                                        <span>+ {t('settlement.charges')}:</span>
                                        <span>+ Rs. {charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="border-t border-green-300 pt-1.5 flex justify-between items-center text-sm font-bold text-green-950">
                                    <span className="font-sans">= {t('settlement.net_payable')}:</span>
                                    <span>Rs. {netPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-rose-700 pt-0.5">
                                    <span>- {t('settlement.paid_amount')}:</span>
                                    <span>- Rs. {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="border-t border-green-300 pt-1.5 flex justify-between items-center text-sm font-bold text-amber-950 bg-amber-100/60 px-2 py-1 rounded">
                                    <span className="font-sans">= {t('settlement.remaining_payable')}:</span>
                                    <span>Rs. {remainingPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setModalOpen(false)}
                                >
                                    {t('common.cancel') || 'Cancel'}
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={processing}
                                    className="bg-green-700 hover:bg-green-800 text-white gap-1.5 font-bold"
                                >
                                    <Icon name="CheckIcon" className="size-4" />
                                    {processing ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...') : (isUrdu ? 'بیجک مکمل کریں' : 'Save & Generate Bijak')}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

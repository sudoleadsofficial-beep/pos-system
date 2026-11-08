import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import PrintLetterhead from '@/components/app/print-letterhead';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

interface BijakData {
    settlement: {
        id: number;
        settlement_no: string;
        date: string;
        nag: number;
        weight: number;
        gross_sale_amount: number;
        commission_rate: number;
        commission_amount: number;
        mazdoori: number;
        carriage: number;
        chungi: number;
        bardana: number;
        other_deductions: number;
        charges: number;
        total_deductions: number;
        net_payable: number;
        paid_amount: number;
        remaining_payable: number;
        notes: string | null;
        created_at: string;
    };
    farmer: {
        id: number;
        name: string;
        name_ur: string | null;
        code: number;
        phone: string | null;
        current_balance: number;
    };
    consignment: {
        id: number;
        reference: string;
        date: string;
        item_name?: string;
        item_name_ur?: string | null;
        mark_name?: string;
        mark_name_ur?: string | null;
    };
    sales: Array<{
        id: number;
        date: string;
        merchant_name?: string;
        merchant_name_ur?: string | null;
        nag: number;
        weight: number;
        rate: number;
        bardana: number;
        gross_amount: number;
    }>;
    business: {
        name: string;
        name_ur: string;
        tagline: string;
        tagline_ur: string;
        address: string;
        phone: string;
        phone2: string;
        logo: string;
    };
}

interface Props {
    bijak: BijakData;
}

export default function FarmerBijakShow({ bijak }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const s = bijak.settlement;
    const f = bijak.farmer;
    const c = bijak.consignment;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.farmer_side'), href: '/register-consignment' },
        { title: t('settlement.title'), href: '/farmers/settlements' },
        { title: s.settlement_no, href: `/farmers/settlements/${s.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Bijak ${s.settlement_no} — ${isUrdu ? f.name_ur || f.name : f.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6 print:p-0 print:m-0">
                {/* Actions Bar (hidden when printed) */}
                <div className="flex items-center justify-between print:hidden">
                    <Link href="/farmers/settlements">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                            <Icon name="ArrowLeftIcon" className="size-3.5" />
                            {isUrdu ? 'واپس فہرست' : 'Back to Settlements'}
                        </Button>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            className="h-8 gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-white shadow-sm font-bold"
                            onClick={() => window.print()}
                        >
                            <Icon name="PrinterIcon" className="size-3.5" />
                            {t('settlement.print_bijak')}
                        </Button>
                    </div>
                </div>

                {/* Printable Formal Bijak Sheet */}
                <div className="mx-auto w-full max-w-4xl bg-white text-black p-6 rounded-lg border border-border/80 shadow-sm print:border-none print:shadow-none print:p-0 print:max-w-none">
                    {/* Official Letterhead */}
                    <PrintLetterhead
                        title={isUrdu ? 'بیجک کسان (تفصیل فروخت مال)' : 'Farmer Bijak (Account Sale)'}
                        titleUrdu="بیجک کسان (تفصیل فروخت مال)"
                        date={s.date}
                    />

                    {/* Meta Row: Bijak No, Consignment Ref, Farmer Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/60 rounded-lg text-xs mb-4">
                        <div>
                            <span className="text-muted-foreground block text-[11px]">{t('settlement.settlement_no')}:</span>
                            <span className="font-bold font-mono text-sm text-green-950">{s.settlement_no}</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                                {isUrdu ? 'تاریخ تصفیہ: ' : 'Date: '} <span className="font-mono">{s.date}</span>
                            </span>
                        </div>

                        <div>
                            <span className="text-muted-foreground block text-[11px]">{isUrdu ? 'محترم زمیندار / کسان' : 'Farmer'}:</span>
                            <span className="font-bold text-sm text-foreground">
                                {isUrdu ? f.name_ur || f.name : f.name}
                            </span>
                            <span className="block text-[10px] text-muted-foreground font-mono">
                                Code: {f.code} {f.phone && `| ${f.phone}`}
                            </span>
                        </div>

                        <div className="sm:text-right">
                            <span className="text-muted-foreground block text-[11px]">{t('settlement.consignment_ref')}:</span>
                            <span className="font-bold font-mono text-sm text-foreground">{c.reference}</span>
                            <span className="block text-[10px] text-muted-foreground">
                                {isUrdu ? 'جنس: ' : 'Item: '}
                                <span className="font-semibold text-foreground">
                                    {isUrdu ? c.item_name_ur || c.item_name : c.item_name}
                                </span>
                                {c.mark_name && ` (${c.mark_name})`}
                            </span>
                        </div>
                    </div>

                    {/* Produce & Arrival Summary */}
                    <div className="grid grid-cols-3 gap-2 p-2 bg-green-50/50 border border-green-200 rounded text-center text-xs font-mono mb-4">
                        <div>
                            <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'کل بوریاں (Nag)' : 'Total Bags (Nag)'}:</span>
                            <span className="text-base font-bold text-green-950">{s.nag}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'کل وزن (Weight)' : 'Total Weight'}:</span>
                            <span className="text-base font-bold text-green-950">{s.weight > 0 ? `${s.weight} Kg` : '-'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[10px] font-sans">{isUrdu ? 'کل رقم فروخت' : 'Gross Sale Amount'}:</span>
                            <span className="text-base font-bold text-green-900">Rs. {s.gross_sale_amount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Sales Breakdown (if arrival was attributed to sales) */}
                    {bijak.sales.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-xs font-bold uppercase text-foreground mb-1.5 flex items-center gap-1.5">
                                <Icon name="ListNumbersIcon" className="size-3.5 text-green-700" />
                                {t('settlement.sales_breakdown')}
                            </h4>
                            <Table className="border border-border/60">
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="text-[11px]">
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead>{isUrdu ? 'تاریخ' : 'Date'}</TableHead>
                                        <TableHead>{isUrdu ? 'خریدار / بیوپاری' : 'Merchant / Buyer'}</TableHead>
                                        <TableHead className="text-center">{isUrdu ? 'تعداد (Nag)' : 'Bags'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'ریٹ' : 'Rate'}</TableHead>
                                        <TableHead className="text-right">{isUrdu ? 'باردانہ' : 'Bardana'}</TableHead>
                                        <TableHead className="text-right font-semibold">{isUrdu ? 'رقم فروخت' : 'Gross Amount'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bijak.sales.map((sale, idx) => (
                                        <TableRow key={sale.id} className="text-xs">
                                            <TableCell className="text-center font-mono py-1.5">{idx + 1}</TableCell>
                                            <TableCell className="font-mono py-1.5">{sale.date}</TableCell>
                                            <TableCell className="font-medium py-1.5">
                                                {isUrdu ? sale.merchant_name_ur || sale.merchant_name : sale.merchant_name}
                                            </TableCell>
                                            <TableCell className="text-center font-mono py-1.5 font-bold">{sale.nag}</TableCell>
                                            <TableCell className="text-right font-mono py-1.5">{sale.rate.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-mono py-1.5">{sale.bardana.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-mono font-bold text-foreground py-1.5">
                                                Rs. {sale.gross_amount.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Deductions & Expenses Table */}
                    <div className="mb-4">
                        <h4 className="text-xs font-bold uppercase text-rose-800 mb-1.5 flex items-center gap-1.5">
                            <Icon name="MinusCircleIcon" className="size-3.5 text-rose-700" />
                            {isUrdu ? 'منہائیاں و دکان کے اخراجات کٹوتی' : 'Itemized Deductions & Charges'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border border-border/80 rounded-lg p-3 bg-muted/10 font-mono">
                            <div className="flex justify-between items-center py-1 border-b border-border/40">
                                <span className="font-sans text-muted-foreground">
                                    1. {t('settlement.commission_aarhat')} ({s.commission_rate}%):
                                </span>
                                <span className="font-bold text-rose-700">Rs. {s.commission_amount.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-border/40">
                                <span className="font-sans text-muted-foreground">
                                    2. {t('settlement.mazdoori')}:
                                </span>
                                <span className="font-bold text-rose-700">Rs. {s.mazdoori.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-border/40">
                                <span className="font-sans text-muted-foreground">
                                    3. {t('settlement.carriage')}:
                                </span>
                                <span className="font-bold text-rose-700">Rs. {s.carriage.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-border/40">
                                <span className="font-sans text-muted-foreground">
                                    4. {t('settlement.chungi')}:
                                </span>
                                <span className="font-bold text-rose-700">Rs. {s.chungi.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-border/40">
                                <span className="font-sans text-muted-foreground">
                                    5. {t('settlement.bardana')}:
                                </span>
                                <span className="font-bold text-rose-700">Rs. {s.bardana.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-border/40">
                                <span className="font-sans text-muted-foreground">
                                    6. {t('settlement.other_deductions')}:
                                </span>
                                <span className="font-bold text-rose-700">Rs. {s.other_deductions.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Deductions Total Line */}
                        <div className="flex justify-between items-center p-2 bg-rose-50 border border-rose-200 rounded mt-1.5 text-xs font-mono">
                            <span className="font-bold font-sans text-rose-900">{t('settlement.total_deductions')}:</span>
                            <span className="font-bold text-sm text-rose-900">- Rs. {s.total_deductions.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Final Net Farmer Payable Calculation Box */}
                    <div className="rounded-lg border-2 border-green-800 bg-green-50/80 p-4 mb-6 font-mono space-y-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span className="font-sans">{t('settlement.gross_sale_proceeds')}:</span>
                            <span>Rs. {s.gross_sale_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-rose-700">
                            <span className="font-sans">- {t('settlement.total_deductions')}:</span>
                            <span>- Rs. {s.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        {s.charges > 0 && (
                            <div className="flex justify-between items-center text-xs text-blue-700">
                                <span className="font-sans">+ {t('settlement.charges')}:</span>
                                <span>+ Rs. {s.charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="border-t-2 border-green-700 pt-2 flex justify-between items-center text-base font-bold text-green-950">
                            <span className="font-sans font-bold">{t('settlement.net_payable')}:</span>
                            <span className="text-lg">Rs. {s.net_payable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-blue-800 pt-1">
                            <span className="font-sans">- {t('settlement.paid_amount')}:</span>
                            <span>- Rs. {s.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="border-t border-green-300 pt-2 flex justify-between items-center text-sm font-bold text-amber-950 bg-amber-100/70 p-2 rounded">
                            <span className="font-sans">{t('settlement.remaining_payable')}:</span>
                            <span className="text-base font-bold">Rs. {s.remaining_payable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {s.notes && (
                        <div className="text-xs text-muted-foreground italic mb-6">
                            <span className="font-semibold">{isUrdu ? 'نوٹ: ' : 'Note: '}</span>
                            {s.notes}
                        </div>
                    )}

                    {/* Official Signatures Row */}
                    <div className="border-t-2 border-border/80 pt-6 mt-8 grid grid-cols-2 text-center text-xs">
                        <div>
                            <div className="w-48 border-b border-black mx-auto mb-1"></div>
                            <span className="font-semibold">{t('settlement.munshi_sign')}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">Prepared By</span>
                        </div>

                        <div>
                            <div className="w-48 border-b border-black mx-auto mb-1"></div>
                            <span className="font-bold text-green-950">{t('settlement.shopkeeper_sign')}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">Authorized Signature</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import useBusiness from '@/hooks/use-business';

export interface ReceiptItem {
    description: string;
    description_ur?: string;
    nag?: number | string;
    weight?: number | string;
    rate?: number | string;
    amount: number | string;
}

export interface ReceiptData {
    receiptType: 'farmer_purchase' | 'amroza_sale' | 'supplier_purchase' | 'party_payment' | 'merchant_receipt' | 'expense_voucher';
    titleEn: string;
    titleUr: string;
    receiptNo: string;
    date: string;
    time?: string;
    partyName: string;
    partyNameUr?: string;
    partyCode?: string;
    partyType?: string;
    partyPhone?: string;
    partyArea?: string;
    items?: ReceiptItem[];
    subtotal?: number;
    deductions?: number;
    commission?: number;
    bardana?: number;
    totalAmount: number;
    paidAmount?: number;
    remainingBalance?: number;
    previousBalance?: number;
    closingBalance?: number;
    notes?: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: ReceiptData | null;
}

export default function ReceiptModal({ open, onOpenChange, data }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';
    const business = useBusiness();
    const [format, setFormat] = useState<'thermal' | 'a4'>('thermal');

    if (!data) return null;

    const handlePrint = () => {
        window.print();
    };

    const phones = [business.phone, business.phone2].filter(Boolean).join(' | ');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-h-[90vh] overflow-y-auto ${format === 'thermal' ? 'max-w-[400px]' : 'max-w-2xl'}`}>
                {/* Print Control Toolbar (Hidden during print) */}
                <div className="flex items-center justify-between border-b pb-3 print:hidden">
                    <DialogHeader className="p-0 text-start">
                        <DialogTitle className="text-sm font-bold text-emerald-950 dark:text-emerald-400 flex items-center gap-1.5">
                            <Icon name="PrinterIcon" className="size-4 text-emerald-700" />
                            {isUrdu ? data.titleUr : data.titleEn}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center gap-1.5">
                        <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
                            <button
                                type="button"
                                onClick={() => setFormat('thermal')}
                                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                                    format === 'thermal'
                                        ? 'bg-white text-emerald-800 shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                80mm
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormat('a4')}
                                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                                    format === 'a4'
                                        ? 'bg-white text-emerald-800 shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                A4
                            </button>
                        </div>
                    </div>
                </div>

                {/* -------------------------------------------------------------
                    RECEIPT BODY (Print Area)
                ------------------------------------------------------------- */}
                <div
                    id="printable-receipt"
                    className={`bg-white text-black p-4 text-xs font-sans print:p-0 ${
                        format === 'thermal' ? 'max-w-[80mm] mx-auto border rounded-sm shadow-sm print:border-none print:shadow-none' : 'w-full'
                    }`}
                    dir={isUrdu ? 'rtl' : 'ltr'}
                >
                    {/* Header: Shop Branding */}
                    <div className="text-center pb-2 border-b border-dashed border-gray-400">
                        {business.logo && (
                            <img src={`/${business.logo}`} alt={business.name} className="h-10 mx-auto mb-1 object-contain" />
                        )}
                        <h2 className="text-base font-bold tracking-tight text-gray-900 font-nastaliq">
                            {business.name_ur || business.name}
                        </h2>
                        {business.name_ur && business.name !== business.name_ur && (
                            <p className="text-xs font-semibold text-gray-700">{business.name}</p>
                        )}
                        {(business.tagline_ur || business.tagline) && (
                            <p className="text-[11px] text-gray-600 font-nastaliq">
                                {business.tagline_ur || business.tagline}
                            </p>
                        )}
                        {business.address && (
                            <p className="text-[10px] text-gray-500 mt-0.5">{business.address}</p>
                        )}
                        {phones && (
                            <p className="text-[10px] font-mono text-gray-600 mt-0.5">{phones}</p>
                        )}
                    </div>

                    {/* Receipt Title & Meta */}
                    <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-[11px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">
                                {isUrdu ? data.titleUr : data.titleEn}
                            </span>
                            <span className="font-mono font-bold text-gray-900">{data.receiptNo}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-600">
                            <span>{isUrdu ? 'تاریخ' : 'Date'}: <strong className="font-mono text-gray-800">{data.date}</strong></span>
                            {data.time && <span>{data.time}</span>}
                        </div>
                    </div>

                    {/* Party Details */}
                    <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">{data.partyType || (isUrdu ? 'پارٹی' : 'Party')}:</span>
                            <span className="font-bold text-gray-900">
                                {data.partyCode && `[${data.partyCode}] `}
                                {isUrdu ? data.partyNameUr || data.partyName : data.partyName}
                            </span>
                        </div>
                        {data.partyArea && (
                            <div className="flex items-center justify-between text-gray-500 text-[10px]">
                                <span>{isUrdu ? 'علاقہ' : 'Area'}:</span>
                                <span>{data.partyArea}</span>
                            </div>
                        )}
                        {data.partyPhone && (
                            <div className="flex items-center justify-between text-gray-500 text-[10px]">
                                <span>{isUrdu ? 'فون' : 'Phone'}:</span>
                                <span className="font-mono">{data.partyPhone}</span>
                            </div>
                        )}
                    </div>

                    {/* Items Table (if any) */}
                    {data.items && data.items.length > 0 && (
                        <div className="py-2 border-b border-dashed border-gray-400">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-gray-300 text-gray-600">
                                        <th className="text-start pb-1">{isUrdu ? 'تفصیل' : 'Item'}</th>
                                        <th className="text-center pb-1">{isUrdu ? 'نگ' : 'Nag'}</th>
                                        {data.items.some((i) => i.weight) && (
                                            <th className="text-center pb-1">{isUrdu ? 'وزن' : 'Kg'}</th>
                                        )}
                                        <th className="text-end pb-1">{isUrdu ? 'ریٹ' : 'Rate'}</th>
                                        <th className="text-end pb-1">{isUrdu ? 'رقم' : 'Amount'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.items.map((item, idx) => (
                                        <tr key={idx} className="py-1">
                                            <td className="py-1 text-start font-medium text-gray-800">
                                                {isUrdu ? item.description_ur || item.description : item.description}
                                            </td>
                                            <td className="py-1 text-center font-mono">{item.nag ?? '-'}</td>
                                            {data.items?.some((i) => i.weight) && (
                                                <td className="py-1 text-center font-mono">{item.weight ?? '-'}</td>
                                            )}
                                            <td className="py-1 text-end font-mono">{item.rate ?? '-'}</td>
                                            <td className="py-1 text-end font-mono font-semibold">
                                                {typeof item.amount === 'number'
                                                    ? item.amount.toLocaleString()
                                                    : item.amount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Financial Summary */}
                    <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                        {data.subtotal !== undefined && data.subtotal !== data.totalAmount && (
                            <div className="flex justify-between text-gray-600">
                                <span>{isUrdu ? 'کل رقم' : 'Gross Amount'}:</span>
                                <span className="font-mono">Rs. {data.subtotal.toLocaleString()}</span>
                            </div>
                        )}
                        {data.bardana !== undefined && data.bardana > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>{isUrdu ? 'باردانہ' : 'Bardana'}:</span>
                                <span className="font-mono">Rs. {data.bardana.toLocaleString()}</span>
                            </div>
                        )}
                        {data.commission !== undefined && data.commission > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>{isUrdu ? 'کمیشن' : 'Commission'}:</span>
                                <span className="font-mono">Rs. {data.commission.toLocaleString()}</span>
                            </div>
                        )}
                        {data.deductions !== undefined && data.deductions > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>{isUrdu ? 'منہائی / کٹوتی' : 'Deductions'}:</span>
                                <span className="font-mono">-Rs. {data.deductions.toLocaleString()}</span>
                            </div>
                        )}

                        {/* Net Total Amount */}
                        <div className="flex justify-between text-xs font-bold text-gray-950 pt-1 border-t border-gray-200">
                            <span>{isUrdu ? 'خالص رقم (Total)' : 'Net Amount'}:</span>
                            <span className="font-mono text-sm">Rs. {data.totalAmount.toLocaleString()}</span>
                        </div>

                        {data.paidAmount !== undefined && (
                            <div className="flex justify-between text-emerald-800 font-semibold pt-0.5">
                                <span>{isUrdu ? 'نقد ادائیگی / وصولی' : 'Cash Paid / Received'}:</span>
                                <span className="font-mono">Rs. {data.paidAmount.toLocaleString()}</span>
                            </div>
                        )}

                        {data.remainingBalance !== undefined && (
                            <div className="flex justify-between text-gray-900 font-semibold pt-0.5 border-t border-gray-200">
                                <span>{isUrdu ? 'باقی رقم' : 'Net Balance'}:</span>
                                <span className="font-mono">Rs. {data.remainingBalance.toLocaleString()}</span>
                            </div>
                        )}

                        {data.closingBalance !== undefined && (
                            <div className="flex justify-between text-gray-900 font-bold pt-1 border-t border-gray-300">
                                <span>{isUrdu ? 'پارٹی کا کل کھاتہ باقی' : 'Party Closing Balance'}:</span>
                                <span className="font-mono">Rs. {data.closingBalance.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Notes if any */}
                    {data.notes && (
                        <div className="py-1.5 text-[10px] text-gray-500 italic border-b border-dashed border-gray-300">
                            {data.notes}
                        </div>
                    )}

                    {/* Footer Attribution */}
                    <div className="pt-2 text-center text-[10px] text-gray-500 space-y-0.5 font-nastaliq">
                        <p>{isUrdu ? 'شکریہ! دوبارہ تشریف لائیں' : 'Thank you for your business!'}</p>
                        <p className="font-sans text-[9px] text-gray-400">
                            JKC Sabzi Mandi POS System • {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                {/* Dialog Footer Actions (Hidden during print) */}
                <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2 print:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        {t('common.close', 'Close')}
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handlePrint}
                        className="text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                        <Icon name="PrinterIcon" className="size-3.5" />
                        {isUrdu ? 'پرنٹ رسید' : 'Print Receipt'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

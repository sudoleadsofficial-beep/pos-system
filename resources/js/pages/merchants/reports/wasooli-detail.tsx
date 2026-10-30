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

interface Row {
    id: number;
    date: string;
    merchant_code: number | string;
    merchant_name_ur: string;
    merchant_name_en: string;
    amount: number;
    type: string;
    note?: string;
}

interface Props {
    rows: Row[];
    totals: {
        total_amount: number;
    };
    filters: {
        from_date: string;
        to_date: string;
    };
}

export default function WasooliDetailReport({ rows, totals, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [fromDate, setFromDate] = useState(filters.from_date);
    const [toDate, setToDate] = useState(filters.to_date);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.wasooli_detail'), href: '/wasooli-detail' },
    ];

    function handleFilter(e: React.FormEvent) {
        e.preventDefault();
        router.get('/wasooli-detail', { from_date: fromDate, to_date: toDate }, { preserveState: true, replace: true });
    }

    function triggerPrint() {
        window.print();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.wasooli_detail')} />

            <div className="p-4 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Non-print Filter Controls */}
                <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border shadow-xs">
                    <div>
                        <h1 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                            <Icon name="Receipt" className="w-5 h-5 text-blue-700" />
                            {t('nav.wasooli_detail')}
                        </h1>
                        <p className="text-xs text-muted-foreground">{t('branding.name')}</p>
                    </div>

                    <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Label htmlFor="from_date" className="text-xs">{t('common.date')}:</Label>
                            <Input
                                id="from_date"
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                className="w-36 h-8 text-xs font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">تا</span>
                            <Input
                                id="to_date"
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                className="w-36 h-8 text-xs font-mono"
                            />
                        </div>
                        <Button type="submit" variant="outline" className="h-8 text-xs">
                            <Icon name="Filter" className="w-3.5 h-3.5 me-1" />
                            {t('common.filter')}
                        </Button>
                        <Button type="button" onClick={triggerPrint} className="h-8 bg-blue-700 hover:bg-blue-800 text-white text-xs">
                            <Icon name="Printer" className="w-3.5 h-3.5 me-1" />
                            {t('common.print')}
                        </Button>
                    </form>
                </div>

                {/* Printable Report Section */}
                <div className="bg-white p-6 rounded-lg border shadow-xs print:border-none print:shadow-none print:p-0">
                    <PrintLetterhead
                        title="Wasooli Detail"
                        titleUrdu="وصولی تفصیلی رپورٹ (ریکوری اندراج)"
                        from_date={fromDate}
                        to_date={toDate}
                    />

                    <div className="overflow-hidden border rounded-md print:border-black">
                        <table className="w-full text-xs">
                            <thead className="bg-blue-900 text-white print:bg-gray-200 print:text-black">
                                <tr>
                                    <th className="p-2.5 text-center w-10">#</th>
                                    <th className="p-2.5 text-start w-24">{t('common.date')}</th>
                                    <th className="p-2.5 text-start w-20">{t('common.code')}</th>
                                    <th className="p-2.5 text-start">{t('merchants.merchant')}</th>
                                    <th className="p-2.5 text-start w-28">{t('common.status')}</th>
                                    <th className="p-2.5 text-start">{t('common.details')}</th>
                                    <th className="p-2.5 text-end w-36">{t('wasooli.wasooli')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            {t('common.no_records')}
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={row.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}`}>
                                            <td className="p-2.5 text-center text-gray-500 font-mono">{idx + 1}</td>
                                            <td className="p-2.5 font-mono text-gray-700">{row.date}</td>
                                            <td className="p-2.5 font-mono font-bold text-blue-900">{row.merchant_code}</td>
                                            <td className="p-2.5 font-nastaliq text-sm">
                                                {isUrdu ? row.merchant_name_ur : row.merchant_name_en}
                                            </td>
                                            <td className="p-2.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                    row.type === 'same_day_cash'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {row.type === 'same_day_cash' ? t('amroza.naqdi') : t('wasooli.wasooli')}
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-gray-600">{row.note || '-'}</td>
                                            <td className="p-2.5 text-end font-mono font-bold text-blue-900">
                                                Rs. {Number(row.amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 print:bg-gray-200">
                                <tr>
                                    <td colSpan={6} className="p-2.5 text-start font-sans">
                                        {t('common.total')}
                                    </td>
                                    <td className="p-2.5 text-end font-mono text-sm text-blue-900">
                                        Rs. {Number(totals.total_amount).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

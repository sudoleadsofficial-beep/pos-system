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
    is_naqdi: boolean;
    item_name_ur: string;
    item_name_en: string;
    unit: string;
    nag: number;
    weight: number;
    rate: number;
    bardana: number;
    gross_amount: number;
}

interface Props {
    rows: Row[];
    totals: {
        total_nag: number;
        total_weight: number;
        total_gross: number;
    };
    filters: {
        from_date: string;
        to_date: string;
    };
}

export default function AmrozaDetailReport({ rows, totals, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [fromDate, setFromDate] = useState(filters.from_date);
    const [toDate, setToDate] = useState(filters.to_date);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.amroza_detail'), href: '/amroza-detail' },
    ];

    function handleFilter(e: React.FormEvent) {
        e.preventDefault();
        router.get('/amroza-detail', { from_date: fromDate, to_date: toDate }, { preserveState: true, replace: true });
    }

    function triggerPrint() {
        window.print();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.amroza_detail')} />

            <div className="p-4 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Non-print Filter Controls */}
                <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border shadow-xs">
                    <div>
                        <h1 className="text-xl font-bold text-green-800 flex items-center gap-2">
                            <Icon name="FileText" className="w-5 h-5 text-green-700" />
                            {t('nav.amroza_detail')}
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
                        <Button type="button" onClick={triggerPrint} className="h-8 bg-green-700 hover:bg-green-800 text-white text-xs">
                            <Icon name="Printer" className="w-3.5 h-3.5 me-1" />
                            {t('common.print')}
                        </Button>
                    </form>
                </div>

                {/* Printable Report Section */}
                <div className="bg-white p-6 rounded-lg border shadow-xs print:border-none print:shadow-none print:p-0">
                    <PrintLetterhead
                        title="Amroza Detail"
                        titleUrdu="امروزہ تفصیلی رپورٹ (سیلز اندراج)"
                        from_date={fromDate}
                        to_date={toDate}
                    />

                    <div className="overflow-hidden border rounded-md print:border-black">
                        <table className="w-full text-xs">
                            <thead className="bg-green-800 text-white print:bg-gray-200 print:text-black">
                                <tr>
                                    <th className="p-2 text-center w-10">#</th>
                                    <th className="p-2 text-start w-20">{t('common.date')}</th>
                                    <th className="p-2 text-start w-16">{t('common.code')}</th>
                                    <th className="p-2 text-start">{t('merchants.merchant')}</th>
                                    <th className="p-2 text-start">{t('amroza.item')}</th>
                                    <th className="p-2 text-end w-16">{t('amroza.nag')}</th>
                                    <th className="p-2 text-end w-20">{t('amroza.weight')}</th>
                                    <th className="p-2 text-end w-20">{t('amroza.rate')}</th>
                                    <th className="p-2 text-end w-16">{t('amroza.bardana')}</th>
                                    <th className="p-2 text-end w-28">{t('amroza.gross_amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-8 text-center text-muted-foreground">
                                            {t('common.no_records')}
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={row.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}`}>
                                            <td className="p-2 text-center text-gray-500 font-mono">{idx + 1}</td>
                                            <td className="p-2 font-mono text-gray-700">{row.date}</td>
                                            <td className="p-2 font-mono font-bold text-green-900">{row.merchant_code}</td>
                                            <td className="p-2">
                                                <span className="font-nastaliq text-sm">
                                                    {isUrdu ? row.merchant_name_ur : row.merchant_name_en}
                                                </span>
                                                {row.is_naqdi && (
                                                    <span className="ms-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                                                        {t('amroza.naqdi')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 font-nastaliq text-sm">
                                                {isUrdu ? row.item_name_ur : row.item_name_en}
                                            </td>
                                            <td className="p-2 text-end font-mono font-semibold">{row.nag}</td>
                                            <td className="p-2 text-end font-mono">
                                                {Number(row.weight) > 0 ? Number(row.weight).toFixed(2) : '-'}
                                            </td>
                                            <td className="p-2 text-end font-mono">{Number(row.rate).toLocaleString()}</td>
                                            <td className="p-2 text-end font-mono">
                                                {Number(row.bardana) > 0 ? Number(row.bardana).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-2 text-end font-mono font-bold text-green-900">
                                                Rs. {Number(row.gross_amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 print:bg-gray-200">
                                <tr>
                                    <td colSpan={5} className="p-2.5 text-start font-sans">
                                        {t('common.total')}
                                    </td>
                                    <td className="p-2.5 text-end font-mono text-sm">{totals.total_nag}</td>
                                    <td className="p-2.5 text-end font-mono text-sm">
                                        {totals.total_weight > 0 ? totals.total_weight.toFixed(2) : '-'}
                                    </td>
                                    <td colSpan={2}></td>
                                    <td className="p-2.5 text-end font-mono text-sm text-green-900">
                                        Rs. {Number(totals.total_gross).toLocaleString()}
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

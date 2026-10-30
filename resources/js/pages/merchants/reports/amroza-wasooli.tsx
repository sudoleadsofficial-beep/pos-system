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
    date: string;
    sabiqa: number;
    amroza: number;
    wasooli: number;
    baqaya: number;
}

interface Props {
    rows: Row[];
    totals: {
        total_sabiqa: number;
        total_amroza: number;
        total_wasooli: number;
        total_baqaya: number;
    };
    filters: {
        from_date: string;
        to_date: string;
    };
}

export default function AmrozaWasooliCombinedReport({ rows, totals, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [fromDate, setFromDate] = useState(filters.from_date);
    const [toDate, setToDate] = useState(filters.to_date);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.merchant_side'), href: '#' },
        { title: t('nav.amroza_wasooli'), href: '/amroza-wasooli' },
    ];

    function handleFilter(e: React.FormEvent) {
        e.preventDefault();
        router.get('/amroza-wasooli', { from_date: fromDate, to_date: toDate }, { preserveState: true, replace: true });
    }

    function triggerPrint() {
        window.print();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.amroza_wasooli')} />

            <div className="p-4 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Non-print Filter Controls */}
                <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border shadow-xs">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Icon name="ChartLineUp" className="w-5 h-5 text-slate-700" />
                            {t('nav.amroza_wasooli')}
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
                        <Button type="button" onClick={triggerPrint} className="h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs">
                            <Icon name="Printer" className="w-3.5 h-3.5 me-1" />
                            {t('common.print')}
                        </Button>
                    </form>
                </div>

                {/* Printable Report Section */}
                <div className="bg-white p-6 rounded-lg border shadow-xs print:border-none print:shadow-none print:p-0">
                    <PrintLetterhead
                        title="Amroza + Wasooli Detail"
                        titleUrdu="امروزہ و وصولی روزانہ گوشوارہ"
                        from_date={fromDate}
                        to_date={toDate}
                    />

                    <div className="overflow-hidden border rounded-md print:border-black">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-900 text-white print:bg-gray-200 print:text-black">
                                <tr>
                                    <th className="p-2.5 text-center w-12">#</th>
                                    <th className="p-2.5 text-start w-28">{t('common.date')}</th>
                                    <th className="p-2.5 text-end w-40">{t('wasooli.sabiqa')}</th>
                                    <th className="p-2.5 text-end w-40">{t('wasooli.amroza')}</th>
                                    <th className="p-2.5 text-end w-40">{t('wasooli.wasooli')}</th>
                                    <th className="p-2.5 text-end w-44">{t('wasooli.total_baqaya')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            {t('common.no_records')}
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={row.date} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="p-2.5 text-center text-gray-500 font-mono">{idx + 1}</td>
                                            <td className="p-2.5 font-mono font-medium text-slate-800">{row.date}</td>
                                            <td className="p-2.5 text-end font-mono">
                                                Rs. {Number(row.sabiqa).toLocaleString()}
                                            </td>
                                            <td className="p-2.5 text-end font-mono font-semibold text-emerald-800">
                                                {row.amroza > 0 ? `Rs. ${Number(row.amroza).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-2.5 text-end font-mono font-semibold text-blue-800">
                                                {row.wasooli > 0 ? `Rs. ${Number(row.wasooli).toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-2.5 text-end font-mono font-bold text-slate-900">
                                                Rs. {Number(row.baqaya).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold border-t-2 print:bg-gray-200">
                                <tr>
                                    <td colSpan={2} className="p-2.5 text-start font-sans">
                                        {t('common.total')}
                                    </td>
                                    <td className="p-2.5 text-end font-mono text-sm">
                                        Rs. {Number(totals.total_sabiqa).toLocaleString()}
                                    </td>
                                    <td className="p-2.5 text-end font-mono text-sm text-emerald-800">
                                        Rs. {Number(totals.total_amroza).toLocaleString()}
                                    </td>
                                    <td className="p-2.5 text-end font-mono text-sm text-blue-800">
                                        Rs. {Number(totals.total_wasooli).toLocaleString()}
                                    </td>
                                    <td className="p-2.5 text-end font-mono text-sm text-amber-800">
                                        Rs. {Number(totals.total_baqaya).toLocaleString()}
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

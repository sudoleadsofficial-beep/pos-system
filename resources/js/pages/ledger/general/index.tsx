import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MandiPageHeader from '@/components/app/mandi-page-header';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface LedgerRow {
    id: string;
    date: string;
    name: string;
    detail: string;
    jama: number;
    banam: number;
}

interface Summary {
    balance: number;
    total_jama: number;
    total_banam: number;
    entries: number;
}

interface Props {
    date: string;
    dayMonth: string;
    rows: LedgerRow[];
    summary: Summary;
}

export default function GeneralLedgerIndex({ date, dayMonth, rows, summary }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);
    const [infoOpen, setInfoOpen] = useState(false);
    const [entryModalOpen, setEntryModalOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'کھاتہ' : 'Khata', href: '#' },
        { title: isUrdu ? 'جنرل لیجر' : 'General Ledger', href: '/general-ledger' },
    ];

    const { data, setData, post, processing, reset } = useForm({
        date: selectedDate,
        title: '',
        amount: '',
        description: '',
    });

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        setData('date', newDate);
        router.get('/general-ledger', { date: newDate }, { preserveState: true, replace: true });
    }

    function handlePrevDate() {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        handleDateChange(d.toISOString().split('T')[0]);
    }

    function handleNextDate() {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        handleDateChange(d.toISOString().split('T')[0]);
    }

    function handleSaveEntry(e: React.FormEvent) {
        e.preventDefault();
        post('/general-ledger', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isUrdu ? 'اندراج محفوظ ہو گیا' : 'Entry saved successfully');
                setEntryModalOpen(false);
                reset('title', 'amount', 'description');
            },
            onError: () => toast.error(isUrdu ? 'خرابی واقع ہوئی' : 'Error saving entry'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'جنرل لیجر' : 'General Ledger'} />

            {/* Screen UI - Clean Simple Style */}
            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] print:hidden" dir={isUrdu ? 'rtl' : 'ltr'}>
                
                {/* 1. Greenish Top Header Banner */}
                <MandiPageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <span>General Ledger</span>
                            <span className="font-nastaliq font-normal text-emerald-100 text-lg md:text-xl">جنرل لیجر</span>
                        </span>
                    }
                    subtitle={isUrdu ? 'پیسے کا لینا دینا' : 'Paisay ka lena dena'}
                    isUrdu={isUrdu}
                >
                    <button
                        type="button"
                        onClick={() => setEntryModalOpen(true)}
                        className="h-8.5 px-3.5 rounded-xl text-xs font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <Icon name="Plus" className="size-3.5" weight="bold" />
                        <span>+ Nayi Entry</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="h-8.5 px-4 rounded-xl text-xs font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                        <Icon name="Printer" className="size-4 text-emerald-800" />
                        <span>Print</span>
                    </button>
                </MandiPageHeader>

                {/* 2. Floating Content Area */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-6 md:-mt-8 space-y-4">
                    
                    

                    {/* Filter Card: Tarikh */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-3.5 md:p-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="text-[11px] font-semibold text-gray-500">
                                Tarikh
                            </label>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => handleDateChange(e.target.value)}
                                    className="h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handlePrevDate}
                                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 cursor-pointer transition-colors"
                                    title="Previous Day"
                                >
                                    <Icon name="CaretLeft" className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextDate}
                                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 cursor-pointer transition-colors"
                                    title="Next Day"
                                >
                                    <Icon name="CaretRight" className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Card: Pure White Card with 4 columns divided by vertical borders */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 items-center divide-y md:divide-y-0 md:divide-x md:divide-gray-100">
                        {/* 1. Balance */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Balance
                            </span>
                            <div className="text-xl md:text-2xl font-black font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.balance).toLocaleString()}
                            </div>
                            <span className="text-[11px] text-gray-400 block pt-0.5 font-mono">
                                {dayMonth} {isUrdu ? 'کا حساب' : 'ka hisaab'}
                            </span>
                        </div>

                        {/* 2. Total Jama */}
                        <div className="md:ps-5 pt-3 md:pt-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Total Jama
                            </span>
                            <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.total_jama).toLocaleString()}
                            </div>
                        </div>

                        {/* 3. Total Banam */}
                        <div className="md:ps-5 pt-3 md:pt-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Total Banam
                            </span>
                            <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-gray-900">
                                Rs. {Number(summary.total_banam).toLocaleString()}
                            </div>
                        </div>

                        {/* 4. Entries */}
                        <div className="md:ps-5 pt-3 md:pt-0 space-y-0.5">
                            <span className="text-[10px] font-semibold text-gray-400 block">
                                Entries
                            </span>
                            <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-gray-900">
                                {summary.entries}
                            </div>
                        </div>
                    </div>

                    {/* Table Card: Pure white, clean muted headers, simple borders */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs font-sans">
                                <thead>
                                    <tr className="text-gray-400 border-b border-gray-200 font-semibold bg-gray-50/50">
                                        <th className="px-4 py-3 text-start w-28">Date</th>
                                        <th className="px-4 py-3 text-start">Naam</th>
                                        <th className="px-4 py-3 text-start">Detail</th>
                                        <th className="px-4 py-3 text-end">Jama</th>
                                        <th className="px-4 py-3 text-end">Banam</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs">
                                                No entries for this date
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-4 py-3 font-mono text-gray-600">
                                                    {row.date}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-900">
                                                    {row.name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {row.detail || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono font-medium text-gray-900">
                                                    {row.jama > 0 ? Number(row.jama).toLocaleString() : '–'}
                                                </td>
                                                <td className="px-4 py-3 text-end font-mono font-medium text-gray-900">
                                                    {row.banam > 0 ? Number(row.banam).toLocaleString() : '–'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-900 bg-gray-50/80 font-bold text-gray-900">
                                        <td className="px-4 py-3">Total</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-end font-mono">
                                            {Number(summary.total_jama).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-end font-mono">
                                            {Number(summary.total_banam).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Thermal 80mm Print Document */}
            <div id="printable-general-ledger" className="hidden print:block p-4 bg-white text-black font-sans text-xs max-w-[80mm] mx-auto print-document-container" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* Header: Green V Logo + Vegetable POS */}
                <div className="text-center border-b-2 border-[#166534] pb-2 mb-3">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <div className="w-6 h-6 rounded bg-[#166534] flex items-center justify-center text-white font-black text-xs">V</div>
                        <h1 className="text-base font-extrabold tracking-tight text-[#166534] uppercase">
                            Vegetable POS
                        </h1>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700">
                        {isUrdu ? 'جنرل لیجر · روکڑ' : 'General Ledger · Roker'}
                    </p>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Date: {selectedDate}
                    </div>
                </div>

                {/* Summary Box */}
                <div className="border border-black rounded p-2 mb-3 text-center bg-gray-50">
                    <span className="text-[10px] text-gray-600 uppercase font-bold block">Net Cash Balance</span>
                    <strong className="text-base font-mono font-black text-gray-900">
                        Rs. {Number(summary.balance).toLocaleString()}
                    </strong>
                    <div className="flex justify-between text-[10px] pt-1 mt-1 border-t border-gray-300">
                        <span>Jama: Rs. {Number(summary.total_jama).toLocaleString()}</span>
                        <span>Banam: Rs. {Number(summary.total_banam).toLocaleString()}</span>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full text-[10px] border border-black border-collapse mb-3">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                            <th className="p-1 text-start border-e border-black">Naam</th>
                            <th className="p-1 text-end border-e border-black">Jama</th>
                            <th className="p-1 text-end">Banam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-3 text-center text-gray-500">
                                    No entries
                                </td>
                            </tr>
                        ) : (
                            rows.map(r => (
                                <tr key={r.id} className="border-b border-gray-300">
                                    <td className="p-1 border-e border-black">
                                        <div className="font-semibold">{r.name}</div>
                                        {r.detail && <div className="text-[9px] text-gray-600">{r.detail}</div>}
                                    </td>
                                    <td className="p-1 text-end border-e border-black font-mono">
                                        {r.jama > 0 ? Number(r.jama).toLocaleString() : '–'}
                                    </td>
                                    <td className="p-1 text-end font-mono">
                                        {r.banam > 0 ? Number(r.banam).toLocaleString() : '–'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black font-bold bg-gray-100">
                            <td className="p-1 border-e border-black">Total</td>
                            <td className="p-1 text-end border-e border-black font-mono">Rs. {Number(summary.total_jama).toLocaleString()}</td>
                            <td className="p-1 text-end font-mono">Rs. {Number(summary.total_banam).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Print Footer: Only "Printed on", NO signatures */}
                <div className="text-center text-[9px] text-gray-500 font-mono pt-2 border-t border-gray-300">
                    Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
            </div>

            

            {/* + Nayi Entry Dialog */}
            <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
                <DialogContent className="max-w-md font-sans">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-gray-900">
                            {isUrdu ? '+ نیا لیجر اندراج' : '+ Nayi Entry'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEntry} className="space-y-3 pt-2">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                {isUrdu ? 'نام / کھاتہ' : 'Naam / Party'} *
                            </label>
                            <Input
                                required
                                value={data.title}
                                onChange={e => setData('title', e.target.value)}
                                placeholder={isUrdu ? 'مثلاً: شمل خان / کرایہ وغیرہ' : 'e.g. Shamil Khan / Rent'}
                                className="h-9 text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                {isUrdu ? 'رقم (بنام / ادا کی گئی)' : 'Amount (Rs.)'} *
                            </label>
                            <Input
                                required
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.amount}
                                onChange={e => setData('amount', e.target.value)}
                                placeholder="0.00"
                                className="h-9 text-xs font-mono font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                {isUrdu ? 'تفصیل' : 'Detail'}
                            </label>
                            <Input
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                placeholder={isUrdu ? 'مثلاً: نقد لیا / سولر ایجنسی' : 'e.g. Naqad liya / Solar Agency'}
                                className="h-9 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setEntryModalOpen(false)} className="text-xs">
                                {isUrdu ? 'منسوخ' : 'Cancel'}
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold">
                                {isUrdu ? 'محفوظ کریں' : 'Save Entry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

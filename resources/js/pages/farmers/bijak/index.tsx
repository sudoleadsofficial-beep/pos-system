import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import Icon from '@/components/ui/icon';
import MandiPageHeader from '@/components/app/mandi-page-header';
import { toast } from 'sonner';

interface Area {
    id: number;
    name_en: string;
    name_ur: string;
}

interface FarmerMark {
    id: number;
    code: number;
    farmer_id: number;
    name_en: string;
    name_ur: string;
}

interface FarmerOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    phone?: string;
    area?: Area;
    marks: FarmerMark[];
}

interface ItemOption {
    id: number;
    name_en: string;
    name_ur: string;
    unit: string;
    default_rate: number | null;
    default_bardana: number | null;
}

interface SavedBillData {
    id: number;
    bill_no: string;
    farmer_name: string;
    net_amount: number;
    gross_amount: number;
    date: string;
}

interface Props {
    farmers: FarmerOption[];
    items: ItemOption[];
    saved_bill?: SavedBillData | null;
    filters: { date: string };
}

export default function BijjakIndex({ farmers, items, saved_bill, filters }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    // Wizard Step: 1 = Kisan, 2 = Maal, 3 = Charges, 4 = Jaiza, 5 = Saved
    const [step, setStep] = useState<number>(saved_bill ? 5 : 1);
    const [infoExpanded, setInfoExpanded] = useState(false);
    const [completedBill, setCompletedBill] = useState<SavedBillData | null>(saved_bill || null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'روزانہ کام' : 'Daily Kaam', href: '#' },
        { title: isUrdu ? 'کسان کا بل (بیجک)' : 'Farmer Bill (Bijak)', href: '/bijak' },
    ];

    // Form State - all inputs editable by user
    const { data, setData, post, processing, reset } = useForm({
        date: filters.date || new Date().toISOString().split('T')[0],
        farmer_id: '',
        farmer_mark_id: '',
        truck_no: '',
        item_id: '',
        nag: '',
        weight: '',
        rate: '',
        commission_pct: '',
        bardana_amount: '',
        kiraya: '',
        mazdoori: '',
        market_fee: '',
        note: '',
    });

    // Selected objects
    const selectedFarmer = useMemo(() => {
        if (!data.farmer_id) return null;
        return farmers.find(f => String(f.id) === String(data.farmer_id)) || null;
    }, [farmers, data.farmer_id]);

    const farmerMarks = useMemo(() => {
        return selectedFarmer?.marks || [];
    }, [selectedFarmer]);

    const selectedMark = useMemo(() => {
        return farmerMarks.find(m => String(m.id) === String(data.farmer_mark_id)) || null;
    }, [farmerMarks, data.farmer_mark_id]);

    const selectedItem = useMemo(() => {
        if (!data.item_id) return null;
        return items.find(it => String(it.id) === String(data.item_id)) || null;
    }, [items, data.item_id]);

    // Live Calculations
    const nagNum = parseFloat(data.nag) || 0;
    const weightNum = parseFloat(data.weight) || 0;
    const rateNum = parseFloat(data.rate) || 0;
    const commPctNum = parseFloat(data.commission_pct) || 0;
    const bardanaNum = parseFloat(data.bardana_amount) || 0;
    const kirayaNum = parseFloat(data.kiraya) || 0;
    const mazdooriNum = parseFloat(data.mazdoori) || 0;
    const marketFeeNum = parseFloat(data.market_fee) || 0;

    const isWeightBased = weightNum > 0;
    const kulRaqam = isWeightBased ? Math.round(weightNum * rateNum) : Math.round(nagNum * rateNum);
    const commAmount = Math.round((kulRaqam * commPctNum) / 100);
    const totalExpenses = Math.round(bardanaNum + kirayaNum + mazdooriNum + marketFeeNum);
    const safiRaqam = Math.round(kulRaqam - commAmount - totalExpenses);

    // Helpers
    const farmerTitle = (f: FarmerOption) => {
        const name = f.name_en || f.name_ur;
        const area = f.area ? (f.area.name_en || f.area.name_ur) : '';
        return area ? `${name} - ${area}` : name;
    };

    const handleFarmerChange = (farmerIdStr: string) => {
        setData(prev => {
            const f = farmers.find(item => String(item.id) === farmerIdStr);
            const defaultMarkId = f?.marks && f.marks.length > 0 ? String(f.marks[0].id) : '';
            return {
                ...prev,
                farmer_id: farmerIdStr,
                farmer_mark_id: defaultMarkId,
            };
        });
    };

    const handleSaveBill = (e: React.FormEvent) => {
        e.preventDefault();
        post('/bijak', {
            preserveScroll: true,
            onSuccess: (page: any) => {
                toast.success(isUrdu ? 'بیجک محفوظ ہو گیا' : 'Bill saved successfully');
                const saved = page.props?.saved_bill;
                if (saved) {
                    setCompletedBill(saved);
                } else {
                    setCompletedBill({
                        id: Date.now(),
                        bill_no: 'BJ-' + String(Math.floor(1000 + Math.random() * 9000)),
                        farmer_name: selectedFarmer ? farmerTitle(selectedFarmer) : 'Farmer',
                        net_amount: safiRaqam,
                        gross_amount: kulRaqam,
                        date: data.date,
                    });
                }
                setStep(5);
            },
            onError: () => toast.error(isUrdu ? 'محفوظ نہیں ہو سکا' : 'Could not save bill'),
        });
    };

    const handleNewBill = () => {
        reset();
        setData({
            date: new Date().toISOString().split('T')[0],
            farmer_id: farmers[0]?.id ? String(farmers[0].id) : '',
            farmer_mark_id: farmers[0]?.marks?.[0]?.id ? String(farmers[0].marks[0].id) : '',
            truck_no: '',
            item_id: items[0]?.id ? String(items[0].id) : '',
            nag: '',
            weight: '',
            rate: '',
            commission_pct: '6',
            bardana_amount: '0',
            kiraya: '0',
            mazdoori: '0',
            market_fee: '0',
            note: '',
        });
        setCompletedBill(null);
        setStep(1);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Kisan ka Bill (Bijak)" />

            {/* Screen UI */}
            <div className="w-full max-w-full overflow-x-hidden -mt-4 -mx-4 pb-20 bg-[#f4f6f4] min-h-[calc(100vh-4rem)] font-sans text-[#1a211c] print:hidden" dir="ltr">
                
                {/* 1. Greenish Top Header Banner */}
                <MandiPageHeader
                    title={
                        <span className="flex items-center gap-2">
                            <span>Kisan ka Bill (Bijak)</span>
                            <span className="font-nastaliq font-normal text-emerald-100 text-lg md:text-xl">بیجک</span>
                        </span>
                    }
                    subtitle="Kisan ke maal ka bill banayein"
                />

                {/* 2. Floating Content Area */}
                <div className="max-w-3xl mx-auto px-4 md:px-6 -mt-6 md:-mt-8 space-y-3">
                    
                    {/* Main White Card with Step Wizard */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-5 md:p-6">
                        
                        {/* 4-Step Stepper Bar */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-6 text-xs font-medium">
                            {/* Step 1: Kisan */}
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    step > 1
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : step === 1
                                        ? 'bg-[#14532d] text-white'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {step > 1 ? '✓' : '1'}
                                </div>
                                <span className={step >= 1 ? 'font-bold text-gray-900' : 'text-gray-400'}>
                                    Kisan
                                </span>
                            </div>

                            <div className="flex-1 h-px bg-gray-200 mx-3" />

                            {/* Step 2: Maal */}
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    step > 2
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : step === 2
                                        ? 'bg-[#14532d] text-white'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {step > 2 ? '✓' : '2'}
                                </div>
                                <span className={step >= 2 ? 'font-bold text-gray-900' : 'text-gray-400'}>
                                    Maal
                                </span>
                            </div>

                            <div className="flex-1 h-px bg-gray-200 mx-3" />

                            {/* Step 3: Charges */}
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    step > 3
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : step === 3
                                        ? 'bg-[#14532d] text-white'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {step > 3 ? '✓' : '3'}
                                </div>
                                <span className={step >= 3 ? 'font-bold text-gray-900' : 'text-gray-400'}>
                                    Charges
                                </span>
                            </div>

                            <div className="flex-1 h-px bg-gray-200 mx-3" />

                            {/* Step 4: Jaiza */}
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                    step >= 5
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : step === 4
                                        ? 'bg-[#14532d] text-white'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {step >= 5 ? '✓' : '4'}
                                </div>
                                <span className={step >= 4 ? 'font-bold text-gray-900' : 'text-gray-400'}>
                                    Jaiza
                                </span>
                            </div>
                        </div>

                        {/* STEP 1: KISAN SELECTION */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Kisan
                                    </label>
                                    <select
                                        value={data.farmer_id}
                                        onChange={e => handleFarmerChange(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                                    >
                                        {farmers.map(f => (
                                            <option key={f.id} value={f.id}>
                                                {farmerTitle(f)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Mark (Bari)
                                    </label>
                                    <select
                                        value={data.farmer_mark_id}
                                        onChange={e => setData('farmer_mark_id', e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                                    >
                                        <option value="">Khud (Self)</option>
                                        {farmerMarks.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name_en || m.name_ur} (#{m.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Truck No (zaroori nahi)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.truck_no}
                                        onChange={e => setData('truck_no', e.target.value)}
                                        placeholder="e.g. NAB652"
                                        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                                    />
                                </div>

                                <div className="flex justify-end pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!data.farmer_id) {
                                                toast.error('Kisan select karein');
                                                return;
                                            }
                                            setStep(2);
                                        }}
                                        className="h-9 px-5 rounded-lg bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                    >
                                        <span>Agla</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: MAAL ENTRY */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Maal
                                    </label>
                                    <select
                                        value={data.item_id}
                                        onChange={e => {
                                            const id = e.target.value;
                                            const it = items.find(item => String(item.id) === id);
                                            setData(prev => ({
                                                ...prev,
                                                item_id: id,
                                                rate: it?.default_rate ? String(it.default_rate) : prev.rate,
                                                bardana_amount: it?.default_bardana ? String(it.default_bardana * (parseFloat(prev.nag) || 1)) : prev.bardana_amount,
                                            }));
                                        }}
                                        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                                    >
                                        {items.map(it => (
                                            <option key={it.id} value={it.id}>
                                                {it.name_en || it.name_ur}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Nag
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.nag}
                                            onChange={e => setData('nag', e.target.value)}
                                            placeholder="40"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Wazan (kg)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={data.weight}
                                            onChange={e => setData('weight', e.target.value)}
                                            placeholder="2000"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Rate
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={data.rate}
                                            onChange={e => setData('rate', e.target.value)}
                                            placeholder="80"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <p className="text-[11px] text-gray-500">
                                    Agar Wazan likha ho to raqam Wazan × Rate se banegi, warna Nag × Rate se.
                                </p>

                                <div className="flex justify-between items-center pt-2 text-xs">
                                    <span className="text-gray-600">
                                        Kul raqam ({isWeightBased ? 'Wazan × Rate' : 'Nag × Rate'})
                                    </span>
                                    <span className="font-mono font-bold text-sm text-gray-900">
                                        Rs. {kulRaqam.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        ← Wapas
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!data.item_id) {
                                                toast.error('Maal select karein');
                                                return;
                                            }
                                            if (kulRaqam <= 0) {
                                                toast.error('Nag ya Wazan aur Rate darj karein');
                                                return;
                                            }
                                            setStep(3);
                                        }}
                                        className="h-9 px-5 rounded-lg bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                    >
                                        <span>Agla</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: CHARGES & EXPENSES */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Commission %
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={data.commission_pct}
                                            onChange={e => setData('commission_pct', e.target.value)}
                                            placeholder="6"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Bardana
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={data.bardana_amount}
                                            onChange={e => setData('bardana_amount', e.target.value)}
                                            placeholder="1200"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Kiraya
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={data.kiraya}
                                            onChange={e => setData('kiraya', e.target.value)}
                                            placeholder="0"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Mazdoori
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={data.mazdoori}
                                            onChange={e => setData('mazdoori', e.target.value)}
                                            placeholder="0"
                                            className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="sm:w-1/2">
                                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                        Market fee / Baaki
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={data.market_fee}
                                        onChange={e => setData('market_fee', e.target.value)}
                                        placeholder="0"
                                        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                                    />
                                </div>

                                {/* Financial Calculations Breakdown */}
                                <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Kul raqam</span>
                                        <span className="font-mono">Rs. {kulRaqam.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Commission {commPctNum}%</span>
                                        <span className="font-mono text-red-600">- Rs. {commAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Bardana aur akhrajat</span>
                                        <span className="font-mono text-red-600">- Rs. {totalExpenses.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="font-bold text-gray-900 text-sm">Kisan ko dene ki raqam</span>
                                        <span className="font-mono font-black text-base text-gray-900">
                                            Rs. {safiRaqam.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        ← Wapas
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(4)}
                                        className="h-9 px-5 rounded-lg bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                    >
                                        <span>Agla</span>
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: JAIZA (REVIEW & SAVE) */}
                        {step === 4 && (
                            <div className="space-y-4">
                                <div className="divide-y divide-gray-100 text-xs">
                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-500">Kisan</span>
                                        <span className="font-bold text-gray-900">
                                            {selectedFarmer ? farmerTitle(selectedFarmer) : '—'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-500">Mark (Bari)</span>
                                        <span className="font-bold text-gray-900">
                                            {selectedMark ? `${selectedMark.name_en || selectedMark.name_ur} (#${selectedMark.code})` : 'Khud (Self)'}
                                        </span>
                                    </div>

                                    {data.truck_no && (
                                        <div className="flex justify-between py-2">
                                            <span className="text-gray-500">Truck No</span>
                                            <span className="font-mono text-gray-900 font-bold">{data.truck_no}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-500">Maal</span>
                                        <span className="font-bold text-gray-900">
                                            {selectedItem ? (selectedItem.name_en || selectedItem.name_ur) : '—'}
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-500">Nag / Wazan / Rate</span>
                                        <span className="font-mono font-bold text-gray-900">
                                            {nagNum} / {weightNum > 0 ? `${weightNum} kg` : '—'} / Rs. {rateNum}
                                        </span>
                                    </div>
                                </div>

                                {/* Financial Calculations Breakdown */}
                                <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Kul raqam</span>
                                        <span className="font-mono font-bold">Rs. {kulRaqam.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Commission {commPctNum}%</span>
                                        <span className="font-mono text-red-600">- Rs. {commAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Bardana aur akhrajat</span>
                                        <span className="font-mono text-red-600">- Rs. {totalExpenses.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                        <span className="font-bold text-gray-900 text-sm">Kisan ko dene ki raqam</span>
                                        <span className="font-mono font-black text-base text-gray-900">
                                            Rs. {safiRaqam.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="h-9 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        ← Wapas
                                    </button>

                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={handleSaveBill}
                                        className="h-9 px-5 rounded-lg bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                                    >
                                        <span>✓</span>
                                        <span>Bill save karein</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: SUCCESS STATE */}
                        {step === 5 && completedBill && (
                            <div className="py-8 text-center space-y-4">
                                <div className="flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
                                        ✓
                                    </div>
                                </div>

                                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                    ✓ Bill save ho gaya
                                </h2>

                                <p className="text-xs text-gray-500 font-medium">
                                    Bill No: {completedBill.bill_no} · {completedBill.farmer_name}
                                </p>

                                <div className="text-3xl font-black font-mono text-gray-900 pt-1">
                                    Rs. {Number(completedBill.net_amount).toLocaleString()}
                                </div>

                                <div className="flex items-center justify-center gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="h-9 px-5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                    >
                                        Print
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleNewBill}
                                        className="h-9 px-5 rounded-lg bg-[#14532d] hover:bg-[#0e3b20] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                                    >
                                        Naya Bill
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Thermal 80mm Print Document for Saved Bill */}
            {completedBill && (
                <div id="printable-farmer-bill" className="hidden print:block p-4 bg-white text-black font-sans text-xs max-w-[80mm] mx-auto print-document-container" dir="ltr">
                    {/* Header: Green V Logo + Vegetable POS */}
                    <div className="text-center border-b-2 border-[#166534] pb-2 mb-3">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <div className="w-6 h-6 rounded bg-[#166534] flex items-center justify-center text-white font-black text-xs">V</div>
                            <h1 className="text-base font-extrabold tracking-tight text-[#166534] uppercase">
                                Vegetable POS
                            </h1>
                        </div>
                        <p className="text-[11px] font-semibold text-gray-700">
                            Kisan ka Bill (Bijak) · بیجک
                        </p>
                    </div>

                    {/* Bill Meta */}
                    <div className="border border-gray-400 rounded p-2 mb-3 text-[11px] space-y-1 bg-gray-50/50">
                        <div className="flex justify-between font-bold">
                            <span>Bill No: {completedBill.bill_no}</span>
                            <span className="font-mono">{completedBill.date}</span>
                        </div>
                        <div className="pt-0.5 border-t border-gray-200">
                            <strong>Kisan: </strong>
                            <span>{completedBill.farmer_name}</span>
                        </div>
                        {data.truck_no && (
                            <div>
                                <strong>Truck No: </strong>
                                <span className="font-mono">{data.truck_no}</span>
                            </div>
                        )}
                        <div>
                            <strong>Maal: </strong>
                            <span>{selectedItem ? (selectedItem.name_en || selectedItem.name_ur) : '—'}</span>
                        </div>
                        <div>
                            <strong>Nag / Wazan: </strong>
                            <span className="font-mono">{nagNum} nag / {weightNum > 0 ? `${weightNum} kg` : '—'}</span>
                        </div>
                        <div>
                            <strong>Rate: </strong>
                            <span className="font-mono">Rs. {rateNum}</span>
                        </div>
                    </div>

                    {/* Breakdown Box */}
                    <div className="border border-black rounded p-2 mb-3 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Kul raqam:</span>
                            <span className="font-mono font-bold">Rs. {kulRaqam.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                            <span>Commission ({commPctNum}%):</span>
                            <span className="font-mono">- Rs. {commAmount.toLocaleString()}</span>
                        </div>
                        {bardanaNum > 0 && (
                            <div className="flex justify-between text-gray-700">
                                <span>Bardana:</span>
                                <span className="font-mono">- Rs. {bardanaNum.toLocaleString()}</span>
                            </div>
                        )}
                        {kirayaNum > 0 && (
                            <div className="flex justify-between text-gray-700">
                                <span>Kiraya:</span>
                                <span className="font-mono">- Rs. {kirayaNum.toLocaleString()}</span>
                            </div>
                        )}
                        {mazdooriNum > 0 && (
                            <div className="flex justify-between text-gray-700">
                                <span>Mazdoori:</span>
                                <span className="font-mono">- Rs. {mazdooriNum.toLocaleString()}</span>
                            </div>
                        )}
                        {marketFeeNum > 0 && (
                            <div className="flex justify-between text-gray-700">
                                <span>Market fee:</span>
                                <span className="font-mono">- Rs. {marketFeeNum.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1.5 border-t border-black font-bold text-sm">
                            <span>Kisan ki safi raqam:</span>
                            <span className="font-mono font-black">Rs. {Number(completedBill.net_amount).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-[9px] text-gray-500 font-mono pt-2 border-t border-gray-300">
                        Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

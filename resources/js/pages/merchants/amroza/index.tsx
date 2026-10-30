import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import ListPicker, { type PickerItem } from '@/components/app/list-picker';
import { toast } from 'sonner';

interface MerchantOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    current_balance: number;
}

interface ItemOption {
    id: number;
    code: number;
    name_en: string;
    name_ur: string;
    unit: string;
    default_rate: number;
    default_bardana: number;
}

interface Sale {
    id: number;
    date: string;
    merchant_id: number;
    item_id: number;
    nag: number;
    weight: number;
    rate: number;
    bardana: number;
    gross_amount: number;
    payment_type?: 'naqdi' | 'udhaar';
    merchant?: {
        id: number;
        code: number;
        name_en: string;
        name_ur: string;
        name: string;
    };
    item?: {
        id: number;
        code: number;
        name_en: string;
        name_ur: string;
        name: string;
        unit: string;
    };
}

interface Summary {
    total_records: number;
    total_gross: number;
    total_nag: number;
    cash_nag: number;
    cash_amount: number;
    credit_nag: number;
    credit_amount: number;
}

interface Props {
    sales: Sale[];
    summary: Summary;
    merchants: MerchantOption[];
    items: ItemOption[];
    topItems?: ItemOption[];
    recentRates?: Record<number, number>;
    filters: {
        date: string;
        search?: string;
    };
}

export default function AmrozaIndex({
    sales,
    summary,
    merchants,
    items,
    topItems = [],
    recentRates = {},
    filters,
}: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [searchFilter, setSearchFilter] = useState(filters.search || '');
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [lastAddedId, setLastAddedId] = useState<number | null>(null);

    // Active tooltip per step (ID IDE-style black tooltip)
    const [activeTooltipStep, setActiveTooltipStep] = useState<string | null>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Flashing step trigger (red border + shake)
    const [flashingStep, setFlashingStep] = useState<string | null>(null);

    // Suspicious input confirmation dialog
    const [anomalyConfirmOpen, setAnomalyConfirmOpen] = useState(false);
    const [anomalyWarningMsg, setAnomalyWarningMsg] = useState('');

    // Delete confirmation dialog & undo state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    const [undoSale, setUndoSale] = useState<Sale | null>(null);
    const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Slip Modal for receipt view / print
    const [slipModalOpen, setSlipModalOpen] = useState(false);
    const [slipSale, setSlipSale] = useState<Sale | null>(null);

    // Section Refs for scroll / focus
    const stepPaymentRef = useRef<HTMLDivElement>(null);
    const stepBuyerRef = useRef<HTMLDivElement>(null);
    const stepItemRef = useRef<HTMLDivElement>(null);
    const stepUnitsRef = useRef<HTMLDivElement>(null);
    const stepWeightRef = useRef<HTMLDivElement>(null);
    const stepRateRef = useRef<HTMLDivElement>(null);

    // Input refs
    const nagRef = useRef<HTMLInputElement>(null);
    const weightRef = useRef<HTMLInputElement>(null);
    const rateRef = useRef<HTMLInputElement>(null);
    const bardanaRef = useRef<HTMLInputElement>(null);
    const submitBtnRef = useRef<HTMLButtonElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: isUrdu ? 'خریدار کھاتہ' : 'Buyer Ledger', href: '#' },
        { title: isUrdu ? 'آج کی بکری (امروزہ)' : "Today's Sales", href: '/amroza' },
    ];

    // INITIAL STATE: No payment type selected, no item pre-selected
    const { data, setData, post, put, processing } = useForm({
        date: selectedDate,
        merchant_id: '',
        merchant_code: '',
        item_id: '',
        nag: '',
        weight: '',
        rate: '',
        bardana: '0',
        payment_type: '' as '' | 'naqdi' | 'udhaar',
    });

    // STEP UNLOCK LOGIC:
    const isBuyerUnlocked = Boolean(data.payment_type);
    const isItemUnlocked = Boolean(isBuyerUnlocked && data.merchant_id);
    const isUnitsUnlocked = Boolean(isItemUnlocked && data.item_id);

    const numNag = parseFloat(data.nag) || 0;
    const isWeightUnlocked = Boolean(isUnitsUnlocked && numNag > 0);
    const isRateUnlocked = Boolean(isUnitsUnlocked && numNag > 0);

    const numWeight = parseFloat(data.weight) || 0;
    const numRate = parseFloat(data.rate) || 0;
    const numBardana = parseFloat(data.bardana) || 0;

    const isAddEnabled = Boolean(
        data.payment_type &&
        data.merchant_id &&
        data.item_id &&
        numNag > 0 &&
        numRate > 0
    );

    const currentMerchant = useMemo(() => {
        return merchants.find(m => String(m.id) === String(data.merchant_id));
    }, [merchants, data.merchant_id]);

    const currentItem = useMemo(() => {
        return items.find(i => String(i.id) === String(data.item_id));
    }, [items, data.item_id]);

    const lineAmount = numWeight > 0 ? (numWeight * numRate) : (numNag * numRate);
    const grossAmount = Math.round((lineAmount + numBardana) * 100) / 100;

    const recentItemRate = currentItem ? recentRates[currentItem.id] : null;
    const isRateUnusual = useMemo(() => {
        if (!recentItemRate || !numRate || recentItemRate <= 0) return false;
        const diffPercent = Math.abs(numRate - recentItemRate) / recentItemRate;
        return diffPercent >= 0.4;
    }, [recentItemRate, numRate]);

    const quickItems = useMemo(() => {
        if (topItems && topItems.length > 0) return topItems.slice(0, 6);
        return items.slice(0, 6);
    }, [topItems, items]);

    // Keyboard shortcuts: F1 = Cash, F2 = Credit
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                handleSelectPayment('naqdi');
            } else if (e.key === 'F2') {
                e.preventDefault();
                handleSelectPayment('udhaar');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isUrdu]);

    // Show tooltip popup
    function showTooltip(step: string) {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltipStep(step);
        tooltipTimeoutRef.current = setTimeout(() => {
            setActiveTooltipStep(null);
        }, 3000);
    }

    // Trigger feedback on locked step click
    function triggerLockedFeedback(requiredStep: string, targetRef?: React.RefObject<HTMLDivElement | null>) {
        showTooltip(requiredStep);

        setFlashingStep(requiredStep);
        setTimeout(() => {
            setFlashingStep(null);
        }, 1100);

        if (targetRef && targetRef.current) {
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function handleSelectPayment(type: 'naqdi' | 'udhaar') {
        setData('payment_type', type);
        setActiveTooltipStep(null);
        toast.info(isUrdu ? (type === 'naqdi' ? 'نقد منتخب ہوا' : 'ادھار منتخب ہوا') : (type === 'naqdi' ? 'Cash Selected' : 'Credit Selected'));

        setTimeout(() => {
            const input = stepBuyerRef.current?.querySelector('input');
            if (input) input.focus();
        }, 100);
    }

    function handleDateChange(newDate: string) {
        setSelectedDate(newDate);
        setData('date', newDate);
        router.get('/amroza', { date: newDate, search: searchFilter }, { preserveState: true, replace: true });
    }

    function setQuickDate(offsetDays: number) {
        const target = new Date();
        target.setDate(target.getDate() + offsetDays);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        const str = `${yyyy}-${mm}-${dd}`;
        handleDateChange(str);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/amroza', { date: selectedDate, search: searchFilter }, { preserveState: true, replace: true });
    }

    function handleItemSelect(item: ItemOption) {
        if (!isItemUnlocked) {
            triggerLockedFeedback('buyer', stepBuyerRef);
            return;
        }

        setData(d => ({
            ...d,
            item_id: String(item.id),
            rate: item.default_rate && (!d.rate || d.rate === '0') ? String(item.default_rate) : d.rate,
            bardana: item.default_bardana && (!d.bardana || d.bardana === '0') ? String(item.default_bardana) : d.bardana,
        }));
        nagRef.current?.focus();
    }

    function attemptSubmit(e?: React.FormEvent) {
        if (e) e.preventDefault();

        if (!isAddEnabled) {
            if (!data.payment_type) {
                triggerLockedFeedback('payment', stepPaymentRef);
            } else if (!data.merchant_id) {
                triggerLockedFeedback('buyer', stepBuyerRef);
            } else if (!data.item_id) {
                triggerLockedFeedback('item', stepItemRef);
            } else if (numNag <= 0) {
                triggerLockedFeedback('units', stepUnitsRef);
            } else if (numRate <= 0) {
                triggerLockedFeedback('rate', stepRateRef);
            }
            return;
        }

        if (numNag >= 500 && numWeight > 0 && numWeight <= 20) {
            setAnomalyWarningMsg(
                isUrdu
                    ? `آپ نے ${numNag} تعداد درج کی ہے جبکہ وزن صرف ${numWeight} ہے! کیا یہ صحیح ہے؟`
                    : `You entered ${numNag} Units with only ${numWeight} weight! Is this correct?`
            );
            setAnomalyConfirmOpen(true);
            return;
        }

        if (numWeight >= 1000 && numNag > 0 && numNag <= 2) {
            setAnomalyWarningMsg(
                isUrdu
                    ? `آپ نے ${numWeight} وزن درج کیا ہے جبکہ تعداد صرف ${numNag} ہے! کیا یہ صحیح ہے؟`
                    : `You entered ${numWeight} Weight with only ${numNag} Units! Is this correct?`
            );
            setAnomalyConfirmOpen(true);
            return;
        }

        executeSave();
    }

    function executeSave() {
        setAnomalyConfirmOpen(false);

        const currentPaymentType = data.payment_type;
        const currentDate = data.date;

        if (editingSale) {
            put(`/merchants/amroza/${editingSale.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(isUrdu ? 'ریکارڈ کامیابی سے تبدیل ہو گیا!' : 'Saved successfully!');
                    setEditingSale(null);
                    resetForm(currentPaymentType, currentDate);
                },
            });
        } else {
            post('/merchants/amroza', {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(isUrdu ? 'نیا اندراج شامل ہو گیا!' : 'Added successfully!');
                    resetForm(currentPaymentType, currentDate);
                },
            });
        }
    }

    function resetForm(keepPaymentType = data.payment_type, keepDate = selectedDate) {
        setData({
            date: keepDate,
            merchant_id: '',
            merchant_code: '',
            item_id: '',
            nag: '',
            weight: '',
            rate: '',
            bardana: '0',
            payment_type: keepPaymentType,
        });
        setEditingSale(null);

        setTimeout(() => {
            const input = stepBuyerRef.current?.querySelector('input');
            if (input) input.focus();
        }, 100);
    }

    function startEdit(sale: Sale) {
        setEditingSale(sale);
        const pType = sale.payment_type || ((sale.merchant && (Number(sale.merchant.code) === 1)) ? 'naqdi' : 'udhaar');
        setData({
            date: sale.date,
            merchant_id: String(sale.merchant_id),
            merchant_code: String(sale.merchant?.code || ''),
            item_id: String(sale.item_id),
            nag: String(sale.nag),
            weight: String(sale.weight || ''),
            rate: String(sale.rate),
            bardana: String(sale.bardana || '0'),
            payment_type: pType,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function confirmDelete(sale: Sale) {
        setSaleToDelete(sale);
        setDeleteModalOpen(true);
    }

    function executeDelete() {
        if (!saleToDelete) return;
        const target = saleToDelete;
        setDeleteModalOpen(false);

        router.delete(`/merchants/amroza/${target.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setUndoSale(target);
                toast.success(isUrdu ? 'انٹری حذف کر دی گئی' : 'Entry deleted', {
                    action: {
                        label: isUrdu ? 'واپس لائیں (Undo 5s)' : 'Undo (5s)',
                        onClick: () => handleUndo(target),
                    },
                    duration: 5000,
                });

                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                undoTimerRef.current = setTimeout(() => {
                    setUndoSale(null);
                }, 5000);
            },
        });
    }

    function handleUndo(sale: Sale) {
        router.post('/merchants/amroza', {
            date: sale.date,
            merchant_id: sale.merchant_id,
            item_id: sale.item_id,
            nag: sale.nag,
            weight: sale.weight,
            rate: sale.rate,
            bardana: sale.bardana,
            payment_type: sale.payment_type || 'udhaar',
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isUrdu ? 'انٹری بحال ہو گئی!' : 'Entry restored!');
                setUndoSale(null);
            },
        });
    }

    function openSlip(sale: Sale) {
        setSlipSale(sale);
        setSlipModalOpen(true);
    }

    function getWhatsAppUrl(sale: Sale): string {
        const pType = sale.payment_type === 'naqdi' ? (isUrdu ? 'نقد' : 'Cash') : (isUrdu ? 'ادھار' : 'Credit');
        const mName = isUrdu ? (sale.merchant?.name_ur || sale.merchant?.name_en) : (sale.merchant?.name_en || sale.merchant?.name_ur);
        const iName = isUrdu ? (sale.item?.name_ur || sale.item?.name_en) : (sale.item?.name_en || sale.item?.name_ur);
        const phone = (sale.merchant as any)?.phone || '';

        const text = `*Jaffer Khan & Brother Company - Sales Slip*
-------------------------
Date: ${sale.date}
Buyer: ${sale.merchant?.code} - ${mName}
Payment: ${pType}
Item: ${iName} (${sale.item?.unit || 'Bag'})
Units: ${sale.nag}
Weight: ${sale.weight > 0 ? sale.weight : '-'}
Rate: Rs. ${Number(sale.rate).toLocaleString()}
Packing Charges: Rs. ${Number(sale.bardana).toLocaleString()}
*Total Amount: Rs. ${Number(sale.gross_amount).toLocaleString()}*
-------------------------
Thank you!`;

        const encoded = encodeURIComponent(text);
        if (phone && phone.replace(/\D/g, '').length >= 10) {
            const cleanPhone = phone.replace(/\D/g, '');
            const finalPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
            return `https://wa.me/${finalPhone}?text=${encoded}`;
        }
        return `https://wa.me/?text=${encoded}`;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isUrdu ? 'آج کی بکری (امروزہ)' : "Today's Sales"} />

            <style>{`
                @keyframes gentle-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                    50% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
                }
                @keyframes flash-shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-4px); }
                    40%, 80% { transform: translateX(4px); }
                }
                .pulse-attention {
                    animation: gentle-pulse 2s infinite ease-in-out;
                }
                .shake-error {
                    animation: flash-shake 0.4s ease-in-out;
                    border-color: #ef4444 !important;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25) !important;
                }
                /* NO BLUR: Clean sharp inputs with subtle disabled opacity */
                .step-locked-clean {
                    opacity: 0.65;
                    user-select: none;
                }
                /* IDE-style dark popover tooltip */
                .ide-tooltip-popup {
                    background-color: #18181b;
                    color: #fafafa;
                    border: 1px solid #3f3f46;
                    border-radius: 6px;
                    padding: 4px 10px;
                    font-size: 11px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
                    white-space: nowrap;
                    z-index: 50;
                    pointer-events: none;
                }
            `}</style>

            <div className="p-2.5 md:p-3 space-y-3 pb-24 max-w-7xl mx-auto" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* 1. Header */}
                <div className="bg-white rounded-lg p-2.5 md:p-3 border border-green-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-green-700 text-white rounded-md shadow-xs">
                            <Icon name="Receipt" className="size-4" />
                        </span>
                        <div>
                            <h1 className={`text-base md:text-lg font-bold text-green-900 leading-tight ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'آج کی بکری (امروزہ)' : "Today's Sales"}
                            </h1>
                            <span className="text-[11px] text-muted-foreground">
                                {isUrdu ? 'مرحلہ وار درست اندراج' : "Step-by-step guided sales entry"}
                            </span>
                        </div>
                    </div>

                    {/* Date Picker + Quick Buttons */}
                    <div className="flex items-center gap-1.5 bg-green-50/80 p-1 rounded-md border border-green-300">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuickDate(0)}
                            className={`h-7 px-2 text-xs bg-white text-green-900 hover:bg-green-100 ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'آج' : 'Today'}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setQuickDate(-1)}
                            className={`h-7 px-2 text-xs bg-white text-green-900 hover:bg-green-100 ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'گزشتہ کل' : 'Yesterday'}
                        </Button>
                        <div className="relative flex items-center">
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={e => handleDateChange(e.target.value)}
                                className="h-7 w-36 text-xs font-mono font-bold bg-white ps-2 pe-7 border-green-400 cursor-pointer"
                            />
                            <Icon name="CalendarDots" className="size-4 text-green-700 absolute end-2 pointer-events-none" weight="bold" />
                        </div>
                    </div>
                </div>

                {/* 2. Step-by-Step Guided Form */}
                <div className="bg-green-50/50 border border-green-300 rounded-lg p-2.5 md:p-3.5 shadow-xs relative">
                    <form onSubmit={attemptSubmit} className="space-y-2.5">

                        {/* STEP 1: Payment Type */}
                        <div
                            ref={stepPaymentRef}
                            className={`p-2 rounded-lg transition-all relative ${
                                flashingStep === 'payment' ? 'shake-error bg-red-50/80' : 'bg-white/80 border border-green-200'
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 relative">
                                <div className="flex items-center gap-1.5 relative">
                                    <span className="size-5 rounded-full bg-green-800 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                                        1
                                    </span>
                                    <span className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                        {isUrdu ? 'طریقہ ادائیگی منتخب کریں:' : 'Select Payment Type:'}
                                    </span>

                                    {/* IDE-style popup on Step 1: Only shows on hover or click */}
                                    {activeTooltipStep === 'payment' && (
                                        <div className="absolute -top-7 start-28 ide-tooltip-popup animate-in fade-in duration-100 flex items-center gap-1">
                                            <span className={isUrdu ? 'font-nastaliq' : ''}>
                                                {isUrdu ? 'پہلے ادائیگی کی قسم چنیں' : 'First select the payment type'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectPayment('naqdi')}
                                        className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                            !data.payment_type ? 'pulse-attention border-2 border-green-600 bg-white text-green-800 hover:bg-green-100' : ''
                                        } ${
                                            data.payment_type === 'naqdi'
                                                ? 'bg-green-700 text-white ring-2 ring-green-600'
                                                : 'bg-white text-green-800 border border-green-600 hover:bg-green-50'
                                        }`}
                                    >
                                        <span>💵 {isUrdu ? 'نقد (Cash)' : 'Cash'}</span>
                                        <span className="text-[9px] font-mono px-1 bg-black/15 rounded">F1</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSelectPayment('udhaar')}
                                        className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                            !data.payment_type ? 'pulse-attention border-2 border-blue-600 bg-white text-blue-800 hover:bg-blue-100' : ''
                                        } ${
                                            data.payment_type === 'udhaar'
                                                ? 'bg-blue-700 text-white ring-2 ring-blue-600'
                                                : 'bg-white text-blue-800 border border-blue-600 hover:bg-blue-50'
                                        }`}
                                    >
                                        <span>📝 {isUrdu ? 'ادھار (Credit)' : 'Credit'}</span>
                                        <span className="text-[9px] font-mono px-1 bg-black/15 rounded">F2</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2: Buyer Selection (No blur, clean warning cursor) */}
                        <div
                            ref={stepBuyerRef}
                            className={`relative p-2 rounded-lg transition-all ${
                                flashingStep === 'buyer' ? 'shake-error bg-red-50/80' : 'bg-white/80 border border-green-200'
                            }`}
                        >
                            {!isBuyerUnlocked && (
                                <div
                                    onClick={() => triggerLockedFeedback('payment', stepPaymentRef)}
                                    onMouseEnter={() => showTooltip('buyer-lock')}
                                    onMouseLeave={() => setActiveTooltipStep(null)}
                                    className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                />
                            )}

                            {activeTooltipStep === 'buyer-lock' && (
                                <div className="absolute -top-7 start-28 ide-tooltip-popup animate-in fade-in duration-100">
                                    <span className={isUrdu ? 'font-nastaliq' : ''}>
                                        {isUrdu ? 'پہلے ادائیگی کی قسم چنیں' : 'First select the payment type'}
                                    </span>
                                </div>
                            )}

                            <div className={!isBuyerUnlocked ? 'step-locked-clean' : ''}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-5 rounded-full bg-green-800 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                                            2
                                        </span>
                                        <label className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            <span>{isUrdu ? 'خریدار منتخب کریں *' : 'Select Buyer *'}</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                                    <div className="w-full md:w-80">
                                        <ListPicker
                                            disabled={!isBuyerUnlocked}
                                            items={merchants}
                                            selectedId={data.merchant_id ? Number(data.merchant_id) : null}
                                            onChange={(item: PickerItem | null) => {
                                                if (item) {
                                                    setData(d => ({
                                                        ...d,
                                                        merchant_id: String(item.id),
                                                        merchant_code: String(item.code),
                                                    }));
                                                    nagRef.current?.focus();
                                                } else {
                                                    setData(d => ({ ...d, merchant_id: '', merchant_code: '' }));
                                                }
                                            }}
                                            placeholder={isUrdu ? "کوڈ..." : "Code..."}
                                        />
                                    </div>

                                    {currentMerchant && (
                                        <div className="flex-1 h-9 px-3 rounded-md border bg-white flex items-center justify-between text-xs shadow-xs">
                                            <div className="truncate">
                                                <span className={`font-semibold text-green-950 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                    {isUrdu ? (currentMerchant.name_ur || currentMerchant.name_en) : (currentMerchant.name_en || currentMerchant.name_ur)}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground ms-1.5 font-mono">
                                                    (#{currentMerchant.code})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 ms-2">
                                                <span className={`text-muted-foreground text-[11px] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                    {isUrdu ? 'پچھلا بقایا:' : 'Prev Bal:'}
                                                </span>
                                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                                                    Number(currentMerchant.current_balance) > 0
                                                        ? 'bg-amber-100 text-amber-900'
                                                        : 'bg-green-100 text-green-900'
                                                }`}>
                                                    Rs. {Number(currentMerchant.current_balance).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* STEP 3: Item Selection (No blur, clean warning cursor) */}
                        <div
                            ref={stepItemRef}
                            className={`relative p-2 rounded-lg transition-all ${
                                flashingStep === 'item' ? 'shake-error bg-red-50/80' : 'bg-white/80 border border-green-200'
                            }`}
                        >
                            {!isItemUnlocked && (
                                <div
                                    onClick={() => triggerLockedFeedback('buyer', stepBuyerRef)}
                                    onMouseEnter={() => showTooltip('item-lock')}
                                    onMouseLeave={() => setActiveTooltipStep(null)}
                                    className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                />
                            )}

                            {activeTooltipStep === 'item-lock' && (
                                <div className="absolute -top-7 start-28 ide-tooltip-popup animate-in fade-in duration-100">
                                    <span className={isUrdu ? 'font-nastaliq' : ''}>
                                        {isUrdu ? 'پہلے خریدار چنیں' : 'First select the buyer'}
                                    </span>
                                </div>
                            )}

                            <div className={!isItemUnlocked ? 'step-locked-clean' : ''}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="size-5 rounded-full bg-green-800 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                                        3
                                    </span>
                                    <label className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                        <span>{isUrdu ? 'آئٹم منتخب کریں *' : 'Select Item *'}</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                                    {quickItems.map(item => {
                                        const isSelected = String(data.item_id) === String(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                disabled={!isItemUnlocked}
                                                tabIndex={!isItemUnlocked ? -1 : 0}
                                                onClick={() => handleItemSelect(item)}
                                                className={`h-9 px-2 rounded-md text-center border transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                                                    isSelected
                                                        ? 'bg-green-800 text-white border-green-900 font-semibold ring-1 ring-green-600'
                                                        : 'bg-white text-gray-800 border-gray-300 hover:bg-green-50'
                                                }`}
                                            >
                                                <span className={`text-xs truncate ${isUrdu ? 'font-nastaliq font-bold' : ''}`}>
                                                    {isUrdu ? (item.name_ur || item.name_en) : (item.name_en || item.name_ur)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {items.length > 6 && (
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                        <span className={`text-[11px] text-muted-foreground ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'دیگر آئٹم:' : 'Other Items:'}
                                        </span>
                                        <select
                                            disabled={!isItemUnlocked}
                                            tabIndex={!isItemUnlocked ? -1 : 0}
                                            value={data.item_id}
                                            onChange={e => {
                                                const it = items.find(i => String(i.id) === e.target.value);
                                                if (it) handleItemSelect(it);
                                            }}
                                            className={`h-8 text-xs rounded border border-gray-300 bg-white px-2 flex-1 max-w-xs ${isUrdu ? 'font-nastaliq' : ''}`}
                                        >
                                            <option value="">{isUrdu ? 'آئٹم چنیں...' : 'Choose item...'}</option>
                                            {items.map(it => (
                                                <option key={it.id} value={it.id}>
                                                    {it.code} - {isUrdu ? it.name_ur : it.name_en} ({isUrdu ? it.name_en : it.name_ur})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* STEP 4, 5, 6, 7: Units, Weight, Rate, Packing Charges */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">

                            {/* STEP 4: Units */}
                            <div
                                ref={stepUnitsRef}
                                className={`relative p-2 rounded-lg transition-all ${
                                    flashingStep === 'units' ? 'shake-error bg-red-50/80' : 'bg-white/80 border border-green-200'
                                }`}
                            >
                                {!isUnitsUnlocked && (
                                    <div
                                        onClick={() => triggerLockedFeedback('item', stepItemRef)}
                                        onMouseEnter={() => showTooltip('units-lock')}
                                        onMouseLeave={() => setActiveTooltipStep(null)}
                                        className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                    />
                                )}

                                {activeTooltipStep === 'units-lock' && (
                                    <div className="absolute -top-7 start-2 ide-tooltip-popup animate-in fade-in duration-100">
                                        <span className={isUrdu ? 'font-nastaliq' : ''}>
                                            {isUrdu ? 'پہلے مال چنیں' : 'First select an item'}
                                        </span>
                                    </div>
                                )}

                                <div className={!isUnitsUnlocked ? 'step-locked-clean' : ''}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="size-4 rounded-full bg-green-800 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                                            4
                                        </span>
                                        <label className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'تعداد (بوریاں) *' : 'Units (Bags) *'}
                                        </label>
                                    </div>
                                    <Input
                                        ref={nagRef}
                                        disabled={!isUnitsUnlocked}
                                        tabIndex={!isUnitsUnlocked ? -1 : 0}
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={data.nag}
                                        onChange={e => setData('nag', e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                weightRef.current?.focus();
                                            }
                                        }}
                                        placeholder="0"
                                        className="h-8 text-sm font-mono font-bold text-center bg-white"
                                        required
                                    />
                                </div>
                            </div>

                            {/* STEP 5: Weight */}
                            <div
                                ref={stepWeightRef}
                                className={`relative p-2 rounded-lg transition-all ${
                                    flashingStep === 'weight' ? 'shake-error bg-red-50/80' : 'bg-white/80 border border-green-200'
                                }`}
                            >
                                {!isWeightUnlocked && (
                                    <div
                                        onClick={() => triggerLockedFeedback('units', stepUnitsRef)}
                                        onMouseEnter={() => showTooltip('weight-lock')}
                                        onMouseLeave={() => setActiveTooltipStep(null)}
                                        className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                    />
                                )}

                                {activeTooltipStep === 'weight-lock' && (
                                    <div className="absolute -top-7 start-2 ide-tooltip-popup animate-in fade-in duration-100">
                                        <span className={isUrdu ? 'font-nastaliq' : ''}>
                                            {isUrdu ? 'پہلے نگ لکھیں' : 'First enter the units (Nag)'}
                                        </span>
                                    </div>
                                )}

                                <div className={!isWeightUnlocked ? 'step-locked-clean' : ''}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="size-4 rounded-full bg-green-800 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                                            5
                                        </span>
                                        <label className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'وزن (کلو/من)' : 'Weight (Kg/Maund)'}
                                        </label>
                                    </div>
                                    <Input
                                        ref={weightRef}
                                        disabled={!isWeightUnlocked}
                                        tabIndex={!isWeightUnlocked ? -1 : 0}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.weight}
                                        onChange={e => setData('weight', e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                rateRef.current?.focus();
                                            }
                                        }}
                                        placeholder="0.00"
                                        className="h-8 text-sm font-mono font-bold text-center bg-white"
                                    />
                                </div>
                            </div>

                            {/* STEP 6: Rate */}
                            <div
                                ref={stepRateRef}
                                className={`relative p-2 rounded-lg transition-all ${
                                    flashingStep === 'rate' ? 'shake-error bg-red-50/80' : 'bg-white/80 border border-green-200'
                                }`}
                            >
                                {!isRateUnlocked && (
                                    <div
                                        onClick={() => triggerLockedFeedback('units', stepUnitsRef)}
                                        onMouseEnter={() => showTooltip('rate-lock')}
                                        onMouseLeave={() => setActiveTooltipStep(null)}
                                        className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                    />
                                )}

                                {activeTooltipStep === 'rate-lock' && (
                                    <div className="absolute -top-7 start-2 ide-tooltip-popup animate-in fade-in duration-100">
                                        <span className={isUrdu ? 'font-nastaliq' : ''}>
                                            {isUrdu ? 'پہلے نگ لکھیں' : 'First enter the units (Nag)'}
                                        </span>
                                    </div>
                                )}

                                <div className={!isRateUnlocked ? 'step-locked-clean' : ''}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="size-4 rounded-full bg-green-800 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                                            6
                                        </span>
                                        <label className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'ریٹ (قیمت) *' : 'Rate *'}
                                        </label>
                                    </div>
                                    <Input
                                        ref={rateRef}
                                        disabled={!isRateUnlocked}
                                        tabIndex={!isRateUnlocked ? -1 : 0}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.rate}
                                        onChange={e => setData('rate', e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                bardanaRef.current?.focus();
                                            }
                                        }}
                                        placeholder="0"
                                        className={`h-8 text-sm font-mono font-bold text-center bg-white ${
                                            isRateUnusual ? 'bg-yellow-50 border-yellow-400' : ''
                                        }`}
                                        required
                                    />
                                </div>
                            </div>

                            {/* STEP 7: Packing Charges */}
                            <div className="relative p-2 rounded-lg bg-white/80 border border-green-200">
                                {!isRateUnlocked && (
                                    <div
                                        onClick={() => triggerLockedFeedback('rate', stepRateRef)}
                                        onMouseEnter={() => showTooltip('packing-lock')}
                                        onMouseLeave={() => setActiveTooltipStep(null)}
                                        className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                    />
                                )}

                                {activeTooltipStep === 'packing-lock' && (
                                    <div className="absolute -top-7 start-2 ide-tooltip-popup animate-in fade-in duration-100">
                                        <span className={isUrdu ? 'font-nastaliq' : ''}>
                                            {isUrdu ? 'پہلے ریٹ لکھیں' : 'First enter the rate'}
                                        </span>
                                    </div>
                                )}

                                <div className={!isRateUnlocked ? 'step-locked-clean' : ''}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="size-4 rounded-full bg-green-800 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                                            7
                                        </span>
                                        <label className={`text-xs font-semibold text-gray-800 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'بوری کا خرچہ' : 'Packing Charges'}
                                        </label>
                                    </div>
                                    <Input
                                        ref={bardanaRef}
                                        disabled={!isRateUnlocked}
                                        tabIndex={!isRateUnlocked ? -1 : 0}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.bardana}
                                        onChange={e => setData('bardana', e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (isAddEnabled) {
                                                    attemptSubmit();
                                                }
                                            }
                                        }}
                                        placeholder="0"
                                        className="h-8 text-sm font-mono font-bold text-center bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Live Calculation Line + Add Button */}
                        <div className="bg-emerald-950 text-white rounded-md p-2.5 shadow-inner flex flex-wrap items-center justify-between gap-2 border border-emerald-800">
                            <div className="flex items-center gap-2">
                                <span className={`text-emerald-400 text-xs ${isUrdu ? 'font-nastaliq' : 'font-semibold'}`}>
                                    {isUrdu ? 'حساب:' : 'Calculation:'}
                                </span>
                                <div className="text-sm md:text-base font-mono font-bold text-emerald-200" dir="ltr">
                                    {numWeight > 0 ? (
                                        <span>
                                            {numWeight} × {numRate.toLocaleString()} = {(numWeight * numRate).toLocaleString()}
                                        </span>
                                    ) : (
                                        <span>
                                            {numNag} × {numRate.toLocaleString()} = {(numNag * numRate).toLocaleString()}
                                        </span>
                                    )}
                                    {numBardana > 0 && (
                                        <span> + {numBardana.toLocaleString()}</span>
                                    )}
                                    <span className="text-white ms-2 font-black">
                                        = Rs. {grossAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Add Button */}
                            <div className="relative flex items-center gap-1.5 w-full md:w-auto">
                                {!isAddEnabled && (
                                    <div
                                        onClick={attemptSubmit}
                                        onMouseEnter={() => showTooltip('add-lock')}
                                        onMouseLeave={() => setActiveTooltipStep(null)}
                                        className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                    />
                                )}

                                {activeTooltipStep === 'add-lock' && (
                                    <div className="absolute -top-7 end-0 ide-tooltip-popup animate-in fade-in duration-100">
                                        <span className={isUrdu ? 'font-nastaliq' : ''}>
                                            {isUrdu ? 'پہلے ضروری خانے پورے کریں' : 'Please fill all required fields'}
                                        </span>
                                    </div>
                                )}

                                {editingSale && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => resetForm()}
                                        className={`h-8 px-2.5 text-xs bg-white text-red-600 hover:bg-red-50 border-red-300 ${isUrdu ? 'font-nastaliq' : ''}`}
                                    >
                                        {isUrdu ? 'منسوخ' : 'Cancel'}
                                    </Button>
                                )}

                                <Button
                                    ref={submitBtnRef}
                                    type="submit"
                                    size="sm"
                                    disabled={!isAddEnabled || processing}
                                    className={`h-8 px-4 text-xs font-semibold flex-1 md:flex-none flex items-center justify-center gap-1.5 transition-all ${
                                        isUrdu ? 'font-nastaliq' : ''
                                    } ${
                                        isAddEnabled
                                            ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer shadow-md'
                                            : 'bg-gray-400 text-gray-200 opacity-60 cursor-not-allowed'
                                    }`}
                                >
                                    <span>
                                        {editingSale
                                            ? (isUrdu ? 'تبدیل کریں' : 'Save Changes')
                                            : (isUrdu ? 'شامل کریں ↵' : 'Add ↵')}
                                    </span>
                                    <Icon name="PlusCircle" className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* 4. Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border shadow-xs">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => window.print()}
                            className={`h-8 px-2.5 text-xs font-semibold text-green-900 border-green-300 hover:bg-green-50 flex items-center gap-1 ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            <Icon name="Printer" className="size-3.5 text-green-700" />
                            <span>{isUrdu ? 'پرنٹ' : 'Print'}</span>
                        </Button>
                        <span className={`text-xs text-muted-foreground ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'کل اندراج:' : 'Records:'}{' '}
                            <strong className="text-green-900 font-mono">{sales.length}</strong>
                        </span>
                    </div>

                    {/* Search box */}
                    <form onSubmit={handleSearch} className="flex items-center gap-1 w-full md:w-60">
                        <Input
                            value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                            placeholder={isUrdu ? "تلاش کریں..." : "Search..."}
                            className={`h-8 text-xs ${isUrdu ? 'font-nastaliq' : ''}`}
                        />
                        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5">
                            <Icon name="Search" className="size-3.5" />
                        </Button>
                    </form>
                </div>

                {/* 5. Entries Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-green-800 text-white select-none">
                                <tr>
                                    <th className={`p-2 text-center w-8 ${isUrdu ? 'font-nastaliq' : ''}`}>#</th>
                                    <th className={`p-2 text-start w-16 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'طریقہ' : 'Payment'}</th>
                                    <th className={`p-2 text-start w-14 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'کوڈ' : 'Code'}</th>
                                    <th className={`p-2 text-start ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'خریدار' : 'Buyer'}</th>
                                    <th className={`p-2 text-start ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'آئٹم' : 'Item'}</th>
                                    <th className={`p-2 text-end w-16 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'تعداد' : 'Units'}</th>
                                    <th className={`p-2 text-end w-20 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'وزن' : 'Weight'}</th>
                                    <th className={`p-2 text-end w-20 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'ریٹ' : 'Rate'}</th>
                                    <th className={`p-2 text-end w-20 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'بوری خرچہ' : 'Packing'}</th>
                                    <th className={`p-2 text-end w-24 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'کل رقم' : 'Total'}</th>
                                    <th className={`p-2 text-center w-28 ${isUrdu ? 'font-nastaliq' : ''}`}>{isUrdu ? 'کارروائی' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className={`p-6 text-center text-muted-foreground text-xs ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'آج کا کوئی اندراج نہیں ہے۔' : 'No records found for today.'}
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map((sale, idx) => {
                                        const isNaqdi = sale.payment_type === 'naqdi' || (sale.merchant && Number(sale.merchant.code) === 1);
                                        const isLastAdded = lastAddedId === sale.id;

                                        return (
                                            <tr
                                                key={sale.id}
                                                className={`transition-colors ${
                                                    isLastAdded
                                                        ? 'bg-amber-100/90 font-medium'
                                                        : idx % 2 === 0
                                                        ? 'bg-white hover:bg-green-50/50'
                                                        : 'bg-green-50/20 hover:bg-green-50/50'
                                                }`}
                                            >
                                                <td className="p-2 text-center text-gray-500 font-mono text-[11px]">{idx + 1}</td>

                                                <td className="p-2">
                                                    {isNaqdi ? (
                                                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-green-100 text-green-900 border border-green-300 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                            {isUrdu ? 'نقد' : 'Cash'}
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-900 border border-blue-300 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                            {isUrdu ? 'ادھار' : 'Credit'}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-2 font-mono font-bold text-green-900">{sale.merchant?.code}</td>

                                                <td className={`p-2 font-semibold text-gray-900 text-xs ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                    {isUrdu ? (sale.merchant?.name_ur || sale.merchant?.name_en) : (sale.merchant?.name_en || sale.merchant?.name_ur)}
                                                </td>

                                                <td className="p-2 text-xs">
                                                    <span className={`font-medium text-gray-900 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                        {isUrdu ? (sale.item?.name_ur || sale.item?.name_en) : (sale.item?.name_en || sale.item?.name_ur)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-mono ms-1">
                                                        ({sale.item?.unit || (isUrdu ? 'بوری' : 'Bag')})
                                                    </span>
                                                </td>

                                                <td className="p-2 text-end font-mono font-bold text-xs">{sale.nag}</td>

                                                <td className="p-2 text-end font-mono text-xs">
                                                    {Number(sale.weight) > 0 ? (
                                                        <span>
                                                            <strong>{Number(sale.weight).toFixed(2)}</strong>{' '}
                                                            <span className="text-[10px] text-gray-500">
                                                                {isUrdu ? (sale.item?.unit?.toLowerCase().includes('kg') ? 'کلو' : 'من') : (sale.item?.unit || 'Kg')}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>

                                                <td className="p-2 text-end font-mono text-xs">
                                                    {Number(sale.rate).toLocaleString()}
                                                </td>

                                                <td className="p-2 text-end font-mono text-xs text-gray-600">
                                                    {Number(sale.bardana) > 0 ? Number(sale.bardana).toLocaleString() : '-'}
                                                </td>

                                                <td className="p-2 text-end font-mono font-bold text-green-900 text-xs">
                                                    {Number(sale.gross_amount).toLocaleString()}
                                                </td>

                                                <td className="p-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => openSlip(sale)}
                                                            className={`px-1.5 py-0.5 bg-green-100 hover:bg-green-200 text-green-900 rounded text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                                                            title={isUrdu ? 'پرچی' : 'Slip'}
                                                        >
                                                            <span>{isUrdu ? 'پرچی' : 'Slip'}</span>
                                                        </button>

                                                        <a
                                                            href={getWhatsAppUrl(sale)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition-colors"
                                                            title={isUrdu ? 'واٹس ایپ' : 'WhatsApp'}
                                                        >
                                                            <Icon name="ShareNetwork" className="size-3" />
                                                        </a>

                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(sale)}
                                                            className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
                                                            title={isUrdu ? 'ترمیم' : 'Edit'}
                                                        >
                                                            <Icon name="PencilSimple" className="size-3" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => confirmDelete(sale)}
                                                            className="p-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                                                            title={isUrdu ? 'حذف' : 'Delete'}
                                                        >
                                                            <Icon name="Trash" className="size-3" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 6. Sticky Live Footer */}
                <div className="fixed bottom-0 start-0 end-0 bg-green-950 text-white px-3 py-1.5 shadow-xl border-t border-green-700 z-30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`text-gray-300 ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'کل تعداد:' : 'Total Units:'}{' '}
                            <strong className="text-white font-mono text-sm">{summary.total_nag}</strong>
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <div className="bg-emerald-800/90 border border-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <span className={`font-semibold text-emerald-200 text-[11px] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'نقد:' : 'Cash:'}
                            </span>
                            <span className="text-white">{summary.cash_nag}</span>
                            <span className="text-emerald-400">|</span>
                            <span className="font-bold text-emerald-100">Rs. {Number(summary.cash_amount).toLocaleString()}</span>
                        </div>

                        <div className="bg-blue-900/90 border border-blue-600 px-2 py-0.5 rounded flex items-center gap-1">
                            <span className={`font-semibold text-blue-200 text-[11px] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'ادھار:' : 'Credit:'}
                            </span>
                            <span className="text-white">{summary.credit_nag}</span>
                            <span className="text-blue-400">|</span>
                            <span className="font-bold text-blue-100">Rs. {Number(summary.credit_amount).toLocaleString()}</span>
                        </div>

                        <div className="bg-amber-600 text-white px-2.5 py-0.5 rounded flex items-center gap-1.5 font-bold shadow-xs">
                            <span className={`text-amber-100 text-[11px] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'کل بکری:' : 'Total:'}
                            </span>
                            <span>Rs. {Number(summary.total_gross).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suspicious Value Confirm Dialog */}
            <Dialog open={anomalyConfirmOpen} onOpenChange={setAnomalyConfirmOpen}>
                <DialogContent className="max-w-md p-4 text-xs" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className={`text-sm font-bold text-amber-900 flex items-center gap-1.5 ${isUrdu ? 'font-nastaliq' : ''}`}>
                            <span>⚠️ {isUrdu ? 'کیا یہ اندراج صحیح ہے؟' : 'Is this entry correct?'}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <p className={`text-xs text-gray-700 leading-relaxed py-2 ${isUrdu ? 'font-nastaliq' : ''}`}>
                        {anomalyWarningMsg}
                    </p>
                    <DialogFooter className="gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAnomalyConfirmOpen(false)}
                            className={isUrdu ? 'font-nastaliq text-xs' : 'text-xs'}
                        >
                            {isUrdu ? 'دوبارہ چیک کریں' : 'Check Again'}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={executeSave}
                            className={`bg-green-700 hover:bg-green-800 text-white text-xs ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'ہاں، بالکل صحیح ہے' : 'Yes, Proceed'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="max-w-md p-4 text-xs" dir={isUrdu ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className={`text-sm font-bold text-red-900 ${isUrdu ? 'font-nastaliq' : ''}`}>
                            {isUrdu ? 'حذف کرنے کی تصدیق' : 'Confirm Delete'}
                        </DialogTitle>
                    </DialogHeader>
                    <p className={`text-xs text-gray-800 py-2 ${isUrdu ? 'font-nastaliq' : ''}`}>
                        {isUrdu ? 'کیا آپ واقعی یہ انٹری ہٹانا چاہتے ہیں؟' : 'Are you sure you want to delete this entry?'}
                    </p>
                    <DialogFooter className="gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteModalOpen(false)}
                            className={isUrdu ? 'font-nastaliq text-xs' : 'text-xs'}
                        >
                            {isUrdu ? 'منسوخ' : 'Cancel'}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={executeDelete}
                            className={`bg-red-600 hover:bg-red-700 text-white text-xs ${isUrdu ? 'font-nastaliq' : ''}`}
                        >
                            {isUrdu ? 'ہاں، حذف کریں' : 'Yes, Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Thermal Receipt Slip Modal */}
            <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen}>
                <DialogContent className="max-w-xs p-3.5 font-mono text-xs" dir={isUrdu ? 'rtl' : 'ltr'}>
                    {slipSale && (
                        <div className="space-y-2.5">
                            <div className="text-center border-b pb-1.5">
                                <h3 className={`font-bold text-sm text-green-900 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                    {isUrdu ? 'جعفر خان اینڈ برادرز کمپنی' : 'Jaffer Khan & Brother Company'}
                                </h3>
                                <p className={`text-[10px] text-gray-600 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                    {isUrdu ? 'سبزی کمیشن ایجنٹ، کراچی' : 'Vegetable Commission Agent, Karachi'}
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono">
                                    {isUrdu ? 'تاریخ:' : 'Date:'} {slipSale.date}
                                </p>
                            </div>

                            <div className={`space-y-1 border-b pb-2 text-start text-xs ${isUrdu ? 'font-nastaliq' : ''}`}>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{isUrdu ? 'خریدار:' : 'Buyer:'}</span>
                                    <span className="font-bold">
                                        {isUrdu ? (slipSale.merchant?.name_ur || slipSale.merchant?.name_en) : (slipSale.merchant?.name_en || saleItemName(slipSale))} (#{slipSale.merchant?.code})
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{isUrdu ? 'ادائیگی:' : 'Payment:'}</span>
                                    <span className="font-bold">
                                        {slipSale.payment_type === 'naqdi' ? (isUrdu ? 'نقد' : 'Cash') : (isUrdu ? 'ادھار' : 'Credit')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{isUrdu ? 'آئٹم:' : 'Item:'}</span>
                                    <span className="font-bold">
                                        {isUrdu ? (slipSale.item?.name_ur || slipSale.item?.name_en) : (saleItemName(slipSale))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{isUrdu ? 'تعداد:' : 'Units:'}</span>
                                    <span className="font-bold font-mono">{slipSale.nag}</span>
                                </div>
                                {Number(slipSale.weight) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">{isUrdu ? 'وزن:' : 'Weight:'}</span>
                                        <span className="font-bold font-mono">{slipSale.weight}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{isUrdu ? 'ریٹ:' : 'Rate:'}</span>
                                    <span className="font-bold font-mono">Rs. {Number(slipSale.rate).toLocaleString()}</span>
                                </div>
                                {Number(slipSale.bardana) > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">{isUrdu ? 'بوری خرچہ:' : 'Packing:'}</span>
                                        <span className="font-bold font-mono">Rs. {Number(slipSale.bardana).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-green-950 pt-1 border-t text-xs">
                                    <span>{isUrdu ? 'کل رقم:' : 'Total:'}</span>
                                    <span className="font-mono">Rs. {Number(slipSale.gross_amount).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className={`flex-1 h-8 text-xs bg-green-700 hover:bg-green-800 text-white ${isUrdu ? 'font-nastaliq' : ''}`}
                                >
                                    {isUrdu ? 'پرنٹ کریں' : 'Print Slip'}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSlipModalOpen(false)}
                                    className={`h-8 text-xs ${isUrdu ? 'font-nastaliq' : ''}`}
                                >
                                    {isUrdu ? 'بند کریں' : 'Close'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );

    function saleItemName(sale: Sale): string {
        return sale.item?.name_en || sale.item?.name_ur || 'Item';
    }
}

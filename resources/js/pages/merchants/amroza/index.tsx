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

    // Buyer searchable input state
    const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
    const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
    const buyerContainerRef = useRef<HTMLDivElement>(null);
    const buyerInputRef = useRef<HTMLInputElement>(null);

    // Sync search query when currentMerchant changes externally (e.g. edit mode)
    useEffect(() => {
        if (currentMerchant) {
            setBuyerSearchQuery(String(currentMerchant.code));
        } else if (!data.merchant_id) {
            setBuyerSearchQuery('');
        }
    }, [data.merchant_id, currentMerchant]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (buyerContainerRef.current && !buyerContainerRef.current.contains(e.target as Node)) {
                setBuyerDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredMerchants = useMemo(() => {
        if (!buyerSearchQuery.trim()) return merchants.slice(0, 30);
        const q = buyerSearchQuery.toLowerCase().trim();
        return merchants.filter(m =>
            String(m.code).includes(q) ||
            (m.name_en && m.name_en.toLowerCase().includes(q)) ||
            (m.name_ur && m.name_ur.includes(q))
        ).slice(0, 30);
    }, [merchants, buyerSearchQuery]);

    function handleSelectBuyer(m: MerchantOption) {
        setData(d => ({
            ...d,
            merchant_id: String(m.id),
            merchant_code: String(m.code),
        }));
        setBuyerSearchQuery(String(m.code));
        setBuyerDropdownOpen(false);
        nagRef.current?.focus();
    }

    const missingFields = useMemo(() => {
        const list: string[] = [];
        if (!data.payment_type) list.push(isUrdu ? 'ادائیگی' : 'Payment');
        if (!data.merchant_id) list.push(isUrdu ? 'خریدار' : 'Buyer');
        if (!data.item_id) list.push(isUrdu ? 'مال' : 'Item');
        if (numNag <= 0) list.push(isUrdu ? 'تعداد' : 'Units');
        if (numRate <= 0) list.push(isUrdu ? 'ریٹ' : 'Rate');
        return list;
    }, [data.payment_type, data.merchant_id, data.item_id, numNag, numRate, isUrdu]);

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

        const currentDate = data.date;

        if (editingSale) {
            put(`/merchants/amroza/${editingSale.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(isUrdu ? 'ریکارڈ کامیابی سے تبدیل ہو گیا!' : 'Saved successfully!');
                    setEditingSale(null);
                    resetForm('', currentDate);
                },
            });
        } else {
            post('/merchants/amroza', {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(isUrdu ? 'نیا اندراج شامل ہو گیا!' : 'Added successfully!');
                    resetForm('', currentDate);
                },
            });
        }
    }

    function resetForm(keepPaymentType: '' | 'naqdi' | 'udhaar' = '', keepDate = selectedDate) {
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
        setBuyerSearchQuery('');
        setBuyerDropdownOpen(false);
        setEditingSale(null);

        if (keepPaymentType) {
            setTimeout(() => {
                const input = stepBuyerRef.current?.querySelector('input');
                if (input) input.focus();
            }, 100);
        } else {
            stepPaymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
        if (sale.merchant) {
            setBuyerSearchQuery(String(sale.merchant.code));
        }
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

            <div className="-mt-3 md:-mt-6 -mx-3 md:-mx-6 pb-24 bg-[#eef2ee] min-h-screen" dir={isUrdu ? 'rtl' : 'ltr'}>
                {/* 1. Dark Green Top Header Banner */}
                <div className="bg-[#14532d] px-4 md:px-8 pt-6 pb-16 md:pb-20 text-white shadow-sm">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className={`text-2xl md:text-3xl font-extrabold text-white tracking-tight ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'آج کی بکری (امروزہ)' : "Today's Sales"}
                            </h1>
                            <p className={`text-emerald-100/80 text-xs md:text-sm font-medium mt-1 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                {isUrdu ? 'آج کی سیل اینٹری · امروزہ' : 'Aaj ki sale entry · Amroza'}
                            </p>
                        </div>

                        {/* Date Picker + Quick Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQuickDate(0)}
                                className={`h-10 px-5 rounded-xl text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                            >
                                {isUrdu ? 'آج' : 'Today'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate(-1)}
                                className={`h-10 px-5 rounded-xl text-sm font-semibold bg-[#20693e] hover:bg-[#287d4a] text-white border border-emerald-600/50 shadow-xs transition-colors cursor-pointer ${isUrdu ? 'font-nastaliq' : ''}`}
                            >
                                {isUrdu ? 'گزشتہ کل' : 'Yesterday'}
                            </button>
                            <div className="relative flex items-center">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => handleDateChange(e.target.value)}
                                    className="h-10 w-36 rounded-xl bg-white text-gray-900 font-bold text-sm cursor-pointer shadow-xs px-3 text-center border-0 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form & Records Container */}
                <div className="max-w-7xl mx-auto px-3 md:px-6 -mt-10 md:-mt-12 space-y-6">
                    {/* 2. Main Entry Form & Bill Preview Grid */}
                    <form onSubmit={attemptSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                            
                            {/* LEFT CARD: Form Entry */}
                            <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-7 border border-gray-100 shadow-md space-y-5">
                                
                                {/* 1. PAYMENT TYPE */}
                                <div ref={stepPaymentRef} className={`transition-all ${flashingStep === 'payment' ? 'shake-error rounded-2xl p-2 bg-red-50/80' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1e713e] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                                        <label className={`text-xs font-bold text-gray-700 uppercase tracking-wider ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                                            {isUrdu ? 'ادائیگی کا طریقہ (PAYMENT TYPE)' : 'PAYMENT TYPE'}
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectPayment('naqdi')}
                                            className={`h-14 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                                                data.payment_type === 'naqdi'
                                                    ? 'bg-[#1e713e] text-white shadow-md'
                                                    : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                            }`}
                                        >
                                            <Icon name="Money" className="size-5" weight={data.payment_type === 'naqdi' ? 'fill' : 'regular'} />
                                            <span className="text-sm md:text-base">{isUrdu ? 'نقد (Cash)' : 'Cash'}</span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${data.payment_type === 'naqdi' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>F1</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectPayment('udhaar')}
                                            className={`h-14 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                                                data.payment_type === 'udhaar'
                                                    ? 'bg-[#1e713e] text-white shadow-md'
                                                    : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                            }`}
                                        >
                                            <Icon name="CreditCard" className="size-5" weight={data.payment_type === 'udhaar' ? 'fill' : 'regular'} />
                                            <span className="text-sm md:text-base">{isUrdu ? 'ادھار (Credit)' : 'Credit'}</span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${data.payment_type === 'udhaar' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>F2</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 2. BUYER */}
                                <div ref={stepBuyerRef} className={`transition-all ${flashingStep === 'buyer' ? 'shake-error rounded-2xl p-2 bg-red-50/80' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1e713e] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                                        <label className={`text-xs font-bold text-gray-700 uppercase tracking-wider ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                                            {isUrdu ? 'خریدار (BUYER)' : 'BUYER'}
                                        </label>
                                    </div>
                                    <div ref={buyerContainerRef} className="relative">
                                        {!isBuyerUnlocked && (
                                            <div
                                                onClick={() => triggerLockedFeedback('payment', stepPaymentRef)}
                                                onMouseEnter={() => showTooltip('payment-lock')}
                                                onMouseLeave={() => setActiveTooltipStep(null)}
                                                className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                            />
                                        )}
                                        <Input
                                            ref={buyerInputRef}
                                            disabled={!isBuyerUnlocked}
                                            tabIndex={!isBuyerUnlocked ? -1 : 0}
                                            value={buyerSearchQuery}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setBuyerSearchQuery(val);
                                                if (isBuyerUnlocked) setBuyerDropdownOpen(true);
                                                if (!val.trim()) {
                                                    setData(d => ({ ...d, merchant_id: '', merchant_code: '' }));
                                                }
                                            }}
                                            onFocus={() => {
                                                if (isBuyerUnlocked) setBuyerDropdownOpen(true);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const trimmed = buyerSearchQuery.trim();
                                                    const codeMatch = merchants.find(m => String(m.code) === trimmed);
                                                    if (codeMatch) {
                                                        handleSelectBuyer(codeMatch);
                                                        return;
                                                    }
                                                    if (filteredMerchants.length > 0) {
                                                        handleSelectBuyer(filteredMerchants[0]);
                                                        return;
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setBuyerDropdownOpen(false);
                                                }
                                            }}
                                            placeholder={isUrdu ? 'کوڈ یا نام لکھیں...' : 'Code ya naam likhein...'}
                                            className={`h-14 rounded-2xl border-gray-200 px-4 pe-11 text-sm md:text-base bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#1e713e] shadow-xs ${!isBuyerUnlocked ? 'opacity-40 cursor-not-allowed bg-gray-50' : ''}`}
                                        />
                                        <Icon name="MagnifyingGlass" className="size-5 text-gray-400 absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none" />

                                        {/* Dropdown list */}
                                        {isBuyerUnlocked && buyerDropdownOpen && (
                                            <div className="absolute z-50 start-0 end-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-xl divide-y divide-gray-100">
                                                {filteredMerchants.length === 0 ? (
                                                    <div className="p-3 text-xs text-gray-500 text-center">
                                                        {isUrdu ? 'کوئی خریدار نہیں ملا' : 'No buyer found'}
                                                    </div>
                                                ) : (
                                                    filteredMerchants.map(m => (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectBuyer(m);
                                                            }}
                                                            className="w-full text-start px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                                                    #{m.code}
                                                                </span>
                                                                <span className={`font-semibold text-gray-800 truncate ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                                    {isUrdu ? (m.name_ur || m.name_en) : (m.name_en || m.name_ur)}
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-gray-600 shrink-0 text-xs">
                                                                Rs. {Number(m.current_balance).toLocaleString()}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {currentMerchant && (
                                            <div className="mt-1.5 text-xs text-gray-600 flex items-center gap-1.5 px-1">
                                                <span className="text-[#1e713e] font-bold">✓</span>
                                                <span className={`font-semibold text-gray-900 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                    {isUrdu ? (currentMerchant.name_ur || currentMerchant.name_en) : (currentMerchant.name_en || currentMerchant.name_ur)}
                                                </span>
                                                <span className="font-mono text-gray-500">(#{currentMerchant.code})</span>
                                                <span className="text-gray-300">—</span>
                                                <span className="text-gray-500">{isUrdu ? 'بقایا:' : 'Balance:'}</span>
                                                <span className="font-mono font-bold text-gray-900">
                                                    Rs. {Number(currentMerchant.current_balance).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. ITEM */}
                                <div
                                    ref={stepItemRef}
                                    className={`relative transition-all ${
                                        flashingStep === 'item' ? 'shake-error rounded-2xl p-2 bg-red-50/80' : ''
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

                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1e713e] text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                                        <label className={`text-xs font-bold text-gray-700 uppercase tracking-wider ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                                            {isUrdu ? 'مال / آئٹم (ITEM)' : 'ITEM'}
                                        </label>
                                    </div>

                                    <div className={`grid grid-cols-2 md:grid-cols-3 gap-2.5 ${!isItemUnlocked ? 'opacity-40' : ''}`}>
                                        {quickItems.map(item => {
                                            const isSelected = String(data.item_id) === String(item.id);
                                            const initial = (item.name_en || item.name_ur || 'I')[0].toUpperCase();
                                            const displayName = isUrdu
                                                ? (item.name_ur || item.name_en)
                                                : (item.name_en ? item.name_en.replace(' (Green Chilli)', '').replace(' (Cabbage)', '') : item.name_ur);

                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    disabled={!isItemUnlocked}
                                                    tabIndex={!isItemUnlocked ? -1 : 0}
                                                    onClick={() => handleItemSelect(item)}
                                                    className={`h-14 px-3 rounded-2xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-[#1e713e] text-white border-[#1e713e] shadow-sm font-bold'
                                                            : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                                    }`}
                                                >
                                                    <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100/70 text-emerald-800'
                                                    }`}>
                                                        {initial}
                                                    </span>
                                                    <span className={`text-xs md:text-sm font-semibold truncate ${isUrdu ? 'font-nastaliq font-bold' : ''}`}>
                                                        {displayName}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {items.length > 6 && (
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <span className={`text-xs text-gray-400 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'دیگر آئٹم:' : 'Other:'}
                                            </span>
                                            <select
                                                disabled={!isItemUnlocked}
                                                tabIndex={!isItemUnlocked ? -1 : 0}
                                                value={data.item_id}
                                                onChange={e => {
                                                    const it = items.find(i => String(i.id) === e.target.value);
                                                    if (it) handleItemSelect(it);
                                                }}
                                                className={`h-9 text-xs rounded-xl border border-gray-200 bg-white px-2.5 flex-1 max-w-xs text-gray-700 ${isUrdu ? 'font-nastaliq' : ''}`}
                                            >
                                                <option value="">{isUrdu ? 'آئٹم چنیں...' : 'Choose item...'}</option>
                                                {items.map(it => (
                                                    <option key={it.id} value={it.id}>
                                                        {it.code} - {isUrdu ? it.name_ur : it.name_en}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* 4. QUANTITY */}
                                <div className="relative">
                                    {!isUnitsUnlocked && (
                                        <div
                                            onClick={() => {
                                                if (!data.payment_type) triggerLockedFeedback('payment', stepPaymentRef);
                                                else if (!data.merchant_id) triggerLockedFeedback('buyer', stepBuyerRef);
                                                else if (!data.item_id) triggerLockedFeedback('item', stepItemRef);
                                            }}
                                            className="absolute inset-0 z-20 cursor-not-allowed bg-transparent"
                                        />
                                    )}

                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="w-5 h-5 rounded-full bg-[#1e713e] text-white text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
                                        <label className={`text-xs font-bold text-gray-700 uppercase tracking-wider ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                                            {isUrdu ? 'مقدار اور ریٹ (QUANTITY)' : 'QUANTITY'}
                                        </label>
                                    </div>

                                    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${!isUnitsUnlocked ? 'opacity-40' : ''}`}>
                                        {/* UNITS */}
                                        <div
                                            ref={stepUnitsRef}
                                            className={`h-14 rounded-2xl border bg-white flex items-center justify-between px-4 transition-all focus-within:border-[#1e713e] focus-within:ring-2 focus-within:ring-[#1e713e]/20 ${
                                                flashingStep === 'units' ? 'shake-error border-red-500 bg-red-50/50' : 'border-gray-200'
                                            }`}
                                        >
                                            <span className={`text-sm font-medium text-gray-500 shrink-0 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'تعداد' : 'Units'}
                                            </span>
                                            <input
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
                                                className="w-24 text-end font-mono font-bold text-gray-900 bg-transparent text-base focus:outline-none placeholder:text-gray-400"
                                                required
                                            />
                                        </div>

                                        {/* WEIGHT */}
                                        <div
                                            ref={stepWeightRef}
                                            className={`h-14 rounded-2xl border bg-white flex items-center justify-between px-4 transition-all focus-within:border-[#1e713e] focus-within:ring-2 focus-within:ring-[#1e713e]/20 ${
                                                flashingStep === 'weight' ? 'shake-error border-red-500 bg-red-50/50' : 'border-gray-200'
                                            }`}
                                        >
                                            <span className={`text-sm font-medium text-gray-500 shrink-0 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'وزن' : 'Weight'}
                                            </span>
                                            <input
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
                                                className="w-24 text-end font-mono font-bold text-gray-900 bg-transparent text-base focus:outline-none placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* RATE */}
                                        <div
                                            ref={stepRateRef}
                                            className={`h-14 rounded-2xl border bg-white flex items-center justify-between px-4 transition-all focus-within:border-[#1e713e] focus-within:ring-2 focus-within:ring-[#1e713e]/20 ${
                                                flashingStep === 'rate'
                                                    ? 'shake-error border-red-500 bg-red-50/50'
                                                    : isRateUnusual
                                                    ? 'border-yellow-400 bg-yellow-50/30'
                                                    : 'border-gray-200'
                                            }`}
                                        >
                                            <span className={`text-sm font-medium text-gray-500 shrink-0 ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {isUrdu ? 'ریٹ' : 'Rate'}
                                            </span>
                                            <div className="flex items-center gap-1 font-mono font-bold text-gray-900">
                                                <span className="text-xs text-gray-400">Rs.</span>
                                                <input
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
                                                    className="w-20 text-end font-mono font-bold text-gray-900 bg-transparent text-base focus:outline-none placeholder:text-gray-400"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Optional Packing Charges Row */}
                                    <div className="mt-2.5 flex items-center justify-end gap-2 text-xs text-gray-500">
                                        <label className={isUrdu ? 'font-nastaliq' : ''}>
                                            {isUrdu ? 'بوری خرچہ (اختیاری):' : 'Packing (optional):'}
                                        </label>
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
                                                    if (isAddEnabled) attemptSubmit();
                                                }
                                            }}
                                            placeholder="0"
                                            className="h-8 w-24 text-center font-mono text-xs rounded-lg border-gray-200 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT CARD: Bill Preview */}
                            <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-7 border border-gray-100 shadow-md flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-5">
                                        <Icon name="Receipt" className="size-5 text-[#1e713e]" weight="bold" />
                                        <h3 className={`text-base font-bold text-gray-900 ${isUrdu ? 'font-nastaliq text-lg' : ''}`}>
                                            {isUrdu ? 'بل کی تفصیل (Bill Preview)' : 'Bill Preview'}
                                        </h3>
                                    </div>

                                    <div className="space-y-3.5 text-sm">
                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className={isUrdu ? 'font-nastaliq' : 'font-medium'}>{isUrdu ? 'طریقہ ادائیگی' : 'Payment'}</span>
                                            <span className="font-bold text-gray-900">
                                                {data.payment_type
                                                    ? (data.payment_type === 'naqdi'
                                                        ? (isUrdu ? 'نقد (Cash)' : 'Cash')
                                                        : (isUrdu ? 'ادھار (Credit)' : 'Credit'))
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className="border-t border-dashed border-gray-200" />

                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className={isUrdu ? 'font-nastaliq' : 'font-medium'}>{isUrdu ? 'خریدار' : 'Buyer'}</span>
                                            <span className={`font-bold text-gray-900 truncate max-w-[200px] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {currentMerchant
                                                    ? (isUrdu ? (currentMerchant.name_ur || currentMerchant.name_en) : (currentMerchant.name_en || currentMerchant.name_ur))
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className="border-t border-dashed border-gray-200" />

                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className={isUrdu ? 'font-nastaliq' : 'font-medium'}>{isUrdu ? 'مال (آئٹم)' : 'Item'}</span>
                                            <span className={`font-bold text-gray-900 truncate max-w-[200px] ${isUrdu ? 'font-nastaliq' : ''}`}>
                                                {currentItem
                                                    ? (isUrdu ? (currentItem.name_ur || currentItem.name_en) : (currentItem.name_en || currentItem.name_ur))
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className="border-t border-dashed border-gray-200" />

                                        <div className="flex justify-between items-center text-gray-600">
                                            <span className={isUrdu ? 'font-nastaliq' : 'font-medium'}>{isUrdu ? 'تعداد × ریٹ' : 'Units × Rate'}</span>
                                            <span className="font-mono font-bold text-gray-900" dir="ltr">
                                                {numWeight > 0
                                                    ? `${numWeight} × ${numRate.toLocaleString()} = ${(numWeight * numRate).toLocaleString()}`
                                                    : numNag > 0 && numRate > 0
                                                    ? `${numNag} × ${numRate.toLocaleString()} = ${(numNag * numRate).toLocaleString()}`
                                                    : '0 × 0 = 0'}
                                            </span>
                                        </div>

                                        {numBardana > 0 && (
                                            <>
                                                <div className="border-t border-dashed border-gray-200" />
                                                <div className="flex justify-between items-center text-gray-600">
                                                    <span className={isUrdu ? 'font-nastaliq' : 'font-medium'}>{isUrdu ? 'بوری خرچہ' : 'Packing'}</span>
                                                    <span className="font-mono font-bold text-gray-900" dir="ltr">
                                                        Rs. {numBardana.toLocaleString()}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4">
                                    <div className="bg-[#eef6f0] rounded-2xl p-4 flex items-center justify-between">
                                        <span className={`text-xs font-bold text-gray-600 uppercase tracking-wider ${isUrdu ? 'font-nastaliq' : ''}`}>
                                            {isUrdu ? 'کل رقم' : 'TOTAL'}
                                        </span>
                                        <div className="text-3xl font-black font-mono text-[#14532d]" dir="ltr">
                                            Rs. {grossAmount.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {editingSale && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => resetForm()}
                                                className="h-14 px-4 rounded-2xl border-red-300 text-red-600 hover:bg-red-50 font-bold"
                                            >
                                                {isUrdu ? 'منسوخ' : 'Cancel'}
                                            </Button>
                                        )}
                                        <Button
                                            ref={submitBtnRef}
                                            type="submit"
                                            disabled={!isAddEnabled || processing}
                                            className={`w-full h-14 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                                                isAddEnabled
                                                    ? 'bg-[#1e713e] hover:bg-[#165a31] text-white cursor-pointer shadow-md'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                                            }`}
                                        >
                                            <span>
                                                {editingSale
                                                    ? (isUrdu ? 'تبدیل کریں' : 'Save Changes')
                                                    : (isUrdu ? 'محفوظ کریں' : 'Save Sale')}
                                            </span>
                                            <Icon name="Check" className="size-5" weight="bold" />
                                        </Button>
                                    </div>

                                    {!isAddEnabled && missingFields.length > 0 && (
                                        <p className="text-xs text-center text-gray-400 font-medium">
                                            {isUrdu ? 'باقی ہے: ' : 'Baqi hai: '}
                                            <span className="text-gray-600 font-semibold">{missingFields.join(isUrdu ? '، ' : ', ')}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>

                {/* 4. Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
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
                            className={`h-8 text-xs rounded-xl ${isUrdu ? 'font-nastaliq' : ''}`}
                        />
                        <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5 rounded-xl">
                            <Icon name="Search" className="size-3.5" />
                        </Button>
                    </form>
                </div>

                {/* 5. Entries Table */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#14532d] text-white select-none">
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

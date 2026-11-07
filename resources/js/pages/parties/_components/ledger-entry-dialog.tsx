import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface LedgerEntry {
    id: number | null;
    date: string;
    direction: string;
    amount: number;
    category: string;
    description: string | null;
    reference: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    partyType: string;
    partyId: number;
    entry?: LedgerEntry | null;
}

const CATEGORIES = ['payment', 'advance', 'consignment', 'purchase', 'commission', 'adjustment', 'other'];

export default function LedgerEntryDialog({ open, onOpenChange, partyType, partyId, entry }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data, setData, post, put, processing, reset, errors } = useForm({
        date: new Date().toISOString().slice(0, 10),
        direction: 'jama',
        amount: 0,
        category: 'payment',
        description: '',
        reference: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        if (entry) {
            setData({
                date: entry.date,
                direction: entry.direction,
                amount: entry.amount,
                category: entry.category,
                description: entry.description || '',
                reference: entry.reference || '',
            });
        } else {
            reset();
        }
    }, [open, entry]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const onSuccess = () => {
            toast.success(t('common.success'));
            onOpenChange(false);
        };

        if (entry?.id) {
            put(route('parties.entries.update', { type: partyType, id: partyId, entry: entry.id }), {
                onSuccess,
            });
        } else {
            post(route('parties.entries.store', { type: partyType, id: partyId }), { onSuccess });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className={`text-lg font-bold ${isUrdu ? 'font-nastaliq text-xl' : ''}`}>
                        {entry?.id ? t('parties.edit_entry') : t('parties.add_entry')}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                            <Label htmlFor="entry_date" className="text-xs font-semibold">
                                {t('parties.entry_date')}
                            </Label>
                            <Input
                                id="entry_date"
                                type="date"
                                value={data.date}
                                onChange={e => setData('date', e.target.value)}
                                className="font-mono text-start"
                            />
                            {errors.date && <span className="text-xs text-destructive">{errors.date}</span>}
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="entry_direction" className="text-xs font-semibold">
                                {t('parties.entry_direction')}
                            </Label>
                            <select
                                id="entry_direction"
                                value={data.direction}
                                onChange={e => setData('direction', e.target.value)}
                                className="h-9 px-3 text-xs rounded-md border bg-background"
                            >
                                <option value="jama">{t('parties.direction_jama')}</option>
                                <option value="banam">{t('parties.direction_banam')}</option>
                            </select>
                            {errors.direction && <span className="text-xs text-destructive">{errors.direction}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                            <Label htmlFor="entry_amount" className="text-xs font-semibold">
                                {t('parties.amount')} (Rs) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="entry_amount"
                                type="number"
                                step="0.01"
                                value={data.amount}
                                onChange={e => setData('amount', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="font-mono text-start"
                            />
                            {errors.amount && <span className="text-xs text-destructive">{errors.amount}</span>}
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="entry_category" className="text-xs font-semibold">
                                {t('parties.category')}
                            </Label>
                            <select
                                id="entry_category"
                                value={data.category}
                                onChange={e => setData('category', e.target.value)}
                                className="h-9 px-3 text-xs rounded-md border bg-background"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>
                                        {t(`parties.categories.${c}`)}
                                    </option>
                                ))}
                            </select>
                            {errors.category && <span className="text-xs text-destructive">{errors.category}</span>}
                        </div>
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="entry_description" className="text-xs font-semibold">
                            {t('parties.description')}
                        </Label>
                        <Input
                            id="entry_description"
                            value={data.description}
                            onChange={e => setData('description', e.target.value)}
                            placeholder={isUrdu ? "مثلاً قیمت وصول" : "e.g. Cash received"}
                            className="text-start"
                        />
                        {errors.description && <span className="text-xs text-destructive">{errors.description}</span>}
                    </div>

                    <div className="grid gap-1">
                        <Label htmlFor="entry_reference" className="text-xs font-semibold">
                            {t('parties.reference')}
                        </Label>
                        <Input
                            id="entry_reference"
                            value={data.reference}
                            onChange={e => setData('reference', e.target.value)}
                            placeholder={isUrdu ? "مثلاً بل نمبر" : "e.g. Bill No. 123"}
                            className="font-mono text-start"
                        />
                        {errors.reference && <span className="text-xs text-destructive">{errors.reference}</span>}
                    </div>

                    <DialogFooter className="pt-3 gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" size="sm" disabled={processing} className="cursor-pointer bg-primary">
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

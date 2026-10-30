import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export interface PickerItem {
    id: number | string;
    code: number | string;
    name?: string;
    name_en?: string;
    name_ur?: string;
    phone?: string;
    current_balance?: number;
    opening_balance?: number;
    unit?: string;
    area?: { name_en?: string; name_ur?: string };
    [key: string]: any;
}

interface ListPickerProps {
    label?: string;
    items?: PickerItem[];
    searchEndpoint?: string;
    selectedId?: number | string | null;
    selectedCode?: number | string | null;
    onChange: (item: PickerItem | null) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    className?: string;
    required?: boolean;
}

export function ListPicker({
    label,
    items = [],
    searchEndpoint,
    selectedId,
    selectedCode,
    onChange,
    placeholder = 'Code...',
    disabled = false,
    autoFocus = false,
    className = '',
}: ListPickerProps) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [fetchedItems, setFetchedItems] = useState<PickerItem[]>(items);
    const [loading, setLoading] = useState(false);
    const [codeValue, setCodeValue] = useState<string>(selectedCode ? String(selectedCode) : '');
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync external items
    useEffect(() => {
        if (items.length > 0) {
            setFetchedItems(items);
        }
    }, [items]);

    // Fetch from endpoint if provided
    useEffect(() => {
        if (searchEndpoint && open) {
            setLoading(true);
            fetch(`${searchEndpoint}?query=${encodeURIComponent(search)}`, {
                headers: { 'Accept': 'application/json' },
            })
                .then(r => r.json())
                .then(data => {
                    setFetchedItems(Array.isArray(data) ? data : (data.data || []));
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [searchEndpoint, search, open]);

    // Active item based on selectedId or selectedCode
    const activeItem = useMemo(() => {
        return fetchedItems.find(
            it => (selectedId && it.id === selectedId) || (codeValue && String(it.code) === String(codeValue))
        );
    }, [fetchedItems, selectedId, codeValue]);

    useEffect(() => {
        if (selectedCode !== undefined && selectedCode !== null) {
            setCodeValue(String(selectedCode));
        }
    }, [selectedCode]);

    // Handle code typed directly in input
    const handleCodeBlurOrEnter = () => {
        if (!codeValue.trim()) {
            onChange(null);
            return;
        }

        const match = fetchedItems.find(it => String(it.code) === String(codeValue).trim());
        if (match) {
            onChange(match);
        } else if (searchEndpoint) {
            // try to fetch by code from endpoint
            fetch(`${searchEndpoint}?query=${encodeURIComponent(codeValue.trim())}`, {
                headers: { 'Accept': 'application/json' },
            })
                .then(r => r.json())
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.data || []);
                    const exact = list.find((it: any) => String(it.code) === String(codeValue).trim()) || list[0];
                    if (exact) {
                        setFetchedItems(prev => [...prev.filter(p => p.id !== exact.id), exact]);
                        onChange(exact);
                    }
                })
                .catch(() => {});
        }
    };

    const handleSelect = (item: PickerItem) => {
        setCodeValue(String(item.code));
        onChange(item);
        setOpen(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Filter items in modal
    const filteredItems = useMemo(() => {
        if (!search.trim()) return fetchedItems;
        const q = search.toLowerCase();
        return fetchedItems.filter(it => {
            const codeStr = String(it.code || '');
            const enName = (it.name_en || '').toLowerCase();
            const urName = it.name_ur || '';
            const phone = it.phone || '';
            return codeStr.includes(q) || enName.includes(q) || urName.includes(q) || phone.includes(q);
        });
    }, [fetchedItems, search]);

    const getItemDisplayName = (it?: PickerItem) => {
        if (!it) return '';
        if (isUrdu) {
            return it.name_ur || it.name_en || it.name || '';
        }
        return it.name_en || it.name_ur || it.name || '';
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-xs font-semibold text-muted-foreground">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-1.5">
                {/* Code input */}
                <div className="w-20 shrink-0">
                    <Input
                        ref={inputRef}
                        type="number"
                        disabled={disabled}
                        autoFocus={autoFocus}
                        value={codeValue}
                        onChange={e => setCodeValue(e.target.value)}
                        onBlur={handleCodeBlurOrEnter}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCodeBlurOrEnter();
                            } else if (e.key === 'F2') {
                                e.preventDefault();
                                setOpen(true);
                            }
                        }}
                        placeholder={placeholder}
                        className="h-9 px-2 text-center font-mono font-bold"
                    />
                </div>

                {/* Name & Balance Display */}
                <div
                    onClick={() => !disabled && setOpen(true)}
                    className="flex-1 h-9 px-3 rounded-md border bg-muted/40 hover:bg-muted/70 cursor-pointer flex items-center justify-between text-xs transition-colors overflow-hidden"
                    title="Click or press F2 to open list"
                >
                    <span className={`truncate font-semibold ${isUrdu ? 'font-nastaliq text-sm leading-none' : ''}`}>
                        {activeItem ? getItemDisplayName(activeItem) : <span className="text-muted-foreground font-normal">{t('common.select')}</span>}
                    </span>
                    {activeItem?.current_balance !== undefined && (
                        <span className="ms-2 shrink-0 font-mono text-[11px] font-semibold text-primary">
                            Rs. {activeItem.current_balance}
                        </span>
                    )}
                </div>

                {/* List picker modal trigger button */}
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                    className="h-9 w-9 shrink-0 cursor-pointer"
                    title="Open list (F2)"
                >
                    <Icon name="ListMagnifyingGlassIcon" className="size-4 text-primary" weight="bold" />
                </Button>
            </div>

            {/* List Picker Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-4">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Icon name="ListMagnifyingGlassIcon" className="size-5 text-primary" />
                            <span>{label || t('common.search')}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Search input in modal */}
                    <div className="relative mb-2">
                        <Input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={isUrdu ? "کوڈ یا نام سے تلاش کریں..." : "Search by code or name..."}
                            className="h-9 pe-8"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute end-2 top-2 text-muted-foreground hover:text-foreground text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Items table */}
                    <div className="flex-1 overflow-auto border rounded-md">
                        <table className="w-full text-xs text-start">
                            <thead className="bg-muted/80 text-muted-foreground font-semibold sticky top-0 border-b">
                                <tr>
                                    <th className="py-2 px-3 text-start w-16">{t('common.code')}</th>
                                    <th className="py-2 px-3 text-start">{t('common.name')}</th>
                                    <th className="py-2 px-3 text-start w-28">{t('common.phone')}</th>
                                    <th className="py-2 px-3 text-end w-28">{t('common.balance')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                                            {t('common.loading')}
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                                            {t('common.no')} data
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map(item => {
                                        const isSelected = activeItem?.id === item.id;
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => handleSelect(item)}
                                                className={`cursor-pointer hover:bg-primary/10 transition-colors ${
                                                    isSelected ? 'bg-primary/15 font-semibold text-primary' : ''
                                                }`}
                                            >
                                                <td className="py-2 px-3 font-mono font-bold">{item.code}</td>
                                                <td className="py-2 px-3">
                                                    <div className="font-semibold">{getItemDisplayName(item)}</div>
                                                    {item.name_ur && item.name_en && (
                                                        <div className="text-[10px] text-muted-foreground font-mono">
                                                            {isUrdu ? item.name_en : item.name_ur}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-muted-foreground">{item.phone || '-'}</td>
                                                <td className="py-2 px-3 text-end font-mono font-semibold">
                                                    {item.current_balance !== undefined ? `Rs. ${item.current_balance}` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-[11px] text-muted-foreground">
                        <span>{t('common.record_x_of_y', { current: filteredItems.length, total: fetchedItems.length })}</span>
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ListPicker;

import React, { useEffect, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppearanceTabs from '@/components/appearance-tabs';
import Icon from '@/components/ui/icon';
import { changeLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props {
    settings: Record<string, string>;
    business: {
        name: string;
        name_ur: string;
        logo: string;
        show_on_print: boolean;
    };
    locale: string;
    paperSizes: Record<string, string>;
    dateFormats: Record<string, string>;
}

export default function SettingsIndex({ settings, business, locale, paperSizes, dateFormats }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const { data, setData, post, errors, processing } = useForm({
        business_name: settings.business_name ?? '',
        business_name_ur: settings.business_name_ur ?? '',
        business_tagline: settings.business_tagline ?? '',
        business_tagline_ur: settings.business_tagline_ur ?? '',
        business_address: settings.business_address ?? '',
        business_phone: settings.business_phone ?? '',
        business_phone2: settings.business_phone2 ?? '',
        default_paper_size: settings.default_paper_size ?? 'a4',
        show_business_info: settings.show_business_info === '1',
        date_format: settings.date_format ?? 'd-m-Y',
        locale: locale ?? 'en',
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(business.logo ? `/${business.logo}` : null);

    const logoForm = useForm<{ logo: File | null }>({ logo: null });

    useEffect(() => {
        setData('locale', locale);
    }, [locale]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav.dashboard', 'Dashboard'), href: '/dashboard' },
        { title: t('nav.settings', 'Settings'), href: '/settings' },
    ];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        post(route('settings.update'), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('settings.saved', 'Settings saved.')),
            onError: () => toast.error(t('common.error', 'An error occurred.')),
        });
    }

    function handleLanguage(value: string) {
        setData('locale', value);
        changeLanguage(value as 'en' | 'ur');
    }

    function handleLogoPick(file: File | null) {
        logoForm.setData('logo', file);

        if (file) {
            setLogoPreview(URL.createObjectURL(file));
        }
    }

    function handleLogoUpload() {
        if (!logoForm.data.logo) {
            toast.error(t('settings.logo_required', 'Please choose a logo file first.'));

            return;
        }

        logoForm.post(route('settings.logo'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => toast.success(t('settings.logo_updated', 'Logo updated.')),
            onError: () => toast.error(t('common.error', 'An error occurred.')),
        });
    }

    function handleLogoRemove() {
        router.delete(route('settings.logo.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                setLogoPreview(null);
                toast.success(t('settings.logo_removed', 'Logo removed.'));
            },
            onError: () => toast.error(t('common.error', 'An error occurred.')),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('nav.settings', 'Settings')} />

            <div className="p-3 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                    <Icon name="GearIcon" className="size-5 text-emerald-700" />
                    <h1 className="text-xl font-bold text-emerald-950 dark:text-emerald-400">{t('settings.title', 'Settings')}</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* -------------------------------------------------------
                        Business information
                    ------------------------------------------------------- */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-foreground font-semibold">{t('settings.business_information', 'Business Information')}</CardTitle>
                            <CardDescription>{t('settings.business_information_hint', 'These details are printed on receipts, invoices and reports.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="business_name">{t('settings.business_name', 'Business name')}</Label>
                                    <Input
                                        id="business_name"
                                        value={data.business_name}
                                        onChange={(e) => setData('business_name', e.target.value)}
                                        required
                                    />
                                    {errors.business_name && (
                                        <span className="text-xs text-destructive">{errors.business_name}</span>
                                    )}
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="business_name_ur">{t('settings.business_name_ur', 'Business name (Urdu)')}</Label>
                                    <Input
                                        id="business_name_ur"
                                        dir="rtl"
                                        value={data.business_name_ur}
                                        onChange={(e) => setData('business_name_ur', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="business_tagline">{t('settings.business_tagline', 'Tagline')}</Label>
                                    <Input
                                        id="business_tagline"
                                        value={data.business_tagline}
                                        onChange={(e) => setData('business_tagline', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="business_tagline_ur">{t('settings.business_tagline_ur', 'Tagline (Urdu)')}</Label>
                                    <Input
                                        id="business_tagline_ur"
                                        dir="rtl"
                                        value={data.business_tagline_ur}
                                        onChange={(e) => setData('business_tagline_ur', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-1.5 md:col-span-2">
                                    <Label htmlFor="business_address">{t('settings.business_address', 'Address')}</Label>
                                    <Textarea
                                        id="business_address"
                                        rows={2}
                                        value={data.business_address}
                                        onChange={(e) => setData('business_address', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="business_phone">{t('settings.business_phone', 'Phone number')}</Label>
                                    <Input
                                        id="business_phone"
                                        dir="ltr"
                                        value={data.business_phone}
                                        onChange={(e) => setData('business_phone', e.target.value)}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="business_phone2">{t('settings.business_phone2', 'Second phone number (optional)')}</Label>
                                    <Input
                                        id="business_phone2"
                                        dir="ltr"
                                        value={data.business_phone2}
                                        onChange={(e) => setData('business_phone2', e.target.value)}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="logo">{t('settings.business_logo', 'Business logo')}</Label>
                                    <div className="flex items-center gap-3">
                                        {logoPreview ? (
                                            <img
                                                src={logoPreview}
                                                alt={t('settings.business_logo', 'Business logo')}
                                                className="size-14 rounded border bg-white object-contain p-1"
                                            />
                                        ) : (
                                            <div className="size-14 rounded border bg-muted flex items-center justify-center">
                                                <Icon name="ImageIcon" className="size-6 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                id="logo"
                                                type="file"
                                                accept="image/png,image/jpeg,image/svg+xml"
                                                onChange={(e) => handleLogoPick(e.target.files?.[0] ?? null)}
                                                className="h-9"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleLogoUpload}
                                                    disabled={logoForm.processing}
                                                >
                                                    {t('common.upload', 'Upload')}
                                                </Button>
                                                {logoPreview && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        onClick={handleLogoRemove}
                                                    >
                                                        {t('common.delete', 'Delete')}
                                                    </Button>
                                                )}
                                            </div>
                                            {logoForm.errors.logo && (
                                                <span className="text-xs text-destructive">{logoForm.errors.logo}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* -------------------------------------------------------
                        Language and display
                    ------------------------------------------------------- */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-foreground font-semibold">{t('settings.language_display', 'Language & Display')}</CardTitle>
                            <CardDescription>{t('settings.language_display_hint', 'Choose the language of the screen and the light or dark look.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="locale">{t('settings.language', 'Language')}</Label>
                                    <Select value={data.locale} onValueChange={handleLanguage}>
                                        <SelectTrigger id="locale">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="ur">اردو</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label>{t('settings.appearance', 'Appearance')}</Label>
                                    <div className="pt-1">
                                        <AppearanceTabs />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* -------------------------------------------------------
                        Printing
                    ------------------------------------------------------- */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-foreground font-semibold">{t('settings.printing', 'Printing')}</CardTitle>
                            <CardDescription>{t('settings.printing_hint', 'How your printouts and PDF exports should look.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="default_paper_size">{t('settings.paper_size', 'Default paper size')}</Label>
                                    <Select
                                        value={data.default_paper_size}
                                        onValueChange={(value) => setData('default_paper_size', value)}
                                    >
                                        <SelectTrigger id="default_paper_size">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(paperSizes).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="show_business_info">{t('settings.show_business_info', 'Show business information on printouts')}</Label>
                                    <div className="flex items-center gap-3 pt-1">
                                        <Switch
                                            id="show_business_info"
                                            checked={data.show_business_info}
                                            onCheckedChange={(checked) => setData('show_business_info', checked)}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {t('settings.show_business_info_hint', 'Turn off to print only the report.')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* -------------------------------------------------------
                        General
                    ------------------------------------------------------- */}
                    <Card className="border border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-foreground font-semibold">{t('settings.general', 'General')}</CardTitle>
                            <CardDescription>{t('settings.general_hint', 'Basic preferences for this installation.')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="currency">{t('settings.currency', 'Currency')}</Label>
                                    <Input id="currency" value="PKR" readOnly disabled />
                                    <span className="text-xs text-muted-foreground">{t('settings.currency_hint', 'Pakistani Rupee is fixed for V1.')}</span>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="date_format">{t('settings.date_format', 'Date format')}</Label>
                                    <Select
                                        value={data.date_format}
                                        onValueChange={(value) => setData('date_format', value)}
                                    >
                                        <SelectTrigger id="date_format">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(dateFormats).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pb-4">
                        <Button type="submit" disabled={processing} className="min-w-32 bg-emerald-700 hover:bg-emerald-800 text-white">
                            {processing ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

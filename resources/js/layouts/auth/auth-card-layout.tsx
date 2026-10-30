import AppLogoIcon from '@/components/app/app-logo-icon';
import { LanguageToggle } from '@/components/app/language-toggle';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    return (
        <div className="bg-muted min-h-svh flex flex-col justify-between p-4 md:p-8">
            {/* Top header bar with language toggle */}
            <div className="flex items-center justify-between w-full max-w-4xl mx-auto py-2">
                <div className="flex items-center gap-2">
                    <AppLogoIcon className="size-8" />
                    <span className={`font-bold text-sm tracking-tight ${isUrdu ? 'font-nastaliq text-base' : ''}`}>
                        {t('branding.name')}
                    </span>
                </div>
                <div>
                    <LanguageToggle />
                </div>
            </div>

            {/* Center card */}
            <div className="flex w-full max-w-md mx-auto flex-col gap-6 my-auto">
                <Card className="rounded-xl shadow-md border bg-card">
                    <CardHeader className="px-8 pt-6 pb-2 text-center">
                        <div className="flex justify-center mb-2">
                            <AppLogoIcon className="size-16" />
                        </div>
                        <h1 className={`text-xl font-bold text-primary ${isUrdu ? 'font-nastaliq text-2xl' : ''}`}>
                            {t('branding.name')}
                        </h1>
                        <p className="text-xs text-muted-foreground font-medium">
                            {t('branding.tagline')}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {t('branding.address')}
                        </p>
                        <div className="pt-4 flex flex-col">
                            <CardTitle className="text-lg">{title}</CardTitle>
                            {description && <CardDescription className="text-xs">{description}</CardDescription>}
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 py-6">{children}</CardContent>
                </Card>
            </div>

            {/* Footer with phones */}
            <div className="text-center text-xs text-muted-foreground py-2">
                {t('branding.phones')}
            </div>
        </div>
    );
}

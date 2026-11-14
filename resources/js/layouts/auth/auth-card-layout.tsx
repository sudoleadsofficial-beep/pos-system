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
        <div className="bg-[#f4f7f4] min-h-[100dvh] flex flex-col justify-between p-3 sm:p-5 overflow-hidden">
            {/* Top header bar with logo & language toggle */}
            <div className="flex items-center justify-between w-full max-w-4xl mx-auto py-1 shrink-0">
                <div className="flex items-center gap-2">
                    <AppLogoIcon className="size-7" />
                    <span className="font-black text-sm tracking-tight text-[#166534]">
                        Vegetable POS
                    </span>
                </div>
                <div>
                    <LanguageToggle />
                </div>
            </div>

            {/* Center card */}
            <div className="flex w-full max-w-md mx-auto flex-col my-auto shrink-0">
                <Card className="rounded-2xl shadow-sm border border-gray-200/90 bg-white">
                    <CardHeader className="px-6 pt-5 pb-2 text-center">
                        <div className="flex justify-center mb-2">
                            <AppLogoIcon className="size-14" />
                        </div>
                        <h1 className="text-xl font-black text-[#166534] tracking-tight">
                            Vegetable POS
                        </h1>
                        <div className="pt-2 flex flex-col">
                            <CardTitle className={`text-base font-bold text-gray-800 ${isUrdu ? 'font-nastaliq text-lg' : ''}`}>{title}</CardTitle>
                            {description && <CardDescription className="text-xs text-gray-500">{description}</CardDescription>}
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2">{children}</CardContent>
                </Card>
            </div>

            {/* Empty footer spacer */}
            <div className="py-1 shrink-0" />
        </div>
    );
}

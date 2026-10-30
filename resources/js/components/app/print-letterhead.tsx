import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
    title: string;
    titleUrdu?: string;
    date?: string;
    from_date?: string;
    to_date?: string;
}

export default function PrintLetterhead({ title, titleUrdu, date, from_date, to_date }: Props) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    return (
        <div className="border-b-2 border-green-800 pb-3 mb-4 text-center">
            {/* Header / Bilingual Company Letterhead */}
            <div className="flex items-center justify-between gap-4">
                <div className="text-start">
                    <h2 className="text-base font-bold text-green-900 tracking-tight">
                        {t('branding.name')}
                    </h2>
                    <p className="text-xs text-gray-600">
                        {t('branding.tagline')}
                    </p>
                    <p className="text-[11px] text-gray-500 max-w-xs">
                        {t('branding.address')}
                    </p>
                </div>

                {/* Center Title Badge */}
                <div className="text-center px-4 py-1.5 bg-green-50 rounded-lg border border-green-200">
                    <h1 className="text-lg font-bold text-green-900 font-nastaliq">
                        {titleUrdu || title}
                    </h1>
                    {titleUrdu && title !== titleUrdu && (
                        <p className="text-xs text-green-800 font-medium">{title}</p>
                    )}
                    <p className="text-[11px] font-mono text-gray-600 mt-0.5">
                        {date && `${t('common.date')}: ${date}`}
                        {from_date && to_date && `${from_date} ${t('common.next')} ${to_date}`}
                    </p>
                </div>

                <div className="text-end">
                    <h2 className="text-lg font-bold text-green-900 font-nastaliq">
                        جعفر خان اینڈ برادرز کمپنی
                    </h2>
                    <p className="text-xs text-green-800 font-nastaliq">
                        سبزی کمیشن ایجنٹ — نیو سبزی منڈی کراچی
                    </p>
                    <p className="text-[11px] font-mono text-gray-600">
                        0303-8598049 | 0340-2108382
                    </p>
                </div>
            </div>
        </div>
    );
}

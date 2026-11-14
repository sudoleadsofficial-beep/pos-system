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
        <div className="border-b-2 border-[#166534] pb-3 mb-4 text-center">
            {/* Header: Green V logo + Vegetable POS */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#166534] flex items-center justify-center text-white font-black text-sm">
                        V
                    </div>
                    <div className="text-start">
                        <h2 className="text-base font-extrabold text-[#166534] tracking-tight">
                            Vegetable POS
                        </h2>
                        <p className="text-[11px] text-gray-600 font-medium">
                            {isUrdu ? 'منڈی سسٹم' : 'Mandi System'}
                        </p>
                    </div>
                </div>

                {/* Center Title Badge */}
                <div className="text-center px-4 py-1 bg-green-50 rounded-lg border border-green-200">
                    <h1 className="text-sm md:text-base font-bold text-green-900 font-nastaliq">
                        {titleUrdu || title}
                    </h1>
                    {titleUrdu && title !== titleUrdu && (
                        <p className="text-[11px] text-green-800 font-medium">{title}</p>
                    )}
                </div>

                <div className="text-end font-mono text-[11px] text-gray-600">
                    {date && `${t('common.date')}: ${date}`}
                    {from_date && to_date && `${from_date} ${t('common.next')} ${to_date}`}
                </div>
            </div>
        </div>
    );
}

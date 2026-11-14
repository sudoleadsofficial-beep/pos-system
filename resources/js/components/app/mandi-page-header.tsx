import React, { ReactNode } from 'react';

interface MandiPageHeaderProps {
    title: ReactNode;
    subtitle: ReactNode;
    isUrdu?: boolean;
    children?: ReactNode;
}

export default function MandiPageHeader({
    title,
    subtitle,
    isUrdu = false,
    children,
}: MandiPageHeaderProps) {
    return (
        <div className="bg-[#14532d] px-4 md:px-6 pt-3.5 pb-10 md:pb-12 text-white shadow-sm print:hidden">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className={`text-lg md:text-xl font-bold text-white tracking-tight leading-tight flex items-center gap-2 ${isUrdu ? 'font-nastaliq text-xl md:text-2xl' : ''}`}>
                        {title}
                    </h1>
                    <p className={`text-emerald-100/80 text-xs font-medium mt-0.5 ${isUrdu ? 'font-nastaliq' : ''}`}>
                        {subtitle}
                    </p>
                </div>
                {children && (
                    <div className="flex items-center gap-2">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

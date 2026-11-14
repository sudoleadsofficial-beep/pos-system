import AppLogoIcon from '@/components/app/app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5 w-full overflow-hidden py-1">
            <AppLogoIcon className="size-[34px] aspect-square shrink-0 rounded-lg shadow-xs" />
            <div className="flex-1 text-start overflow-hidden leading-tight group-data-[collapsible=icon]:hidden">
                <span className="block truncate font-black text-sm text-[#14532d] tracking-tight">
                    Vegetable POS
                </span>
            </div>
        </div>
    );
}

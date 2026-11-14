import { SidebarTrigger } from '@/components/ui/sidebar';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { LanguageToggle } from '@/components/app/language-toggle';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    return (
        <header className="sticky top-0 z-20 bg-[#f6f7f6]/95 backdrop-blur-md border-b border-[#e6e9e6] flex h-14 shrink-0 items-center gap-3 px-4 md:px-6">
            <div className="flex items-center justify-between w-full gap-3">
                {/* Left: Sidebar toggle + Global search */}
                <div className="flex items-center gap-3 min-w-0">
                    <SidebarTrigger className="-ms-1 rtl-flip text-[#68736b] hover:text-[#1a211c] hover:bg-[#f0f2f0] rounded-lg p-2 cursor-pointer" />
                    
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-[#e6e9e6] bg-white rounded-lg text-xs text-[#68736b] w-64 md:w-80 shadow-2xs">
                        <MagnifyingGlassIcon className="size-4 shrink-0 text-[#68736b]" />
                        <span className="flex-1 truncate">
                            {isUrdu ? 'مرچنٹ، کسان یا صفحہ تلاش کریں...' : 'Search merchant, farmer or page...'}
                        </span>
                        <kbd className="border border-[#e6e9e6] bg-[#f6f7f6] rounded px-1.5 py-0.5 text-[10px] font-mono text-[#68736b]">
                            Ctrl K
                        </kbd>
                    </div>
                </div>

                {/* Right: Language toggle + Notifications */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    {/* Language toggle */}
                    <LanguageToggle />

                    {/* Notifications with red indicator dot */}
                    <Button variant="ghost" size="icon" className="relative size-8 text-[#68736b] hover:text-[#1a211c] hover:bg-[#f0f2f0] rounded-lg cursor-pointer" title="Notifications">
                        <Icon name="Bell" className="size-4.5" />
                        <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-[#b42318] ring-2 ring-white" />
                    </Button>
                </div>
            </div>
        </header>
    );
}

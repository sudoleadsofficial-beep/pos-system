import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Icon from '@/components/ui/icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { LanguageToggle } from '@/components/app/language-toggle';
import { useTranslation } from 'react-i18next';
import { CalendarIcon } from '@phosphor-icons/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { t } = useTranslation();

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className='flex items-center justify-between w-full'>
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ms-1 rtl-flip" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                <div className='flex items-center gap-2'>
                    {/* Year badge */}
                    <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/10 text-primary border border-primary/20">
                        <CalendarIcon className="size-3.5" />
                        <span>{t('common.year')}</span>
                    </div>

                    {/* Language toggle at top right */}
                    <LanguageToggle />

                    <AppearanceToggleDropdown />
                    <Button variant={"ghost"} size={"icon"} title="Notifications">
                        <Icon
                            name="BellIcon"
                            className="h-5 w-5"
                        />
                    </Button>
                </div>
            </div>
        </header>
    );
}

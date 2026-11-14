import { useEffect, useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AppLogo from '@/components/app/app-logo';
import Icon from '@/components/ui/icon';
import { CaretRightIcon } from '@phosphor-icons/react';
import { getNavigationItems } from '@/lib/navigation';
import { NavGroup } from '@/types';
import { cn } from '@/lib/utils';
import { NavUser } from '../nav/nav-user';

export function AppSidebar() {
    const { url, props } = usePage();
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const showLegacyPos = (props as any)?.showLegacyPos ?? false;
    const { sideNav } = useMemo(() => getNavigationItems(showLegacyPos), [showLegacyPos]);
    const currentRouteName = (route().current() as string) || '';

    // Track which groups are expanded
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        sideNav.forEach(group => {
            const hasActiveRoute = group.items.some(item => item.url === url) ||
                (group.includeRoutes && group.includeRoutes.some(r => currentRouteName.startsWith(r)));
            // Open active group by default, or daily_kaam group on home
            initial[group.id] = !!hasActiveRoute || group.id === 'daily_kaam';
        });
        return initial;
    });

    // Auto-expand group when route changes
    useEffect(() => {
        sideNav.forEach(group => {
            const hasActiveRoute = group.items.some(item => item.url === url) ||
                (group.includeRoutes && group.includeRoutes.some(r => currentRouteName.startsWith(r)));
            if (hasActiveRoute) {
                setOpenGroups(prev => ({ ...prev, [group.id]: true }));
            }
        });
    }, [url, currentRouteName, sideNav]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-e shadow-xs">
            {/* Sidebar Branding Header */}
            <SidebarHeader className="border-b px-3 py-2.5">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent px-1">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* Navigation Content (Single unified sidebar) */}
            <SidebarContent className="px-2 py-3 overflow-y-auto">
                <SidebarGroup className="p-0">
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {sideNav.map((group: NavGroup) => {
                                const hasMultiple = group.items && group.items.length > 1;
                                const groupHasActiveItem = group.items.some(item => item.url === url);

                                // Single item group (e.g. Dashboard, Cash Book, Reports)
                                if (!hasMultiple && group.items && group.items.length === 1) {
                                    const singleItem = group.items[0];
                                    const isActive = url === singleItem.url;
                                    const label = t(singleItem.title || group.title);

                                    return (
                                        <SidebarMenuItem key={group.id}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={label}
                                                className={cn(
                                                    "transition-colors rounded-lg font-medium h-9 px-2.5",
                                                    isActive
                                                        ? "bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80] font-semibold hover:bg-[#ecf5ee] hover:text-[#166534]"
                                                        : "text-[#68736b] dark:text-[#8b968e] hover:bg-[#f0f2f0] dark:hover:bg-[#1e2420] hover:text-[#1a211c] dark:hover:text-[#e7ece8]"
                                                )}
                                            >
                                                <Link href={singleItem.url} className="flex items-center gap-2.5">
                                                    <Icon
                                                        name={singleItem.icon || group.icon}
                                                        weight={isActive ? "bold" : "regular"}
                                                        className={cn(
                                                            "!size-5 shrink-0",
                                                            isActive ? "text-[#166534] dark:text-[#4ade80]" : "text-[#68736b] dark:text-[#8b968e]"
                                                        )}
                                                    />
                                                    <span className={cn("truncate text-[15px] font-medium text-black dark:text-white", isUrdu && "font-nastaliq text-[17px]")}>
                                                        {label}
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                }

                                // Collapsible group with multiple sub-items (Merchants, Farmers, Masters, System)
                                const isExpanded = !!openGroups[group.id];
                                const groupLabel = t(group.title);

                                return (
                                    <Collapsible
                                        key={group.id}
                                        open={isExpanded}
                                        onOpenChange={() => toggleGroup(group.id)}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    tooltip={groupLabel}
                                                    className={cn(
                                                        "w-full justify-between font-medium text-xs transition-colors rounded-lg h-9 px-2.5 cursor-pointer",
                                                        groupHasActiveItem
                                                            ? "text-[#1a211c] dark:text-[#e7ece8] font-semibold"
                                                            : "text-[#68736b] dark:text-[#8b968e] hover:bg-[#f0f2f0] dark:hover:bg-[#1e2420] hover:text-[#1a211c] dark:hover:text-[#e7ece8]"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Icon
                                                            name={group.icon}
                                                            weight="regular"
                                                            className="!size-5 shrink-0 text-[#68736b] dark:text-[#8b968e]"
                                                        />
                                                        <span className={cn("truncate text-[15px] font-medium text-black dark:text-white", isUrdu && "font-nastaliq text-[17px]")}>
                                                            {groupLabel}
                                                        </span>
                                                    </div>
                                                    <CaretRightIcon
                                                        className={cn(
                                                            "size-3.5 shrink-0 text-[#68736b] transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                                            isExpanded && "rotate-90 rtl:rotate-90",
                                                            !isExpanded && "rtl:rotate-180"
                                                        )}
                                                    />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub className="ms-4 my-1 border-s border-[#e6e9e6] dark:border-[#262d28] ps-2.5 gap-0.5">
                                                    {group.items.map((subItem) => {
                                                        const isSubActive = url === subItem.url ||
                                                            (subItem.url === '/merchant-wasooli' && (url.startsWith('/merchant-wasooli') || url.startsWith('/merchant-amroza') || url.startsWith('/amroza-detail') || url.startsWith('/wasooli-detail') || url.startsWith('/amroza-wasooli'))) ||
                                                            (subItem.url === '/masters/merchants' && (url.startsWith('/masters/merchants') || url.startsWith('/masters/farmers'))) ||
                                                            (subItem.url === '/masters/items' && (url.startsWith('/masters/items') || url.startsWith('/masters/marks') || url.startsWith('/masters/areas')));
                                                        const subLabel = t(subItem.title);

                                                        return (
                                                            <SidebarMenuSubItem key={subItem.url}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={isSubActive}
                                                                    className={cn(
                                                                        "rounded-md py-1.5 px-2.5 transition-colors text-xs font-medium h-8",
                                                                        isSubActive
                                                                            ? "bg-[#ecf5ee] dark:bg-[#1b2a20] text-[#166534] dark:text-[#4ade80] font-semibold hover:bg-[#ecf5ee] hover:text-[#166534]"
                                                                            : "text-[#68736b] dark:text-[#8b968e] hover:bg-[#f0f2f0] dark:hover:bg-[#1e2420] hover:text-[#1a211c] dark:hover:text-[#e7ece8]"
                                                                    )}
                                                                >
                                                                    <Link href={subItem.url} className="flex items-center gap-2">
                                                                        <span className={cn("truncate text-[15px] font-medium text-black dark:text-white", isUrdu && "font-nastaliq text-[16px]")}>
                                                                            {subLabel}
                                                                        </span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        );
                                                    })}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Sidebar User Footer */}
            <SidebarFooter className="border-t p-2">
                <NavUser />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}

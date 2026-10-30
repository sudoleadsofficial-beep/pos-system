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
            // Open active group by default, or merchants group on home
            initial[group.id] = !!hasActiveRoute || group.id === 'merchants';
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
                                                        ? "bg-green-700 text-white font-semibold shadow-xs hover:bg-green-800 hover:text-white"
                                                        : "text-sidebar-foreground hover:bg-green-50 hover:text-green-900"
                                                )}
                                            >
                                                <Link href={singleItem.url} className="flex items-center gap-2.5">
                                                    <Icon
                                                        name={singleItem.icon || group.icon}
                                                        weight={isActive ? "fill" : "duotone"}
                                                        className={cn(
                                                            "!size-5 shrink-0",
                                                            isActive ? "text-white" : "text-muted-foreground"
                                                        )}
                                                    />
                                                    <span className={cn("truncate text-xs font-medium", isUrdu && "font-nastaliq text-sm")}>
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
                                                        "w-full justify-between font-semibold text-xs transition-colors rounded-lg h-9 px-2.5 cursor-pointer",
                                                        groupHasActiveItem
                                                            ? "text-green-900 font-bold bg-green-50/70"
                                                            : "text-sidebar-foreground hover:bg-green-50/50 hover:text-green-900"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Icon
                                                            name={group.icon}
                                                            weight={groupHasActiveItem ? "fill" : "duotone"}
                                                            className={cn(
                                                                "!size-5 shrink-0",
                                                                groupHasActiveItem ? "text-green-700" : "text-muted-foreground"
                                                            )}
                                                        />
                                                        <span className={cn("truncate", isUrdu && "font-nastaliq text-sm")}>
                                                            {groupLabel}
                                                        </span>
                                                    </div>
                                                    <CaretRightIcon
                                                        className={cn(
                                                            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                                            isExpanded && "rotate-90 rtl:rotate-90",
                                                            !isExpanded && "rtl:rotate-180"
                                                        )}
                                                    />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub className="ms-3.5 my-1 border-s border-green-200 ps-2 gap-0.5">
                                                    {group.items.map((subItem) => {
                                                        const isSubActive = url === subItem.url;
                                                        const subLabel = t(subItem.title);

                                                        return (
                                                            <SidebarMenuSubItem key={subItem.url}>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={isSubActive}
                                                                    className={cn(
                                                                        "rounded-md py-1.5 px-2 transition-colors text-xs font-medium h-8",
                                                                        isSubActive
                                                                            ? "bg-green-700 text-white font-semibold shadow-xs hover:bg-green-800 hover:text-white"
                                                                            : "text-sidebar-foreground/80 hover:bg-green-50 hover:text-green-900"
                                                                    )}
                                                                >
                                                                    <Link href={subItem.url} className="flex items-center gap-2">
                                                                        <Icon
                                                                            name={subItem.icon}
                                                                            weight={isSubActive ? "fill" : "duotone"}
                                                                            className={cn(
                                                                                "!size-4 shrink-0",
                                                                                isSubActive ? "text-white" : "text-muted-foreground"
                                                                            )}
                                                                        />
                                                                        <span className={cn("truncate", isUrdu && "font-nastaliq text-xs")}>
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

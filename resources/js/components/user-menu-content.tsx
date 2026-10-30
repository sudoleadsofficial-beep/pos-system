import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import Icon from '@/components/ui/icon';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                    <UserInfo user={user} showEmail />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full cursor-pointer" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <div className="flex items-center gap-2">
                            <Icon
                                name="GearSixIcon"
                                weight='duotone'
                                className="size-4"
                            />
                            <span className={isUrdu ? "font-nastaliq" : ""}>{t('nav.settings')}</span>
                        </div>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuItem asChild>
                <Link className="block w-full cursor-pointer text-destructive focus:text-destructive" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <div className="flex items-center gap-2">
                        <Icon
                            name="SignOutIcon"
                            weight='duotone'
                            className="size-4"
                        />
                        <span className={isUrdu ? "font-nastaliq" : ""}>{t('auth.logout')}</span>
                    </div>
                </Link>
            </DropdownMenuItem>
        </>
    );
}

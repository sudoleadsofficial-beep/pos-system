import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();

    return (
        <div className="flex items-center gap-2.5 overflow-hidden text-start">
            <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-border">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg text-emerald-800 bg-emerald-100 font-semibold text-xs">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            {showEmail && (
                <div className="grid flex-1 text-start text-xs leading-tight overflow-hidden group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-foreground">{user.name}</span>
                    <span className="text-muted-foreground truncate text-[11px]">{user.email}</span>
                </div>
            )}
        </div>
    );
}

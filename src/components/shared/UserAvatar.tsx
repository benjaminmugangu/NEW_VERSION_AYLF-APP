// src/components/shared/UserAvatar.tsx
"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, UserRole } from "@/lib/types";
import { User as UserIcon, Shield, Building, GraduationCap } from "lucide-react";

interface UserAvatarProps {
    user?: Partial<User> | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showBadge?: boolean;
}

const sizeMap = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-16 w-16 text-xl',
};

const iconMap: Record<string, any> = {
    NATIONAL_COORDINATOR: Shield,
    SITE_COORDINATOR: Building,
    SMALL_GROUP_LEADER: GraduationCap,
    USER: UserIcon,
};

export function UserAvatar({ user, size = 'md', className, showBadge = false }: UserAvatarProps) {
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '??';

    const RoleIcon = user?.role && iconMap[user.role] ? iconMap[user.role] : UserIcon;

    // Add a timestamp to bypass browser cache for updated avatars
    const avatarSrc = user?.avatarUrl
        ? `${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
        : undefined;

    return (
        <div className="relative inline-block">
            <Avatar className={cn(sizeMap[size], "border border-border/50 shadow-sm", className)}>
                <AvatarImage src={avatarSrc} alt={user?.name || 'User'} className="object-cover" />
                <AvatarFallback className="bg-primary/5 text-primary font-semibold flex flex-col items-center justify-center">
                    {initials !== '??' ? (
                        <span>{initials}</span>
                    ) : (
                        <UserIcon className="h-1/2 w-1/2 opacity-40" />
                    )}
                </AvatarFallback>
            </Avatar>

            {showBadge && user?.role && (
                <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 rounded-full bg-background border border-border flex items-center justify-center shadow-sm",
                    size === 'sm' ? 'h-2 w-2 p-0.5' : size === 'lg' ? 'h-5 w-5 p-1' : 'h-3.5 w-3.5 p-0.5'
                )}>
                    <RoleIcon className="h-full w-full text-primary" />
                </div>
            )}
        </div>
    );
}

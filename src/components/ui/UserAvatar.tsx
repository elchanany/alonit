'use client';

import { UserProfile } from "@/types/user-levels";
import Image from "next/image";

interface UserAvatarProps {
    user?: Partial<UserProfile> | null;
    src?: string | null;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    onClick?: () => void;
}

const SIZE_CLASSES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-base', // Increased from sm
    lg: 'w-14 h-14 text-xl',   // Increased from base
    xl: 'w-24 h-24 text-4xl',  // Increased from xl to 4xl for much bigger letter
};

const COLORS = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500',
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
    'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

export function UserAvatar({ user, src, name, size = 'md', className = '', onClick }: UserAvatarProps) {
    const photoURL = src || user?.photoURL;
    const displayName = name || user?.displayName || user?.username || '?';
    const firstLetter = displayName.charAt(0).toUpperCase();

    // קביעת צבע רקע לפי השם (כדי שיהיה עקבי לאותו משתמש)
    const colorIndex = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLORS.length;
    const bgColor = COLORS[colorIndex];

    const sizeClass = SIZE_CLASSES[size];

    return (
        <div
            className={`relative rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0 ${sizeClass} ${!photoURL ? bgColor : 'bg-gray-200'} ${className} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
            onClick={onClick}
        >
            {photoURL ? (
                <Image
                    src={photoURL}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes={size === 'sm' ? '32px' : size === 'md' ? '40px' : size === 'lg' ? '56px' : '96px'}
                    quality={100}
                    unoptimized
                />
            ) : (
                <span>{firstLetter}</span>
            )}
        </div>
    );
}

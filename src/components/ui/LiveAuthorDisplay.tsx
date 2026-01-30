'use client';

import { useState, useEffect } from 'react';
import { getUserProfile } from '@/services/user-level.service';
import { UserAvatar } from '@/components/ui/UserAvatar';
import Link from 'next/link';

interface LiveAuthorDisplayProps {
    authorId?: string;
    fallbackName: string;
    fallbackPhoto?: string | null;
    showAvatar?: boolean;
    avatarSize?: 'xs' | 'sm' | 'md' | 'lg';
    nameClassName?: string;
    isAnonymous?: boolean;
    linkToProfile?: boolean;
}

/**
 * Displays author name and optionally avatar with real-time updates from user profile.
 * Falls back to stored values if profile can't be loaded.
 */
export function LiveAuthorDisplay({
    authorId,
    fallbackName,
    fallbackPhoto,
    showAvatar = false,
    avatarSize = 'sm',
    nameClassName = 'text-xs font-bold text-indigo-300',
    isAnonymous = false,
    linkToProfile = false
}: LiveAuthorDisplayProps) {
    const [profile, setProfile] = useState<{ displayName: string; photoURL?: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!authorId || isAnonymous || fallbackName === 'אנונימי') return;
            try {
                const userProfile = await getUserProfile(authorId);
                if (userProfile) {
                    setProfile({
                        displayName: userProfile.displayName || userProfile.username || fallbackName,
                        photoURL: userProfile.photoURL
                    });
                }
            } catch (err) {
                // Fallback to stored values
            }
        };
        fetchProfile();
    }, [authorId, fallbackName, isAnonymous]);

    const displayName = profile?.displayName || fallbackName;
    const displayPhoto = profile?.photoURL || fallbackPhoto;

    const content = (
        <div className={`flex items-center gap-2 ${linkToProfile && !isAnonymous ? 'cursor-pointer hover:opacity-80' : ''}`}>
            {showAvatar && (
                <UserAvatar
                    src={displayPhoto}
                    name={displayName}
                    size={avatarSize}
                />
            )}
            <span className={nameClassName}>{displayName}</span>
        </div>
    );

    if (linkToProfile && !isAnonymous && authorId) {
        return (
            <Link href={`/user/${authorId}`}>
                {content}
            </Link>
        );
    }

    return content;
}

/**
 * Simple hook to get live author profile
 */
export function useLiveAuthorProfile(authorId?: string, fallbackName?: string, fallbackPhoto?: string | null) {
    const [profile, setProfile] = useState<{ displayName: string; photoURL?: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!authorId || fallbackName === 'אנונימי') return;
            try {
                const userProfile = await getUserProfile(authorId);
                if (userProfile) {
                    setProfile({
                        displayName: userProfile.displayName || userProfile.username || fallbackName || 'משתמש',
                        photoURL: userProfile.photoURL
                    });
                }
            } catch (err) {
                // Fallback to stored values
            }
        };
        fetchProfile();
    }, [authorId, fallbackName]);

    return {
        displayName: profile?.displayName || fallbackName || 'משתמש',
        photoURL: profile?.photoURL || fallbackPhoto
    };
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/user-level.service';
import { UserProfile, LEVEL_UNLOCKS } from '@/types/user-levels';
import Link from 'next/link';

export default function UserLevelBadge() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        async function loadProfile() {
            if (!user) return;

            try {
                const userProfile = await getUserProfile(user.uid);
                setProfile(userProfile);
            } catch (error) {
                console.error('Error loading profile:', error);
            }
        }

        loadProfile();
    }, [user]);

    if (!user || !profile) return null;

    const levelData = LEVEL_UNLOCKS[profile.level];

    return (
        <Link href="/progress" className="block">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg transition-all hover:scale-105 cursor-pointer">
                <span className="text-2xl">{levelData.icon}</span>
                <div className="text-sm">
                    <div className="font-bold">{levelData.name}</div>
                    <div className="text-xs opacity-90">{profile.stats.points} נקודות</div>
                </div>
            </div>
        </Link>
    );
}

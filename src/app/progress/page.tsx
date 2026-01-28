'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/user-level.service';
import { UserProfile } from '@/types/user-levels';
import ProgressPage from '@/components/features/ProgressPage';

export default function ProgressRoute() {
    const { user, loading } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            if (!user) {
                setLoadingProfile(false);
                return;
            }

            try {
                const profile = await getUserProfile(user.uid);
                setUserProfile(profile);
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoadingProfile(false);
            }
        }

        if (!loading) {
            loadProfile();
        }
    }, [user, loading]);

    if (loading || loadingProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl">טוען...</div>
            </div>
        );
    }

    if (!user || !userProfile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">🚫 נדרשת התחברות</h1>
                    <p className="text-gray-600">עליך להתחבר כדי לראות את ההתקדמות שלך</p>
                </div>
            </div>
        );
    }

    return <ProgressPage userProfile={userProfile} />;
}

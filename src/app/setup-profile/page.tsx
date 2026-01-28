'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createUserProfile, getUserProfile } from '@/services/user-level.service';
import { useRouter } from 'next/navigation';

export default function SetupProfilePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [status, setStatus] = useState('checking');
    const [message, setMessage] = useState('בודק פרופיל...');

    useEffect(() => {
        async function setupProfile() {
            if (!user) {
                setStatus('error');
                setMessage('אתה לא מחובר');
                return;
            }

            try {
                // בדוק אם כבר יש פרופיל
                const existingProfile = await getUserProfile(user.uid);

                if (existingProfile) {
                    setStatus('success');
                    setMessage(`הפרופיל שלך כבר קיים! רמה: ${existingProfile.level}`);
                    setTimeout(() => router.push('/progress'), 2000);
                    return;
                }

                // צור פרופיל חדש
                setMessage('יוצר פרופיל...');
                await createUserProfile(
                    user.uid,
                    user.email || '',
                    user.displayName || user.email?.split('@')[0] || 'משתמש',
                    user.photoURL || undefined
                );

                setStatus('success');
                setMessage('הפרופיל נוצר בהצלחה! מעביר אותך...');
                setTimeout(() => router.push('/progress'), 2000);
            } catch (error: any) {
                setStatus('error');
                setMessage(`שגיאה: ${error.message}`);
                console.error('Error setting up profile:', error);
            }
        }

        setupProfile();
    }, [user, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50" dir="rtl">
            <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md text-center">
                {status === 'checking' && (
                    <>
                        <div className="text-6xl mb-6 animate-spin">⚙️</div>
                        <h1 className="text-2xl font-bold text-purple-800 mb-4">{message}</h1>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="text-6xl mb-6 animate-bounce">✅</div>
                        <h1 className="text-2xl font-bold text-green-800 mb-4">{message}</h1>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="text-6xl mb-6">❌</div>
                        <h1 className="text-2xl font-bold text-red-800 mb-4">{message}</h1>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-600 transition-all mt-4"
                        >
                            חזור לדף הבית
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

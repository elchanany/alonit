'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserLevel, UserRole } from '@/types/user-levels';

export function ForceFix() {
    const { user } = useAuth();
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        if (!user) return;

        const fix = async () => {
            if (user.email?.toLowerCase() === 'eyceyceyc139@gmail.com') {
                setStatus('fixing');
                try {
                    await setDoc(doc(db, 'users', user.uid), {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || 'Elchanan Yehuda',
                        photoURL: user.photoURL,
                        role: UserRole.SUPER_ADMIN,
                        level: UserLevel.OAK,
                        stats: {
                            points: 999,
                            flowers: 999,
                            correctAnswers: 999,
                            questionsAsked: 999,
                            helpfulAnswers: 999,
                            daysActive: 999,
                            streak: 999
                        },
                        isBlocked: false,
                        lastActive: new Date()
                    }, { merge: true });
                    setStatus('success');
                    alert('פרופיל תוקן בהצלחה! אנא רענן את העמוד.');
                } catch (e: any) {
                    console.error(e);
                    setStatus('error: ' + e.message);
                }
            }
        };

        fix();
    }, [user]);

    if (status === 'idle') return null;
    if (status === 'success') return <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-4 z-[9999] text-center font-bold">הפרופיל תוקן! תעשה רענון</div>;
    if (status === 'fixing') return <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-4 z-[9999] text-center font-bold">מתקן פרופיל... אנא המתן</div>;

    return <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 z-[9999] text-center font-bold">שגיאה: {status}</div>;
}

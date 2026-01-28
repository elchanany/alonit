'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function SystemCleanup() {
    const { user } = useAuth();
    const [status, setStatus] = useState('idle');
    const [log, setLog] = useState<string[]>([]);

    useEffect(() => {
        if (!user || user.email?.toLowerCase() !== 'eyceyceyc139@gmail.com') return;

        const cleanup = async () => {
            if (status !== 'idle') return;
            setStatus('working');

            try {
                const usersRef = collection(db, 'users');
                const snapshot = await getDocs(usersRef);

                let deletedCount = 0;

                for (const userDoc of snapshot.docs) {
                    const data = userDoc.data();

                    // 1. Remove Impostor Admin (eyc139@gmail.com)
                    if (data.email?.toLowerCase() === 'eyc139@gmail.com') {
                        setLog(prev => [...prev, `Deleting impostor: ${data.email}`]);
                        await deleteDoc(doc(db, 'users', userDoc.id));
                        deletedCount++;
                    }

                    // 2. Remove Broken Users (User without email AND inactive)
                    if (data.displayName === 'משתמש ללא מייל') {
                        // Assuming 0 points means inactive/broken
                        if (!data.stats || data.stats.points === 0) {
                            setLog(prev => [...prev, `Deleting broken user: ${userDoc.id}`]);
                            await deleteDoc(doc(db, 'users', userDoc.id));
                            deletedCount++;
                        }
                    }
                }

                setStatus('done');
                if (deletedCount > 0) {
                    // Small delay then reload
                    setTimeout(() => window.location.reload(), 2500);
                }
            } catch (e: any) {
                console.error(e);
                setStatus('error');
            }
        };

        cleanup();
    }, [user, status]);

    if (status === 'working') {
        return (
            <div className="fixed top-4 right-4 z-[9999] bg-yellow-500 text-black px-6 py-3 rounded-full font-bold shadow-xl animate-pulse">
                🧹 מנקה נתונים כפולים...
            </div>
        );
    }

    if (status === 'done') {
        return (
            <div className="fixed top-4 right-4 z-[9999] bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-xl">
                ✅ הושלם! מרענן...
            </div>
        );
    }

    return null;
}

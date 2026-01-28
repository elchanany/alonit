'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/services/user-level.service';
import AdminPanel from '@/components/admin/AdminPanel';

export default function AdminPage() {
    const { user, loading } = useAuth();
    const [hasAccess, setHasAccess] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        async function checkAccess() {
            if (!user) {
                setHasAccess(false);
                setChecking(false);
                return;
            }

            try {
                const profile = await getUserProfile(user.uid);
                setHasAccess(profile?.role !== 'user');
            } catch (error) {
                console.error('Error checking access:', error);
                setHasAccess(false);
            } finally {
                setChecking(false);
            }
        }

        if (!loading) {
            checkAccess();
        }
    }, [user, loading]);

    if (loading || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-2xl">טוען...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">🚫 נדרשת התחברות</h1>
                    <p className="text-gray-600">עליך להתחבר כדי לגשת לדף זה</p>
                </div>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-600 mb-4">🚫 אין גישה</h1>
                    <p className="text-gray-600">אין לך הרשאות לצפות בדף זה</p>
                </div>
            </div>
        );
    }

    return <AdminPanel />;
}

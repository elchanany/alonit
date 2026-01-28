'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, createUserProfile } from '@/services/user-level.service';
import { fixUserProfile } from '@/services/fix-profile.service';
import { UserProfile } from '@/types/user-levels';

export default function DebugPage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [fixing, setFixing] = useState(false);

    useEffect(() => {
        loadProfile();
    }, [user]);

    async function loadProfile() {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const userProfile = await getUserProfile(user.uid);
            setProfile(userProfile);
        } catch (err: any) {
            setError(err.message);
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateProfile() {
        if (!user) return;

        try {
            setCreating(true);
            setError(null);
            await createUserProfile(
                user.uid,
                user.email || '',
                user.displayName || user.email?.split('@')[0] || 'משתמש',
                user.photoURL || undefined
            );
            await loadProfile();
        } catch (err: any) {
            setError(err.message);
            console.error('Error creating profile:', err);
        } finally {
            setCreating(false);
        }
    }

    async function handleFixProfile() {
        if (!user) return;

        try {
            setFixing(true);
            setError(null);
            await fixUserProfile(user.uid, user.email || '');
            await loadProfile();
        } catch (err: any) {
            setError(err.message);
            console.error('Error fixing profile:', err);
        } finally {
            setFixing(false);
        }
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white" dir="rtl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">אתה לא מחובר</h1>
                    <p>התחבר כדי לראות את הפרופיל שלך</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6" dir="rtl">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">🔍 דף בדיקה - מערכת דירוג</h1>

                {/* User Info */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-bold mb-4">מידע משתמש (Firebase Auth)</h2>
                    <div className="space-y-2 font-mono text-sm">
                        <div><span className="text-gray-400">UID:</span> {user.uid}</div>
                        <div><span className="text-gray-400">Email:</span> {user.email}</div>
                        <div><span className="text-gray-400">Display Name:</span> {user.displayName || 'לא מוגדר'}</div>
                        <div><span className="text-gray-400">Photo URL:</span> {user.photoURL || 'לא מוגדר'}</div>
                    </div>
                </div>

                {/* Profile Status */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                    <h2 className="text-2xl font-bold mb-4">סטטוס פרופיל (Firestore)</h2>

                    {loading && (
                        <div className="text-yellow-400">טוען...</div>
                    )}

                    {error && (
                        <div className="bg-red-900/50 border border-red-500 rounded p-4 mb-4">
                            <div className="font-bold mb-2">❌ שגיאה:</div>
                            <div className="font-mono text-sm">{error}</div>
                        </div>
                    )}

                    {!loading && !profile && !error && (
                        <div className="bg-orange-900/50 border border-orange-500 rounded p-4">
                            <div className="font-bold mb-4">⚠️ הפרופיל לא קיים ב-Firestore!</div>
                            <p className="mb-4">זה אומר שהפרופיל שלך לא נוצר עדיין במסד הנתונים.</p>
                            <button
                                onClick={handleCreateProfile}
                                disabled={creating}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                            >
                                {creating ? 'יוצר פרופיל...' : '✨ צור פרופיל עכשיו'}
                            </button>
                        </div>
                    )}

                    {!loading && profile && (
                        <div className="bg-green-900/50 border border-green-500 rounded p-4">
                            <div className="font-bold mb-4">✅ הפרופיל קיים!</div>
                            <div className="space-y-2 font-mono text-sm">
                                <div><span className="text-gray-400">Level:</span> {profile.level || '❌ חסר'}</div>
                                <div><span className="text-gray-400">Role:</span> {profile.role || '❌ חסר'}</div>
                                {profile.stats ? (
                                    <>
                                        <div><span className="text-gray-400">Points:</span> {profile.stats.points}</div>
                                        <div><span className="text-gray-400">Flowers:</span> {profile.stats.flowers}</div>
                                        <div><span className="text-gray-400">Correct Answers:</span> {profile.stats.correctAnswers}</div>
                                        <div><span className="text-gray-400">Questions Asked:</span> {profile.stats.questionsAsked}</div>
                                        <div><span className="text-gray-400">Days Active:</span> {profile.stats.daysActive}</div>
                                    </>
                                ) : (
                                    <div className="text-red-400">⚠️ Stats object is missing!</div>
                                )}
                                <div><span className="text-gray-400">Is Blocked:</span> {profile.isBlocked ? 'כן' : 'לא'}</div>
                            </div>

                            {(!profile.level || !profile.role || !profile.stats) && (
                                <div className="mt-4 bg-orange-900/50 border border-orange-500 rounded p-4">
                                    <div className="font-bold mb-2">⚠️ הפרופיל חסר שדות!</div>
                                    <p className="text-sm mb-4">לחץ על הכפתור כדי לתקן את הפרופיל</p>
                                    <button
                                        onClick={handleFixProfile}
                                        disabled={fixing}
                                        className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                                    >
                                        {fixing ? 'מתקן...' : '🔧 תקן פרופיל'}
                                    </button>
                                </div>
                            )}

                            <div className="mt-6 flex gap-4">
                                <a
                                    href="/progress"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                                >
                                    📈 עמוד התקדמות
                                </a>
                                <a
                                    href="/admin"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                                >
                                    🛡️ פאנל ניהול
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Firestore Rules Check */}
                <div className="bg-gray-800 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4">בדיקות נוספות</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-2">
                            <span>📝</span>
                            <div>
                                <div className="font-bold">Firestore Rules:</div>
                                <div className="text-gray-400">ודא שיש לך הרשאות קריאה/כתיבה ל-collection 'users'</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span>🔥</span>
                            <div>
                                <div className="font-bold">Firebase Console:</div>
                                <div className="text-gray-400">בדוק ב-Firebase Console אם ה-collection 'users' קיים</div>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <span>🌐</span>
                            <div>
                                <div className="font-bold">Network:</div>
                                <div className="text-gray-400">פתח את ה-Console בדפדפן (F12) ובדוק אם יש שגיאות</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={loadProfile}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        🔄 רענן
                    </button>
                </div>
            </div>
        </div>
    );
}

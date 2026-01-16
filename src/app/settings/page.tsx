'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Bell, LogOut } from 'lucide-react';
import Link from 'next/link';

interface UserSettings {
    autoSubscribeToAnswers: boolean;
    notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
    autoSubscribeToAnswers: true,
    notificationsEnabled: true,
};

export default function SettingsPage() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'userSettings', user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as UserSettings);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
            setLoading(false);
        };

        fetchSettings();
    }, [user]);

    const updateSetting = async (key: keyof UserSettings, value: boolean) => {
        if (!user) return;

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        setSaving(true);

        try {
            const docRef = doc(db, 'userSettings', user.uid);
            await setDoc(docRef, newSettings, { merge: true });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
        setSaving(false);
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <p className="text-indigo-300 mb-4">התחבר כדי לגשת להגדרות</p>
                <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold transition-colors">
                    התחבר
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-indigo-500/30 z-10 px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                    <ArrowRight size={24} />
                </button>
                <h1 className="font-bold text-white flex-1">הגדרות</h1>
                {saving && <span className="text-xs text-indigo-400">שומר...</span>}
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                {/* User Info */}
                <div className="bg-gray-800/50 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            (user.displayName || user.email || 'מ')[0]
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-white">{user.displayName || 'משתמש'}</h2>
                        <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-gray-800/50 backdrop-blur-md border border-indigo-500/20 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
                        <h3 className="font-bold text-gray-300 flex items-center gap-2">
                            <Bell size={18} className="text-indigo-400" />
                            התראות
                        </h3>
                    </div>

                    <div className="divide-y divide-gray-700">
                        {/* Enable notifications */}
                        <div className="px-4 py-4 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">הפעל התראות</p>
                                <p className="text-sm text-gray-400">קבל התראות על תשובות והודעות</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notificationsEnabled}
                                    onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Auto subscribe */}
                        <div className="px-4 py-4 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">עקוב אחרי שאלות שעניתי עליהן</p>
                                <p className="text-sm text-gray-400">קבל התראות על תשובות חדשות</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.autoSubscribeToAnswers}
                                    onChange={(e) => updateSetting('autoSubscribeToAnswers', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Sign Out */}
                <button
                    onClick={signOut}
                    className="w-full bg-red-900/30 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400 hover:bg-red-900/50 transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium">התנתק</span>
                </button>
            </div>
        </div>
    );
}

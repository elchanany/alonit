'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Bell, LogOut, User, Camera, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { checkUsernameAvailability } from '@/services/user-level.service';

interface UserSettings {
    autoSubscribeToAnswers: boolean;
    notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
    autoSubscribeToAnswers: true,
    notificationsEnabled: true,
};

const MONTHS = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' },
];

export default function SettingsPage() {
    const router = useRouter();
    const { user, userProfile, refreshProfile, signOut } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile editing
    const [editingProfile, setEditingProfile] = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editBirthDay, setEditBirthDay] = useState<number | ''>('');
    const [editBirthMonth, setEditBirthMonth] = useState<number | ''>('');
    const [editBirthYear, setEditBirthYear] = useState<number | ''>('');
    const [editGender, setEditGender] = useState<'male' | 'female' | ''>('');
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [profileError, setProfileError] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Initialize profile edit fields
    useEffect(() => {
        if (userProfile) {
            setEditUsername(userProfile.username || userProfile.displayName || '');
            setEditGender(userProfile.gender || '');
            if (userProfile.birthDate) {
                const d = new Date(userProfile.birthDate);
                setEditBirthDay(d.getDate());
                setEditBirthMonth(d.getMonth() + 1);
                setEditBirthYear(d.getFullYear());
            }
        }
    }, [userProfile]);

    // Username availability check
    useEffect(() => {
        if (!editUsername || editUsername.length < 3 || editUsername === userProfile?.username) {
            setUsernameStatus('idle');
            return;
        }

        const timer = setTimeout(async () => {
            setUsernameStatus('checking');
            try {
                const result = await checkUsernameAvailability(editUsername, user?.uid);
                setUsernameStatus(result.available ? 'available' : 'taken');
            } catch {
                setUsernameStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [editUsername, user?.uid, userProfile?.username]);

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) return;

        const previewUrl = URL.createObjectURL(file);
        setCropperImage(previewUrl);
    };

    const handleCropSave = async (croppedBlob: Blob) => {
        if (!user) return;
        setUploadingPhoto(true);
        setCropperImage(null);

        try {
            const storageRef = ref(storage, `avatars/${user.uid}`);
            await uploadBytes(storageRef, croppedBlob);
            const url = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
            await refreshProfile();
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleCropCancel = () => {
        if (cropperImage) URL.revokeObjectURL(cropperImage);
        setCropperImage(null);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setProfileError('');

        if (!editUsername.trim() || editUsername.length < 3) {
            setProfileError('שם משתמש חייב להכיל לפחות 3 תווים');
            return;
        }
        if (usernameStatus === 'taken') {
            setProfileError('שם המשתמש תפוס');
            return;
        }

        setSavingProfile(true);
        try {
            const updates: Record<string, unknown> = {
                username: editUsername.toLowerCase().trim(),
                displayName: editUsername.trim(),
            };

            if (editGender) updates.gender = editGender;
            if (editBirthDay && editBirthMonth && editBirthYear) {
                updates.birthDate = `${editBirthYear}-${String(editBirthMonth).padStart(2, '0')}-${String(editBirthDay).padStart(2, '0')}`;
                // Calculate age
                const birth = new Date(updates.birthDate as string);
                updates.age = new Date().getFullYear() - birth.getFullYear();
            }

            await updateDoc(doc(db, 'users', user.uid), updates);
            await refreshProfile();
            setEditingProfile(false);
        } catch (err) {
            console.error('Error saving profile:', err);
            setProfileError('שגיאה בשמירה');
        } finally {
            setSavingProfile(false);
        }
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

    const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
    const currentYear = new Date().getFullYear();
    const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 5 - i);

    return (
        <>
            {cropperImage && (
                <ImageCropper
                    imageUrl={cropperImage}
                    onSave={handleCropSave}
                    onCancel={handleCropCancel}
                />
            )}
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
                    {/* Profile Section */}
                    <div className="bg-gray-800/50 backdrop-blur-md border border-indigo-500/20 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-300 flex items-center gap-2">
                                <User size={18} className="text-indigo-400" />
                                פרטי פרופיל
                            </h3>
                            {!editingProfile ? (
                                <button onClick={() => setEditingProfile(true)} className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
                                    <Edit2 size={14} /> עריכה
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={handleSaveProfile} disabled={savingProfile} className="text-green-400 hover:text-green-300 p-1">
                                        <Check size={18} />
                                    </button>
                                    <button onClick={() => setEditingProfile(false)} className="text-red-400 hover:text-red-300 p-1">
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <UserAvatar src={userProfile?.photoURL} name={userProfile?.displayName} size="lg" />
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                        className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full text-xs hover:bg-indigo-500 disabled:opacity-50"
                                    >
                                        {uploadingPhoto ? '...' : <Camera size={12} />}
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white">{userProfile?.displayName || 'משתמש'}</p>
                                    <p className="text-sm text-gray-400">{user.email}</p>
                                    {userProfile?.googleName && userProfile.googleName !== userProfile.displayName && (
                                        <p className="text-xs text-gray-500">שם מקורי: {userProfile.googleName}</p>
                                    )}
                                </div>
                            </div>

                            {editingProfile && (
                                <div className="space-y-4 pt-4 border-t border-gray-700">
                                    {/* Username */}
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">כינוי</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editUsername}
                                                onChange={(e) => setEditUsername(e.target.value)}
                                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 pr-10 py-2 text-white"
                                                dir="auto"
                                                spellCheck={false}
                                                autoComplete="off"
                                                autoCorrect="off"
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                {usernameStatus === 'checking' && <span className="text-indigo-400 text-xs">⏳</span>}
                                                {usernameStatus === 'available' && <span className="text-green-400">✓</span>}
                                                {usernameStatus === 'taken' && <span className="text-red-400">✕</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Birth Date */}
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">תאריך לידה</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <select value={editBirthDay} onChange={(e) => setEditBirthDay(e.target.value ? Number(e.target.value) : '')} className="bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-2 text-white text-center">
                                                <option value="">יום</option>
                                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <select value={editBirthMonth} onChange={(e) => setEditBirthMonth(e.target.value ? Number(e.target.value) : '')} className="bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-2 text-white text-center">
                                                <option value="">חודש</option>
                                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                            </select>
                                            <select value={editBirthYear} onChange={(e) => setEditBirthYear(e.target.value ? Number(e.target.value) : '')} className="bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-2 text-white text-center">
                                                <option value="">שנה</option>
                                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Gender */}
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-1">מגדר</label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setEditGender('male')} className={`flex-1 py-2 rounded-lg font-medium transition ${editGender === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                👦 בן
                                            </button>
                                            <button type="button" onClick={() => setEditGender('female')} className={`flex-1 py-2 rounded-lg font-medium transition ${editGender === 'female' ? 'bg-pink-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                👧 בת
                                            </button>
                                        </div>
                                    </div>

                                    {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
                                </div>
                            )}
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
                            <div className="px-4 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-white">הפעל התראות</p>
                                    <p className="text-sm text-gray-400">קבל התראות על תשובות והודעות</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => updateSetting('notificationsEnabled', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className="px-4 py-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-white">עקוב אחרי שאלות שעניתי עליהן</p>
                                    <p className="text-sm text-gray-400">קבל התראות על תשובות חדשות</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={settings.autoSubscribeToAnswers} onChange={(e) => updateSetting('autoSubscribeToAnswers', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:ring-4 peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
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
        </>
    );
}

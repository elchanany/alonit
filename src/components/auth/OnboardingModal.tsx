'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { checkUsernameAvailability, completeUserProfile } from '@/services/user-level.service';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { Camera } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

// Generate arrays for date picker
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
    { value: 1, label: 'ינואר', short: 'ינו' },
    { value: 2, label: 'פברואר', short: 'פבר' },
    { value: 3, label: 'מרץ', short: 'מרץ' },
    { value: 4, label: 'אפריל', short: 'אפר' },
    { value: 5, label: 'מאי', short: 'מאי' },
    { value: 6, label: 'יוני', short: 'יונ' },
    { value: 7, label: 'יולי', short: 'יול' },
    { value: 8, label: 'אוגוסט', short: 'אוג' },
    { value: 9, label: 'ספטמבר', short: 'ספט' },
    { value: 10, label: 'אוקטובר', short: 'אוק' },
    { value: 11, label: 'נובמבר', short: 'נוב' },
    { value: 12, label: 'דצמבר', short: 'דצמ' },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 5 - i);

// Scroll Date Picker Component
function ScrollPicker({
    items,
    value,
    onChange,
    label,
    width = 'w-20'
}: {
    items: { value: number; label: string }[];
    value: number | '';
    onChange: (val: number) => void;
    label: string;
    width?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ITEM_HEIGHT = 48;

    const selectedIndex = value === '' ? 0 : items.findIndex(item => item.value === value);

    const scrollToIndex = (index: number, smooth = true) => {
        if (!containerRef.current) return;
        isScrollingRef.current = true;

        containerRef.current.scrollTo({
            top: index * ITEM_HEIGHT,
            behavior: smooth ? 'smooth' : 'auto'
        });

        // Clear flag after animation
        setTimeout(() => {
            isScrollingRef.current = false;
        }, 300);
    };

    // Initial scroll to selected
    useEffect(() => {
        if (selectedIndex >= 0) {
            scrollToIndex(selectedIndex, false);
        }
    }, []);

    const handleScroll = () => {
        if (isScrollingRef.current || !containerRef.current) return;

        // Debounce scroll
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            if (!containerRef.current) return;
            const scrollTop = containerRef.current.scrollTop;
            const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
            if (newIndex >= 0 && newIndex < items.length && items[newIndex].value !== value) {
                onChange(items[newIndex].value);
            }
        }, 100);
    };

    const selectItem = (index: number) => {
        if (index >= 0 && index < items.length) {
            onChange(items[index].value);
            scrollToIndex(index);
        }
    };

    return (
        <div className={`flex flex-col items-center ${width}`}>
            <span className="text-xs text-indigo-300 mb-1 font-medium">{label}</span>

            {/* Up arrow button - visible on desktop */}
            <button
                type="button"
                onClick={() => selectItem(selectedIndex - 1)}
                disabled={selectedIndex <= 0}
                className="hidden sm:flex w-full justify-center p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
            </button>

            <div className="relative h-36 w-full">
                {/* Selection indicator */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-indigo-600/30 rounded-lg border border-indigo-500/50 pointer-events-none z-10" />

                {/* Scroll container */}
                <div
                    ref={containerRef}
                    className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory"
                    onScroll={handleScroll}
                    style={{
                        scrollSnapType: 'y mandatory',
                        maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)'
                    }}
                >
                    {/* Top padding */}
                    <div style={{ height: ITEM_HEIGHT }} />

                    {items.map((item, idx) => {
                        const isSelected = item.value === value;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => selectItem(idx)}
                                className={`w-full h-12 flex items-center justify-center snap-center transition-all cursor-pointer ${isSelected
                                    ? 'text-white text-xl font-bold'
                                    : 'text-gray-400 text-base hover:text-white'
                                    }`}
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {item.label}
                            </button>
                        );
                    })}

                    {/* Bottom padding */}
                    <div style={{ height: ITEM_HEIGHT }} />
                </div>
            </div>

            {/* Down arrow button - visible on desktop */}
            <button
                type="button"
                onClick={() => selectItem(selectedIndex + 1)}
                disabled={selectedIndex >= items.length - 1}
                className="hidden sm:flex w-full justify-center p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
        </div>
    );
}


export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
    const { user, userProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [googleName, setGoogleName] = useState('');
    const [username, setUsername] = useState('');
    const [birthDay, setBirthDay] = useState<number | ''>('');
    const [birthMonth, setBirthMonth] = useState<number | ''>('');
    const [birthYear, setBirthYear] = useState<number | ''>('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');
    const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Image cropper state
    const [cropperImage, setCropperImage] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setGoogleName(user.displayName || '');
            setPhotoURL(userProfile?.photoURL || undefined);

            if (userProfile?.username) setUsername(userProfile.username);
            if (userProfile?.birthDate) {
                const d = new Date(userProfile.birthDate);
                setBirthDay(d.getDate());
                setBirthMonth(d.getMonth() + 1);
                setBirthYear(d.getFullYear());
            }
            if (userProfile?.gender) setGender(userProfile.gender as 'male' | 'female');
        }
    }, [user, userProfile]);

    useEffect(() => {
        if (!username || username.length < 3) {
            setUsernameStatus('idle');
            return;
        }

        const timer = setTimeout(async () => {
            setUsernameStatus('checking');
            try {
                const result = await checkUsernameAvailability(username, user?.uid);
                if (result.available) {
                    setUsernameStatus('available');
                    setSuggestions([]);
                } else {
                    setUsernameStatus('taken');
                    setSuggestions(result.suggestions || []);
                }
            } catch {
                setUsernameStatus('idle');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username, user?.uid]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (!file.type.startsWith('image/')) {
            setError('נא לבחור קובץ תמונה');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('התמונה גדולה מדי (מקסימום 5MB)');
            return;
        }

        // Create preview URL and open cropper
        const previewUrl = URL.createObjectURL(file);
        setCropperImage(previewUrl);
        setPendingFile(file);
    };

    const handleCropSave = async (croppedBlob: Blob) => {
        if (!user) return;

        setUploadingPhoto(true);
        setCropperImage(null);
        setError('');

        try {
            // Upload to Cloudinary via API route
            const formData = new FormData();
            formData.append('file', croppedBlob, 'avatar.jpg');
            formData.append('userId', user.uid);

            const response = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            setPhotoURL(result.url);
        } catch (err) {
            console.error('Upload error:', err);
            setError('שגיאה בהעלאת התמונה');
        } finally {
            setUploadingPhoto(false);
            setPendingFile(null);
        }
    };

    const handleCropCancel = () => {
        if (cropperImage) URL.revokeObjectURL(cropperImage);
        setCropperImage(null);
        setPendingFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || username.length < 3) {
            setError('שם משתמש חייב להכיל לפחות 3 תווים');
            return;
        }
        if (usernameStatus === 'taken') {
            setError('שם המשתמש תפוס, בחר שם אחר');
            return;
        }
        if (!birthDay || !birthMonth || !birthYear) {
            setError('נא לבחור תאריך לידה מלא');
            return;
        }
        if (!gender) {
            setError('נא לבחור מגדר');
            return;
        }

        const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (age < 5 || age > 120) {
            setError('גיל לא תקין');
            return;
        }

        setSubmitting(true);
        try {
            await completeUserProfile(user!.uid, {
                username: username.trim(),
                googleName: googleName,
                birthDate,
                gender: gender as 'male' | 'female',
                photoURL
            });
            onComplete();
        } catch (err) {
            console.error('Error completing profile:', err);
            setError('שגיאה בשמירת הפרופיל, נסה שוב');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Prepare items for wheel pickers
    const dayItems = DAYS.map(d => ({ value: d, label: String(d) }));
    const monthItems = MONTHS.map(m => ({ value: m.value, label: m.short }));
    const yearItems = YEARS.map(y => ({ value: y, label: String(y) }));

    return (
        <>
            {cropperImage && (
                <ImageCropper
                    imageUrl={cropperImage}
                    onSave={handleCropSave}
                    onCancel={handleCropCancel}
                />
            )}

            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-indigo-950 via-gray-900 to-slate-900 rounded-3xl max-w-lg w-full p-8 border border-white/10 shadow-[0_0_50px_rgba(79,70,229,0.2)] relative overflow-hidden max-h-[90vh] overflow-y-auto">

                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <h2 className="text-3xl font-black text-white tracking-tight">ברוכים הבאים!</h2>
                            <AppLogo className="w-10 h-10" showText={false} />
                        </div>
                        <p className="text-indigo-200 text-sm">בואו נכיר אתכם ונבנה לכם פרופיל אישי</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative">

                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative group">
                                <UserAvatar
                                    src={photoURL}
                                    name={username || '?'}
                                    size="xl"
                                    className="ring-4 ring-white/10 shadow-2xl"
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    disabled={uploadingPhoto}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                >
                                    {uploadingPhoto ? (
                                        <span className="animate-spin block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <Camera size={16} />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">לחץ על הכפתור להעלאת תמונה</p>
                        </div>

                        <div className="space-y-5">
                            {/* Username - FIXED RTL */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-300">כינוי באתר</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className={`w-full bg-white/5 border ${usernameStatus === 'taken' ? 'border-red-500/50' : usernameStatus === 'available' ? 'border-green-500/50' : 'border-white/10'} rounded-xl px-4 pr-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
                                        placeholder="הכינוי שלך"
                                        dir="auto"
                                        spellCheck={false}
                                        autoComplete="off"
                                        autoCorrect="off"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {usernameStatus === 'checking' && <span className="text-indigo-400 text-xs">⏳</span>}
                                        {usernameStatus === 'available' && <span className="text-green-400 text-lg">✓</span>}
                                        {usernameStatus === 'taken' && <span className="text-red-400 text-lg">✕</span>}
                                    </div>
                                </div>

                                {googleName && (
                                    <p className="text-[11px] text-gray-500">השם המקורי ({googleName}) יישמר ויוצג רק לך.</p>
                                )}

                                {usernameStatus === 'taken' && suggestions.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-xs text-red-300">תפוס! הצעות:</span>
                                        {suggestions.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setUsername(s)}
                                                className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-indigo-300"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Birth Date - Fancy Wheel Picker */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-300 text-center block">תאריך לידה</label>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <div className="flex justify-center gap-6">
                                        <ScrollPicker
                                            items={dayItems}
                                            value={birthDay}
                                            onChange={setBirthDay}
                                            label="יום"
                                        />
                                        <ScrollPicker
                                            items={monthItems}
                                            value={birthMonth}
                                            onChange={setBirthMonth}
                                            label="חודש"
                                        />
                                        <ScrollPicker
                                            items={yearItems}
                                            value={birthYear}
                                            onChange={setBirthYear}
                                            label="שנה"
                                        />
                                    </div>
                                    {birthDay && birthMonth && birthYear && (
                                        <p className="text-center text-indigo-300 text-sm mt-3 font-medium">
                                            נולדת ב-{birthDay} {MONTHS.find(m => m.value === birthMonth)?.label} {birthYear}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-300">מגדר</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setGender('male')}
                                        className={`py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2 ${gender === 'male'
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-[1.02]'
                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="text-2xl">👦</span>
                                        <span>בן</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGender('female')}
                                        className={`py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2 ${gender === 'female'
                                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg scale-[1.02]'
                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="text-2xl">👧</span>
                                        <span>בת</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || usernameStatus === 'checking' || usernameStatus === 'taken'}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'יוצר פרופיל...' : 'יאללה מתחילים! 🚀'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

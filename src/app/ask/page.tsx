'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Ghost as UserSecret, Tag, Type } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
    { id: 1, name: 'חברים', icon: '🫂' },
    { id: 2, name: 'אהבה', icon: '❤️' },
    { id: 3, name: 'טכנולוגיה', icon: '💻' },
    { id: 4, name: 'צבא', icon: '🪖' },
    { id: 5, name: 'לימודים', icon: '📚' },
    { id: 6, name: 'מוזיקה', icon: '🎵' },
    { id: 7, name: 'סרטים וסדרות', icon: '🎬' },
    { id: 8, name: 'התייעצות כללית', icon: '🤔' },
];

export default function AskPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        category: null as number | null,
        title: '',
        content: '',
        isAnonymous: false,
    });

    const handleCategorySelect = (id: number) => {
        setFormData({ ...formData, category: id });
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            await addDoc(collection(db, 'questions'), {
                title: formData.title,
                content: formData.content,
                category: CATEGORIES.find(c => c.id === formData.category)?.name || 'כללי',
                isAnonymous: formData.isAnonymous,
                authorId: user.uid,
                authorName: formData.isAnonymous ? 'אנונימי' : (user.displayName || 'משתמש'),
                authorPhoto: formData.isAnonymous ? null : user.photoURL,
                createdAt: serverTimestamp(),
                flowerCount: 0,
                answerCount: 0,
                viewCount: 0
            });

            router.push('/');
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("אירעה שגיאה בפרסום השאלה. נסה שוב.");
        }
    };

    const { user, isVerified, loading, resendVerification } = useAuth();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">טוען...</div>;

    // Not logged in - show inline prompt
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <div className="w-20 h-20 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center mb-6">
                    <UserSecret size={40} className="text-indigo-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">רוצה לשאול שאלה?</h1>
                <p className="text-indigo-300 mb-8 max-w-xs">כדי לשמור על קהילה בטוחה, עליך להתחבר לפני פרסום שאלה.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
                >
                    התחבר או הירשם
                </button>
            </div>
        );
    }

    // Logged in but email not verified (for email users, Google is always verified)
    if (user.providerData[0]?.providerId === 'password' && !isVerified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <div className="w-20 h-20 bg-yellow-600/20 border border-yellow-500/30 rounded-full flex items-center justify-center mb-6 text-4xl">
                    📧
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">אימות מייל נדרש</h1>
                <p className="text-indigo-300 mb-4 max-w-sm">
                    שלחנו לך מייל אימות לכתובת <strong className="text-white">{user.email}</strong>.
                    לחץ על הקישור במייל כדי להפעיל את החשבון.
                </p>
                <button
                    onClick={resendVerification}
                    className="text-indigo-400 font-bold hover:underline mb-4"
                >
                    שלח מייל אימות מחדש
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="text-gray-400 text-sm hover:underline"
                >
                    כבר אימתתי, רענן
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-900/80 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden">

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-800">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                        style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                    />
                </div>

                <div className="p-8">
                    <h1 className="text-2xl font-bold text-white mb-6 text-center">
                        {step === 1 && "בחר קטגוריה לשאלה"}
                        {step === 2 && "נסח את השאלה שלך"}
                        {step === 3 && "איך תרצה להופיע?"}
                    </h1>

                    {step === 1 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategorySelect(cat.id)}
                                    className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:bg-indigo-900/50 hover:border-indigo-500 hover:shadow-lg transition-all duration-200 group"
                                >
                                    <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                                    <span className="font-medium text-gray-300 group-hover:text-indigo-300">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">כותרת השאלה</label>
                                <div className="relative">
                                    <Type className="absolute top-3 right-3 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full pr-10 pl-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500"
                                        placeholder="למשל: איפה הכי כדאי לקנות ציוד לבית ספר?"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">פירוט (אופציונלי)</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-32 resize-none text-white placeholder:text-gray-500"
                                    placeholder="פרט ככל הניתן כדי לקבל תשובות מדויקות..."
                                />
                            </div>

                            <div className="flex justify-between mt-8">
                                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white font-medium">חזרה</button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!formData.title.trim()}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    המשך
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8">
                            <div
                                onClick={() => setFormData({ ...formData, isAnonymous: !formData.isAnonymous })}
                                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${formData.isAnonymous ? 'border-pink-500 bg-pink-900/30' : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'}`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.isAnonymous ? 'bg-pink-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                    <UserSecret size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">לשאול בעילום שם</h3>
                                    <p className="text-sm text-gray-400">השאלה תפורסם ללא השם שלך, והזהות שלך תישמר חסויה.</p>
                                </div>
                                <div className="mr-auto">
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center ${formData.isAnonymous ? 'bg-pink-500 border-pink-500' : 'border-gray-600'}`}>
                                        {formData.isAnonymous && <span className="text-white text-sm">✓</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white font-medium">חזרה</button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    <Send size={18} />
                                    פרסם שאלה
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

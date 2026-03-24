'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Ghost as UserSecret, Tag, Type, Hash, PlusCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { trackEvent, extractKeywords } from '@/services/recommendation.service';

import semanticClustersRaw from '@/lib/semantic-clusters.json';
const semanticClusters = semanticClustersRaw as Record<string, string[]>;

// Create a flat array of all distinct keys and values for the autocomplete
const allPossibleTags = Array.from(new Set([
    ...Object.keys(semanticClusters),
    ...Object.values(semanticClusters).flat()
]));

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
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        tags: [] as string[],
        title: '',
        content: '',
        isAnonymous: false,
    });
    
    const [showTagSearch, setShowTagSearch] = useState(false);
    const [tagSearchQuery, setTagSearchQuery] = useState('');

    const filteredTags = tagSearchQuery.trim() === '' 
        ? [] 
        : allPossibleTags.filter(t => t.toLowerCase().includes(tagSearchQuery.trim().toLowerCase())).slice(0, 10);

    const [autoSuggestedTags, setAutoSuggestedTags] = useState<string[]>([]);
    
    useEffect(() => {
        if (step === 2) {
            const textParams = `${formData.title} ${formData.content} ${formData.tags.join(' ')}`;
            const writtenWords = extractKeywords(textParams);
            const suggestions = new Set<string>();
            
            writtenWords.forEach(word => {
                if (word.length < 3) return;

                for (const [cluster, words] of Object.entries(semanticClusters)) {
                    let matched = false;
                    if (cluster.includes(word) && word.length >= 4) matched = true;
                    if (!matched) {
                        for (const w of words) {
                            if (w === word || (word.includes(w) && w.length >= 3) || (w.includes(word) && word.length >= 4)) {
                                matched = true;
                                break;
                            }
                        }
                    }
                    if (matched) {
                        suggestions.add(cluster);
                        const exactMatches = words.filter(w => w === word || (word.includes(w) && w.length >= 3) || (w.includes(word) && word.length >= 4));
                        exactMatches.slice(0, 2).forEach(m => suggestions.add(m));
                    }
                }
            });
            
            // Remove tags that are already selected by the user
            formData.tags.forEach(t => suggestions.delete(t));
            
            setAutoSuggestedTags(Array.from(suggestions).slice(0, 10));
        }
    }, [step, formData.title, formData.content, formData.tags]);

    const toggleTag = (tag: string) => {
        setFormData(prev => {
            if (prev.tags.includes(tag)) {
                return { ...prev, tags: prev.tags.filter(t => t !== tag) };
            }
            if (prev.tags.length >= 5) {
                showToast('ניתן לבחור עד 5 תגיות בלבד', 'error');
                return prev;
            }
            return { ...prev, tags: [...prev.tags, tag] };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || submitting) return;

        setSubmitting(true);
        try {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const docRef = await addDoc(collection(db, 'questions'), {
                title: formData.title,
                content: formData.content,
                category: formData.tags.length > 0 ? formData.tags[0] : 'כללי',
                tags: formData.tags,
                isAnonymous: formData.isAnonymous,
                authorId: user.uid,
                authorName: formData.isAnonymous ? 'אנונימי' : (user.displayName || 'משתמש'),
                authorPhoto: formData.isAnonymous ? null : user.photoURL,
                createdAt: serverTimestamp(),
                flowerCount: 0,
                answerCount: 0,
                viewCount: 0
            });

            trackEvent('ASK_QUESTION', { 
                category: formData.tags.length > 0 ? formData.tags[0] : 'כללי',
                keywords: formData.tags.join(' ') + ' ' + formData.title + ' ' + formData.content
            });

            router.push(`/question/${docRef.id}`);
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("אירעה שגיאה בפרסום השאלה. נסה שוב.");
            setSubmitting(false);
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
            <div className="w-full max-w-2xl bg-gray-900/80 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-2xl relative">

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-800 rounded-t-2xl overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                        style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                    />
                </div>

                <div className="p-8">
                    <h1 className="text-2xl font-bold text-white mb-6 text-center">
                        {step === 1 && "נסח את השאלה שלך"}
                        {step === 2 && "בחר תגיות לשאלה"}
                        {step === 3 && "איך תרצה להופיע?"}
                    </h1>

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">כותרת השאלה (מינימום 7 תווים)</label>
                                <div className="relative">
                                    <Type className="absolute top-3 right-3 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className={`w-full pr-10 pl-4 py-2 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-gray-500 transition-colors ${formData.title.length > 0 && formData.title.trim().length < 7 ? 'border-red-500/50' : 'border-gray-700 focus:border-transparent'}`}
                                        placeholder="למשל: איפה הכי כדאי לקנות ציוד לבית ספר?"
                                    />
                                    {formData.title.length > 0 && formData.title.trim().length < 7 && (
                                        <p className="text-red-400 text-xs mt-1 absolute -bottom-5 right-0">חסרים עוד {7 - formData.title.trim().length} תווים</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">פירוט (מינימום 20 תווים)</label>
                                <div className="relative">
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        className={`w-full p-4 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none text-white placeholder:text-gray-500 transition-colors ${formData.content.length > 0 && formData.content.trim().length < 20 ? 'border-red-500/50' : 'border-gray-700 focus:border-transparent'}`}
                                        placeholder="פרט ככל הניתן כדי לקבל תשובות מדויקות..."
                                    />
                                    {formData.content.length > 0 && formData.content.trim().length < 20 && (
                                        <p className="text-red-400 text-xs mt-1 absolute -bottom-5 right-0">חסרים עוד {20 - formData.content.trim().length} תווים</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end mt-10">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={formData.title.trim().length < 7 || formData.content.trim().length < 20}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-300 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                                >
                                    המשך לשלב הבא
                                    <Send size={18} className="rotate-180" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center w-full animate-in fade-in duration-300">
                            {/* Auto Suggestions Section */}
                            {autoSuggestedTags.length > 0 && (
                                <div className="mb-6 w-full p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                                    <h3 className="text-indigo-300 text-sm mb-3 font-medium flex items-center gap-2">
                                        <Hash size={16} /> הצעות חכמות מהשאלה שלך:
                                    </h3>
                                    <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                                        {autoSuggestedTags.map(tag => (
                                            <button
                                                key={`auto-${tag}`}
                                                onClick={() => toggleTag(tag)}
                                                className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all ${formData.tags.includes(tag) ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'}`}
                                            >
                                                <span># {tag}</span>
                                                {formData.tags.includes(tag) && <X size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Selected Tags Display */}
                            <div className="mb-6 w-full p-4 bg-gray-800/30 border border-gray-700 rounded-xl min-h-[80px]">
                                <h3 className="text-gray-400 text-sm mb-3 text-right">תגיות נבחרות ({formData.tags.length}/5) - חובה לבחור לפחות 3</h3>
                                <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                                    {formData.tags.map(tag => (
                                        <div key={tag} className="bg-indigo-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium animate-in zoom-in duration-200">
                                            <span># {tag}</span>
                                            <button onClick={() => toggleTag(tag)} className="hover:text-red-300 focus:outline-none transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.tags.length < 3 && (
                                        <span className="text-gray-500 text-sm py-1.5 ml-2 animate-pulse">חסרות עוד {3 - formData.tags.length} תגיות...</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => toggleTag(cat.name)}
                                        className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 transition-all duration-200 group ${formData.tags.includes(cat.name) ? 'border-indigo-500 bg-indigo-900/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-95' : 'border-gray-700 bg-gray-800/40 hover:border-indigo-500 hover:bg-indigo-900/30'}`}
                                    >
                                        <span className={`text-2xl md:text-3xl mb-1 md:mb-2 transition-transform ${formData.tags.includes(cat.name) ? 'scale-110' : 'group-hover:scale-110'}`}>{cat.icon}</span>
                                        <span className={`font-medium text-xs md:text-sm text-center transition-colors ${formData.tags.includes(cat.name) ? 'text-white' : 'text-gray-400 group-hover:text-indigo-300'}`}>{cat.name}</span>
                                    </button>
                                ))}
                                
                                {/* "Other" Autocomplete Tag Option */}
                                <button
                                    onClick={() => setShowTagSearch(!showTagSearch)}
                                    className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 transition-all duration-200 group ${showTagSearch ? 'border-indigo-500 bg-indigo-900/40' : 'border-gray-700 bg-gray-800/50 hover:border-indigo-500 hover:bg-indigo-900/30'}`}
                                >
                                    <span className="text-2xl md:text-3xl mb-1 md:mb-2 transition-transform text-gray-400 group-hover:text-indigo-400 group-hover:scale-110"><Hash className="inline" /></span>
                                    <span className="font-medium text-xs md:text-sm text-center text-gray-300 group-hover:text-indigo-300">אחר</span>
                                </button>
                            </div>

                            {/* Tag Search Autocomplete Area */}
                            {showTagSearch && (
                                <div className="mt-6 w-full max-w-md relative animate-in fade-in slide-in-from-top-4 duration-300 z-50">
                                    <div className="relative">
                                        <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <input
                                            type="text"
                                            value={tagSearchQuery}
                                            onChange={(e) => setTagSearchQuery(e.target.value)}
                                            placeholder="חפש תגית (למשל: נשיקה, קראש, לוחם)..."
                                            className="w-full bg-gray-900 border border-indigo-500/50 rounded-xl py-3 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && tagSearchQuery.trim() !== '') {
                                                    toggleTag(tagSearchQuery.trim());
                                                    setTagSearchQuery('');
                                                }
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Dropdown Suggestions */}
                                    {tagSearchQuery.trim() !== '' && (
                                        <div className="absolute w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[60] max-h-[40vh] overflow-y-auto">
                                            {filteredTags.length > 0 ? (
                                                filteredTags.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => {
                                                            toggleTag(tag);
                                                            setTagSearchQuery('');
                                                        }}
                                                        className="w-full text-right px-4 py-3 hover:bg-gray-800 border-b border-gray-800/50 last:border-0 text-gray-200 flex items-center justify-between transition-colors"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Hash size={14} className="text-indigo-400" />
                                                            {tag}
                                                        </span>
                                                        {formData.tags.includes(tag) && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">נבחר</span>}
                                                    </button>
                                                ))
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        toggleTag(tagSearchQuery.trim());
                                                        setTagSearchQuery('');
                                                    }}
                                                    className="w-full text-right px-4 py-3 hover:bg-gray-800 text-indigo-400 flex items-center gap-2"
                                                >
                                                    <PlusCircle size={14} />
                                                    צור תגית חדשה: "{tagSearchQuery.trim()}"
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NEXT BUTTON */}
                            <div className="mt-10 w-full flex justify-between items-center">
                                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white font-medium">חזרה</button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={formData.tags.length < 3}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-300 hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none w-full md:w-auto"
                                >
                                    המשך לשלב הבא
                                    <Send size={18} className="rotate-180" />
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
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            שולח...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            פרסם שאלה
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

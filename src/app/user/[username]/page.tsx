'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { MessageCircle, ArrowRight, Settings, Heart, LogOut } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
    id: string;
    displayName: string;
    email?: string;
    photoURL?: string;
    bio?: string;
    flowerCount: number;
    questionCount: number;
    answerCount: number;
    trustLevel: string;
    createdAt: any;
}

interface UserQuestion {
    id: string;
    title: string;
    answerCount: number;
}

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;
    const { user, signOut } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [questions, setQuestions] = useState<UserQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Check if viewing own profile
                if (username === 'me' && user) {
                    setIsOwnProfile(true);
                    // Create profile from auth user
                    setProfile({
                        id: user.uid,
                        displayName: user.displayName || 'משתמש',
                        email: user.email || undefined,
                        photoURL: user.photoURL || undefined,
                        bio: '',
                        flowerCount: 0,
                        questionCount: 0,
                        answerCount: 0,
                        trustLevel: 'NEWBIE',
                        createdAt: null
                    });

                    // Fetch user's questions
                    const qQuery = query(
                        collection(db, 'questions'),
                        where('authorId', '==', user.uid),
                        orderBy('createdAt', 'desc'),
                        limit(10)
                    );
                    const qSnap = await getDocs(qQuery);
                    setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserQuestion)));
                } else if (username !== 'me') {
                    // Search by displayName (public profile)
                    const usersQuery = query(
                        collection(db, 'users'),
                        where('displayName', '==', username),
                        limit(1)
                    );
                    const userSnap = await getDocs(usersQuery);

                    if (!userSnap.empty) {
                        const userData = userSnap.docs[0];
                        setProfile({ id: userData.id, ...userData.data() } as UserProfile);
                        setIsOwnProfile(user?.uid === userData.id);

                        // Fetch their questions
                        const qQuery = query(
                            collection(db, 'questions'),
                            where('authorId', '==', userData.id),
                            orderBy('createdAt', 'desc'),
                            limit(10)
                        );
                        const qSnap = await getDocs(qQuery);
                        setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserQuestion)));
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            }
            setLoading(false);
        };

        fetchUser();
    }, [username, user]);

    const handleStartChat = async () => {
        if (!user || !profile || isOwnProfile) return;

        try {
            // Check if conversation already exists
            const convQuery = query(
                collection(db, 'conversations'),
                where('participants', 'array-contains', user.uid)
            );
            const convSnap = await getDocs(convQuery);

            let existingConv = null;
            convSnap.forEach(doc => {
                const data = doc.data();
                if (data.participants.includes(profile.id)) {
                    existingConv = doc.id;
                }
            });

            if (existingConv) {
                router.push(`/conversations/${existingConv}`);
            } else {
                // Create new conversation
                const newConv = await addDoc(collection(db, 'conversations'), {
                    participants: [user.uid, profile.id],
                    participantNames: {
                        [user.uid]: user.displayName || 'משתמש',
                        [profile.id]: profile.displayName
                    },
                    lastMessage: null,
                    lastMessageTime: serverTimestamp(),
                    createdAt: serverTimestamp()
                });
                router.push(`/conversations/${newConv.id}`);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('שגיאה בפתיחת צ\'אט');
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">טוען...</div>;
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <p className="text-indigo-300 mb-4">המשתמש לא נמצא</p>
                <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold transition-colors">חזרה לראשי</Link>
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
                <h1 className="font-bold text-white flex-1">פרופיל</h1>
                {isOwnProfile && (
                    <Link href="/settings" className="text-gray-400 hover:text-white">
                        <Settings size={20} />
                    </Link>
                )}
            </div>

            <div className="max-w-2xl mx-auto p-4">
                {/* Profile Card */}
                <div className="bg-gray-800/50 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-6 text-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 overflow-hidden">
                        {profile.photoURL ? (
                            <img src={profile.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            profile.displayName[0]
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-1">{profile.displayName}</h1>

                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-indigo-600/30 text-indigo-300 text-xs rounded-full font-medium border border-indigo-500/30">
                            {profile.trustLevel === 'LEGEND' ? '🏆 אגדה' :
                                profile.trustLevel === 'MENTOR' ? '⭐ מנטור' :
                                    profile.trustLevel === 'TRUSTED' ? '✓ נאמן' : '🌱 חדש'}
                        </span>
                    </div>

                    {profile.bio && (
                        <p className="text-gray-400 mb-4">{profile.bio}</p>
                    )}

                    {/* Stats */}
                    <div className="flex justify-center gap-8 py-4 border-t border-b border-gray-700 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{questions.length}</div>
                            <div className="text-xs text-gray-500">שאלות</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{profile.answerCount || 0}</div>
                            <div className="text-xs text-gray-500">תשובות</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-pink-400 flex items-center justify-center gap-1">
                                <Heart size={18} fill="currentColor" />
                                {profile.flowerCount || 0}
                            </div>
                            <div className="text-xs text-gray-500">פרחים</div>
                        </div>
                    </div>

                    {/* Actions */}
                    {!isOwnProfile && user && (
                        <button
                            onClick={handleStartChat}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                        >
                            <MessageCircle size={20} />
                            שלח הודעה
                        </button>
                    )}

                    {isOwnProfile && (
                        <div className="space-y-3">
                            <Link
                                href="/settings"
                                className="w-full py-3 bg-gray-700/50 text-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
                            >
                                <Settings size={20} />
                                הגדרות
                            </Link>
                            <button
                                onClick={() => signOut()}
                                className="w-full py-3 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-900/50 transition-colors"
                            >
                                <LogOut size={20} />
                                התנתק
                            </button>
                        </div>
                    )}
                </div>

                {/* User's Questions */}
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-300 px-2">שאלות שנשאלו</h2>

                    {questions.length === 0 && (
                        <p className="text-center text-gray-500 py-4">אין שאלות עדיין</p>
                    )}

                    {questions.map(q => (
                        <Link key={q.id} href={`/question/${q.id}`} className="block bg-gray-800/50 border border-indigo-500/20 rounded-xl p-4 hover:bg-gray-800 transition-colors">
                            <h3 className="font-bold text-white">{q.title}</h3>
                            <p className="text-sm text-gray-500">{q.answerCount || 0} תשובות</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Conversation {
    id: string;
    participants: string[];
    participantNames: { [key: string]: string };
    lastMessage: string | null;
    lastMessageTime: any;
}

export default function ConversationsPage() {
    const { user, isVerified, loading: authLoading } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const convQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageTime', 'desc')
        );

        const unsubscribe = onSnapshot(convQuery, (snapshot) => {
            const convs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Conversation[];
            setConversations(convs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
                <div className="text-5xl mb-4">💬</div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">התחבר לצ'אט</h1>
                <p className="text-gray-500 mb-6 text-sm">כדי לשוחח עם משתמשים אחרים, עליך להתחבר.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-2.5 bg-primary text-white rounded-full font-bold"
                >
                    התחבר
                </button>
            </div>
        );
    }

    // Email not verified
    if (user.providerData[0]?.providerId === 'password' && !isVerified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
                <div className="text-4xl mb-4">📧</div>
                <h1 className="text-xl font-bold text-gray-800 mb-2">אמת את המייל שלך</h1>
                <p className="text-gray-500 text-sm">כדי לגשת לצ'אט, יש לאמת את כתובת המייל.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white md:bg-gray-50 pb-20">
            <div className="max-w-md mx-auto h-screen bg-white md:shadow-xl md:h-auto md:min-h-screen">

                {/* Header */}
                <div className="p-4 border-b sticky top-0 bg-white/80 backdrop-blur-md z-10 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">הודעות</h1>
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search size={16} className="text-gray-500" />
                    </div>
                </div>

                {/* List */}
                {loading && (
                    <div className="text-center py-8 text-gray-400">טוען...</div>
                )}

                {!loading && conversations.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">💬</div>
                        <p className="text-gray-400">אין שיחות עדיין</p>
                        <p className="text-sm text-gray-300 mt-2">לחץ על "שלח הודעה" בפרופיל משתמש כדי להתחיל</p>
                    </div>
                )}

                <div className="divide-y divide-gray-50">
                    {conversations.map(chat => {
                        const otherName = Object.entries(chat.participantNames)
                            .find(([id]) => id !== user?.uid)?.[1] || 'משתמש';

                        const timeAgo = chat.lastMessageTime?.toDate
                            ? formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: false, locale: he })
                            : '';

                        return (
                            <Link key={chat.id} href={`/conversations/${chat.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                        {otherName[0]}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-bold text-gray-900 truncate">{otherName}</h3>
                                            <span className="text-xs text-gray-400">{timeAgo}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">
                                            {chat.lastMessage || 'שיחה חדשה'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}

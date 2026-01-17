'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Search, ArrowRight, MessageCircle } from 'lucide-react';
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
    unreadCount?: { [key: string]: number }; // Per-user unread count
}

export default function ConversationsPage() {
    const { user, isVerified, loading: authLoading } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        console.log('📥 Loading conversations for user:', user.uid);

        const convQuery = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageTime', 'desc')
        );

        const unsubscribe = onSnapshot(convQuery,
            (snapshot) => {
                console.log('📦 Got conversations:', snapshot.docs.length);
                const convs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Conversation[];
                setConversations(convs);
                setLoading(false);
            },
            (error) => {
                console.error('❌ Error loading conversations:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Filter conversations based on search
    const filteredConversations = conversations.filter(chat => {
        if (!searchTerm.trim()) return true;
        const otherName = Object.entries(chat.participantNames)
            .find(([id]) => id !== user?.uid)?.[1] || '';
        return otherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (authLoading || (loading && user)) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-20 md:pb-0">
                <div className="max-w-2xl mx-auto h-screen bg-gray-800/40 md:shadow-2xl md:border md:border-gray-700/50">
                    <div className="p-4 border-b border-gray-700/50">
                        <div className="h-8 bg-gray-700 rounded-lg animate-pulse mb-3 w-32" />
                        <div className="h-10 bg-gray-700 rounded-full animate-pulse" />
                    </div>
                    <div className="p-4 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-gray-700 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-700 rounded w-1/3" />
                                    <div className="h-3 bg-gray-700 rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-gray-900 to-black">
                <div className="text-5xl mb-4">💬</div>
                <h1 className="text-xl font-bold text-white mb-2">התחבר לצ'אט</h1>
                <p className="text-gray-400 mb-6 text-sm">כדי לשוחח עם משתמשים אחרים, עליך להתחבר.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700"
                >
                    התחבר
                </button>
            </div>
        );
    }

    // Email not verified
    if (user.providerData[0]?.providerId === 'password' && !isVerified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-gray-900 to-black">
                <div className="text-4xl mb-4">📧</div>
                <h1 className="text-xl font-bold text-white mb-2">אמת את המייל שלך</h1>
                <p className="text-gray-400 text-sm">כדי לגשת לצ'אט, יש לאמת את כתובת המייל.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-20 md:pb-0">
            <div className="max-w-2xl mx-auto h-screen bg-gray-800/40 md:shadow-2xl md:border md:border-gray-700/50">

                {/* Header */}
                <div className="p-4 border-b border-gray-700/50 sticky top-14 md:top-16 bg-gray-800/80 backdrop-blur-md z-10">
                    <h1 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                        <MessageCircle size={24} className="text-indigo-400" />
                        הודעות
                    </h1>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="search"
                            placeholder="חפש לפי שם או הודעה..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-full py-2 pr-10 pl-4 text-sm focus:bg-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>

                {/* List */}

                {!loading && filteredConversations.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-4">💬</div>
                        <p className="text-gray-400">
                            {searchTerm ? 'לא נמצאו תוצאות' : 'אין שיחות עדיין'}
                        </p>
                        {!searchTerm && (
                            <p className="text-sm text-gray-500 mt-2">לחץ על "שלח הודעה" בפרופיל משתמש כדי להתחיל</p>
                        )}
                    </div>
                )}

                <div className="divide-y divide-gray-700/30">
                    {filteredConversations.map(chat => {
                        const otherName = Object.entries(chat.participantNames)
                            .find(([id]) => id !== user?.uid)?.[1] || 'משתמש';

                        const timeAgo = chat.lastMessageTime?.toDate
                            ? formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: false, locale: he })
                            : '';

                        const unreadCount = chat.unreadCount?.[user.uid] || 0;
                        const hasUnread = unreadCount > 0;

                        return (
                            <Link
                                key={chat.id}
                                href={`/conversations/${chat.id}`}
                                className={`block p-4 transition-colors ${hasUnread
                                    ? 'bg-indigo-900/20 hover:bg-indigo-900/30 border-r-2 border-indigo-500'
                                    : 'hover:bg-gray-700/30'
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${hasUnread
                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 ring-2 ring-indigo-400'
                                        : 'bg-gradient-to-br from-indigo-400 to-purple-400'
                                        }`}>
                                        {otherName[0]}
                                        {hasUnread && (
                                            <div className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-gray-800">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-bold truncate ${hasUnread ? 'text-white' : 'text-gray-200'
                                                }`}>
                                                {otherName}
                                            </h3>
                                            <span className="text-xs text-gray-500">{timeAgo}</span>
                                        </div>
                                        <p className={`text-sm truncate ${hasUnread ? 'text-indigo-300 font-semibold' : 'text-gray-400'
                                            }`}>
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

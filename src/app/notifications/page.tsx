'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Bell, MessageCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Notification {
    id: string;
    type: 'ANSWER' | 'MESSAGE' | 'SYSTEM';
    recipientId: string;
    senderId?: string;
    senderName?: string;
    questionId?: string;
    questionTitle?: string;
    message: string;
    read: boolean;
    createdAt: any;
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const notifQuery = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (notifId: string) => {
        try {
            await updateDoc(doc(db, 'notifications', notifId), {
                read: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleNotificationClick = (notif: Notification) => {
        markAsRead(notif.id);

        if (notif.type === 'ANSWER' && notif.questionId) {
            router.push(`/question/${notif.questionId}`);
        } else if (notif.type === 'MESSAGE') {
            router.push('/conversations');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ANSWER': return <MessageCircle size={20} className="text-indigo-400" />;
            case 'MESSAGE': return <MessageCircle size={20} className="text-pink-400" />;
            case 'SYSTEM': return <AlertCircle size={20} className="text-orange-400" />;
            default: return <Bell size={20} className="text-gray-400" />;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <Bell size={48} className="text-indigo-400 mb-4" />
                <p className="text-indigo-300 mb-4">התחבר כדי לראות התראות</p>
                <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold transition-colors">התחבר</Link>
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
                <h1 className="font-bold text-white flex-1">התראות</h1>
                <Bell size={20} className="text-indigo-400" />
            </div>

            <div className="max-w-2xl mx-auto">
                {loading && (
                    <div className="text-center py-10 text-indigo-400">טוען...</div>
                )}

                {!loading && notifications.length === 0 && (
                    <div className="text-center py-16">
                        <Bell size={48} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">אין התראות חדשות</p>
                    </div>
                )}

                <div className="divide-y divide-gray-800">
                    {notifications.map(notif => {
                        const timeAgo = notif.createdAt?.toDate
                            ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: he })
                            : 'עכשיו';

                        return (
                            <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`w-full text-right p-4 flex gap-3 hover:bg-gray-800/50 transition-colors ${!notif.read ? 'bg-indigo-900/30' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    {getIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${!notif.read ? 'font-bold text-white' : 'text-gray-300'}`}>
                                        {notif.message}
                                    </p>
                                    {notif.questionTitle && (
                                        <p className="text-xs text-gray-500 truncate">
                                            {notif.questionTitle}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
                                </div>
                                {!notif.read && (
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

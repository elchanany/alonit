'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Bell, MessageCircle, AlertCircle, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { getQuestionUrl } from '@/utils/url';

interface Notification {
    id: string;
    type: 'ANSWER' | 'MESSAGE' | 'SYSTEM' | 'MENTION';
    recipientId: string;
    senderId?: string;
    senderName?: string;
    conversationId?: string;
    questionId?: string;
    questionTitle?: string;
    message: string;
    read: boolean;
    createdAt: any;
}

interface GroupedNotification {
    type: 'MESSAGE' | 'SYSTEM' | 'ANSWER' | 'MENTION';
    senderId?: string;
    senderName?: string;
    conversationId?: string;
    questionId?: string;
    questionTitle?: string;
    lastMessage: string;
    unreadCount: number;
    latestTimestamp: any;
    notifications: Notification[];
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

    // Group notifications
    const groupedNotifications = useMemo(() => {
        const groups: GroupedNotification[] = [];
        const processedIds = new Set<string>();

        notifications.forEach(notif => {
            if (processedIds.has(notif.id)) return;

            if (notif.type === 'MESSAGE' && notif.senderId) {
                // Group all messages from same sender
                const relatedNotifs = notifications.filter(n =>
                    n.type === 'MESSAGE' &&
                    n.senderId === notif.senderId &&
                    !processedIds.has(n.id)
                );

                relatedNotifs.forEach(n => processedIds.add(n.id));

                const unreadCount = relatedNotifs.filter(n => !n.read).length;
                const latest = relatedNotifs[0];

                groups.push({
                    type: 'MESSAGE',
                    senderId: notif.senderId,
                    senderName: notif.senderName || 'משתמש',
                    conversationId: notif.conversationId,
                    lastMessage: latest.message,
                    unreadCount,
                    latestTimestamp: latest.createdAt,
                    notifications: relatedNotifs
                });
            } else if (notif.type === 'SYSTEM') {
                // Group system notifications
                const relatedNotifs = notifications.filter(n =>
                    n.type === 'SYSTEM' &&
                    !processedIds.has(n.id)
                );

                relatedNotifs.forEach(n => processedIds.add(n.id));

                const unreadCount = relatedNotifs.filter(n => !n.read).length;
                const latest = relatedNotifs[0];

                groups.push({
                    type: 'SYSTEM',
                    senderName: 'מערכת',
                    lastMessage: latest.message,
                    unreadCount,
                    latestTimestamp: latest.createdAt,
                    notifications: relatedNotifs
                });
            } else if (notif.type === 'ANSWER' || notif.type === 'MENTION') {
                // Keep answer and mention notifications individual
                processedIds.add(notif.id);
                groups.push({
                    type: notif.type,
                    senderId: notif.senderId,
                    senderName: notif.senderName || 'משתמש',
                    questionId: notif.questionId,
                    questionTitle: notif.questionTitle,
                    lastMessage: notif.message,
                    unreadCount: notif.read ? 0 : 1,
                    latestTimestamp: notif.createdAt,
                    notifications: [notif]
                });
            }
        });

        return groups;
    }, [notifications]);

    const markGroupAsRead = async (group: GroupedNotification) => {
        try {
            const unreadNotifs = group.notifications.filter(n => !n.read);
            await Promise.all(
                unreadNotifs.map(notif =>
                    updateDoc(doc(db, 'notifications', notif.id), { read: true })
                )
            );
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    };

    const handleGroupClick = async (group: GroupedNotification) => {
        await markGroupAsRead(group);

        if (group.type === 'MESSAGE' && group.conversationId) {
            router.push(`/conversations/${group.conversationId}`);
        } else if (group.type === 'MESSAGE' && group.senderId) {
            // Find or create conversation with this user
            try {
                const conversationsRef = collection(db, 'conversations');
                const q = query(
                    conversationsRef,
                    where('participants', 'array-contains', user!.uid)
                );
                const snapshot = await getDocs(q);

                const existingConv = snapshot.docs.find(doc => {
                    const data = doc.data();
                    return data.participants.includes(group.senderId);
                });

                if (existingConv) {
                    router.push(`/conversations/${existingConv.id}`);
                } else {
                    router.push('/conversations');
                }
            } catch (error) {
                console.error('Error finding conversation:', error);
                router.push('/conversations');
            }
        } else if ((group.type === 'ANSWER' || group.type === 'MENTION') && group.questionId) {
            router.push(getQuestionUrl(group.questionId, group.questionTitle));
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ANSWER': return <MessageCircle size={12} className="text-indigo-400" />;
            case 'MENTION': return <User size={12} className="text-cyan-400" />;
            case 'MESSAGE': return <MessageCircle size={12} className="text-pink-400" />;
            case 'SYSTEM': return <AlertCircle size={12} className="text-orange-400" />;
            default: return <Bell size={12} className="text-gray-400" />;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black">
                <Bell size={48} className="text-indigo-400 mb-4" />
                <p className="text-indigo-300 mb-4">התחבר כדי לראות התראות</p>
                <Link href="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold transition-colors">התחבר</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-24 pt-16 md:pt-20">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                        <ArrowRight size={24} />
                    </button>
                    <h1 className="font-bold text-white text-2xl flex-1">התראות</h1>
                    <Bell size={20} className="text-indigo-400" />
                </div>

                {loading && (
                    <div className="text-center py-10 text-indigo-400">טוען...</div>
                )}

                {!loading && groupedNotifications.length === 0 && (
                    <div className="text-center py-16">
                        <Bell size={48} className="text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">אין התראות</p>
                    </div>
                )}

                <div className="space-y-3">
                    {groupedNotifications.map((group, index) => {
                        const timeAgo = group.latestTimestamp?.toDate
                            ? formatDistanceToNow(group.latestTimestamp.toDate(), { addSuffix: true, locale: he })
                            : 'עכשיו';

                            return (
                                <button
                                    key={`${group.type}-${group.senderId || 'system'}-${index}`}
                                onClick={() => handleGroupClick(group)}
                                className={`w-full text-right p-4 rounded-xl flex gap-4 hover:bg-gray-800/80 transition-all duration-200 group-hover ${
                                    group.unreadCount > 0
                                        ? 'bg-indigo-900/20 border border-indigo-500/40 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.15)]'
                                        : 'bg-gray-800/20 border border-gray-700/50 hover:border-gray-600'
                                }`}
                            >
                                {/* Avatar/Icon */}
                                <div 
                                    className="relative cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={(e) => {
                                        if (group.type !== 'SYSTEM' && group.senderName) {
                                            e.stopPropagation();
                                            router.push(`/user/${group.senderName}`);
                                        }
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 flex-shrink-0">
                                        <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center">
                                            {group.type === 'SYSTEM' ? (
                                                <AlertCircle size={22} className="text-white" />
                                            ) : (
                                                <span className="text-white font-bold text-lg">
                                                    {group.senderName?.[0] || '?'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Small icon badge overlay */}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center border border-gray-700">
                                        {getIcon(group.type)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className={`text-sm ${group.unreadCount > 0 ? 'text-gray-100' : 'text-gray-300'}`}>
                                            {group.type === 'MENTION' && (
                                                <p>
                                                    <span onClick={(e) => { e.stopPropagation(); router.push(`/user/${group.senderName}`); }} className="font-bold text-white hover:underline hover:text-indigo-400 cursor-pointer transition-colors px-1 py-0.5 -mx-1">{group.senderName}</span> תייג אותך בשאלה <span className="font-semibold text-indigo-300">{group.questionTitle}</span>
                                                </p>
                                            )}
                                            {group.type === 'ANSWER' && (
                                                <p>
                                                    <span onClick={(e) => { e.stopPropagation(); router.push(`/user/${group.senderName}`); }} className="font-bold text-white hover:underline hover:text-indigo-400 cursor-pointer transition-colors px-1 py-0.5 -mx-1">{group.senderName}</span> כתב תשובה לשאלה שלך <span className="font-semibold text-indigo-300">{group.questionTitle}</span>
                                                </p>
                                            )}
                                            {group.type === 'MESSAGE' && (
                                                <p>
                                                    <span onClick={(e) => { e.stopPropagation(); router.push(`/user/${group.senderName}`); }} className="font-bold text-white hover:underline hover:text-indigo-400 cursor-pointer transition-colors px-1 py-0.5 -mx-1">{group.senderName}</span> שלח לך הודעות חדשות בצ'אט
                                                </p>
                                            )}
                                            {group.type === 'SYSTEM' && (
                                                <p>
                                                    <span className="font-bold text-orange-400">מערכת:</span> {group.lastMessage}
                                                </p>
                                            )}
                                        </div>
                                        {group.unreadCount > 0 && (
                                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                                {group.unreadCount} חדש
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* The specific message/preview */}
                                    {group.type !== 'SYSTEM' && group.lastMessage && (
                                        <p className={`text-xs mt-1.5 line-clamp-1 border-r-2 border-indigo-500/30 pr-2 ${group.unreadCount > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                                            "{group.lastMessage}"
                                        </p>
                                    )}
                                    
                                    <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5 opacity-80">
                                        <span>•</span>
                                        {timeAgo}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

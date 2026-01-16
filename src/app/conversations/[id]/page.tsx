'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: any;
}

interface Conversation {
    id: string;
    participants: string[];
    participantNames: { [key: string]: string };
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.id as string;
    const { user, isVerified } = useAuth();

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Fetch conversation details
    useEffect(() => {
        const fetchConversation = async () => {
            const docRef = doc(db, 'conversations', conversationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setConversation({ id: docSnap.id, ...docSnap.data() } as Conversation);
            }
            setLoading(false);
        };

        fetchConversation();
    }, [conversationId]);

    // Subscribe to messages
    useEffect(() => {
        const messagesQuery = query(
            collection(db, 'conversations', conversationId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [conversationId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim() || sending) return;

        // Check verification
        if (user.providerData[0]?.providerId === 'password' && !isVerified) {
            alert('יש לאמת את המייל לפני שניתן לשלוח הודעות');
            return;
        }

        setSending(true);
        try {
            // Add message
            await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
                senderId: user.uid,
                senderName: user.displayName || 'משתמש',
                content: newMessage.trim(),
                createdAt: serverTimestamp()
            });

            // Update conversation last message
            await updateDoc(doc(db, 'conversations', conversationId), {
                lastMessage: newMessage.trim(),
                lastMessageTime: serverTimestamp()
            });

            // Create notification for other participant
            if (conversation) {
                const otherParticipantId = conversation.participants.find(p => p !== user.uid);
                if (otherParticipantId) {
                    await addDoc(collection(db, 'notifications'), {
                        type: 'MESSAGE',
                        recipientId: otherParticipantId,
                        senderId: user.uid,
                        senderName: user.displayName || 'משתמש',
                        message: `הודעה חדשה מ-${user.displayName || 'משתמש'}`,
                        read: false,
                        createdAt: serverTimestamp()
                    });
                }
            }

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('שגיאה בשליחת ההודעה');
        }
        setSending(false);
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">יש להתחבר כדי לצפות בצ'אט</p>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
    }

    const otherParticipantName = conversation
        ? Object.entries(conversation.participantNames).find(([id]) => id !== user?.uid)?.[1] || 'משתמש'
        : 'משתמש';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-600">
                    <ArrowRight size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold">
                    {otherParticipantName[0]}
                </div>
                <div className="flex-1">
                    <h1 className="font-bold text-gray-800">{otherParticipantName}</h1>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        <p>אין הודעות עדיין. שלח הודעה ראשונה!</p>
                    </div>
                )}

                {messages.map(msg => {
                    const isMine = msg.senderId === user?.uid;
                    const timeAgo = msg.createdAt?.toDate
                        ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: he })
                        : '';

                    return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine
                                    ? 'bg-primary text-white rounded-br-sm'
                                    : 'bg-white border rounded-bl-sm'
                                }`}>
                                <p className={isMine ? 'text-white' : 'text-gray-800'}>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                                    {timeAgo}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Message Input */}
            <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="כתוב הודעה..."
                        className="flex-1 bg-gray-100 rounded-full px-5 py-3 focus:bg-white focus:ring-2 focus:ring-primary outline-none text-gray-900"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

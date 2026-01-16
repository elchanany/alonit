'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Send, Trash2, Reply, X, Image as ImageIcon, BellOff, Bell, Loader2, Mic, Square, Play, Pause } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/context/ToastContext';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    replyToId?: string;
    replyToContent?: string;
    replyToSender?: string;
    deleted?: boolean;
    createdAt: any;
}

interface Conversation {
    id: string;
    participants: string[];
    participantNames: { [key: string]: string };
    participantPhotos?: { [key: string]: string };
    mutedBy?: string[];
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.id as string;
    const { user, isVerified } = useAuth();
    const { showToast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom on new messages
    const scrollToBottom = () => {
        // Only scroll inside the messages container, not the whole page
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    // Scroll to bottom only when new messages arrive, not on page load
    const isFirstLoad = useRef(true);
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            // On first load, scroll without animation
            messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
        } else {
            scrollToBottom();
        }
    }, [messages]);

    // Fetch conversation details
    useEffect(() => {
        const fetchConversation = async () => {
            const docRef = doc(db, 'conversations', conversationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const convData = { id: docSnap.id, ...docSnap.data() } as Conversation;
                setConversation(convData);
                setIsMuted(convData.mutedBy?.includes(user?.uid || '') || false);
            }
            setLoading(false);
        };

        fetchConversation();
    }, [conversationId, user]);

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast('הקובץ גדול מדי (מקסימום 5MB)', 'error');
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const fileName = `chat/${conversationId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    // Voice recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            setRecordingDuration(0);

            // Start timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showToast('לא ניתן לגשת למיקרופון', 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    const uploadAudio = async (blob: Blob): Promise<string> => {
        const fileName = `chat/${conversationId}/audio_${Date.now()}.webm`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, blob);
        return getDownloadURL(storageRef);
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!newMessage.trim() && !selectedFile && !audioBlob) || sending) return;

        if (user.providerData[0]?.providerId === 'password' && !isVerified) {
            showToast('יש לאמת את המייל לפני שניתן לשלוח הודעות', 'error');
            return;
        }

        setSending(true);
        try {
            let imageUrl: string | undefined;
            let audioUrl: string | undefined;

            if (selectedFile) {
                setUploadingImage(true);
                imageUrl = await uploadImage(selectedFile);
                setUploadingImage(false);
            }

            if (audioBlob) {
                audioUrl = await uploadAudio(audioBlob);
            }

            const messageData: any = {
                senderId: user.uid,
                senderName: user.displayName || 'משתמש',
                content: newMessage.trim() || (imageUrl ? '📷 תמונה' : audioUrl ? '🎙️ הקלטה קולית' : ''),
                createdAt: serverTimestamp()
            };

            if (imageUrl) {
                messageData.imageUrl = imageUrl;
            }

            if (audioUrl) {
                messageData.audioUrl = audioUrl;
                messageData.audioDuration = recordingDuration;
            }

            if (replyingTo) {
                messageData.replyToId = replyingTo.id;
                messageData.replyToContent = replyingTo.content.substring(0, 50) + (replyingTo.content.length > 50 ? '...' : '');
                messageData.replyToSender = replyingTo.senderName;
            }

            await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);

            await updateDoc(doc(db, 'conversations', conversationId), {
                lastMessage: messageData.content,
                lastMessageTime: serverTimestamp()
            });

            // Notification - only if not muted by recipient
            if (conversation) {
                const otherParticipantId = conversation.participants.find(p => p !== user.uid);
                if (otherParticipantId && !conversation.mutedBy?.includes(otherParticipantId)) {
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
            setReplyingTo(null);
            setPreviewImage(null);
            setSelectedFile(null);
            setAudioBlob(null);
            setRecordingDuration(0);
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('שגיאה בשליחת ההודעה', 'error');
        }
        setSending(false);
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
                deleted: true,
                content: 'ההודעה נמחקה'
            });
            setSelectedMessage(null);
            setShowMenu(false);
            showToast('ההודעה נמחקה', 'success');
        } catch (error) {
            showToast('שגיאה במחיקת ההודעה', 'error');
        }
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
        setSelectedMessage(null);
        setShowMenu(false);
    };

    const formatMessageTime = (timestamp: any) => {
        if (!timestamp?.toDate) return '';
        return format(timestamp.toDate(), 'HH:mm');
    };

    const formatDateSeparator = (timestamp: any) => {
        if (!timestamp?.toDate) return '';
        const date = timestamp.toDate();
        if (isToday(date)) return 'היום';
        if (isYesterday(date)) return 'אתמול';
        return format(date, 'd בMMMM yyyy', { locale: he });
    };

    const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
        if (!prevMsg) return true;
        if (!currentMsg.createdAt?.toDate || !prevMsg.createdAt?.toDate) return false;
        return !isSameDay(currentMsg.createdAt.toDate(), prevMsg.createdAt.toDate());
    };

    const handleToggleMute = async () => {
        if (!user || !conversation) return;

        try {
            const currentMuted = conversation.mutedBy || [];
            let newMuted: string[];

            if (isMuted) {
                newMuted = currentMuted.filter(id => id !== user.uid);
            } else {
                newMuted = [...currentMuted, user.uid];
            }

            await updateDoc(doc(db, 'conversations', conversationId), {
                mutedBy: newMuted
            });

            setIsMuted(!isMuted);
            showToast(isMuted ? 'ההתראות הופעלו' : 'השיחה הושתקה', 'success');
        } catch (error) {
            showToast('שגיאה בעדכון ההשתקה', 'error');
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                <p className="text-gray-400">יש להתחבר כדי לצפות בצ'אט</p>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">טוען...</div>;
    }

    const otherParticipantName = conversation
        ? Object.entries(conversation.participantNames).find(([id]) => id !== user?.uid)?.[1] || 'משתמש'
        : 'משתמש';

    return (
        <div className="fixed inset-0 top-14 md:top-16 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4 z-0">
            <div className="w-full max-w-md h-full max-h-[85vh] flex flex-col">
                {/* Chat Card - matches site dark cards, narrower like TikTok */}
                <div className="flex flex-col h-full bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl">
                    {/* Header - inside the card */}
                    <div className="shrink-0 bg-gray-800/80 border-b border-gray-700/50 px-4 py-3 flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
                            <ArrowRight size={24} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {otherParticipantName[0]}
                        </div>
                        <div className="flex-1">
                            <h1 className="font-bold text-white">{otherParticipantName}</h1>
                            <p className="text-xs text-gray-400">מחובר</p>
                        </div>
                        <button
                            onClick={handleToggleMute}
                            className={`p-2 rounded-full transition-colors ${isMuted
                                ? 'text-orange-400 bg-orange-900/30'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            title={isMuted ? 'הפעל התראות' : 'השתק שיחה'}
                        >
                            {isMuted ? <BellOff size={18} className="line-through" /> : <Bell size={18} />}
                        </button>
                    </div>

                    {/* Messages area - takes remaining space */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <p>אין הודעות עדיין. שלח הודעה ראשונה! 💬</p>
                            </div>
                        )}

                        {messages.map((msg, index) => {
                            const isMine = msg.senderId === user?.uid;
                            const prevMsg = index > 0 ? messages[index - 1] : null;
                            const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);

                            return (
                                <div key={msg.id}>
                                    {/* Date Separator */}
                                    {showDateSeparator && (
                                        <div className="flex justify-center my-4">
                                            <span className="px-4 py-1 bg-gray-700/60 text-gray-400 text-xs rounded-full">
                                                {formatDateSeparator(msg.createdAt)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Message */}
                                    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'} mb-1`}>
                                        <div
                                            onClick={() => {
                                                if (isMine && !msg.deleted) {
                                                    setSelectedMessage(msg);
                                                    setShowMenu(true);
                                                }
                                            }}
                                            className={`max-w-[80%] px-4 py-2 relative group cursor-pointer ${msg.deleted
                                                ? 'bg-gray-700/30 text-gray-500 italic rounded-2xl'
                                                : isMine
                                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                                                    : 'bg-gray-700/80 text-white rounded-2xl rounded-bl-sm'
                                                }`}
                                        >
                                            {/* Reply Preview */}
                                            {msg.replyToContent && !msg.deleted && (
                                                <div className={`text-xs mb-1 pb-1 border-b ${isMine ? 'border-indigo-400/50 text-indigo-200' : 'border-gray-600 text-gray-400'}`}>
                                                    <span className="font-bold">{msg.replyToSender}</span>
                                                    <p className="opacity-75 truncate">{msg.replyToContent}</p>
                                                </div>
                                            )}

                                            {/* Image */}
                                            {msg.imageUrl && !msg.deleted && (
                                                <img
                                                    src={msg.imageUrl}
                                                    alt="תמונה"
                                                    className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(msg.imageUrl, '_blank');
                                                    }}
                                                />
                                            )}

                                            {/* Audio Player */}
                                            {msg.audioUrl && !msg.deleted && (
                                                <div className="mb-2">
                                                    <div className="flex items-center gap-2 bg-gray-900/30 rounded-lg p-2">
                                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                                            <Mic size={16} className="text-white" />
                                                        </div>
                                                        <audio
                                                            controls
                                                            src={msg.audioUrl}
                                                            className="flex-1 h-8"
                                                            style={{ maxWidth: '200px' }}
                                                        />
                                                        {msg.audioDuration && (
                                                            <span className="text-xs text-gray-400">
                                                                {formatDuration(msg.audioDuration)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {msg.content !== '📷 תמונה' && (
                                                <p>{msg.content}</p>
                                            )}

                                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-indigo-200/70' : 'text-gray-500'}`}>
                                                <span className="text-[10px]">{formatMessageTime(msg.createdAt)}</span>
                                                {isMine && !msg.deleted && (
                                                    <span className="text-[10px]">✓✓</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Image Preview - inside card, larger and clearer */}
                    {previewImage && (
                        <div className="shrink-0 bg-indigo-900/30 border-t border-indigo-500/30 p-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-40 h-40 rounded-xl overflow-hidden border-2 border-indigo-500/50 cursor-pointer hover:border-indigo-400 transition-colors"
                                    onClick={() => window.open(previewImage || '', '_blank')}
                                >
                                    <img
                                        src={previewImage || ''}
                                        alt="תצוגה מקדימה"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold mb-1">תמונה מוכנה לשליחה</p>
                                    <p className="text-gray-400 text-xs truncate mb-2">{selectedFile?.name}</p>
                                    <p className="text-gray-500 text-xs">
                                        {selectedFile && `${(selectedFile.size / 1024).toFixed(0)} KB`}
                                    </p>
                                    <p className="text-indigo-400 text-xs mt-2">לחץ על התמונה להגדלה</p>
                                </div>
                                <button
                                    onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
                                    className="text-gray-400 hover:text-white p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Audio Preview - inside card */}
                    {audioBlob && (
                        <div className="shrink-0 bg-purple-900/30 border-t border-purple-500/30 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                                    <Mic size={24} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-bold mb-1">הקלטה קולית מוכנה</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-8 bg-gray-700/50 rounded-lg flex items-center px-2">
                                            {/* Waveform visualization */}
                                            {[...Array(20)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 bg-purple-400 mx-0.5 rounded-full"
                                                    style={{
                                                        height: `${Math.random() * 60 + 40}%`,
                                                        opacity: 0.6
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-gray-400 text-xs font-mono">
                                            {formatDuration(recordingDuration)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setAudioBlob(null); setRecordingDuration(0); }}
                                    className="text-gray-400 hover:text-white p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reply Preview - inside card */}
                    {replyingTo && (
                        <div className="shrink-0 bg-indigo-900/20 border-t border-indigo-500/30 px-4 py-2 flex items-center gap-3">
                            <div className="flex-1 border-r-2 border-indigo-500 pr-3">
                                <p className="text-xs text-indigo-400 font-bold">{replyingTo.senderName}</p>
                                <p className="text-sm text-gray-300 truncate">{replyingTo.content}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    {/* Message Input - inside card */}
                    <div className="shrink-0 bg-gray-800/80 border-t border-gray-700/50 p-3">
                        {/* Recording indicator */}
                        {isRecording && (
                            <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-red-900/30 rounded-lg">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-red-400 text-sm font-bold">מקליט...</span>
                                <span className="text-gray-400 text-sm font-mono ml-auto">
                                    {formatDuration(recordingDuration)}
                                </span>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-400 transition-colors"
                                disabled={isRecording}
                            >
                                <ImageIcon size={20} />
                            </button>

                            {/* Mic button */}
                            <button
                                type="button"
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`w-10 h-10 flex items-center justify-center transition-colors ${isRecording
                                    ? 'text-red-400 bg-red-900/30 hover:bg-red-900/50'
                                    : 'text-gray-400 hover:text-purple-400'
                                    }`}
                                title={isRecording ? 'עצור הקלטה' : 'הקלטה קולית'}
                            >
                                {isRecording ? <Square size={20} className="fill-current" /> : <Mic size={20} />}
                            </button>
                            <input
                                type="text"
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="כתוב הודעה..."
                                className="flex-1 bg-gray-700/50 border border-gray-600 rounded-full px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white placeholder-gray-500 transition-all"
                                disabled={sending}
                            />
                            <button
                                type="submit"
                                disabled={(!newMessage.trim() && !selectedFile && !audioBlob) || sending}
                                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-all"
                            >
                                {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Context Menu - Modal */}
            {showMenu && selectedMessage && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowMenu(false)}>
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden min-w-[200px]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => handleReply(selectedMessage!)}
                            className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-gray-700 transition-colors"
                        >
                            <Reply size={18} />
                            השב
                        </button>
                        <button
                            onClick={() => handleDeleteMessage(selectedMessage!.id)}
                            className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-gray-700 transition-colors border-t border-gray-700"
                        >
                            <Trash2 size={18} />
                            מחק
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}



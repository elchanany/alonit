'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Send, Trash2, Reply, X, Image as ImageIcon, BellOff, Bell, Loader2, Mic, Square, Play, Pause, Smile, Check, CheckCheck, MoreVertical, Ban, Flag } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/context/ToastContext';
import AudioPlayer from '@/components/chat/AudioPlayer';
import { EmojiStickerPicker } from '@/components/ui/EmojiStickerPicker';

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
    readBy?: string[]; // Array of user IDs who read this message
}

interface Conversation {
    id: string;
    participants: string[];
    participantNames: { [key: string]: string };
    participantPhotos?: { [key: string]: string };
    mutedBy?: string[];
    blockedBy?: string[];  // Users who blocked this conversation
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.id as string;
    const { user, isVerified } = useAuth();
    const { showToast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showMediaOptions, setShowMediaOptions] = useState(false); // Toggle for camera/gallery menu
    const [isMuted, setIsMuted] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageCaption, setImageCaption] = useState('');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Upload disclaimer and error state
    const [showUploadDisclaimer, setShowUploadDisclaimer] = useState(false);
    const [pendingUploadAction, setPendingUploadAction] = useState<(() => void) | null>(null);
    const [showServiceError, setShowServiceError] = useState(false);
    const [serviceErrorDetails, setServiceErrorDetails] = useState('');

    // Emoji picker state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Online status state
    const [otherUserStatus, setOtherUserStatus] = useState<'online' | Date | null>(null);

    // Block menu state
    const [showBlockMenu, setShowBlockMenu] = useState(false);

    // Scroll to bottom on new messages
    const scrollToBottom = () => {
        // Scroll to the end of messages container, ensuring last message is fully visible
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };

    // Scroll to bottom only when new messages arrive, not on page load
    const isFirstLoad = useRef(true);
    const prevMessageCount = useRef(0);

    useEffect(() => {
        // Only scroll if message count changed (new message added)
        if (messages.length !== prevMessageCount.current) {
            if (isFirstLoad.current) {
                isFirstLoad.current = false;
                // On first load, scroll without animation
                messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
            } else {
                scrollToBottom();
            }
            prevMessageCount.current = messages.length;
        }
    }, [messages.length]); // Only depend on length, not entire messages array

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

    // Update current user's lastSeen timestamp every 30 seconds (real-time presence)
    useEffect(() => {
        if (!user) return;

        const updateLastSeen = () => {
            setDoc(doc(db, 'users', user.uid), {
                lastSeen: serverTimestamp()
            }, { merge: true }).catch(err => console.error('Error updating lastSeen:', err));
        };

        // Update immediately
        updateLastSeen();

        // Then update every 5 seconds
        const interval = setInterval(updateLastSeen, 5000);

        return () => clearInterval(interval);
    }, [user]);

    // Subscribe to other user's online status
    useEffect(() => {
        if (!conversation) return;
        const otherId = conversation.participants.find(p => p !== user?.uid);
        if (!otherId) return;

        const unsubscribe = onSnapshot(doc(db, 'users', otherId), (docSnap) => {
            const data = docSnap.data();
            const lastSeen = data?.lastSeen?.toDate();
            if (lastSeen && Date.now() - lastSeen.getTime() < 2 * 60 * 1000) {
                setOtherUserStatus('online');
            } else {
                setOtherUserStatus(lastSeen || null);
            }
        });

        return () => unsubscribe();
    }, [conversation, user]);

    // Mark messages as read when chat is opened
    useEffect(() => {
        if (!user || messages.length === 0) return;

        // Find unread messages from other users
        const unreadMessages = messages.filter(
            msg => msg.senderId !== user.uid && !msg.readBy?.includes(user.uid)
        );

        // Mark them as read
        unreadMessages.forEach(msg => {
            updateDoc(doc(db, 'conversations', conversationId, 'messages', msg.id), {
                readBy: arrayUnion(user.uid)
            }).catch(err => console.error('Error marking message as read:', err));
        });
    }, [messages, user, conversationId]);

    // Auto-send audio when recording stops
    useEffect(() => {
        if (audioBlob && !sending && user) {
            // Check if recording is too short (less than 1 second)
            if (recordingDuration < 1) {
                showToast('ההקלטה קצרה מדי, נסה שוב', 'info');
                setAudioBlob(null);
                setRecordingDuration(0);
                return;
            }

            // Trigger send automatically
            const autoSendAudio = async () => {
                setSending(true);
                try {
                    const audioUrl = await uploadAudio(audioBlob);
                    const messageData: any = {
                        senderId: user.uid,
                        senderName: user.displayName || 'משתמש',
                        content: '🎙️ הקלטה קולית',
                        audioUrl,
                        audioDuration: recordingDuration,
                        createdAt: serverTimestamp()
                    };
                    await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
                    await updateDoc(doc(db, 'conversations', conversationId), {
                        lastMessage: '🎙️ הקלטה קולית',
                        lastMessageTime: serverTimestamp()
                    });
                    setAudioBlob(null);
                    setRecordingDuration(0);
                } catch (error) {
                    console.error('Error sending audio:', error);
                    showToast('שגיאה בשליחת ההקלטה', 'error');
                } finally {
                    setSending(false);
                }
            };
            autoSendAudio();
        }
    }, [audioBlob]);

    // Check if user has accepted upload disclaimer
    const hasAcceptedDisclaimer = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('uploadDisclaimerAccepted') === 'true';
        }
        return false;
    };

    const acceptDisclaimer = () => {
        localStorage.setItem('uploadDisclaimerAccepted', 'true');
        setShowUploadDisclaimer(false);
        if (pendingUploadAction) {
            pendingUploadAction();
            setPendingUploadAction(null);
        }
    };

    // Handle service errors and allow reporting
    const handleServiceError = (error: string) => {
        setServiceErrorDetails(error);
        setShowServiceError(true);
    };

    const reportServiceIssue = async () => {
        try {
            await addDoc(collection(db, 'reports'), {
                type: 'SERVICE_ERROR',
                service: 'Catbox (file hosting)',
                error: serviceErrorDetails,
                reporterId: user?.uid,
                reporterName: user?.displayName,
                createdAt: serverTimestamp()
            });
            showToast('הדיווח נשלח, תודה!', 'success');
            setShowServiceError(false);
        } catch (e) {
            showToast('שגיאה בשליחת הדיווח', 'error');
        }
    };

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
        console.log('🖼️ Starting image upload...', file.name, file.size);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');

            console.log('📤 Sending to /api/upload...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            console.log('📥 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!data.success) {
                console.error('❌ Upload failed:', data.error);
                if (data.serviceError) {
                    handleServiceError(data.error || 'שגיאה בשירות האחסון');
                }
                throw new Error(data.error || 'Upload failed');
            }

            console.log('✅ Image uploaded successfully:', data.url);
            return data.url;
        } catch (error: any) {
            console.error('💥 Upload error:', error);
            if (!showServiceError) {
                handleServiceError(error.message || 'שגיאה לא ידועה');
            }
            throw error;
        }
    };

    // Voice recording functions
    const startRecording = async () => {
        // Check disclaimer first
        if (!hasAcceptedDisclaimer()) {
            setPendingUploadAction(() => startRecording);
            setShowUploadDisclaimer(true);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: Blob[] = [];

            // Set up audio analyzer for visualization
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Animate audio level
            const updateAudioLevel = () => {
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setAudioLevel(average / 255);
                }
                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };
            updateAudioLevel();

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
                // Clean up audio analyzer
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                }
                setAudioLevel(0);
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
        console.log('🎙️ Starting audio upload...', blob.size, 'bytes');
        try {
            const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'audio');

            console.log('📤 Sending audio to /api/upload...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            console.log('📥 Audio response status:', response.status);
            const data = await response.json();
            console.log('📦 Audio response data:', data);

            if (!data.success) {
                console.error('❌ Audio upload failed:', data.error);
                throw new Error(data.error || 'Upload failed');
            }

            console.log('✅ Audio uploaded successfully:', data.url);
            return data.url;
        } catch (error) {
            console.error('💥 Audio upload error:', error);
            throw error;
        }
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

        // Save message content before clearing
        const messageText = newMessage.trim() || imageCaption.trim();
        const fileToUpload = selectedFile;
        const audioToUpload = audioBlob;
        const replyData = replyingTo;
        const captionText = imageCaption.trim();

        setNewMessage('');
        setShowEmojiPicker(false); // Close emoji picker on send
        setShowMediaOptions(false); // Close media menu if open
        setSelectedFile(null);
        setPreviewImage(null);
        setImageCaption('');
        setAudioBlob(null);
        setRecordingDuration(0);
        setReplyingTo(null);

        setSending(true);
        try {
            let imageUrl: string | undefined;
            let audioUrl: string | undefined;

            if (fileToUpload) {
                setUploadingImage(true);
                imageUrl = await uploadImage(fileToUpload);
                setUploadingImage(false);
            }

            if (audioToUpload) {
                audioUrl = await uploadAudio(audioToUpload);
            }

            const messageData: any = {
                senderId: user.uid,
                senderName: user.displayName || 'משתמש',
                content: messageText || (imageUrl ? '📷 תמונה' : audioUrl ? '🎙️ הקלטה קולית' : ''),
                createdAt: serverTimestamp()
            };

            if (imageUrl) {
                messageData.imageUrl = imageUrl;
            }

            if (audioUrl) {
                messageData.audioUrl = audioUrl;
                messageData.audioDuration = recordingDuration;
            }

            if (replyData) {
                messageData.replyToId = replyData.id;
                messageData.replyToContent = replyData.content.substring(0, 50) + (replyData.content.length > 50 ? '...' : '');
                messageData.replyToSender = replyData.senderName;
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
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('שגיאה בשליחת ההודעה', 'error');
            // Restore message on error
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
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
        // Focus input after selecting reply
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
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

    // Block handler
    const handleBlock = async () => {
        if (!user || !conversation) return;
        setShowBlockMenu(false);

        try {
            await updateDoc(doc(db, 'conversations', conversationId), {
                blockedBy: arrayUnion(user.uid)
            });
            showToast('המשתמש נחסם', 'success');
        } catch (error) {
            showToast('שגיאה בחסימת המשתמש', 'error');
        }
    };

    // Unblock handler
    const handleUnblock = async () => {
        if (!user || !conversation) return;

        try {
            await updateDoc(doc(db, 'conversations', conversationId), {
                blockedBy: arrayRemove(user.uid)
            });
            showToast('החסימה בוטלה', 'success');
        } catch (error) {
            showToast('שגיאה בביטול החסימה', 'error');
        }
    };

    // Report handler
    const handleReport = async () => {
        setShowBlockMenu(false);
        // TODO: Implement report functionality - save to reports collection
        showToast('הדיווח נשלח, תודה!', 'success');
    };

    // Check if current user blocked the other participant
    const isBlockedByMe = conversation?.blockedBy?.includes(user?.uid || '');

    // Emoji handler - insert emoji at cursor position
    const handleEmojiSelect = (emoji: string) => {
        if (inputRef.current) {
            const start = inputRef.current.selectionStart || 0;
            const end = inputRef.current.selectionEnd || 0;
            const newValue = newMessage.slice(0, start) + emoji + newMessage.slice(end);
            setNewMessage(newValue);
            // Set cursor after emoji
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.selectionStart = start + emoji.length;
                    inputRef.current.selectionEnd = start + emoji.length;
                    inputRef.current.focus();
                }
            }, 0);
        } else {
            setNewMessage(prev => prev + emoji);
        }
    };

    // Sticker handler - send as image message (for future use)
    const handleStickerSelect = async (stickerUrl: string) => {
        if (!user || sending) return;
        setShowEmojiPicker(false);
        setSending(true);
        try {
            const messageData = {
                senderId: user.uid,
                senderName: user.displayName || 'משתמש',
                content: '🎨 סטיקר',
                imageUrl: stickerUrl,
                createdAt: serverTimestamp()
            };
            await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
            await updateDoc(doc(db, 'conversations', conversationId), {
                lastMessage: '🎨 סטיקר',
                lastMessageTime: serverTimestamp()
            });
        } catch (error) {
            showToast('שגיאה בשליחת הסטיקר', 'error');
        } finally {
            setSending(false);
        }
    };

    // Show skeleton while loading auth or data
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
                <div className="max-w-2xl mx-auto h-screen bg-gray-800/40 flex flex-col">
                    {/* Header skeleton */}
                    <div className="p-4 border-b border-gray-700/50 flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse" />
                        <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse" />
                        <div className="h-5 bg-gray-700 rounded w-24 animate-pulse" />
                    </div>
                    {/* Messages skeleton */}
                    <div className="flex-1 p-4 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                <div className={`w-48 h-10 bg-gray-700 rounded-2xl animate-pulse`} />
                            </div>
                        ))}
                    </div>
                    {/* Input skeleton */}
                    <div className="p-3 border-t border-gray-700/50">
                        <div className="h-10 bg-gray-700 rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                <p className="text-gray-400">יש להתחבר כדי לצפות בצ'אט</p>
            </div>
        );
    }

    const otherParticipantName = conversation
        ? Object.entries(conversation.participantNames).find(([id]) => id !== user?.uid)?.[1] || 'משתמש'
        : 'משתמש';

    const otherParticipantId = conversation?.participants.find(p => p !== user?.uid);

    // Check if current user is blocked by the other participant (must be after otherParticipantId)
    const amIBlocked = conversation?.blockedBy?.includes(otherParticipantId || '');

    return (
        <div className="fixed inset-0 top-14 md:top-16 bottom-16 md:bottom-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4 z-0">
            <div className="w-full max-w-md h-full max-h-[85vh] md:max-h-[85vh] flex flex-col">
                {/* Chat Card - matches site dark cards, narrower like TikTok */}
                <div className="flex flex-col h-full bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden shadow-2xl">
                    {/* Header - inside the card */}
                    <div className="shrink-0 bg-gray-800/80 border-b border-gray-700/50 px-4 py-3 flex items-center gap-3">
                        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
                            <ArrowRight size={24} />
                        </button>
                        {/* Profile with glowing ring */}
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-full p-[2px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 ${otherUserStatus === 'online' && !amIBlocked ? 'animate-pulse' : ''}`}>
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {otherParticipantName[0]}
                                </div>
                            </div>
                            {/* Online indicator dot - only show when online and not blocked */}
                            {otherUserStatus === 'online' && !amIBlocked && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h1 className="font-bold text-white">{otherParticipantName}</h1>
                            {/* If blocked by other user - hide real status */}
                            {amIBlocked ? (
                                <p className="text-xs text-gray-500">נראה לפני זמן רב</p>
                            ) : otherUserStatus === 'online' ? (
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                                    מחובר
                                </p>
                            ) : otherUserStatus instanceof Date ? (
                                <p className="text-xs text-gray-400">
                                    נראה לאחרונה {formatDistanceToNow(otherUserStatus, { addSuffix: false, locale: he })}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500">לא מחובר</p>
                            )}
                        </div>

                        {/* Mute button */}
                        <button
                            onClick={handleToggleMute}
                            className={`p-2 rounded-full transition-colors ${isMuted
                                ? 'text-orange-400 bg-orange-900/30'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                            title={isMuted ? 'הפעל התראות' : 'השתק שיחה'}
                        >
                            {isMuted ? <BellOff size={18} className="line-through" /> : <Bell size={18} />}
                        </button>

                        {/* Three-dot menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowBlockMenu(!showBlockMenu)}
                                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                            >
                                <MoreVertical size={18} />
                            </button>

                            {/* Dropdown menu */}
                            {showBlockMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowBlockMenu(false)} />
                                    <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                                        {isBlockedByMe ? (
                                            <button
                                                onClick={handleUnblock}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-400 hover:bg-gray-700/50 transition-colors"
                                            >
                                                <Ban size={16} />
                                                בטל חסימה
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleBlock}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-700/50 transition-colors"
                                            >
                                                <Ban size={16} />
                                                חסום
                                            </button>
                                        )}
                                        <button
                                            onClick={handleReport}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-orange-400 hover:bg-gray-700/50 transition-colors border-t border-gray-700"
                                        >
                                            <Flag size={16} />
                                            דווח
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Block banner */}
                    {isBlockedByMe && (
                        <div className="shrink-0 bg-red-900/30 border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
                            <p className="text-sm text-red-300">🚫 חסמת את המשתמש הזה</p>
                            <button
                                onClick={handleUnblock}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                                בטל חסימה
                            </button>
                        </div>
                    )}

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
                                            onDoubleClick={() => {
                                                if (!msg.deleted) {
                                                    setReplyingTo(msg);
                                                    inputRef.current?.focus();
                                                }
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                if (!msg.deleted) {
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
                                            {/* Reply Preview - Improved styling */}
                                            {msg.replyToContent && !msg.deleted && (
                                                <div className={`text-xs mb-2 p-2 rounded-lg border-r-4 ${isMine ? 'bg-indigo-700/40 border-purple-400 text-indigo-100' : 'bg-gray-600/40 border-cyan-400 text-gray-200'}`}>
                                                    <span className="font-bold text-purple-300">↩️ {msg.replyToSender}</span>
                                                    <p className="opacity-90 truncate mt-0.5">{msg.replyToContent}</p>
                                                </div>
                                            )}

                                            {/* Image - click opens lightbox */}
                                            {msg.imageUrl && !msg.deleted && (
                                                <img
                                                    src={msg.imageUrl}
                                                    alt="תמונה"
                                                    className="max-w-full max-h-64 rounded-lg mb-2 cursor-zoom-in hover:opacity-90 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLightboxImage(msg.imageUrl!);
                                                    }}
                                                />
                                            )}

                                            {/* Audio Player */}
                                            {msg.audioUrl && !msg.deleted && (
                                                <AudioPlayer
                                                    src={msg.audioUrl}
                                                    duration={msg.audioDuration}
                                                    isMine={isMine}
                                                />
                                            )}

                                            {msg.content !== '📷 תמונה' && (
                                                <p className={/^[^a-zA-Z0-9\u0590-\u05FF]{1,8}$/.test(msg.content) ? 'text-5xl py-2' : ''}>
                                                    {msg.content}
                                                </p>
                                            )}

                                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-indigo-200/70' : 'text-gray-500'}`}>
                                                <span className="text-[10px]">{formatMessageTime(msg.createdAt)}</span>
                                                {/* Read receipt checkmarks - only for sender's messages */}
                                                {isMine && (
                                                    msg.readBy?.includes(otherParticipantId || '')
                                                        ? <CheckCheck size={14} className="text-blue-400" />
                                                        : <Check size={14} className="text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Image Preview with Caption */}
                    {previewImage && (
                        <div className="shrink-0 bg-indigo-900/30 border-t border-indigo-500/30 p-3">
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-16 h-16 rounded-lg overflow-hidden border-2 border-indigo-500/50 cursor-zoom-in hover:border-indigo-400 transition-colors flex-shrink-0"
                                    onClick={() => setLightboxImage(previewImage)}
                                >
                                    <img
                                        src={previewImage}
                                        alt="תצוגה מקדימה"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="text"
                                        value={imageCaption}
                                        onChange={(e) => setImageCaption(e.target.value)}
                                        placeholder="הוסף כיתוב לתמונה..."
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                    />
                                    <p className="text-gray-500 text-xs mt-1">
                                        {selectedFile && `${(selectedFile.size / 1024).toFixed(0)} KB • לחץ להגדלה`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setPreviewImage(null); setSelectedFile(null); setImageCaption(''); }}
                                    className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Audio Sending Indicator */}
                    {audioBlob && sending && (
                        <div className="shrink-0 bg-purple-900/30 border-t border-purple-500/30 p-3">
                            <div className="flex items-center gap-3">
                                <Loader2 size={20} className="text-purple-400 animate-spin" />
                                <span className="text-purple-300 text-sm font-bold">שולח הקלטה...</span>
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
                        {/* Recording indicator with live audio visualization */}
                        {isRecording && (
                            <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-red-900/30 rounded-xl">
                                <div
                                    className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center transition-transform duration-75"
                                    style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
                                >
                                    <Mic size={18} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-1 h-6">
                                        {[...Array(16)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-red-400 rounded-full transition-all duration-75"
                                                style={{
                                                    height: `${Math.min(100, (audioLevel * 300) + Math.random() * 20 + 10)}%`,
                                                    opacity: 0.5 + audioLevel * 0.5 + Math.random() * 0.2
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-red-400 text-sm font-mono font-bold">
                                    {formatDuration(recordingDuration)}
                                </span>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="flex gap-1 items-end relative bg-gray-900/50 p-1 rounded-3xl border border-gray-800 backdrop-blur-sm">

                            {/* Hidden Inputs */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <input
                                type="file"
                                ref={cameraInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                            />

                            {/* Media Selection Bottom Sheet (Overlay) */}
                            {showMediaOptions && (
                                <div
                                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200"
                                    onClick={() => setShowMediaOptions(false)}
                                >
                                    <div
                                        className="w-full sm:w-96 bg-gray-900 border-t sm:border border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-bottom-10 duration-200 shadow-2xl pb-10 sm:p-6"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto sm:hidden opacity-50" />

                                        <h3 className="text-center text-gray-400 text-sm font-medium">בחר מדיה לשליחה</h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Camera - HIDDEN ON DESKTOP */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowMediaOptions(false);
                                                    if (cameraInputRef.current) cameraInputRef.current.click();
                                                }}
                                                className="md:hidden flex flex-col items-center justify-center gap-3 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 active:scale-95 transition-all group"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <span className="text-3xl">📸</span>
                                                </div>
                                                <span className="text-sm">מצלמה</span>
                                            </button>

                                            {/* Gallery */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowMediaOptions(false);
                                                    fileInputRef.current?.click();
                                                }}
                                                className="col-span-1 md:col-span-2 flex flex-col items-center justify-center gap-3 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 active:scale-95 transition-all group"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <span className="text-3xl">🖼️</span>
                                                </div>
                                                <span className="text-sm">גלריה</span>
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowMediaOptions(false)}
                                            className="mt-2 py-3 w-full bg-gray-800 rounded-xl text-gray-400 font-medium hover:bg-gray-700 transition-colors"
                                        >
                                            ביטול
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Media Button (Restored) */}
                            <button
                                type="button"
                                onClick={() => setShowMediaOptions(!showMediaOptions)}
                                className={`w-10 h-10 mb-1 flex items-center justify-center transition-colors active:scale-95 rounded-full flex-shrink-0 ${showMediaOptions
                                    ? 'text-indigo-400 bg-indigo-500/20'
                                    : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                                    }`}
                                disabled={isRecording}
                            >
                                <ImageIcon size={20} />
                            </button>

                            {/* Emoji button */}
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`w-10 h-10 mb-1 flex items-center justify-center transition-colors active:scale-95 rounded-full flex-shrink-0 ${showEmojiPicker
                                    ? 'text-yellow-400 bg-yellow-500/20'
                                    : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                                    }`}
                                disabled={isRecording}
                            >
                                <Smile size={20} />
                            </button>

                            {/* Auto-expanding Textarea */}
                            <div className="flex-1 min-w-0 py-2 relative">
                                <textarea
                                    ref={(el) => {
                                        // @ts-ignore
                                        inputRef.current = el;
                                        if (el) {
                                            el.style.height = 'auto';
                                            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                                        }
                                    }}
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            // Handle manual form submission
                                            const event = new Event('submit', { cancelable: true }) as unknown as React.FormEvent;
                                            handleSendMessage(event);
                                        }
                                    }}
                                    onClick={() => {
                                        window.scrollTo(0, document.body.scrollHeight);
                                    }}
                                    placeholder={isRecording ? "מקליט..." : "הודעה..."}
                                    className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none overflow-y-auto leading-relaxed scrollbar-hide align-middle"
                                    disabled={isRecording}
                                    rows={1}
                                    dir="auto"
                                    style={{ maxHeight: '120px' }}
                                />
                            </div>

                            {/* Mic / Send Button */}
                            <button
                                type={newMessage.trim() || selectedFile ? 'submit' : 'button'}
                                onClick={(e) => {
                                    if (!(newMessage.trim() || selectedFile)) {
                                        if (isRecording) stopRecording();
                                        else startRecording();
                                    }
                                }}
                                onTouchStart={(e) => {
                                    if (!(newMessage.trim() || selectedFile)) {
                                        e.preventDefault();
                                        if (!isRecording) startRecording();
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    if (!(newMessage.trim() || selectedFile)) {
                                        e.preventDefault();
                                        if (isRecording) stopRecording();
                                    }
                                }}
                                className={`w-10 h-10 mb-1 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                    : (newMessage.trim() || selectedFile ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white')
                                    }`}
                                disabled={sending}
                            >
                                {newMessage.trim() || selectedFile ? (
                                    (sending || uploadingImage) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />
                                ) : (
                                    isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <Mic size={20} />
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Emoji/Sticker Keyboard */}
                    {showEmojiPicker && (
                        <div className="shrink-0 z-10 w-full animate-in slide-in-from-bottom-5 duration-200 bg-gray-900 border-t border-gray-800">
                            <EmojiStickerPicker
                                isOpen={true}
                                onClose={() => setShowEmojiPicker(false)}
                                onEmojiSelect={handleEmojiSelect}
                                onStickerSelect={handleStickerSelect}
                            />
                        </div>
                    )}
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

            {/* Lightbox for viewing images - Blur background & Full size */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors z-50 shadow-lg"
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="תמונה מוגדלת"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Upload Disclaimer Modal */}
            {showUploadDisclaimer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">📤</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">לפני שמעלים קובץ</h3>
                        </div>
                        <div className="text-gray-300 text-sm space-y-3 mb-6">
                            <p>✅ הקבצים שלך נשמרים ומוצגים רק בשיחה הזו</p>
                            <p>✅ רק מי שמשתתף בשיחה יכול לראות אותם</p>
                            <p className="text-gray-400 text-xs pt-2 border-t border-gray-700">
                                💡 <strong>טיפ:</strong> מומלץ לא לשתף מידע רגיש במיוחד (כמו סיסמאות או מסמכים אישיים) - כמו בכל שירות הודעות.
                            </p>
                            <p className="text-gray-500 text-xs">
                                השירות חינמי ולכן ייתכנו תקלות זמניות. התמונות וההקלטות עשויות להימחק לאחר זמן מה.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUploadDisclaimer(false)}
                                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={acceptDisclaimer}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                הבנתי, המשך
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Error Modal with Report Button */}
            {showServiceError && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl border border-red-500/50 p-6 max-w-md w-full">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">❌</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">שגיאה בהעלאת הקובץ</h3>
                        </div>
                        <div className="text-gray-300 text-sm space-y-3 mb-6">
                            <p>נראה שיש בעיה עם שירות האחסון החיצוני.</p>
                            <p className="text-red-400 bg-red-900/20 p-2 rounded-lg text-xs font-mono">
                                {serviceErrorDetails}
                            </p>
                            <p className="text-gray-400 text-xs">
                                אם הבעיה חוזרת, אנא דווח לנו כדי שנוכל לבדוק.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowServiceError(false)}
                                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                סגור
                            </button>
                            <button
                                onClick={reportServiceIssue}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                            >
                                דווח על הבעיה
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



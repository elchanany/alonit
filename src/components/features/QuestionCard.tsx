'use client';

import Link from 'next/link';
import { MessageCircle, Heart, Share2, Flag, Reply, Trash2, ThumbsDown, Send, Edit2, MoreVertical, X, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { doc, updateDoc, increment, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getUserProfile } from '@/services/user-level.service';
import { UserProfile, UserRole, UserLevel, LEVEL_PERMISSIONS } from '@/types/user-levels';
import { logDeleteQuestion, logDeleteAnswer, logEditQuestion, logEditAnswer, logBlockUser } from '@/services/admin-actions.service';

interface QuestionCardProps {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorPhoto?: string | null;
    authorId?: string;
    flowerCount: number;
    answerCount: number;
    viewCount: number;
    timeAgo: string;
    createdAt?: any;
    category?: string;
    trustLevel?: string;
    onDelete?: () => void;
}

interface Answer {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    flowerCount: number;
    dislikeCount?: number;
    replyTo?: { authorName: string; content: string };
    createdAt: any;
}

export function QuestionCard({
    id,
    title,
    content,
    authorName,
    authorPhoto,
    authorId,
    flowerCount,
    answerCount,
    viewCount,
    timeAgo,
    createdAt,
    category,
    trustLevel,
    onDelete
}: QuestionCardProps) {
    const { user, userProfile: currentUserProfile } = useAuth();
    const { showToast } = useToast();

    const [liked, setLiked] = useState(false);
    const [disliked, setDisliked] = useState(false);
    const [localFlowerCount, setLocalFlowerCount] = useState(flowerCount);
    const [localDislikeCount, setLocalDislikeCount] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [newAnswer, setNewAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showLikePrompt, setShowLikePrompt] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Answer | null>(null);
    const [likedAnswers, setLikedAnswers] = useState<Set<string>>(new Set());
    const [dislikedAnswers, setDislikedAnswers] = useState<Set<string>>(new Set());

    // Admin State
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminAction, setAdminAction] = useState<{ type: 'DELETE_QUESTION' | 'DELETE_ANSWER' | 'BLOCK_USER' | 'EDIT_QUESTION' | 'EDIT_ANSWER'; targetId: string; targetName?: string; targetData?: any } | null>(null);

    // Permission Logic
    const levelPermissions = currentUserProfile ? LEVEL_PERMISSIONS[currentUserProfile.level] : null;

    // Admin = has Role OR has specific Level permissions (Oak)
    const isAdmin =
        currentUserProfile?.role === UserRole.ADMIN ||
        currentUserProfile?.role === UserRole.SUPER_ADMIN ||
        currentUserProfile?.role === UserRole.MODERATOR ||
        levelPermissions?.canModerateContent ||
        levelPermissions?.canDeletePosts;

    const isSuperAdmin = currentUserProfile?.role === UserRole.SUPER_ADMIN;

    useEffect(() => {
        const fetchAnswers = async () => {
            try {
                const answersRef = collection(db, 'questions', id, 'answers');
                const q = query(answersRef, orderBy('createdAt', 'desc'), limit(10));
                const snapshot = await getDocs(q);
                const loadedAnswers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Answer[];
                setAnswers(loadedAnswers);
            } catch (err) {
                console.error("Error fetching answers", err);
            }
        };
        fetchAnswers();
    }, [id]);

    const handleFlower = async () => {
        if (!user) {
            setShowLikePrompt(true);
            return;
        }

        // Toggle: If already liked, remove like
        if (liked) {
            setLiked(false);
            setLocalFlowerCount(prev => Math.max(0, prev - 1));
            try {
                const docRef = doc(db, 'questions', id);
                await updateDoc(docRef, { flowerCount: increment(-1) });
            } catch (error) {
                console.error("Error removing flower:", error);
                setLiked(true);
                setLocalFlowerCount(prev => prev + 1);
            }
            return;
        }

        // If was disliked, remove dislike first
        if (disliked) {
            setDisliked(false);
            setLocalDislikeCount(prev => Math.max(0, prev - 1));
        }

        // Add like
        setLiked(true);
        setLocalFlowerCount(prev => prev + 1);

        try {
            const docRef = doc(db, 'questions', id);
            await updateDoc(docRef, { flowerCount: increment(1) });
        } catch (error) {
            console.error("Error giving flower:", error);
            setLiked(false);
            setLocalFlowerCount(prev => prev - 1);
        }
    };

    const handleDislike = async () => {
        if (!user) {
            setShowLikePrompt(true);
            return;
        }

        // Toggle: If already disliked, remove dislike
        if (disliked) {
            setDisliked(false);
            setLocalDislikeCount(prev => Math.max(0, prev - 1));
            return;
        }

        // If was liked, remove dislike first
        if (liked) {
            setLiked(false);
            setLocalFlowerCount(prev => Math.max(0, prev - 1));
            try {
                const docRef = doc(db, 'questions', id);
                await updateDoc(docRef, { flowerCount: increment(-1) });
            } catch (error) {
                console.error("Error removing flower:", error);
            }
        }

        // Add dislike
        setDisliked(true);
        setLocalDislikeCount(prev => prev + 1);
    };

    const handleShare = async () => {
        const shareUrl = window.location.origin + '/question/' + id;
        if (navigator.share) {
            try {
                await navigator.share({ title: title, text: content, url: shareUrl });
            } catch (err) { }
        } else {
            navigator.clipboard.writeText(shareUrl);
            showToast('הקישור הועתק', 'success');
        }
    };

    // Check if within time limit for delete (2 hours) or edit (24 hours)
    const getHoursSinceCreation = () => {
        if (!createdAt) return 999;
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return (Date.now() - created.getTime()) / (1000 * 60 * 60);
    };

    const isOwner = user?.uid === authorId;

    // Permission checks
    const canDeleteQuestion = (isOwner && getHoursSinceCreation() <= 2) || (levelPermissions?.canDeletePosts ?? false) || isAdmin;
    const canEditQuestion = (isOwner && getHoursSinceCreation() <= 24) || (levelPermissions?.canEditAnyPost ?? false) || isAdmin;

    const executeDeleteQuestion = async (reason?: string) => {
        try {
            // First, delete all answers
            const answersRef = collection(db, 'questions', id, 'answers');
            const answersSnapshot = await getDocs(answersRef);

            // Delete each answer
            const deletePromises = answersSnapshot.docs.map(answerDoc =>
                deleteDoc(doc(db, 'questions', id, 'answers', answerDoc.id))
            );
            await Promise.all(deletePromises);

            // Then delete the question itself
            await deleteDoc(doc(db, 'questions', id));

            // Log if admin
            if (isAdmin && user && currentUserProfile && reason) {
                await logDeleteQuestion(
                    { uid: user.uid, displayName: currentUserProfile.displayName, email: currentUserProfile.email },
                    { uid: authorId || 'unknown', displayName: authorName, email: 'unknown' }, // We don't have author email easily here without fetching, but that's okay for now
                    reason,
                    id,
                    title
                );
            }

            showToast('השאלה נמחקה', 'success');
            if (onDelete) onDelete();
        } catch (error) {
            console.error('Error deleting question:', error);
            showToast('שגיאה במחיקת השאלה', 'error');
        }
    };

    const handleDeleteQuestion = async () => {
        if (!user) return;

        if (isAdmin && !isOwner) {
            setAdminAction({ type: 'DELETE_QUESTION', targetId: id, targetName: authorName });
            setShowAdminModal(true);
            return;
        }

        if (!isOwner) {
            showToast('אין לך הרשאה למחוק', 'error');
            return;
        }

        if (getHoursSinceCreation() > 2 && !isAdmin) {
            showToast('ניתן למחוק שאלה רק עד שעתיים אחרי פרסום', 'error');
            return;
        }

        if (confirm('האם אתה בטוח שברצונך למחוק את השאלה?')) {
            executeDeleteQuestion();
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [editContent, setEditContent] = useState(content);

    // Answer editing state
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [editAnswerContent, setEditAnswerContent] = useState('');

    const executeEditAnswer = async (answerId: string, newContent: string, reason?: string) => {
        try {
            await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                content: newContent,
                editedAt: serverTimestamp()
            });

            // Find old answer content for logging (optional, could be passed in)
            const oldAnswer = answers.find(a => a.id === answerId);

            if (isAdmin && user && currentUserProfile && reason && oldAnswer) {
                await logEditAnswer(
                    { uid: user.uid, displayName: currentUserProfile.displayName, email: currentUserProfile.email },
                    { uid: oldAnswer.authorId, displayName: oldAnswer.authorName, email: 'unknown' },
                    reason,
                    answerId,
                    oldAnswer.content,
                    newContent
                );
            }

            setAnswers(prev => prev.map(a =>
                a.id === answerId ? { ...a, content: newContent } : a
            ));
            setEditingAnswerId(null);
            setEditAnswerContent('');
            showToast('התשובה עודכנה', 'success');
        } catch (error) {
            showToast('שגיאה בעריכת התשובה', 'error');
        }
    };

    const handleEditAnswer = async (answerId: string) => {
        if (!user) return;

        const answer = answers.find(a => a.id === answerId);
        if (!answer) return;

        const isAnswerOwner = user.uid === answer.authorId;

        // Admin logic
        if (isAdmin && !isAnswerOwner) {
            setAdminAction({
                type: 'EDIT_ANSWER',
                targetId: answerId,
                targetName: answer.authorName,
                targetData: { content: editAnswerContent } // passing the NEW content
            });
            setShowAdminModal(true);
            return;
        }

        // Standard user logic
        if (isAnswerOwner) {
            executeEditAnswer(answerId, editAnswerContent);
        }
    };

    const executeEditQuestion = async (reason?: string) => {
        try {
            await updateDoc(doc(db, 'questions', id), {
                title: editTitle,
                content: editContent,
                editedAt: serverTimestamp()
            });

            if (isAdmin && user && currentUserProfile && reason) {
                await logEditQuestion(
                    { uid: user.uid, displayName: currentUserProfile.displayName, email: currentUserProfile.email },
                    { uid: authorId || 'unknown', displayName: authorName, email: 'unknown' },
                    reason,
                    id,
                    title, // old title
                    editTitle // new title
                );
            }

            showToast('השאלה עודכנה', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast('שגיאה בעריכת השאלה', 'error');
        }
    };

    const handleEditQuestion = async () => {
        if (!user) return;

        if (!canEditQuestion) {
            showToast('אין לך הרשאה לערוך', 'error');
            return;
        }

        const timeLimitExceeded = getHoursSinceCreation() > 24;

        // Admin override logic: If admin is editing someone else's post OR time limit exceeded
        if (isAdmin && (!isOwner || timeLimitExceeded)) {
            setAdminAction({
                type: 'EDIT_QUESTION',
                targetId: id,
                targetName: authorName,
                targetData: { oldTitle: title, newTitle: editTitle }
            });
            setShowAdminModal(true);
            return;
        }

        if (timeLimitExceeded && !isAdmin) {
            showToast('ניתן לערוך שאלה רק עד 24 שעות אחרי פרסום', 'error');
            return;
        }

        executeEditQuestion();
    };

    const fetchAllAnswers = async () => {
        try {
            const answersRef = collection(db, 'questions', id, 'answers');
            const q = query(answersRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const loadedAnswers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Answer[];
            setAnswers(loadedAnswers);
        } catch (err) {
            console.error("Error fetching all answers", err);
        }
    };

    const getRankBadge = (rank?: string) => {
        switch (rank) {
            case 'ALON': return <span className="text-xs bg-amber-700 text-white px-2 py-0.5 rounded-full">🌳 אלון</span>;
            case 'GEZA': return <span className="text-xs bg-amber-600/80 text-white px-2 py-0.5 rounded-full">🪵 גזע</span>;
            default: return <span className="text-xs bg-green-500/80 text-white px-2 py-0.5 rounded-full">🌱 שתיל</span>;
        }
    };

    const toggleExpanded = () => {
        setExpanded(!expanded);
        if (!expanded && answers.length < answerCount) {
            fetchAllAnswers();
        }
    };

    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            showToast('עליך להתחבר כדי לענות', 'error');
            return;
        }
        if (!newAnswer.trim()) return;

        setSubmitting(true);
        try {
            const answerData: any = {
                content: newAnswer.trim(),
                authorId: user.uid,
                authorName: user.displayName || 'משתמש',
                flowerCount: 0,
                dislikeCount: 0,
                createdAt: serverTimestamp()
            };

            // Add reply reference if replying to someone
            if (replyingTo) {
                answerData.replyTo = {
                    authorName: replyingTo.authorName,
                    content: replyingTo.content.slice(0, 50) + (replyingTo.content.length > 50 ? '...' : '')
                };
            }

            const answersRef = collection(db, 'questions', id, 'answers');
            await addDoc(answersRef, answerData);

            const questionRef = doc(db, 'questions', id);
            await updateDoc(questionRef, { answerCount: increment(1) });

            setNewAnswer('');
            setReplyingTo(null);
            fetchAllAnswers();
            showToast('התשובה נשלחה בהצלחה', 'success');
        } catch (error: any) {
            console.error('Error submitting answer:', error);
            showToast('שגיאה בשליחת התשובה: ' + (error.message || 'נסה שוב'), 'error');
        }
        setSubmitting(false);
    };

    const executeDeleteAnswer = async (answerId: string, authorId: string, authorName: string, content: string, reason?: string) => {
        try {
            await deleteDoc(doc(db, 'questions', id, 'answers', answerId));
            await updateDoc(doc(db, 'questions', id), { answerCount: increment(-1) });
            setAnswers(prev => prev.filter(a => a.id !== answerId));

            if (isAdmin && user && currentUserProfile && reason) {
                await logDeleteAnswer(
                    { uid: user.uid, displayName: currentUserProfile.displayName, email: currentUserProfile.email },
                    { uid: authorId, displayName: authorName, email: 'unknown' },
                    reason,
                    answerId,
                    content.substring(0, 50) + (content.length > 50 ? '...' : '')
                );
            }

            showToast('התשובה נמחקה', 'success');
        } catch (error) {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    const handleDeleteAnswer = async (answerId: string, authorId: string, authorName: string, content: string) => {
        if (!user) return;

        const isAnswerOwner = user.uid === authorId;

        if (isAdmin && !isAnswerOwner) {
            setAdminAction({
                type: 'DELETE_ANSWER',
                targetId: answerId,
                targetName: authorName,
                targetData: { authorId, authorName, content }
            });
            setShowAdminModal(true);
            return;
        }

        if (isAnswerOwner) {
            if (confirm('האם למחוק את התשובה?')) {
                executeDeleteAnswer(answerId, authorId, authorName, content);
            }
        }
    };

    const handleReportAnswer = async (answer: Answer) => {
        if (!user) {
            showToast('התחבר כדי לדווח', 'error');
            return;
        }
        try {
            await addDoc(collection(db, 'reports'), {
                type: 'ANSWER',
                questionId: id,
                answerId: answer.id,
                answerContent: answer.content,
                answerAuthorId: answer.authorId,
                answerAuthorName: answer.authorName,
                reporterId: user.uid,
                reporterName: user.displayName || 'משתמש',
                status: 'PENDING',
                createdAt: serverTimestamp()
            });
            showToast('הדיווח נשלח לאלונים 🌳', 'success');
        } catch (error) {
            showToast('שגיאה בדיווח', 'error');
        }
    };

    const handleLikeAnswer = async (answerId: string) => {
        if (!user) {
            showToast('התחבר כדי לתת לייק', 'error');
            return;
        }

        // Toggle: If already liked, remove like
        if (likedAnswers.has(answerId)) {
            try {
                await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                    flowerCount: increment(-1)
                });
                setLikedAnswers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(answerId);
                    return newSet;
                });
                setAnswers(prev => prev.map(a =>
                    a.id === answerId ? { ...a, flowerCount: Math.max(0, a.flowerCount - 1) } : a
                ));
            } catch (error) {
                console.error('Error removing like:', error);
            }
            return;
        }
        try {
            // If was disliked, remove dislike first
            if (dislikedAnswers.has(answerId)) {
                await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                    dislikeCount: increment(-1)
                });
                setDislikedAnswers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(answerId);
                    return newSet;
                });
                setAnswers(prev => prev.map(a =>
                    a.id === answerId ? { ...a, dislikeCount: Math.max(0, (a.dislikeCount || 0) - 1) } : a
                ));
            }

            await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                flowerCount: increment(1)
            });
            setLikedAnswers(prev => new Set(prev).add(answerId));
            setAnswers(prev => prev.map(a =>
                a.id === answerId ? { ...a, flowerCount: a.flowerCount + 1 } : a
            ));
        } catch (error) {
            console.error('Error liking answer:', error);
        }
    };

    const handleDislikeAnswer = async (answerId: string) => {
        if (!user) {
            showToast('התחבר כדי לתת דיסלייק', 'error');
            return;
        }

        // Toggle: If already disliked, remove dislike
        if (dislikedAnswers.has(answerId)) {
            try {
                await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                    dislikeCount: increment(-1)
                });
                setDislikedAnswers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(answerId);
                    return newSet;
                });
                setAnswers(prev => prev.map(a =>
                    a.id === answerId ? { ...a, dislikeCount: Math.max(0, (a.dislikeCount || 0) - 1) } : a
                ));
            } catch (error) {
                console.error('Error removing dislike:', error);
            }
            return;
        }
        try {
            // If was liked, remove like first
            if (likedAnswers.has(answerId)) {
                await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                    flowerCount: increment(-1)
                });
                setLikedAnswers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(answerId);
                    return newSet;
                });
                setAnswers(prev => prev.map(a =>
                    a.id === answerId ? { ...a, flowerCount: Math.max(0, a.flowerCount - 1) } : a
                ));
            }

            await updateDoc(doc(db, 'questions', id, 'answers', answerId), {
                dislikeCount: increment(1)
            });
            setDislikedAnswers(prev => new Set(prev).add(answerId));
            setAnswers(prev => prev.map(a =>
                a.id === answerId ? { ...a, dislikeCount: (a.dislikeCount || 0) + 1 } : a
            ));
        } catch (error) {
            console.error('Error disliking answer:', error);
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-6 bg-slate-900 text-white overflow-y-auto">
            <div className="flex-1 w-full flex flex-col gap-4">

                {/* Like Login Prompt */}
                {showLikePrompt && !user && (
                    <div className="mb-4 flex items-center justify-between bg-pink-600/20 border border-pink-500/30 rounded-xl px-4 py-3">
                        <span className="text-sm text-pink-300">💖 התחבר כדי לתת לייק</span>
                        <Link href="/login" className="text-sm font-bold text-pink-400 hover:text-pink-300">
                            התחבר
                        </Link>
                    </div>
                )}

                {/* Header: Author & Rank */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={authorName === 'אנונימי' ? '#' : '/user/' + authorName}>
                            <div className="w-10 h-10 rounded-full border border-gray-700 p-0.5 overflow-hidden">
                                {authorPhoto ? (
                                    <img src={authorPhoto} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-full text-gray-400 font-bold">
                                        {authorName[0]}
                                    </div>
                                )}
                            </div>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{authorName}</span>
                                {getRankBadge(trustLevel)}
                            </div>
                            <span className="text-xs text-gray-500">{timeAgo}</span>
                        </div>
                    </div>
                    {category && (
                        <span className="px-3 py-1 bg-gray-900 text-indigo-400 rounded-full text-xs font-medium border border-gray-800">
                            {category}
                        </span>
                    )}

                    {/* Author Actions Menu */}
                    {(user?.uid === authorId || isAdmin) && (
                        <div className="flex items-center gap-2">
                            {canEditQuestion && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 text-gray-500 hover:text-indigo-400 transition-colors"
                                    title="ערוך"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                            {canDeleteQuestion && (
                                <button
                                    onClick={handleDeleteQuestion}
                                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                    title="מחק"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Question Content - Edit Mode or Display Mode */}
                <div className="mt-2 text-right">
                    {isEditing ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-gray-800 border border-indigo-500 rounded-lg px-3 py-2 text-white font-bold"
                            />
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-gray-800 border border-indigo-500 rounded-lg px-3 py-2 text-gray-300 min-h-[100px]"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleEditQuestion}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                >
                                    שמור
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditTitle(title);
                                        setEditContent(content);
                                    }}
                                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold mb-3 leading-tight text-white">{editTitle}</h2>
                            <p className={`text-gray-300 text-base leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-indigo-500/50 cursor-pointer ${expanded ? '' : 'line-clamp-4'}`} onClick={toggleExpanded}>
                                {editContent}
                            </p>
                        </>
                    )}
                </div>

                {/* Engagement Bar */}
                <div className="flex items-center gap-4 py-4 border-t border-b border-gray-800 mt-4">
                    <button
                        onClick={handleFlower}
                        className={'flex items-center gap-2 transition-colors ' + (liked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500')}
                    >
                        <Heart size={22} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2} />
                        <span className="font-medium text-sm">{localFlowerCount}</span>
                    </button>

                    <button
                        onClick={handleDislike}
                        className={'flex items-center gap-2 transition-colors ' + (disliked ? 'text-red-500' : 'text-gray-500 hover:text-red-500')}
                    >
                        <ThumbsDown size={20} fill={disliked ? "currentColor" : "none"} />
                        {localDislikeCount > 0 && <span className="font-medium text-sm">{localDislikeCount}</span>}
                    </button>

                    <button
                        onClick={toggleExpanded}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-400 transition-colors"
                    >
                        <MessageCircle size={22} />
                        <span className="font-medium text-sm">{answerCount}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-400 transition-colors"
                    >
                        <Share2 size={22} />
                    </button>

                    <div className="mr-auto">
                        <Flag size={18} className="text-gray-600 hover:text-red-400 cursor-pointer" />
                    </div>
                </div>

                {/* Answers Section */}
                <div className="space-y-3 mt-2">

                    {/* Reply indicator */}
                    {replyingTo && (
                        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-indigo-300">משיב ל-{replyingTo.authorName}:</span>
                                <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">✕</button>
                            </div>
                            <p className="text-gray-400 text-xs truncate">"{replyingTo.content.slice(0, 50)}..."</p>
                        </div>
                    )}

                    {/* Answer Form */}
                    {expanded && (
                        user ? (
                            <form onSubmit={handleSubmitAnswer} className="mb-4 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="כתוב תשובה..."
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white placeholder:text-gray-500"
                                    value={newAnswer}
                                    onChange={(e) => setNewAnswer(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !newAnswer.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 min-w-[70px]"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span className="hidden sm:inline">שלח</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <Link
                                href="/login"
                                className="mb-4 flex items-center justify-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                            >
                                🔐 התחבר כדי להשאיר תשובה
                            </Link>
                        )
                    )}

                    {answers.length > 0 && expanded && (
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">תשובות ({answers.length})</h3>
                            <button
                                onClick={() => setExpanded(false)}
                                className="text-gray-500 hover:text-white text-lg px-2"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Answers List */}
                    <div className="space-y-3">
                        {(expanded ? answers : answers.slice(0, 2)).map(ans => (
                            <div key={ans.id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                                {/* Reply Quote */}
                                {ans.replyTo && (
                                    <div className="bg-gray-900/50 rounded-lg p-2 mb-2 text-xs border-r-2 border-indigo-500">
                                        <span className="text-indigo-400">↩️ {ans.replyTo.authorName}:</span>
                                        <span className="text-gray-500 mr-1">"{ans.replyTo.content}"</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-indigo-300">{ans.authorName}</span>
                                </div>

                                {/* Answer Content - Edit or Display Mode */}
                                {editingAnswerId === ans.id ? (
                                    <div className="space-y-2 mb-2">
                                        <textarea
                                            value={editAnswerContent}
                                            onChange={(e) => setEditAnswerContent(e.target.value)}
                                            className="w-full bg-gray-900 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-gray-300 min-h-[60px]"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditAnswer(ans.id)}
                                                className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
                                            >
                                                שמור
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingAnswerId(null);
                                                    setEditAnswerContent('');
                                                }}
                                                className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
                                            >
                                                ביטול
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-300 leading-snug mb-2">{ans.content}</p>
                                )}

                                {/* Answer Actions */}
                                <div className="flex items-center gap-3 text-xs">
                                    <button
                                        onClick={() => handleLikeAnswer(ans.id)}
                                        className={`flex items-center gap-1 transition-colors ${likedAnswers.has(ans.id) ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'}`}
                                    >
                                        <Heart size={14} fill={likedAnswers.has(ans.id) ? "currentColor" : "none"} />
                                        <span>{ans.flowerCount}</span>
                                        {/* Flower indicator if question author liked */}
                                        {likedAnswers.has(ans.id) && user?.uid === authorId && (
                                            <span className="text-yellow-400">🌸</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDislikeAnswer(ans.id)}
                                        className={`flex items-center gap-1 transition-colors ${dislikedAnswers.has(ans.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}
                                    >
                                        <ThumbsDown size={14} fill={dislikedAnswers.has(ans.id) ? "currentColor" : "none"} />
                                        {(ans.dislikeCount || 0) > 0 && <span>{ans.dislikeCount}</span>}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setReplyingTo(ans);
                                            setExpanded(true);
                                        }}
                                        className="flex items-center gap-1 text-gray-500 hover:text-indigo-400 transition-colors"
                                    >
                                        <Reply size={14} />
                                        <span>השב</span>
                                    </button>
                                    {user?.uid === ans.authorId && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingAnswerId(ans.id);
                                                    setEditAnswerContent(ans.content);
                                                }}
                                                className="flex items-center gap-1 text-gray-500 hover:text-indigo-400 transition-colors"
                                            >
                                                <Edit2 size={14} />
                                                <span>ערוך</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAnswer(ans.id, ans.authorId, ans.authorName, ans.content)}
                                                className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                                <span>מחק</span>
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleReportAnswer(ans)}
                                        className="flex items-center gap-1 text-gray-600 hover:text-orange-400 transition-colors mr-auto"
                                    >
                                        <Flag size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Frosted glass preview when not expanded - clickable to expand */}
                        {!expanded && answers.length > 2 && (
                            <div
                                onClick={toggleExpanded}
                                className="relative cursor-pointer group"
                            >
                                {/* Show 3rd and 4th answer blurred behind */}
                                <div className="space-y-2 blur-[3px] opacity-50 pointer-events-none">
                                    {answers.slice(2, 4).map(ans => (
                                        <div key={ans.id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                                            <p className="text-sm text-gray-300 line-clamp-2">{ans.content}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Frosted glass overlay */}
                                <div className="absolute inset-0 backdrop-blur-[2px] bg-slate-900/40 rounded-xl flex items-center justify-center">
                                    <span className="text-indigo-400 font-medium text-sm group-hover:text-indigo-300 transition-colors">
                                        הקש לפתיחת {Math.max(0, answerCount - 2)} תשובות נוספות
                                    </span>
                                </div>
                            </div>
                        )}

                        {!expanded && answers.length === 0 && (
                            <button
                                onClick={toggleExpanded}
                                className="block w-full py-2.5 text-center text-sm font-medium text-gray-600 hover:text-indigo-400 transition-colors mt-2"
                            >
                                הפרח את התשובה הראשונה...
                            </button>
                        )}
                    </div>
                    {/* End of answers wrapper */}
                </div>

                {/* Admin Action Modal */}
                {showAdminModal && adminAction && (
                    <AdminActionModal
                        title={
                            adminAction.type === 'DELETE_QUESTION' ? 'מחיקת שאלה' :
                                adminAction.type === 'DELETE_ANSWER' ? 'מחיקת תשובה' :
                                    adminAction.type === 'EDIT_QUESTION' ? 'עריכת שאלה' :
                                        'עריכת תשובה'
                        }
                        description={`אתה עומד ${adminAction.type.includes('DELETE') ? 'למחוק' : 'לערוך'} את ${adminAction.type.includes('QUESTION') ? 'השאלה של' : 'התשובה של'} ${adminAction.targetName}. פעולה זו תירשם בלוג.`}
                        confirmLabel={adminAction.type.includes('DELETE') ? 'מחק תוכן' : 'שמור שינויים'}
                        variant={adminAction.type.includes('DELETE') ? 'danger' : 'info'}
                        onConfirm={(reason) => {
                            if (adminAction.type === 'DELETE_QUESTION') {
                                executeDeleteQuestion(reason);
                            } else if (adminAction.type === 'DELETE_ANSWER' && adminAction.targetData) {
                                executeDeleteAnswer(
                                    adminAction.targetId,
                                    adminAction.targetData.authorId,
                                    adminAction.targetData.authorName,
                                    adminAction.targetData.content,
                                    reason
                                );
                            } else if (adminAction.type === 'EDIT_QUESTION') {
                                executeEditQuestion(reason);
                            } else if (adminAction.type === 'EDIT_ANSWER' && adminAction.targetData) {
                                executeEditAnswer(adminAction.targetId, adminAction.targetData.content, reason);
                            }
                            setShowAdminModal(false);
                            setAdminAction(null);
                        }}
                        onClose={() => {
                            setShowAdminModal(false);
                            setAdminAction(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

function AdminActionModal({ title, description, confirmLabel = 'אישור', variant = 'danger', onConfirm, onClose }: {
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'danger' | 'info';
    onConfirm: (reason: string) => void;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-gray-900 border ${isDanger ? 'border-red-500/50' : 'border-indigo-500/50'} rounded-2xl w-full max-w-md p-6 shadow-2xl`}>
                <div className={`flex items-center gap-3 ${isDanger ? 'text-red-500' : 'text-indigo-400'} mb-4`}>
                    <ShieldAlert size={32} />
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>

                <p className="text-gray-300 mb-6">{description}</p>

                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-400 mb-2">
                        {isDanger ? 'סיבת המחיקה (חובה):' : 'סיבת העריכה (חובה):'}
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={`w-full bg-gray-800 border ${isDanger ? 'border-gray-700 focus:border-red-500' : 'border-gray-700 focus:border-indigo-500'} text-white rounded-xl px-4 py-3 min-h-[100px] focus:outline-none`}
                        placeholder={isDanger ? "פרט למה התוכן נמחק..." : "פרט למה התוכן נערך..."}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => reason.trim() && onConfirm(reason)}
                        disabled={!reason.trim()}
                        className={`flex-1 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all ${isDanger
                            ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-800 text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-700 transition-all"
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { MessageCircle, Heart, Share2, Send, ArrowRight, Bell, BellOff } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Answer {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    flowerCount: number;
    createdAt: any;
}

interface Question {
    id: string;
    title: string;
    content: string;
    category: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    isAnonymous: boolean;
    flowerCount: number;
    answerCount: number;
    createdAt: any;
}

export default function QuestionPage() {
    const params = useParams();
    const router = useRouter();
    const questionId = params.id as string;
    const { user, isVerified } = useAuth();

    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [answerText, setAnswerText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Fetch question
    useEffect(() => {
        const fetchQuestion = async () => {
            const docRef = doc(db, 'questions', questionId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setQuestion({ id: docSnap.id, ...docSnap.data() } as Question);
            } else {
                router.push('/'); // Question not found
            }
            setLoading(false);
        };

        fetchQuestion();
    }, [questionId, router]);

    // Subscribe to answers
    useEffect(() => {
        const answersQuery = query(
            collection(db, 'questions', questionId, 'answers'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(answersQuery, (snapshot) => {
            const answersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Answer[];
            setAnswers(answersData);
        });

        return () => unsubscribe();
    }, [questionId]);

    // Submit answer
    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !answerText.trim() || submitting) return;

        // Check email verification for email users
        if (user.providerData[0]?.providerId === 'password' && !isVerified) {
            alert('יש לאמת את המייל לפני שניתן לענות');
            return;
        }

        setSubmitting(true);
        try {
            // Add answer
            await addDoc(collection(db, 'questions', questionId, 'answers'), {
                content: answerText.trim(),
                authorId: user.uid,
                authorName: user.displayName || 'משתמש',
                authorPhoto: user.photoURL || null,
                flowerCount: 0,
                createdAt: serverTimestamp()
            });

            // Update answer count on question
            await updateDoc(doc(db, 'questions', questionId), {
                answerCount: increment(1)
            });

            // Create notification for question author
            if (question && question.authorId !== user.uid) {
                await addDoc(collection(db, 'notifications'), {
                    type: 'ANSWER',
                    recipientId: question.authorId,
                    senderId: user.uid,
                    senderName: user.displayName || 'משתמש',
                    questionId: questionId,
                    questionTitle: question.title,
                    message: `${user.displayName || 'משתמש'} ענה על השאלה שלך`,
                    read: false,
                    createdAt: serverTimestamp()
                });
            }

            // Subscribe answerer to question notifications
            await addDoc(collection(db, 'subscriptions'), {
                userId: user.uid,
                questionId: questionId,
                createdAt: serverTimestamp()
            });

            setAnswerText('');
        } catch (error) {
            console.error('Error submitting answer:', error);
            alert('שגיאה בשליחת התשובה');
        }
        setSubmitting(false);
    };

    // Give flower to answer
    const handleGiveFlower = async (answerId: string) => {
        if (!user) return;

        try {
            await updateDoc(doc(db, 'questions', questionId, 'answers', answerId), {
                flowerCount: increment(1)
            });
        } catch (error) {
            console.error('Error giving flower:', error);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
    }

    if (!question) {
        return <div className="min-h-screen flex items-center justify-center">השאלה לא נמצאה</div>;
    }

    const timeAgo = question.createdAt?.toDate
        ? formatDistanceToNow(question.createdAt.toDate(), { addSuffix: true, locale: he })
        : 'עכשיו';

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b z-10 px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-600">
                    <ArrowRight size={24} />
                </button>
                <h1 className="font-bold text-gray-800 truncate flex-1">שאלה</h1>
                <button className="text-gray-400">
                    {isSubscribed ? <BellOff size={20} /> : <Bell size={20} />}
                </button>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Question Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Link href={question.isAnonymous ? '#' : `/user/${question.authorName}`}>
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {question.authorName[0]}
                            </div>
                        </Link>
                        <div>
                            <div className="font-bold text-gray-900">
                                {question.isAnonymous ? 'אנונימי' : question.authorName}
                            </div>
                            <div className="text-xs text-gray-500">{timeAgo}</div>
                        </div>
                        <span className="mr-auto px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {question.category}
                        </span>
                    </div>

                    <h1 className="text-xl font-bold text-gray-900 mb-3">{question.title}</h1>
                    {question.content && (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {question.content}
                        </p>
                    )}

                    <div className="flex items-center gap-4 mt-6 pt-4 border-t text-sm text-gray-500">
                        <span>{answers.length} תשובות</span>
                        <span>{question.flowerCount || 0} 🌸</span>
                        <span className="flex-1"></span>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-gray-600">
                            <Share2 size={18} />
                            שתף
                        </button>
                    </div>
                </div>

                {/* Answers List */}
                <div className="space-y-4">
                    <h2 className="font-bold text-gray-700 px-2">תשובות ({answers.length})</h2>

                    {answers.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <p>עדיין אין תשובות. היה הראשון לענות!</p>
                        </div>
                    )}

                    {answers.map((ans) => {
                        const answerTime = ans.createdAt?.toDate
                            ? formatDistanceToNow(ans.createdAt.toDate(), { addSuffix: true, locale: he })
                            : 'עכשיו';

                        return (
                            <div key={ans.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <Link href={`/user/${ans.authorName}`}>
                                            <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 text-sm font-bold">
                                                {ans.authorName[0]}
                                            </div>
                                        </Link>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-800 text-sm">{ans.authorName}</span>
                                                <span className="text-xs text-gray-400">{answerTime}</span>
                                            </div>
                                            <p className="text-gray-600 mt-1 whitespace-pre-wrap">{ans.content}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleGiveFlower(ans.id)}
                                        className="flex flex-col items-center text-gray-300 hover:text-pink-500 transition-colors p-1"
                                    >
                                        <Heart size={20} />
                                        <span className="text-xs font-medium">{ans.flowerCount || 0}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Answer Input - Fixed at bottom */}
            {user ? (
                <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 md:bottom-0">
                    <form onSubmit={handleSubmitAnswer} className="max-w-3xl mx-auto flex gap-2">
                        <input
                            type="text"
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="כתוב תגובה מכבדת..."
                            className="flex-1 bg-gray-100 rounded-full px-6 py-3 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all text-gray-900"
                            disabled={submitting}
                        />
                        <button
                            type="submit"
                            disabled={!answerText.trim() || submitting}
                            className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            ) : (
                <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 text-center md:bottom-0">
                    <Link href="/login" className="text-primary font-bold hover:underline">
                        התחבר כדי לענות
                    </Link>
                </div>
            )}
        </div>
    );
}

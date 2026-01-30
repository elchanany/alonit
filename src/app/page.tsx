'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, onSnapshot, startAfter, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QuestionCard } from '@/components/features/QuestionCard';
import { RelatedQuestionsTiles } from '@/components/features/RelatedQuestionsTiles';
import { findRelatedQuestions, getRelatedTiles, Question as RecommendationQuestion } from '@/services/recommendation.service';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Question {
    id: string;
    title: string;
    content: string;
    description?: string;
    category: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    isAnonymous: boolean;
    flowerCount: number;
    answerCount: number;
    viewCount: number;
    createdAt: any;
    timeAgo?: string;
}

export default function Home() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [leftTiles, setLeftTiles] = useState<RecommendationQuestion[]>([]);
    const [rightTiles, setRightTiles] = useState<RecommendationQuestion[]>([]);
    const { user } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const INITIAL_LOAD = 10;
    const LOAD_MORE_COUNT = 10;

    // Initial load - just first batch
    useEffect(() => {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(INITIAL_LOAD));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timeAgo: data.createdAt?.toDate ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'
                    } as Question;
                });
                setQuestions(docs);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
                setHasMore(snapshot.docs.length >= INITIAL_LOAD);
                setLoading(false);
            },
            (error) => {
                console.error("Firestore Error:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load more questions when approaching end
    const loadMoreQuestions = useCallback(async () => {
        if (!hasMore || loadingMore || !lastDoc) return;

        setLoadingMore(true);
        try {
            const q = query(
                collection(db, 'questions'),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(LOAD_MORE_COUNT)
            );

            const snapshot = await getDocs(q);
            const newDocs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timeAgo: data.createdAt?.toDate ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'
                } as Question;
            });

            if (newDocs.length > 0) {
                setQuestions(prev => [...prev, ...newDocs]);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            }
            setHasMore(snapshot.docs.length >= LOAD_MORE_COUNT);
        } catch (error) {
            console.error('Error loading more questions:', error);
        }
        setLoadingMore(false);
    }, [hasMore, loadingMore, lastDoc]);

    // Update related questions when current question changes
    useEffect(() => {
        if (questions.length === 0) return;

        const currentQuestion = questions[currentIndex];
        if (!currentQuestion) return;

        const recQuestion: RecommendationQuestion = {
            id: currentQuestion.id,
            title: currentQuestion.title,
            content: currentQuestion.content || '',
            category: currentQuestion.category,
            authorName: currentQuestion.authorName,
            authorPhoto: currentQuestion.authorPhoto,
            flowerCount: currentQuestion.flowerCount,
            answerCount: currentQuestion.answerCount,
            createdAt: currentQuestion.createdAt
        };

        const allRecQuestions: RecommendationQuestion[] = questions.map(q => ({
            id: q.id,
            title: q.title,
            content: q.content || '',
            category: q.category,
            authorName: q.authorName,
            authorPhoto: q.authorPhoto,
            flowerCount: q.flowerCount,
            answerCount: q.answerCount,
            createdAt: q.createdAt
        }));

        findRelatedQuestions(recQuestion, allRecQuestions, 6).then(related => {
            const { left, right } = getRelatedTiles(related);
            setLeftTiles(left);
            setRightTiles(right);
        });
    }, [currentIndex, questions]);

    // Track scroll to update current index and load more
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        const itemHeight = container.clientHeight;
        const newIndex = Math.round(scrollTop / itemHeight);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < questions.length) {
            setCurrentIndex(newIndex);
        }

        // Load more when 3 items from end
        if (newIndex >= questions.length - 3 && hasMore && !loadingMore) {
            loadMoreQuestions();
        }
    }, [currentIndex, questions.length, hasMore, loadingMore, loadMoreQuestions]);

    // Scroll to specific question
    const scrollToQuestion = (questionId: string) => {
        const index = questions.findIndex(q => q.id === questionId);
        if (index >= 0 && scrollContainerRef.current) {
            const itemHeight = scrollContainerRef.current.clientHeight;
            scrollContainerRef.current.scrollTo({
                top: index * itemHeight,
                behavior: 'auto' // Instant jump per user request
            });
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="animate-pulse">טוען את הפיד...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="fixed inset-0 top-14 md:top-16 bottom-16 md:bottom-0 bg-black z-0">
            <div className="h-full w-full flex justify-center items-stretch">
                {/* Left Sidebar - Related Questions (Desktop only) */}
                <div className="hidden lg:flex flex-1 justify-start min-w-0 pl-4">
                    <RelatedQuestionsTiles
                        questions={leftTiles}
                        side="left"
                        onQuestionClick={scrollToQuestion}
                    />
                </div>

                {/* Main Feed */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="w-full max-w-lg overflow-y-auto snap-y snap-mandatory h-full no-scrollbar relative shrink-0"
                >
                    {questions.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-indigo-300 p-6 text-center">
                            <div className="text-6xl mb-4">🌙</div>
                            <h2 className="text-2xl font-bold mb-2">אין שאלות עדיין</h2>
                            <p className="text-indigo-400">הלילה יפה... היה הראשון להאיר בשאלה!</p>
                        </div>
                    ) : (
                        questions.map((question, index) => (
                            <div
                                key={question.id}
                                className="h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] w-full snap-start snap-always flex items-center justify-center py-2"
                            >
                                {/* Question Card with rounded edges like TikTok */}
                                <div className="w-full h-full rounded-2xl overflow-hidden">
                                    <QuestionCard
                                        id={question.id}
                                        title={question.title}
                                        content={question.content || question.description || ""}
                                        authorName={question.isAnonymous ? 'אנונימי' : question.authorName}
                                        authorPhoto={question.isAnonymous ? null : question.authorPhoto}
                                        authorId={question.authorId}
                                        createdAt={question.createdAt}
                                        flowerCount={question.flowerCount || 0}
                                        answerCount={question.answerCount || 0}
                                        viewCount={question.viewCount || 0}
                                        timeAgo={question.timeAgo || 'עכשיו'}
                                        category={question.category}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right Sidebar - Related Questions (Desktop only) */}
                <div className="hidden lg:flex flex-1 justify-end min-w-0 pr-4">
                    <RelatedQuestionsTiles
                        questions={rightTiles}
                        side="right"
                        onQuestionClick={scrollToQuestion}
                    />
                </div>
            </div>
        </main>
    );
}

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getQuestionUrl } from '@/utils/url';
import { collection, query, orderBy, limit, onSnapshot, startAfter, getDocs, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QuestionCard } from '@/components/features/QuestionCard';
import { ChevronDown, Inbox } from 'lucide-react';
import { RelatedQuestionsTiles } from '@/components/features/RelatedQuestionsTiles';
import { findRelatedQuestions, getRelatedTiles, Question as RecommendationQuestion, rankFeedForUser, trackInteraction } from '@/services/recommendation.service';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { getGenderedTexts } from '@/utils/gender';

interface Question {
    id: string;
    title: string;
    content: string;
    description?: string;
    category: string;
    tags?: string[];
    authorId: string;
    realAuthorId?: string;
    authorName: string;
    authorPhoto?: string;
    isAnonymous: boolean;
    flowerCount: number;
    answerCount: number;
    viewCount: number;
    createdAt: any;
    timeAgo?: string;
    // Poll data
    type?: 'question' | 'poll';
    pollOptions?: { id: string; text: string; votes: number }[];
    totalVotes?: number;
    votedUsers?: Record<string, string>;
    allowVoteChange?: boolean;
}

export default function Home() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [leftTiles, setLeftTiles] = useState<RecommendationQuestion[]>([]);
    const [rightTiles, setRightTiles] = useState<RecommendationQuestion[]>([]);
    const { user, userProfile } = useAuth();
    const texts = getGenderedTexts(userProfile?.gender);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const questionStartTimeRef = useRef<number>(Date.now());
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);
    const INITIAL_LOAD = 30; // Increased pool for personalized ranking
    const LOAD_MORE_COUNT = 30;

    // Initial load - just first batch
    useEffect(() => {
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(INITIAL_LOAD));

        getDocs(q).then((snapshot) => {
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timeAgo: data.createdAt?.toDate ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'
                } as Question;
            });
            setQuestions(rankFeedForUser(docs as any) as Question[]); // Rank the pool based on user affinities
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length >= INITIAL_LOAD);
            setLoading(false);
        }).catch((error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });
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
                setQuestions(prev => [...prev, ...(rankFeedForUser(newDocs as any) as Question[])]);
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

        // Defer CPU-intensive semantic processing so it doesn't freeze the scrolling animation
        const timerId = setTimeout(() => {
            findRelatedQuestions(recQuestion, allRecQuestions, 6).then(related => {
                const { left, right } = getRelatedTiles(related);
                setLeftTiles(left);
                setRightTiles(right);
            });
        }, 300);

        return () => clearTimeout(timerId);
    }, [currentIndex, questions]);

    // Track Watch Time and Sync URL
    useEffect(() => {
        questionStartTimeRef.current = Date.now();
        const currentQ = questions[currentIndex];
        
        // Sync URL to match the current question shown
        if (currentQ && typeof window !== 'undefined') {
            window.history.replaceState(null, '', getQuestionUrl(currentQ.id, currentQ.title));
        }
        
        return () => {
            if (currentQ) {
                const duration = Date.now() - questionStartTimeRef.current;
                trackInteraction(currentQ as any, 'view', duration);
            }
        };
    }, [currentIndex, questions]);

    // Track scroll to update current index and load more
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        const itemHeight = container.clientHeight;
        const newIndex = Math.round(scrollTop / itemHeight);
        
        if (scrollTop > 20) {
            setHasScrolled(true);
        }

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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0612] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="animate-pulse">טוען את הפיד...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="fixed inset-x-0 top-14 bottom-16 md:top-16 md:bottom-0 bg-gradient-to-b from-[#0a0414] via-[#07030e] to-[#040208] z-0 overflow-hidden">
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
                    className="w-full max-w-[500px] h-full flex flex-col no-scrollbar relative shrink-0 mx-auto overflow-y-auto"
                    style={{
                        scrollSnapType: 'y mandatory',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {questions.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-indigo-300 p-6 text-center">
                            <Inbox size={44} className="text-indigo-400/60 mb-3" />
                            <h2 className="text-xl font-bold mb-2 text-white">אין שאלות עדיין</h2>
                            <p className="text-sm text-indigo-300/80">{texts.beFirst} לשאול שאלה ראשונה בקהילה.</p>
                        </div>
                    ) : (
                        questions.map((question, index) => (
                            <div
                                key={question.id}
                                className="w-full h-full shrink-0 flex-none snap-start snap-always p-2 md:py-3.5 md:px-0 box-border relative flex flex-col"
                                style={{
                                    scrollSnapAlign: 'start',
                                    scrollSnapStop: 'always',
                                }}
                            >
                                {/* Question Card - TikTok aspect on desktop (rounded), also rounded on mobile */}
                                <div className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
                                    <QuestionCard
                                        id={question.id}
                                        type={question.type as 'question' | 'poll'}
                                        pollOptions={question.pollOptions as any}
                                        totalVotes={question.totalVotes}
                                        votedUsers={question.votedUsers as any}
                                        allowVoteChange={question.allowVoteChange}
                                        title={question.title}
                                        content={question.content || question.description || ""}
                                        authorName={question.isAnonymous ? 'אנונימי' : question.authorName}
                                        authorPhoto={question.isAnonymous ? null : question.authorPhoto}
                                        authorId={question.authorId}
                                        realAuthorId={question.realAuthorId}
                                        createdAt={question.createdAt}
                                        flowerCount={question.flowerCount || 0}
                                        answerCount={question.answerCount || 0}
                                        viewCount={question.viewCount || 0}
                                        timeAgo={question.timeAgo || 'עכשיו'}
                                        category={question.category}
                                        tags={question.tags}
                                    />
                                </div>

                                {/* First card scroll guidance hint */}
                                {index === 0 && !hasScrolled && (
                                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center gap-1 animate-bounce">
                                        <span className="text-[11px] font-semibold text-white/95 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-indigo-500/30 shadow-xl flex items-center gap-1.5">
                                            <span>גללו לשאלה הבאה</span>
                                            <ChevronDown size={14} className="text-indigo-400" />
                                        </span>
                                    </div>
                                )}
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

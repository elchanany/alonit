'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { QuestionCard } from '@/components/features/QuestionCard';
import { RelatedQuestionsTiles } from '@/components/features/RelatedQuestionsTiles';
import { findRelatedQuestions, getRelatedTiles, Question as RecommendationQuestion, rankFeedForUser, trackInteraction } from '@/services/recommendation.service';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getQuestionUrl } from '@/utils/url';

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

export default function QuestionPage() {
    const params = useParams();
    const router = useRouter();
    const questionId = Array.isArray(params.id) ? params.id[0] : params.id as string;
    const { user } = useAuth();
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [leftTiles, setLeftTiles] = useState<RecommendationQuestion[]>([]);
    const [rightTiles, setRightTiles] = useState<RecommendationQuestion[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const FEED_POOL_SIZE = 50; // Get a pool of 50 recent questions to sort for recommendations.

    // Load initial question and build personalized feed
    useEffect(() => {
        const fetchFeed = async () => {
            if (!questionId) return;

            try {
                // 1. Fetch specific question
                const docRef = doc(db, 'questions', questionId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setLoading(false);
                    return; // Question not found
                }
                
                const data = docSnap.data();
                const specificQuestion: Question = {
                    id: docSnap.id,
                    ...data,
                    timeAgo: data.createdAt?.toDate ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'
                } as Question;

                // 2. Fetch recent questions pool to recommend from
                const q = query(
                    collection(db, 'questions'),
                    orderBy('createdAt', 'desc'),
                    limit(FEED_POOL_SIZE)
                );
                
                const poolSnapshot = await getDocs(q);
                const poolDocs: Question[] = poolSnapshot.docs.map(poolDoc => {
                    const poolData = poolDoc.data();
                    return {
                        id: poolDoc.id,
                        ...poolData,
                        timeAgo: poolData.createdAt?.toDate ? formatDistanceToNow(poolData.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'
                    } as Question;
                });

                // 3. Rank feed using personalized affinity (FYP style)
                const fypFeed = rankFeedForUser(poolDocs as any) as Question[];

                // 4. Assemble the feed: Target question at the top, then related ones.
                const finalFeed = [
                    specificQuestion, 
                    ...fypFeed.filter(q => q.id !== specificQuestion.id)
                ];
                
                setQuestions(finalFeed);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching question feed:", error);
                setLoading(false);
            }
        };

        fetchFeed();
    }, [questionId]);


    const questionStartTimeRef = useRef<number>(Date.now());

    // Track Watch Time
    useEffect(() => {
        questionStartTimeRef.current = Date.now();
        const currentQ = questions[currentIndex];
        
        return () => {
            if (currentQ) {
                const duration = Date.now() - questionStartTimeRef.current;
                trackInteraction(currentQ as any, 'view', duration);
            }
        };
    }, [currentIndex, questions]);

    // Update related questions sidebars when current question changes
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

    // Track scroll
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        const itemHeight = container.clientHeight;
        const newIndex = Math.round(scrollTop / itemHeight);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < questions.length) {
            setCurrentIndex(newIndex);
            
            // Update the browser URL without triggering a page reload
            if (questions[newIndex]) {
                const q = questions[newIndex];
                window.history.replaceState(null, '', getQuestionUrl(q.id, q.title));
            }
        }
    }, [currentIndex, questions]);

    // Scroll to specific question
    const scrollToQuestion = (id: string) => {
        const index = questions.findIndex(q => q.id === id);
        if (index >= 0 && scrollContainerRef.current) {
            const itemHeight = scrollContainerRef.current.clientHeight;
            scrollContainerRef.current.scrollTo({
                top: index * itemHeight,
                behavior: 'auto'
            });
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="animate-pulse">טוען את התוכן המבוקש...</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0 && !loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
                  <div className="text-4xl mb-4">🌙</div>
                  <h2 className="text-xl font-bold mb-4">השאלה לא נמצאה</h2>
                  <button onClick={() => router.push('/')} className="px-6 py-2 bg-indigo-600 rounded-full font-bold">
                      חזור לדף הבית
                  </button>
            </div>
        );
    }

    const feedHeight = 'calc(100vh - 7.5rem)';

    return (
        <main
            className="absolute left-0 right-0 bg-black z-0"
            style={{
                top: '3.5rem',
                bottom: '4rem',
            }}
        >
            <style jsx>{`
                @media (min-width: 768px) {
                    main { top: 4rem !important; bottom: 0 !important; }
                }
            `}</style>

            {/* Back Button Overlay */}
            <div className="absolute top-4 right-4 z-50">
               <button onClick={() => router.push('/')} className="bg-black/50 hover:bg-black/70 backdrop-blur-md p-2 rounded-full text-white transition">
                  <ArrowRight size={24} />
               </button>
            </div>

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
                    className="w-full max-w-lg no-scrollbar relative shrink-0"
                    style={{
                        overflowY: 'auto',
                        height: '100%',
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'y mandatory',
                    }}
                >
                    {questions.map((question, index) => (
                        <div
                            key={question.id + index}
                            className="w-full flex items-center justify-center py-2"
                            style={{
                                height: feedHeight,
                                scrollSnapAlign: 'start',
                                scrollSnapStop: 'always',
                            }}
                        >
                            {/* Question Card with rounded edges like TikTok */}
                            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                                <QuestionCard
                                    id={question.id}
                                    title={question.title}
                                    type={question.type as 'question' | 'poll'}
                                    pollOptions={question.pollOptions as any}
                                    totalVotes={question.totalVotes}
                                    votedUsers={question.votedUsers as any}
                                    allowVoteChange={question.allowVoteChange}
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
                        </div>
                    ))}
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

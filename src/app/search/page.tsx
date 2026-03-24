'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Question, searchAndRank } from '@/services/recommendation.service';
import { QuestionThumbnail } from '@/components/features/QuestionThumbnail';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function SearchPage() {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';
    
    const [results, setResults] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAndSearch = async () => {
            if (!q) {
                setResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch ALL questions (ordered by newest to give baseline relevance)
                // Note: In a production app with 1M+ docs, this should be paginated or use Algolia.
                const questionsRef = collection(db, 'questions');
                const qQuery = query(questionsRef, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(qQuery);
                
                const allQuestions: Question[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timeAgo: data.createdAt?.toDate ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'
                    } as Question;
                });

                // Run through Monolith-Lite search and personalization ranker
                const finalRanked = searchAndRank(allQuestions, q);
                setResults(finalRanked);
            } catch (error) {
                console.error("Error searching:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndSearch();
    }, [q]);

    return (
        <div className="min-h-screen bg-gray-950 text-white p-2 sm:p-4 md:p-8 pt-4 md:pt-6">
            <div className="max-w-6xl mx-auto">
                
                <div className="mb-4 pb-4 md:mb-6 md:pb-6 border-b border-gray-800">
                    <h1 className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 md:gap-3">
                        <Search className="text-indigo-500 shrink-0" size={24} />
                        <span className="truncate">תוצאות חיפוש עבור: <span className="text-indigo-400">"{q}"</span></span>
                    </h1>
                    <p className="text-gray-400 mt-1 md:mt-2 text-xs md:text-sm">
                        התוצאות מדורגות לפי התאמה ובשילוב העדפות התוכן האישיות שלך.
                    </p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 animate-pulse">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-gray-900 rounded-lg"></div>
                        ))}
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                        {results.map((question) => (
                            <QuestionThumbnail key={question.id} question={question} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="text-gray-600 mb-4 flex justify-center">
                            <Search size={64} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-300">לא נמצאו תוצאות</h2>
                        <p className="text-gray-500 mt-2">נסה לחפש במילים אחרות או לשנות את החיפוש.</p>
                    </div>
                )}
                
            </div>
        </div>
    );
}

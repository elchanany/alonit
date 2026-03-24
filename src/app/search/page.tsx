'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Question, searchAndRank } from '@/services/recommendation.service';
import { QuestionThumbnail } from '@/components/features/QuestionThumbnail';
import { Search, User2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import Link from 'next/link';

function SearchContent() {
    const searchParams = useSearchParams();
    const q = searchParams.get('q') || '';
    
    const [results, setResults] = useState<Question[]>([]);
    const [userResults, setUserResults] = useState<any[]>([]);
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
                // Fetch Users
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const searchLower = q.toLowerCase();
                const matchedUsers: any[] = [];
                
                usersSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.displayName && data.displayName.toLowerCase().includes(searchLower)) {
                        matchedUsers.push({ id: doc.id, ...data });
                    }
                });
                
                // Sort users by some relevance or creation if needed, limit to top 10
                setUserResults(matchedUsers.slice(0, 10));

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
                ) : (
                    <>
                        {userResults.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                                    <User2 size={20} /> משתמשים
                                </h2>
                                <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar snap-x">
                                    {userResults.map(u => (
                                        <Link href={`/user/${encodeURIComponent(u.displayName)}`} key={u.id} className="snap-start shrink-0 w-32 bg-gray-800/50 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center gap-3 transition-all hover:bg-gray-800">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 overflow-hidden flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                                {u.photoURL ? (
                                                    <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    u.displayName[0]
                                                )}
                                            </div>
                                            <div className="text-center w-full">
                                                <div className="font-bold text-sm truncate w-full text-gray-200">{u.displayName}</div>
                                                <div className="text-xs text-gray-500 mt-1">{u.trustLevel === 'LEGEND' ? 'אגדה' : u.trustLevel === 'MENTOR' ? 'מנטור' : u.trustLevel === 'TRUSTED' ? 'נאמן' : 'שתיל'}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                                    <Search size={20} /> שאלות
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                                    {results.map((question) => (
                                        <QuestionThumbnail key={question.id} question={question} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.length === 0 && userResults.length === 0 && (
                            <div className="text-center py-20">
                                <div className="text-gray-600 mb-4 flex justify-center">
                                    <Search size={64} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-300">לא נמצאו תוצאות</h2>
                                <p className="text-gray-500 mt-2">נסה לחפש במילים אחרות או לשנות את החיפוש.</p>
                            </div>
                        )}
                    </>
                )}
                
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}

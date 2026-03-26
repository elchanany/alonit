'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, LogIn, MessageCircle, Shield, TrendingUp, Clock, Flame, User2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, orderBy, limit, setDoc, increment as firestoreIncrement } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLogo } from '@/components/ui/AppLogo';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { trackEvent } from '@/services/recommendation.service';
import { getQuestionUrl } from '@/utils/url';
import { getGenderedTexts } from '@/utils/gender';

const SEARCH_HISTORY_KEY = 'alonit_search_history';
const MAX_HISTORY = 8;

function getSearchHistory(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    } catch { return []; }
}

function saveSearchHistory(term: string) {
    const history = getSearchHistory().filter(h => h !== term);
    history.unshift(term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function removeSearchHistoryItem(term: string) {
    const history = getSearchHistory().filter(h => h !== term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

export function Header() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const texts = getGenderedTexts(userProfile?.gender);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [userResults, setUserResults] = useState<any[]>([]);
    const [questionResults, setQuestionResults] = useState<any[]>([]);
    const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check if user is admin
    useEffect(() => {
        if (!user) {
            setIsAdmin(false);
            return;
        }

        const checkAdmin = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const role = data.role;
                    setIsAdmin(role === 'super_admin' || role === 'admin' || role === 'moderator');
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }
        };

        checkAdmin();
    }, [user]);

    // Listen for unread notifications
    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const notifQuery = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
            setUnreadCount(snapshot.docs.length);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch trending searches on mount
    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const trendingRef = collection(db, 'trending_searches');
                const q = query(trendingRef, orderBy('count', 'desc'), limit(5));
                const snap = await getDocs(q);
                setTrendingSearches(snap.docs.map(d => d.data().term || d.id));
            } catch {
                setTrendingSearches([]);
            }
        };
        fetchTrending();
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && inputRef.current !== e.target) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setUserResults([]);
            setQuestionResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            const qLower = searchQuery.toLowerCase();

            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const matched = usersSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((u: any) => u.displayName?.toLowerCase().includes(qLower))
                    .slice(0, 4);
                setUserResults(matched);
            } catch { setUserResults([]); }

            try {
                const questionsSnap = await getDocs(query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(50)));
                const matched = questionsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((q: any) => q.title?.toLowerCase().includes(qLower) || q.content?.toLowerCase().includes(qLower))
                    .slice(0, 4);
                setQuestionResults(matched);
            } catch { setQuestionResults([]); }
        }, 200);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleFocus = () => {
        setSearchHistory(getSearchHistory());
        setShowDropdown(true);
    };

    const handleSearch = (term: string) => {
        if (!term.trim()) return;
        saveSearchHistory(term.trim());
        trackEvent('SEARCH', { keywords: term });

        // Save to trending_searches (fire-and-forget, may fail if rules don't allow)
        const trendingDocRef = doc(db, 'trending_searches', term.trim().toLowerCase().replace(/\s+/g, '-'));
        setDoc(trendingDocRef, { term: term.trim(), count: firestoreIncrement(1), lastSearched: new Date() }, { merge: true }).catch(() => {});

        setShowDropdown(false);
        router.push(`/search?q=${encodeURIComponent(term.trim())}`);
    };

    const getAutocompleteSuggestions = useCallback((): string[] => {
        if (!searchQuery.trim()) return [];
        const qLower = searchQuery.toLowerCase();
        const history = getSearchHistory();
        const all = [...history, ...trendingSearches];
        const unique = Array.from(new Set(all.filter(s => s.toLowerCase().startsWith(qLower) && s.toLowerCase() !== qLower)));
        return unique.slice(0, 3);
    }, [searchQuery, trendingSearches]);

    const autocompleteSuggestions = getAutocompleteSuggestions();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-indigo-500/30 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 shadow-lg">
            <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-6xl">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity active:scale-95 group">
                    <AppLogo className="h-12 w-auto" showText={false} />
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200 hidden md:block group-hover:from-indigo-200 group-hover:to-white transition-all">
                        אלונית
                    </span>
                </Link>

                {/* Search Bar */}
                <div className="flex flex-1 items-center justify-center px-2 md:px-6 max-w-md mx-auto relative">
                    <div className="relative w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            ref={inputRef}
                            type="search"
                            placeholder={`${texts.search} שאלות, משתמשים, נושאים...`}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-full py-2 pr-9 pl-4 text-sm focus:bg-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white placeholder:text-gray-500"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={handleFocus}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSearch(searchQuery);
                                if (e.key === 'Escape') setShowDropdown(false);
                            }}
                        />
                    </div>

                    {/* Search Dropdown */}
                    {showDropdown && (
                        <div ref={dropdownRef} className="absolute top-full mt-2 left-0 right-0 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                            
                            {autocompleteSuggestions.length > 0 && (
                                <div className="border-b border-gray-800">
                                    {autocompleteSuggestions.map((s, i) => (
                                        <button key={`ac-${i}`} onClick={() => { setSearchQuery(s); handleSearch(s); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 text-right transition-colors">
                                            <Search size={14} className="text-gray-500 shrink-0" />
                                            <span className="text-sm text-gray-300 truncate"><span className="text-white font-medium">{s.slice(0, searchQuery.length)}</span>{s.slice(searchQuery.length)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {userResults.length > 0 && (
                                <div className="border-b border-gray-800">
                                    <div className="px-4 py-2 text-xs font-bold text-indigo-400 flex items-center gap-1.5 bg-gray-800/50">
                                        <User2 size={12} /> משתמשים
                                    </div>
                                    {userResults.map((u: any) => (
                                        <button key={u.id} onClick={() => { setShowDropdown(false); router.push(`/user/${encodeURIComponent(u.displayName)}`); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 text-right transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0">
                                                {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover"/> : u.displayName?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{u.displayName}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {questionResults.length > 0 && (
                                <div className="border-b border-gray-800">
                                    <div className="px-4 py-2 text-xs font-bold text-indigo-400 flex items-center gap-1.5 bg-gray-800/50">
                                        <MessageCircle size={12} /> שאלות
                                    </div>
                                    {questionResults.map((q: any) => (
                                        <button key={q.id} onClick={() => { setShowDropdown(false); router.push(getQuestionUrl(q.id, q.title)); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 text-right transition-colors">
                                            <Search size={14} className="text-gray-500 shrink-0" />
                                            <span className="text-sm text-gray-300 truncate">{q.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!searchQuery.trim() && searchHistory.length > 0 && (
                                <div className="border-b border-gray-800">
                                    <div className="px-4 py-2 text-xs font-bold text-gray-400 flex items-center gap-1.5 bg-gray-800/50">
                                        <Clock size={12} /> חיפושים אחרונים
                                    </div>
                                    {searchHistory.map((h, i) => (
                                        <div key={`h-${i}`} className="flex items-center">
                                            <button onClick={() => { setSearchQuery(h); handleSearch(h); }} className="flex-1 flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 text-right transition-colors">
                                                <Clock size={14} className="text-gray-600 shrink-0" />
                                                <span className="text-sm text-gray-300 truncate">{h}</span>
                                            </button>
                                            <button onClick={() => { removeSearchHistoryItem(h); setSearchHistory(getSearchHistory()); }} className="p-2 text-gray-600 hover:text-red-400 transition-colors shrink-0">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!searchQuery.trim() && trendingSearches.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-bold text-orange-400 flex items-center gap-1.5 bg-gray-800/50">
                                        <Flame size={12} /> מגמות חיפוש
                                    </div>
                                    {trendingSearches.map((t, i) => (
                                        <button key={`t-${i}`} onClick={() => { setSearchQuery(t); handleSearch(t); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 text-right transition-colors">
                                            <Flame size={14} className="text-orange-500 shrink-0" />
                                            <span className="text-sm text-gray-300">{t}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchQuery.trim() && userResults.length === 0 && questionResults.length === 0 && autocompleteSuggestions.length === 0 && (
                                <div className="px-4 py-6 text-center text-sm text-gray-500">
                                    לא נמצאו תוצאות עבור &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-2">
                    <Link href="/ask" className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10 active:scale-95">
                        {texts.ask} שאלה
                    </Link>

                    {authLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                            <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                            <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                        </div>
                    ) : user ? (
                        <>
                            <Link href="/progress" className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10 active:scale-95" title="ההתקדמות שלי">
                                <TrendingUp size={18} />
                                <span className="hidden lg:inline">התקדמות</span>
                            </Link>

                            {isAdmin && (
                                <Link href="/admin" className="flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors px-3 py-2 rounded-full hover:bg-amber-500/10 active:scale-95" title="פאנל ניהול">
                                    <Shield size={18} />
                                    <span className="hidden lg:inline">ניהול</span>
                                </Link>
                            )}

                            <Link href="/conversations" className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10 active:scale-95">
                                <MessageCircle size={18} />
                                צ'אטים
                            </Link>
                            <Link href="/notifications" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95 flex items-center justify-center">
                                <div className="relative">
                                    <Bell size={24} />
                                    {unreadCount > 0 && (
                                        <span className={`absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-gray-900 shadow-sm leading-none z-10 ${unreadCount > 9 ? 'px-1 min-w-[20px] h-[20px]' : 'w-[20px] h-[20px]'}`}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                            </Link>
                            <Link href="/settings" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95" title="הגדרות">
                                <Settings size={20} />
                            </Link>
                            <Link href="/user/me" className="ml-2 p-0.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full border border-gray-700 hover:border-indigo-400 transition-colors active:scale-95">
                                <UserAvatar user={userProfile} size="sm" />
                            </Link>
                        </>
                    ) : (
                        <Link href="/login" className="flex items-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-colors active:scale-95">
                            <LogIn size={16} />
                            {texts.login}
                        </Link>
                    )}
                </nav>

                {/* Mobile Icons */}
                <div className="flex md:hidden items-center gap-2">
                    {authLoading ? (
                        <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                    ) : user ? (
                        <Link href="/settings" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95">
                            <Settings size={20} />
                        </Link>
                    ) : (
                        <Link href="/login" className="text-sm font-medium text-white active:scale-95">
                            <LogIn size={20} />
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}

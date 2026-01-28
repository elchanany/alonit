'use client';

import Link from 'next/link';
import { Search, Bell, User, Settings, LogIn, MessageCircle, Shield, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLogo } from '@/components/ui/AppLogo';

export function Header() {
    const { user, loading: authLoading } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);

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

    return (
        <header className="sticky top-0 z-40 w-full border-b border-indigo-500/30 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 shadow-lg">
            <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-6xl">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity active:scale-95">
                    <AppLogo className="h-10 w-auto" />
                </Link>

                {/* Search Bar */}
                <div className="flex flex-1 items-center justify-center px-2 md:px-6 max-w-md mx-auto">
                    <div className="relative w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="search"
                            placeholder="חפש..."
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-full py-2 pr-9 pl-4 text-sm focus:bg-black focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-2">
                    <Link href="/ask" className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10 active:scale-95">
                        שאל שאלה
                    </Link>

                    {authLoading ? (
                        /* Skeleton during auth loading */
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                            <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                            <div className="w-8 h-8 bg-gray-700/50 rounded-full animate-pulse" />
                        </div>
                    ) : user ? (
                        <>
                            {/* Progress Link - for all logged in users */}
                            <Link href="/progress" className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10 active:scale-95" title="ההתקדמות שלי">
                                <TrendingUp size={18} />
                                <span className="hidden lg:inline">התקדמות</span>
                            </Link>

                            {/* Admin Link - only for admins */}
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
                            <Link href="/notifications" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors relative active:scale-95">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                            <Link href="/settings" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95" title="הגדרות">
                                <Settings size={20} />
                            </Link>
                            <Link href="/user/me" className="ml-2 p-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full border border-gray-700 hover:border-indigo-400 transition-colors active:scale-95">
                                <User size={20} className="text-white" />
                            </Link>
                        </>
                    ) : (
                        <Link href="/login" className="flex items-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-colors active:scale-95">
                            <LogIn size={16} />
                            התחברות
                        </Link>
                    )}
                </nav>

                {/* Mobile Icons (only on mobile) */}
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

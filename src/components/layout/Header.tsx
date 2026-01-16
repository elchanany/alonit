'use client';

import Link from 'next/link';
import { Search, Bell, User, Settings, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function Header() {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

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
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white hover:opacity-80 transition-opacity">
                    🌺 <span className="hidden md:inline">אלונית</span>
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
                    <Link href="/ask" className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10">
                        שאל שאלה
                    </Link>

                    {user ? (
                        <>
                            <Link href="/notifications" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors relative">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-black"></span>
                                )}
                            </Link>
                            <Link href="/settings" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="הגדרות">
                                <Settings size={20} />
                            </Link>
                            <Link href="/user/me" className="ml-2 p-1 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full border border-gray-700 hover:border-indigo-400 transition-colors">
                                <User size={20} className="text-white" />
                            </Link>
                        </>
                    ) : (
                        <Link href="/login" className="flex items-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-colors">
                            <LogIn size={16} />
                            התחברות
                        </Link>
                    )}
                </nav>

                {/* Mobile Icons */}
                <div className="flex md:hidden items-center gap-3">
                    {user ? (
                        <Link href="/notifications" className="p-1 relative">
                            <Bell size={20} className="text-gray-400 hover:text-white" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
                            )}
                        </Link>
                    ) : (
                        <Link href="/login" className="flex items-center gap-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full transition-colors">
                            <LogIn size={14} />
                            התחבר
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}

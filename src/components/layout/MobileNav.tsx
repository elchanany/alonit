'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, PlusCircle, Bell, User, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function MobileNav() {
    const pathname = usePathname();
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

    const isActive = (path: string) => pathname === path;

    // Different nav items based on auth state
    const navItems = user ? [
        { href: '/', icon: Home, label: 'ראשי' },
        { href: '/conversations', icon: MessageCircle, label: "צ'אט" },
        { href: '/ask', icon: PlusCircle, label: 'שאל', isMain: true },
        { href: '/notifications', icon: Bell, badge: unreadCount }, // No label!
        { href: '/user/me', icon: User, label: 'פרופיל' },
    ] : [
        { href: '/', icon: Home, label: 'ראשי' },
        { href: '/ask', icon: PlusCircle, label: 'שאל', isMain: true },
        { href: '/login', icon: LogIn, label: 'התחברות' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-t border-indigo-500/30 flex items-center justify-around z-[100] md:hidden pb-1 shadow-[0_-4px_15px_-1px_rgba(99,102,241,0.3)]">
            {navItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center gap-1 p-2 relative ${item.isMain
                        ? 'text-white'
                        : isActive(item.href)
                            ? 'text-white'
                            : 'text-indigo-300'
                        }`}
                >
                    {item.isMain ? (
                        <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg -mt-6 border-2 border-indigo-400 -ml-1">
                            <item.icon size={28} strokeWidth={2} />
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <item.icon size={24} strokeWidth={isActive(item.href) ? 2.5 : 2} />
                                {item.badge && item.badge > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </div>
                                )}
                            </div>
                            {item.label && (
                                <span className="text-[10px] font-medium">{item.label}</span>
                            )}
                        </>
                    )}
                </Link>
            ))}
        </div>
    );
}

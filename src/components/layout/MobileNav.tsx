'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, PlusCircle, Bell, User, LogIn, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function MobileNav() {
    const pathname = usePathname();
    const { user, loading: authLoading } = useAuth();
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
    const isAdmin = user?.email === 'eyceyceyc139@gmail.com';

    // Show skeleton during auth loading
    if (authLoading) {
        return (
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-t border-indigo-500/30 flex items-center justify-around z-[100] md:hidden pb-1 shadow-[0_-4px_15px_-1px_rgba(99,102,241,0.3)]">
                <div className="flex flex-col items-center gap-1 p-2">
                    <div className="w-6 h-6 bg-gray-700/50 rounded-full animate-pulse" />
                    <div className="w-8 h-2 bg-gray-700/50 rounded animate-pulse mt-1" />
                </div>
                <div className="w-12 h-12 bg-indigo-600/50 rounded-full -mt-6 animate-pulse" />
                <div className="flex flex-col items-center gap-1 p-2">
                    <div className="w-6 h-6 bg-gray-700/50 rounded-full animate-pulse" />
                    <div className="w-8 h-2 bg-gray-700/50 rounded animate-pulse mt-1" />
                </div>
            </div>
        );
    }

    // Nav item component
    const NavItem = ({ href, icon: Icon, label, badge }: { href: string; icon: any; label?: string; badge?: number }) => (
        <Link
            href={href}
            className={`flex flex-col items-center gap-0.5 p-1.5 relative transition-transform active:scale-90 ${isActive(href) ? 'text-white' : 'text-indigo-300'
                }`}
        >
            <div className="relative">
                <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 2} />
                {badge && badge > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                    </div>
                )}
            </div>
            {label && <span className="text-[9px] font-medium">{label}</span>}
        </Link>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border-t border-indigo-500/30 z-[100] md:hidden pb-1 shadow-[0_-4px_15px_-1px_rgba(99,102,241,0.3)]">
            <div className="h-full flex items-center justify-between px-2">
                {/* Left side items */}
                <div className="flex items-center gap-1">
                    <NavItem href="/" icon={Home} label="ראשי" />
                    {user && <NavItem href="/conversations" icon={MessageCircle} label="צ'אט" />}
                </div>

                {/* Center - Main Add Button */}
                <Link
                    href="/ask"
                    className="absolute left-1/2 -translate-x-1/2 -top-4"
                >
                    <div className={`w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-indigo-900 active:scale-95 transition-transform ${isActive('/ask') ? 'ring-2 ring-indigo-400' : ''
                        }`}>
                        <PlusCircle size={28} strokeWidth={2} className="text-white" />
                    </div>
                </Link>

                {/* Right side items */}
                <div className="flex items-center gap-1">
                    {user ? (
                        <>
                            <NavItem href="/notifications" icon={Bell} badge={unreadCount > 0 ? unreadCount : undefined} />
                            <NavItem href="/user/me" icon={User} label="פרופיל" />
                            {isAdmin && <NavItem href="/admin" icon={Settings} label="ניהול" />}
                        </>
                    ) : (
                        <NavItem href="/login" icon={LogIn} label="התחברות" />
                    )}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { LEVEL_UNLOCKS, UserLevel } from '@/types/user-levels';

interface LevelUpNotificationProps {
    newLevel: UserLevel;
    onClose: () => void;
}

export default function LevelUpNotification({ newLevel, onClose }: LevelUpNotificationProps) {
    const [show, setShow] = useState(false);
    const levelData = LEVEL_UNLOCKS[newLevel];

    useEffect(() => {
        // אנימציה של כניסה
        setTimeout(() => setShow(true), 100);
    }, []);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300);
    };

    return (
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={handleClose}
        >
            <div
                className={`bg-white rounded-3xl p-12 max-w-lg mx-4 text-center transform transition-all duration-300 ${show ? 'scale-100' : 'scale-75'
                    }`}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                {/* אנימציה של זיקוקים */}
                <div className="text-8xl mb-6 animate-bounce">
                    🎉
                </div>

                <h2 className="text-4xl font-bold text-green-800 mb-4">
                    מזל טוב! 🎊
                </h2>

                <div className="text-7xl mb-6 animate-pulse">
                    {levelData.icon}
                </div>

                <h3 className="text-3xl font-bold text-green-700 mb-3">
                    עלית לרמת {levelData.name}!
                </h3>

                <p className="text-gray-600 mb-6">
                    {levelData.description}
                </p>

                {/* יכולות חדשות */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 mb-6">
                    <h4 className="font-bold text-green-800 mb-3 text-lg">
                        🎁 יכולות חדשות שנפתחו:
                    </h4>
                    <ul className="space-y-2">
                        {levelData.unlocks.map((unlock, i) => (
                            <li
                                key={i}
                                className="flex items-center gap-2 text-green-700 font-medium"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <span className="text-xl">✨</span>
                                <span>{unlock}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    onClick={handleClose}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                >
                    מעולה! 🚀
                </button>
            </div>
        </div>
    );
}

/**
 * Hook לשימוש בהתראות עליית רמה
 * 
 * דוגמה לשימוש:
 * 
 * const { showLevelUp } = useLevelUpNotification();
 * 
 * // כשמשתמש עולה רמה:
 * if (levelChanged) {
 *   showLevelUp(newLevel);
 * }
 */
export function useLevelUpNotification() {
    const [notification, setNotification] = useState<UserLevel | null>(null);

    const showLevelUp = (newLevel: UserLevel) => {
        setNotification(newLevel);
    };

    const hideNotification = () => {
        setNotification(null);
    };

    const NotificationComponent = notification ? (
        <LevelUpNotification
            newLevel={notification}
            onClose={hideNotification}
        />
    ) : null;

    return {
        showLevelUp,
        LevelUpNotification: NotificationComponent
    };
}

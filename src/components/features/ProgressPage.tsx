'use client';

import { UserProfile, UserLevel, LEVEL_UNLOCKS, LEVEL_REQUIREMENTS } from '@/types/user-levels';
import { getProgressToNextLevel } from '@/services/user-level.service';

interface ProgressPageProps {
    userProfile: UserProfile;
}

export default function ProgressPage({ userProfile }: ProgressPageProps) {
    const defaultLevel = userProfile.level || UserLevel.SEEDLING;
    const currentLevelData = LEVEL_UNLOCKS[defaultLevel];
    const stats = userProfile.stats || { points: 0, flowers: 0, correctAnswers: 0, questionsAsked: 0, helpfulAnswers: 0, daysActive: 0, streak: 0 };
    const progress = getProgressToNextLevel(stats, defaultLevel);

    const levels = [UserLevel.SEEDLING, UserLevel.TRUNK, UserLevel.OAK];
    const currentIndex = levels.indexOf(defaultLevel);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-6" dir="rtl">
            <div className="max-w-6xl mx-auto">
                {/* כותרת */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 bg-clip-text text-transparent mb-4">
                        מסע ההתקדמות שלך 🌳
                    </h1>
                    <p className="text-xl text-gray-300">
                        גדל מ{LEVEL_UNLOCKS[UserLevel.SEEDLING].name} ל{LEVEL_UNLOCKS[UserLevel.OAK].name}
                    </p>
                </div>

                {/* הרמה הנוכחית */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <span className="text-7xl">{currentLevelData.icon}</span>
                            <div>
                                <h2 className="text-3xl font-bold text-indigo-400">{currentLevelData.name}</h2>
                                <p className="text-gray-400">{currentLevelData.description}</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <div className="text-4xl font-bold text-purple-400">{progress}%</div>
                            <div className="text-sm text-gray-500">התקדמות</div>
                        </div>
                    </div>

                    {/* פס התקדמות */}
                    {userProfile.level !== UserLevel.OAK && (
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>התקדמות לרמה הבאה</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* סטטיסטיקות */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon="⭐" label="נקודות" value={stats.points} />
                        <StatCard icon="🌸" label="פרחים" value={stats.flowers} />
                        <StatCard icon="✅" label="תשובות נכונות" value={stats.correctAnswers} />
                        <StatCard icon="❓" label="שאלות" value={stats.questionsAsked} />
                        <StatCard icon="💡" label="תשובות מועילות" value={stats.helpfulAnswers} />
                        <StatCard icon="📅" label="ימים פעילים" value={stats.daysActive} />
                        <StatCard icon="🔥" label="רצף ימים" value={stats.streak} />
                    </div>
                </div>

                {/* מפת התקדמות */}
                <div className="space-y-6">
                    {levels.map((level, index) => {
                        const levelData = LEVEL_UNLOCKS[level];
                        const requirements = LEVEL_REQUIREMENTS[level];
                        const isUnlocked = index <= currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                            <div
                                key={level}
                                className={`relative bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-xl p-8 transition-all duration-300 ${isCurrent
                                    ? 'border-2 border-indigo-500 scale-[1.02]'
                                    : isUnlocked
                                        ? 'border border-indigo-500/30'
                                        : 'border border-gray-700 opacity-60'
                                    }`}
                            >
                                {/* קו חיבור */}
                                {index < levels.length - 1 && (
                                    <div className={`absolute left-1/2 -bottom-6 w-1 h-6 ${isUnlocked ? 'bg-indigo-500' : 'bg-gray-700'
                                        }`} />
                                )}

                                <div className="flex items-start gap-6">
                                    {/* אייקון */}
                                    <div className={`text-6xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
                                        {levelData.icon}
                                    </div>

                                    {/* תוכן */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-3xl font-bold text-indigo-400">{levelData.name}</h3>
                                            {isCurrent && (
                                                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                                    הרמה שלך
                                                </span>
                                            )}
                                            {isUnlocked && !isCurrent && (
                                                <span className="bg-gray-600 text-gray-200 px-3 py-1 rounded-full text-sm">
                                                    ✓ הושג
                                                </span>
                                            )}
                                            {!isUnlocked && (
                                                <span className="bg-gray-700 text-gray-400 px-3 py-1 rounded-full text-sm">
                                                    🔒 נעול
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-400 mb-4">{levelData.description}</p>

                                        {/* דרישות */}
                                        {!isUnlocked && index > 0 && (
                                            <div className="bg-amber-900/30 border border-amber-600/30 rounded-xl p-4 mb-4">
                                                <h4 className="font-bold text-amber-400 mb-2">📋 דרישות לפתיחה:</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                                    <RequirementItem
                                                        label="נקודות"
                                                        current={stats.points}
                                                        required={requirements.minPoints}
                                                        isUnlocked={isUnlocked}
                                                    />
                                                    <RequirementItem
                                                        label="פרחים"
                                                        current={stats.flowers}
                                                        required={requirements.minFlowers}
                                                        isUnlocked={isUnlocked}
                                                    />
                                                    <RequirementItem
                                                        label="תשובות נכונות"
                                                        current={stats.correctAnswers}
                                                        required={requirements.minCorrectAnswers}
                                                        isUnlocked={isUnlocked}
                                                    />
                                                    <RequirementItem
                                                        label="שאלות"
                                                        current={stats.questionsAsked}
                                                        required={requirements.minQuestionsAsked}
                                                        isUnlocked={isUnlocked}
                                                    />
                                                    <RequirementItem
                                                        label="ימים פעילים"
                                                        current={stats.daysActive}
                                                        required={requirements.minDaysActive}
                                                        isUnlocked={isUnlocked}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* יכולות */}
                                        <div>
                                            <h4 className="font-bold text-indigo-400 mb-2">🎁 יכולות:</h4>
                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {levelData.unlocks.map((unlock, i) => (
                                                    <li
                                                        key={i}
                                                        className={`flex items-center gap-2 text-sm ${isUnlocked ? 'text-indigo-300' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        <span>{isUnlocked ? '✅' : '⭕'}</span>
                                                        <span>{unlock}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* הודעת עידוד */}
                {defaultLevel !== UserLevel.OAK && currentIndex + 1 < levels.length && (
                    <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 text-center">
                        <h3 className="text-2xl font-bold mb-2">המשך כך! 💪</h3>
                        <p className="text-lg">
                            אתה ב-{progress}% מהדרך ל{LEVEL_UNLOCKS[levels[currentIndex + 1]].name}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
    return (
        <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-indigo-500/20">
            <div className="text-3xl mb-1">{icon}</div>
            <div className="text-2xl font-bold text-indigo-400">{value}</div>
            <div className="text-xs text-gray-400">{label}</div>
        </div>
    );
}

function RequirementItem({
    label,
    current,
    required,
    isUnlocked
}: {
    label: string;
    current: number;
    required: number;
    isUnlocked: boolean;
}) {
    const met = current >= required || isUnlocked;

    return (
        <div className={`flex items-center gap-1 ${met ? 'text-indigo-400' : 'text-gray-400'}`}>
            <span>{met ? '✅' : '⏳'}</span>
            <span>{label}: {current}/{required}</span>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { UserProfile, UserLevel, UserRole, LEVEL_UNLOCKS } from '@/types/user-levels';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    getAllUsers,
    promoteUser,
    blockUser,
    unblockUser,
    getUserProfile
} from '@/services/user-level.service';
import { logBlockUser, logUnblockUser, logPromoteUser, getAdminActionsLog } from '@/services/admin-actions.service';
import { AdminActionLog, ACTION_LABELS } from '@/types/admin-actions';
import { useAuth } from '@/context/AuthContext';
import { fixUserProfile } from '@/services/fix-profile.service';

export default function AdminPanel() {
    const { user, userProfile: currentUserProfile } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    // const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null); // Removed locally
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'logs'>('dashboard');
    const [actionLogs, setActionLogs] = useState<AdminActionLog[]>([]);
    const [questionsCount, setQuestionsCount] = useState(0);
    const [answersCount, setAnswersCount] = useState(0);
    const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
    const [fixingProfiles, setFixingProfiles] = useState(false);

    useEffect(() => {
        loadData();
    }, [user, currentUserProfile]);

    async function loadData() {
        if (!user || !currentUserProfile) return;

        try {
            setLoading(true);
            // Profile is now from context

            if (currentUserProfile) {
                const allUsers = await getAllUsers(user.uid);
                setUsers(allUsers);

                // Sort by lastActive for recent users
                const sorted = [...allUsers].sort((a, b) => {
                    const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
                    const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
                    return bDate - aDate;
                });
                setRecentUsers(sorted.slice(0, 5));

                // Get questions count
                try {
                    const questionsSnap = await getDocs(collection(db, 'questions'));
                    setQuestionsCount(questionsSnap.size);

                    // Count answers (approximate from answerCount field)
                    let totalAnswers = 0;
                    questionsSnap.docs.forEach(doc => {
                        totalAnswers += doc.data().answerCount || 0;
                    });
                    setAnswersCount(totalAnswers);
                } catch (e) {
                    console.error('Error counting questions:', e);
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleFixAllProfiles() {
        if (!confirm('האם לתקן את כל הפרופילים עם נתונים חסרים?')) return;
        setFixingProfiles(true);
        let successCount = 0;
        let failCount = 0;
        let errors: string[] = [];

        try {
            // Filter users who are missing level, role, OR display name (or have empty display name)
            const brokenProfiles = users.filter(u => !u.level || !u.role || !u.displayName || u.displayName.trim() === '');

            for (const profile of brokenProfiles) {
                try {
                    await fixUserProfile(profile.uid, profile.email, profile.displayName);
                    successCount++;
                } catch (err: any) {
                    console.error(`Error fixing profile ${profile.uid}:`, err);
                    failCount++;
                    errors.push(`${profile.displayName || profile.email}: ${err.message}`);
                }
            }

            if (failCount > 0) {
                alert(`התהליך הסתיים. תוקנו: ${successCount}. נכשלו: ${failCount}.\n\nשגיאות:\n${errors.join('\n')}`);
            } else {
                alert(`כל ${successCount} הפרופילים תוקנו בהצלחה!`);
            }

            await loadData();
        } catch (error: any) {
            console.error('Critical error in fix profiles:', error);
            alert('שגיאה קריטית בתהליך התיקון: ' + error.message);
        } finally {
            setFixingProfiles(false);
        }
    }

    async function handlePromote(targetUid: string, newLevel: UserLevel, newRole: UserRole, reason: string) {
        if (!user || !currentUserProfile || !selectedUser) return;
        try {
            await promoteUser(targetUid, newLevel, newRole, user.uid);
            await logPromoteUser(
                {
                    uid: user.uid,
                    displayName: currentUserProfile.displayName || currentUserProfile.email || 'Admin',
                    email: currentUserProfile.email
                },
                {
                    uid: selectedUser.uid,
                    displayName: selectedUser.displayName || selectedUser.email || 'Unknown',
                    email: selectedUser.email
                },
                reason,
                LEVEL_UNLOCKS[newLevel].name,
                newRole
            );
            await loadData();
            setShowPromoteModal(false);
            setSelectedUser(null);
        } catch (error: any) {
            alert(error.message);
        }
    }

    async function handleBlock(targetUid: string, reason: string) {
        if (!user || !currentUserProfile || !selectedUser) return;
        try {
            await blockUser(targetUid, reason, user.uid);
            await logBlockUser(
                { uid: user.uid, displayName: currentUserProfile.displayName, email: currentUserProfile.email },
                { uid: selectedUser.uid, displayName: selectedUser.displayName, email: selectedUser.email },
                reason
            );
            await loadData();
            setShowBlockModal(false);
            setSelectedUser(null);
        } catch (error: any) {
            alert(error.message);
        }
    }

    async function handleUnblock(targetUid: string, targetUser: UserProfile) {
        if (!user || !currentUserProfile) return;
        const reason = prompt('סיבה לביטול החסימה:');
        if (!reason) return;
        try {
            await unblockUser(targetUid, user.uid);
            await logUnblockUser(
                { uid: user.uid, displayName: currentUserProfile.displayName, email: currentUserProfile.email },
                { uid: targetUser.uid, displayName: targetUser.displayName, email: targetUser.email },
                reason
            );
            await loadData();
        } catch (error: any) {
            alert(error.message);
        }
    }

    async function loadActionLogs() {
        try {
            const logs = await getAdminActionsLog({ limit: 50 });
            setActionLogs(logs);
        } catch (error) {
            console.error('Error loading action logs:', error);
        }
    }

    // Helper functions for display
    const getLevelIcon = (level?: UserLevel) => {
        if (!level) return '🌱'; // Default to seedling
        return LEVEL_UNLOCKS[level]?.icon || '🌱';
    };

    const getLevelName = (level?: UserLevel) => {
        if (!level) return 'שתיל';
        return LEVEL_UNLOCKS[level]?.name || 'שתיל';
    };

    // Statistics
    const totalPoints = users.reduce((sum, u) => sum + (u.stats?.points || 0), 0);
    const totalFlowers = users.reduce((sum, u) => sum + (u.stats?.flowers || 0), 0);
    const brokenProfilesCount = users.filter(u => !u.level || !u.role || !u.displayName || u.displayName.trim() === '').length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-2xl text-white">טוען...</div>
            </div>
        );
    }

    if (!currentUserProfile || currentUserProfile.role === UserRole.USER) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-red-400 mb-4">🚫 אין גישה</h1>
                    <p className="text-gray-400">אין לך הרשאות לצפות בדף זה</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* כותרת */}
                <div className="bg-gray-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">🛡️ פאנל ניהול</h1>
                            <p className="text-gray-400">שלום {currentUserProfile.displayName} - {getLevelName(currentUserProfile.level)}</p>
                            {currentUserProfile.role === UserRole.SUPER_ADMIN && (
                                <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold mt-2">👑 מנהל ראשי</span>
                            )}
                        </div>
                        <div className="text-left flex items-center gap-4">
                            {brokenProfilesCount > 0 && (
                                <button
                                    onClick={handleFixAllProfiles}
                                    disabled={fixingProfiles}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                                >
                                    {fixingProfiles ? '⏳ מתקן...' : `🔧 תקן ${brokenProfilesCount} פרופילים`}
                                </button>
                            )}
                            <div>
                                <div className="text-3xl font-bold text-indigo-400">{users.length}</div>
                                <div className="text-sm text-gray-500">משתמשים</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* טאבים */}
                <div className="flex gap-4 mb-6">
                    <button onClick={() => setActiveTab('dashboard')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        📊 דשבורד
                    </button>
                    <button onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        👥 משתמשים
                    </button>
                    <button onClick={() => { setActiveTab('logs'); loadActionLogs(); }}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'logs' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        📋 לוג פעולות
                    </button>
                </div>

                {/* דשבורד */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* כרטיסי סטטיסטיקה */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <StatCard icon="👥" label="משתמשים" value={users.length} color="indigo" />
                            <StatCard icon="🌱" label="שתילים" value={users.filter(u => !u.level || u.level === UserLevel.SEEDLING).length} color="green" />
                            <StatCard icon="🌳" label="גזעים" value={users.filter(u => u.level === UserLevel.TRUNK).length} color="emerald" />
                            <StatCard icon="🌲" label="אלונים" value={users.filter(u => u.level === UserLevel.OAK).length} color="teal" />
                            <StatCard icon="❓" label="שאלות" value={questionsCount} color="purple" />
                            <StatCard icon="💬" label="תשובות" value={answersCount} color="blue" />
                            <StatCard icon="⭐" label="סה״כ נקודות" value={totalPoints} color="yellow" />
                            <StatCard icon="🌸" label="סה״כ פרחים" value={totalFlowers} color="pink" />
                            <StatCard icon="🚫" label="חסומים" value={users.filter(u => u.isBlocked).length} color="red" />
                            <StatCard icon="⚠️" label="פרופילים לתיקון" value={brokenProfilesCount} color="orange" />
                        </div>

                        {/* משתמשים פעילים אחרונים */}
                        <div className="bg-gray-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">⏰ פעילים לאחרונה</h3>
                            <div className="space-y-3">
                                {recentUsers.map(u => (
                                    <div key={u.uid} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getLevelIcon(u.level)}</span>
                                            <div>
                                                <div className="font-bold text-white">{u.displayName}</div>
                                                <div className="text-xs text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm text-indigo-400">{u.stats?.points || 0} נק׳</div>
                                            <div className="text-xs text-gray-500">
                                                {u.lastActive ? new Date(u.lastActive).toLocaleDateString('he-IL') : 'לא ידוע'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* התפלגות לפי רמה */}
                        <div className="bg-gray-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">📈 התפלגות משתמשים</h3>
                            <div className="space-y-3">
                                <LevelBar label="🌱 שתילים" count={users.filter(u => !u.level || u.level === UserLevel.SEEDLING).length} total={users.length} color="bg-green-500" />
                                <LevelBar label="🌳 גזעים" count={users.filter(u => u.level === UserLevel.TRUNK).length} total={users.length} color="bg-emerald-500" />
                                <LevelBar label="🌲 אלונים" count={users.filter(u => u.level === UserLevel.OAK).length} total={users.length} color="bg-teal-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* טבלת משתמשים */}
                {activeTab === 'users' && (
                    <div className="bg-gray-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-right">משתמש</th>
                                        <th className="px-6 py-4 text-right">רמה</th>
                                        <th className="px-6 py-4 text-right">תפקיד</th>
                                        <th className="px-6 py-4 text-right">נקודות</th>
                                        <th className="px-6 py-4 text-right">פרחים</th>
                                        <th className="px-6 py-4 text-right">סטטוס</th>
                                        <th className="px-6 py-4 text-right">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {users.map((userProfile) => (
                                        <tr key={userProfile.uid} className={`hover:bg-indigo-900/30 transition-colors ${userProfile.isBlocked ? 'bg-red-900/20' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden">
                                                        {userProfile.photoURL ? (
                                                            <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg font-bold text-gray-400">
                                                                {(userProfile.displayName || '?')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">
                                                            {userProfile.displayName || '(חסר שם)'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {userProfile.email || userProfile.uid}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{getLevelIcon(userProfile.level)}</span>
                                                    <span className="text-sm text-gray-400">{getLevelName(userProfile.level)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><RoleBadge role={userProfile.role} /></td>
                                            <td className="px-6 py-4 font-bold text-indigo-400">{userProfile.stats?.points ?? 0}</td>
                                            <td className="px-6 py-4 font-bold text-purple-400">{userProfile.stats?.flowers ?? 0}</td>
                                            <td className="px-6 py-4">
                                                {userProfile.isBlocked ? (
                                                    <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">חסום</span>
                                                ) : !userProfile.level ? (
                                                    <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">לתקן</span>
                                                ) : (
                                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">פעיל</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {userProfile.role !== UserRole.SUPER_ADMIN && (
                                                        <>
                                                            <button onClick={() => { setSelectedUser(userProfile); setShowPromoteModal(true); }}
                                                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors">
                                                                ⬆️ קדם
                                                            </button>
                                                            {userProfile.isBlocked ? (
                                                                <button onClick={() => handleUnblock(userProfile.uid, userProfile)}
                                                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors">
                                                                    ✅ בטל חסימה
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => { setSelectedUser(userProfile); setShowBlockModal(true); }}
                                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors">
                                                                    🚫 חסום
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* לוג פעולות */}
                {activeTab === 'logs' && (
                    <div className="bg-gray-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white">📋 לוג פעולות ניהוליות</h2>
                            <p className="text-gray-400 text-sm">רשימת כל הפעולות שבוצעו על ידי מנהלים</p>
                        </div>
                        <div className="divide-y divide-gray-700">
                            {actionLogs.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>אין פעולות ניהוליות עדיין</p>
                                </div>
                            ) : (
                                actionLogs.map((log) => (
                                    <div key={log.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-sm font-bold">
                                                        {ACTION_LABELS[log.actionType]}
                                                    </span>
                                                    <span className="text-gray-500 text-sm">{log.relativeTime}</span>
                                                </div>
                                                <p className="text-white">
                                                    <span className="font-bold">{log.adminDisplayName}</span>
                                                    <span className="text-gray-400"> ביצע פעולה על </span>
                                                    <span className="font-bold">{log.targetDisplayName}</span>
                                                </p>
                                                <p className="text-gray-400 text-sm mt-1">סיבה: {log.reason}</p>
                                            </div>
                                            <div className="text-left text-sm text-gray-500">
                                                <div>{log.gregorianDate}</div>
                                                <div className="text-xs">{log.hebrewDate}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* מודלים */}
                {showPromoteModal && selectedUser && (
                    <PromoteModal
                        user={selectedUser}
                        onClose={() => { setShowPromoteModal(false); setSelectedUser(null); }}
                        onPromote={handlePromote}
                        isSuperAdmin={currentUserProfile.role === UserRole.SUPER_ADMIN}
                    />
                )}

                {showBlockModal && selectedUser && (
                    <BlockModal
                        user={selectedUser}
                        onClose={() => { setShowBlockModal(false); setSelectedUser(null); }}
                        onBlock={handleBlock}
                    />
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string; }) {
    const colorMap: Record<string, string> = {
        indigo: 'border-indigo-500/30 text-indigo-400',
        green: 'border-green-500/30 text-green-400',
        emerald: 'border-emerald-500/30 text-emerald-400',
        teal: 'border-teal-500/30 text-teal-400',
        purple: 'border-purple-500/30 text-purple-400',
        blue: 'border-blue-500/30 text-blue-400',
        yellow: 'border-yellow-500/30 text-yellow-400',
        pink: 'border-pink-500/30 text-pink-400',
        red: 'border-red-500/30 text-red-400',
        orange: 'border-orange-500/30 text-orange-400',
    };
    const classes = colorMap[color] || colorMap.indigo;
    return (
        <div className={`bg-gray-800/50 rounded-2xl p-4 border ${classes.split(' ')[0]} backdrop-blur-sm`}>
            <div className="text-3xl mb-1">{icon}</div>
            <div className={`text-2xl font-bold ${classes.split(' ')[1]}`}>{value}</div>
            <div className="text-xs text-gray-400">{label}</div>
        </div>
    );
}

function LevelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{label}</span>
                <span className="text-gray-500">{count} ({percent}%)</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}

function RoleBadge({ role }: { role?: UserRole }) {
    const badges: Record<string, { text: string; color: string }> = {
        [UserRole.SUPER_ADMIN]: { text: 'מנהל ראשי', color: 'from-yellow-400 to-orange-500' },
        [UserRole.ADMIN]: { text: 'אלון', color: 'from-teal-400 to-cyan-500' },
        [UserRole.MODERATOR]: { text: 'גזע', color: 'from-emerald-400 to-green-500' },
        [UserRole.USER]: { text: 'שתיל', color: 'from-gray-400 to-gray-500' }
    };
    const badge = role ? badges[role] : badges[UserRole.USER];
    const finalBadge = badge || { text: 'שתיל', color: 'from-gray-400 to-gray-500' };
    return (
        <span className={`bg-gradient-to-r ${finalBadge.color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
            {finalBadge.text}
        </span>
    );
}

function PromoteModal({ user, onClose, onPromote, isSuperAdmin }: {
    user: UserProfile;
    onClose: () => void;
    onPromote: (uid: string, level: UserLevel, role: UserRole, reason: string) => void;
    isSuperAdmin: boolean;
}) {
    const [selectedLevel, setSelectedLevel] = useState(user.level || UserLevel.SEEDLING);
    const [selectedRole, setSelectedRole] = useState(user.role || UserRole.USER);
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" dir="rtl">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-indigo-400 mb-4">קדם משתמש: {user.displayName}</h2>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">רמה:</label>
                        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value as UserLevel)}
                            className="w-full bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-2">
                            <option value={UserLevel.SEEDLING}>🌱 שתיל</option>
                            <option value={UserLevel.TRUNK}>🌳 גזע</option>
                            <option value={UserLevel.OAK}>🌲 אלון</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">תפקיד:</label>
                        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className="w-full bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-2">
                            <option value={UserRole.USER}>משתמש רגיל</option>
                            <option value={UserRole.MODERATOR}>גזע (מנהל)</option>
                            {isSuperAdmin && <option value={UserRole.ADMIN}>אלון (מנהל בכיר)</option>}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">סיבה (חובה):</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-2 h-20 placeholder-gray-500"
                            placeholder="למה אתה מקדם את המשתמש הזה?" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => reason.trim() && onPromote(user.uid, selectedLevel, selectedRole, reason)} disabled={!reason.trim()}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50">
                        ✅ קדם
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-700 text-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-600">
                        ❌ ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}

function BlockModal({ user, onClose, onBlock }: {
    user: UserProfile;
    onClose: () => void;
    onBlock: (uid: string, reason: string) => void;
}) {
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" dir="rtl">
            <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-red-400 mb-4">חסום משתמש: {user.displayName}</h2>
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-300 mb-2">סיבה:</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-2 h-32 placeholder-gray-500"
                        placeholder="למה אתה חוסם את המשתמש הזה?" />
                </div>
                <div className="flex gap-3">
                    <button onClick={() => reason.trim() && onBlock(user.uid, reason)} disabled={!reason.trim()}
                        className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50">
                        🚫 חסום
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-700 text-gray-300 px-6 py-3 rounded-xl font-bold hover:bg-gray-600">
                        ❌ ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}

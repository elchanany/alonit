import { db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    increment
} from 'firebase/firestore';
import {
    UserProfile,
    UserLevel,
    UserRole,
    UserStats,
    LEVEL_REQUIREMENTS,
    LEVEL_PERMISSIONS
} from '@/types/user-levels';

const SUPER_ADMIN_EMAIL = 'eyceyceyc139@gmail.com';

// יצירת פרופיל משתמש חדש
export async function createUserProfile(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<UserProfile> {
    const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

    const profile: UserProfile = {
        uid,
        email,
        displayName,
        photoURL,
        level: isSuperAdmin ? UserLevel.OAK : UserLevel.SEEDLING,
        role: isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.USER,
        stats: {
            points: 0,
            flowers: 0,
            correctAnswers: 0,
            questionsAsked: 0,
            helpfulAnswers: 0,
            daysActive: 0,
            streak: 0
        },
        createdAt: new Date(),
        lastActive: new Date(),
        isBlocked: false
    };

    await setDoc(doc(db, 'users', uid), {
        ...profile,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
    });

    return profile;
}

// קבלת פרופיל משתמש
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    const data = docSnap.data();
    return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        lastActive: data.lastActive?.toDate(),
        promotedAt: data.promotedAt?.toDate()
    } as UserProfile;
}

// עדכון סטטיסטיקות משתמש
export async function updateUserStats(
    uid: string,
    updates: Partial<UserStats>
): Promise<{ leveledUp: boolean; newLevel?: UserLevel }> {
    const docRef = doc(db, 'users', uid);
    const incrementUpdates: any = {};

    Object.entries(updates).forEach(([key, value]) => {
        incrementUpdates[`stats.${key}`] = increment(value);
    });

    await updateDoc(docRef, {
        ...incrementUpdates,
        lastActive: serverTimestamp()
    });

    // בדוק אם המשתמש עלה רמה
    const result = await checkAndUpdateLevel(uid);

    if (result.leveledUp) {
        return { leveledUp: true, newLevel: result.newLevel };
    }

    return { leveledUp: false };
}

// בדיקה ועדכון רמה אוטומטי
export async function checkAndUpdateLevel(uid: string): Promise<{ leveledUp: boolean; newLevel?: UserLevel }> {
    const profile = await getUserProfile(uid);
    if (!profile || profile.role !== UserRole.USER) {
        return { leveledUp: false }; // רק משתמשים רגילים יכולים לעלות רמה אוטומטית
    }

    const stats = profile.stats;
    let newLevel = profile.level;

    // בדוק אם עומד בדרישות לאלון
    const oakReq = LEVEL_REQUIREMENTS[UserLevel.OAK];
    if (
        stats.points >= oakReq.minPoints &&
        stats.flowers >= oakReq.minFlowers &&
        stats.correctAnswers >= oakReq.minCorrectAnswers &&
        stats.questionsAsked >= oakReq.minQuestionsAsked &&
        stats.daysActive >= oakReq.minDaysActive
    ) {
        newLevel = UserLevel.OAK;
    }
    // בדוק אם עומד בדרישות לגזע
    else {
        const trunkReq = LEVEL_REQUIREMENTS[UserLevel.TRUNK];
        if (
            stats.points >= trunkReq.minPoints &&
            stats.flowers >= trunkReq.minFlowers &&
            stats.correctAnswers >= trunkReq.minCorrectAnswers &&
            stats.questionsAsked >= trunkReq.minQuestionsAsked &&
            stats.daysActive >= trunkReq.minDaysActive
        ) {
            newLevel = UserLevel.TRUNK;
        }
    }

    if (newLevel !== profile.level) {
        await updateDoc(doc(db, 'users', uid), {
            level: newLevel
        });
        return { leveledUp: true, newLevel };
    }

    return { leveledUp: false };
}

// קידום משתמש ידני (רק למנהלים)
export async function promoteUser(
    targetUid: string,
    newLevel: UserLevel,
    newRole: UserRole,
    promotedByUid: string
): Promise<void> {
    const promoter = await getUserProfile(promotedByUid);

    // בדוק הרשאות
    if (!promoter || promoter.role === UserRole.USER) {
        throw new Error('אין לך הרשאה לקדם משתמשים');
    }

    if (promoter.role === UserRole.MODERATOR && newRole !== UserRole.MODERATOR) {
        throw new Error('גזעים יכולים לקדם רק לגזע');
    }

    await updateDoc(doc(db, 'users', targetUid), {
        level: newLevel,
        role: newRole,
        promotedBy: promotedByUid,
        promotedAt: serverTimestamp()
    });
}

// חסימת משתמש
export async function blockUser(
    targetUid: string,
    reason: string,
    blockedByUid: string
): Promise<void> {
    const blocker = await getUserProfile(blockedByUid);

    if (!blocker) {
        throw new Error('משתמש לא נמצא');
    }

    const permissions = LEVEL_PERMISSIONS[blocker.level];
    if (!permissions.canBanUsers && blocker.role !== UserRole.SUPER_ADMIN) {
        throw new Error('אין לך הרשאה לחסום משתמשים');
    }

    await updateDoc(doc(db, 'users', targetUid), {
        isBlocked: true,
        blockedReason: reason,
        blockedBy: blockedByUid,
        blockedAt: serverTimestamp()
    });
}

// ביטול חסימה
export async function unblockUser(
    targetUid: string,
    unblockedByUid: string
): Promise<void> {
    const unblocker = await getUserProfile(unblockedByUid);

    if (!unblocker) {
        throw new Error('משתמש לא נמצא');
    }

    const permissions = LEVEL_PERMISSIONS[unblocker.level];
    if (!permissions.canBanUsers && unblocker.role !== UserRole.SUPER_ADMIN) {
        throw new Error('אין לך הרשאה לבטל חסימה');
    }

    await updateDoc(doc(db, 'users', targetUid), {
        isBlocked: false,
        blockedReason: null,
        blockedBy: null,
        blockedAt: null
    });
}

// קבלת כל המשתמשים (למנהלים)
export async function getAllUsers(requestingUid: string): Promise<UserProfile[]> {
    const requester = await getUserProfile(requestingUid);

    if (!requester) {
        throw new Error('משתמש לא נמצא');
    }

    const permissions = LEVEL_PERMISSIONS[requester.level];
    if (!permissions.canViewReports && requester.role !== UserRole.SUPER_ADMIN) {
        throw new Error('אין לך הרשאה לצפות במשתמשים');
    }

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            uid: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            lastActive: data.lastActive?.toDate(),
            promotedAt: data.promotedAt?.toDate()
        } as UserProfile;
    });
}

// בדיקת הרשאות
export function hasPermission(
    profile: UserProfile,
    permission: keyof typeof LEVEL_PERMISSIONS[UserLevel.OAK]
): boolean {
    if (profile.role === UserRole.SUPER_ADMIN) {
        return true;
    }

    const permissions = LEVEL_PERMISSIONS[profile.level];
    return permissions[permission];
}

// חישוב אחוזי התקדמות לרמה הבאה
export function getProgressToNextLevel(stats: UserStats, currentLevel: UserLevel): number {
    if (currentLevel === UserLevel.OAK) {
        return 100; // כבר ברמה המקסימלית
    }

    const nextLevel = currentLevel === UserLevel.SEEDLING ? UserLevel.TRUNK : UserLevel.OAK;
    const requirements = LEVEL_REQUIREMENTS[nextLevel];

    const progressMetrics = [
        stats.points / requirements.minPoints,
        stats.flowers / requirements.minFlowers,
        stats.correctAnswers / requirements.minCorrectAnswers,
        stats.questionsAsked / requirements.minQuestionsAsked,
        stats.daysActive / requirements.minDaysActive
    ];

    const avgProgress = progressMetrics.reduce((sum, val) => sum + val, 0) / progressMetrics.length;
    return Math.min(100, Math.round(avgProgress * 100));
}

// בדיקת זמינות שם משתמש
export async function checkUsernameAvailability(username: string, currentUid?: string): Promise<{ available: boolean; suggestions?: string[] }> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    // אם נמצא משתמש עם השם הזה (ולא המשתמש הנוכחי)
    const isOwnUsername = snapshot.docs.length === 1 && snapshot.docs[0].id === currentUid;
    const available = snapshot.empty || isOwnUsername;

    if (!available) {
        // יצירת הצעות חלופיות
        const suggestions: string[] = [];
        for (let i = 1; i <= 3; i++) {
            const suggestion = `${username}${Math.floor(Math.random() * 1000)}`;
            suggestions.push(suggestion);
        }
        return { available: false, suggestions };
    }

    return { available: true };
}

// השלמת פרופיל משתמש (Onboarding)
export async function completeUserProfile(
    uid: string,
    data: {
        username: string;
        birthDate: string;
        gender: 'male' | 'female';
        photoURL?: string;
        googleName?: string;
    }
): Promise<void> {
    const docRef = doc(db, 'users', uid);

    // Calculate Age
    const birth = new Date(data.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    await updateDoc(docRef, {
        username: data.username.toLowerCase().trim(),
        displayName: data.username.trim(), // Public display name is the username
        googleName: data.googleName || null, // Private real name
        birthDate: data.birthDate,
        age: age,
        gender: data.gender,
        photoURL: data.photoURL || null,
        isProfileCompleted: true,
        lastActive: serverTimestamp()
    });
}


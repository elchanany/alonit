import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserLevel, UserRole } from '@/types/user-levels';

/**
 * תיקון פרופיל קיים שחסרים בו שדות
 */
export async function fixUserProfile(uid: string, email: string, currentDisplayName?: string) {
    const isSuperAdmin = email?.toLowerCase() === 'eyceyceyc139@gmail.com';
    const safeEmail = email || '';
    const displayName = currentDisplayName || (safeEmail ? safeEmail.split('@')[0] : 'משתמש ללא מייל');

    await setDoc(doc(db, 'users', uid), {
        uid, // Ensure UID is saved
        email: safeEmail,
        displayName, // Ensure name is saved
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
        isBlocked: false,
        lastActive: serverTimestamp()
    }, { merge: true });
}

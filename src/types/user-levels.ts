// מערכת הדירוג: שתיל -> גזע -> אלון

export enum UserLevel {
    SEEDLING = 'seedling',  // שתיל
    TRUNK = 'trunk',        // גזע
    OAK = 'oak'             // אלון
}

export enum UserRole {
    SUPER_ADMIN = 'super_admin',  // מנהל ראשי
    ADMIN = 'admin',              // אלון
    MODERATOR = 'moderator',      // גזע
    USER = 'user'                 // שתיל
}

export interface UserStats {
    points: number;           // נקודות כלליות
    flowers: number;          // פרחים
    correctAnswers: number;   // תשובות נכונות
    questionsAsked: number;   // שאלות שנשאלו
    helpfulAnswers: number;   // תשובות מועילות
    daysActive: number;       // ימים פעילים
    streak: number;           // רצף ימים
}

export interface LevelRequirements {
    level: UserLevel;
    minPoints: number;
    minFlowers: number;
    minCorrectAnswers: number;
    minQuestionsAsked: number;
    minDaysActive: number;
}

export interface LevelPermissions {
    canDeletePosts: boolean;
    canDeleteComments: boolean;
    canBanUsers: boolean;
    canViewReports: boolean;
    canModerateContent: boolean;
    canPromoteUsers: boolean;
    canEditAnyPost: boolean;
    canAccessAnalytics: boolean;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    level: UserLevel;
    role: UserRole;
    stats: UserStats;
    createdAt: Date;
    lastActive: Date;
    isBlocked: boolean;
    blockedReason?: string;
    promotedBy?: string;  // UID של מי שקידם
    promotedAt?: Date;
}

// דרישות לכל רמה
export const LEVEL_REQUIREMENTS: Record<UserLevel, LevelRequirements> = {
    [UserLevel.SEEDLING]: {
        level: UserLevel.SEEDLING,
        minPoints: 0,
        minFlowers: 0,
        minCorrectAnswers: 0,
        minQuestionsAsked: 0,
        minDaysActive: 0
    },
    [UserLevel.TRUNK]: {
        level: UserLevel.TRUNK,
        minPoints: 100,
        minFlowers: 20,
        minCorrectAnswers: 10,
        minQuestionsAsked: 5,
        minDaysActive: 7
    },
    [UserLevel.OAK]: {
        level: UserLevel.OAK,
        minPoints: 500,
        minFlowers: 100,
        minCorrectAnswers: 50,
        minQuestionsAsked: 20,
        minDaysActive: 30
    }
};

// הרשאות לכל רמה
export const LEVEL_PERMISSIONS: Record<UserLevel, LevelPermissions> = {
    [UserLevel.SEEDLING]: {
        canDeletePosts: false,
        canDeleteComments: false,
        canBanUsers: false,
        canViewReports: false,
        canModerateContent: false,
        canPromoteUsers: false,
        canEditAnyPost: false,
        canAccessAnalytics: false
    },
    [UserLevel.TRUNK]: {
        canDeletePosts: false,
        canDeleteComments: true,
        canBanUsers: false,
        canViewReports: true,
        canModerateContent: true,
        canPromoteUsers: false,
        canEditAnyPost: false,
        canAccessAnalytics: false
    },
    [UserLevel.OAK]: {
        canDeletePosts: true,
        canDeleteComments: true,
        canBanUsers: true,
        canViewReports: true,
        canModerateContent: true,
        canPromoteUsers: true,
        canEditAnyPost: true,
        canAccessAnalytics: true
    }
};

// תיאורים של מה נפתח בכל רמה
export const LEVEL_UNLOCKS = {
    [UserLevel.SEEDLING]: {
        name: 'שתיל',
        icon: '🌱',
        description: 'רמת התחלה - למד והשתתף בקהילה',
        unlocks: [
            'שאל שאלות',
            'ענה על שאלות',
            'תן לייקים ופרחים',
            'שלח הודעות'
        ]
    },
    [UserLevel.TRUNK]: {
        name: 'גזע',
        icon: '🌳',
        description: 'משתמש מנוסה - עזור לאחרים',
        unlocks: [
            'מחק תגובות לא הולמות',
            'צפה בדיווחים',
            'נהל תוכן',
            'תג מומחה בתשובות'
        ]
    },
    [UserLevel.OAK]: {
        name: 'אלון',
        icon: '🌲',
        description: 'מנהל קהילה - שמור על הסדר',
        unlocks: [
            'מחק פוסטים',
            'חסום משתמשים',
            'קדם משתמשים',
            'ערוך כל פוסט',
            'גישה לאנליטיקס',
            'ניהול מלא של הקהילה'
        ]
    }
};

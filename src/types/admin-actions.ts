/**
 * Admin Actions Types
 * טיפוסים לפעולות ניהול ולוג פעולות
 */

// סוגי פעולות ניהול
export enum AdminActionType {
    PROMOTE_USER = 'PROMOTE_USER',
    DEMOTE_USER = 'DEMOTE_USER',
    BLOCK_USER = 'BLOCK_USER',
    UNBLOCK_USER = 'UNBLOCK_USER',
    EDIT_QUESTION = 'EDIT_QUESTION',
    DELETE_QUESTION = 'DELETE_QUESTION',
    EDIT_ANSWER = 'EDIT_ANSWER',
    DELETE_ANSWER = 'DELETE_ANSWER',
    GIVE_FLOWER = 'GIVE_FLOWER',
    REMOVE_FLOWER = 'REMOVE_FLOWER',
    SEND_WARNING = 'SEND_WARNING',
    OTHER = 'OTHER'
}

// תיאורי הפעולות בעברית
export const ACTION_LABELS: Record<AdminActionType, string> = {
    [AdminActionType.PROMOTE_USER]: 'קידום משתמש',
    [AdminActionType.DEMOTE_USER]: 'הורדת דרגה',
    [AdminActionType.BLOCK_USER]: 'חסימת משתמש',
    [AdminActionType.UNBLOCK_USER]: 'ביטול חסימה',
    [AdminActionType.EDIT_QUESTION]: 'עריכת שאלה',
    [AdminActionType.DELETE_QUESTION]: 'מחיקת שאלה',
    [AdminActionType.EDIT_ANSWER]: 'עריכת תשובה',
    [AdminActionType.DELETE_ANSWER]: 'מחיקת תשובה',
    [AdminActionType.GIVE_FLOWER]: 'מתן פרח',
    [AdminActionType.REMOVE_FLOWER]: 'הסרת פרח',
    [AdminActionType.SEND_WARNING]: 'שליחת אזהרה',
    [AdminActionType.OTHER]: 'פעולה אחרת'
};

// רשומת לוג פעולה
export interface AdminActionLog {
    id?: string;
    actionType: AdminActionType;
    adminUid: string;
    adminDisplayName: string;
    adminEmail: string;
    targetUid: string;
    targetDisplayName: string;
    targetEmail: string;
    reason: string; // סיבה - חובה לכל פעולה
    details?: Record<string, unknown>; // פרטים נוספים
    // תאריכים
    timestamp: Date;
    hebrewDate: string; // לדוגמה: "כ\"ד בטבת תשפ\"ד"
    gregorianDate: string; // לדוגמה: "05/01/2024"
    relativeTime?: string; // לדוגמה: "לפני 5 דקות"
}

// הודעת מערכת למשתמש
export interface SystemNotification {
    id?: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    recipientUid: string;
    senderUid?: string; // מנהל ששלח (אם רלוונטי)
    relatedActionId?: string; // ID של הפעולה הקשורה
    read: boolean;
    timestamp: Date;
    hebrewDate: string;
    gregorianDate: string;
}

// פילטרים ללוג פעולות
export interface ActionLogFilter {
    actionType?: AdminActionType;
    adminUid?: string;
    targetUid?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}

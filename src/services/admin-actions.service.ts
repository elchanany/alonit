/**
 * Admin Actions Service
 * שירות לניהול לוג פעולות מנהל והודעות מערכת
 */

import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    AdminActionLog,
    AdminActionType,
    SystemNotification,
    ActionLogFilter,
    ACTION_LABELS
} from '@/types/admin-actions';
import { toHebrewDate, toGregorianDate, toRelativeTime } from '@/utils/hebrewDate';

const ADMIN_ACTIONS_COLLECTION = 'admin_actions';
const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * רישום פעולת מנהל
 * @param action פרטי הפעולה
 * @returns ID של הרשומה שנוצרה
 */
export async function logAdminAction(action: Omit<AdminActionLog, 'id' | 'hebrewDate' | 'gregorianDate' | 'relativeTime'>): Promise<string> {
    const now = new Date();

    const logEntry: Omit<AdminActionLog, 'id'> = {
        ...action,
        timestamp: now,
        hebrewDate: toHebrewDate(now),
        gregorianDate: toGregorianDate(now)
    };

    const docRef = await addDoc(collection(db, ADMIN_ACTIONS_COLLECTION), {
        ...logEntry,
        timestamp: serverTimestamp()
    });

    return docRef.id;
}

/**
 * רישום פעולת מנהל ושליחת הודעה למשתמש מושפע
 * @param action פרטי הפעולה
 * @param notificationMessage הודעה לשלוח למשתמש
 * @returns ID של הפעולה
 */
export async function logActionAndNotify(
    action: Omit<AdminActionLog, 'id' | 'hebrewDate' | 'gregorianDate' | 'relativeTime'>,
    notificationMessage: {
        title: string;
        message: string;
        type: 'info' | 'warning' | 'success' | 'error';
    }
): Promise<string> {
    // רישום הפעולה
    const actionId = await logAdminAction(action);

    // שליחת הודעה למשתמש המושפע
    await sendSystemNotification({
        type: notificationMessage.type,
        title: notificationMessage.title,
        message: notificationMessage.message,
        recipientUid: action.targetUid,
        senderUid: action.adminUid,
        relatedActionId: actionId,
        read: false,
        timestamp: new Date(),
        hebrewDate: toHebrewDate(new Date()),
        gregorianDate: toGregorianDate(new Date())
    });

    return actionId;
}

/**
 * שליחת הודעת מערכת למשתמש
 * @param notification פרטי ההודעה
 * @returns ID של ההודעה
 */
export async function sendSystemNotification(
    notification: Omit<SystemNotification, 'id'>
): Promise<string> {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        ...notification,
        timestamp: serverTimestamp()
    });

    return docRef.id;
}

/**
 * קבלת לוג פעולות לפי פילטרים
 * @param filter פילטרים לחיפוש
 * @returns רשימת פעולות
 */
export async function getAdminActionsLog(filter: ActionLogFilter = {}): Promise<AdminActionLog[]> {
    let q = query(
        collection(db, ADMIN_ACTIONS_COLLECTION),
        orderBy('timestamp', 'desc')
    );

    if (filter.actionType) {
        q = query(q, where('actionType', '==', filter.actionType));
    }

    if (filter.adminUid) {
        q = query(q, where('adminUid', '==', filter.adminUid));
    }

    if (filter.targetUid) {
        q = query(q, where('targetUid', '==', filter.targetUid));
    }

    if (filter.limit) {
        q = query(q, firestoreLimit(filter.limit));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp
            ? data.timestamp.toDate()
            : new Date(data.timestamp);

        return {
            id: doc.id,
            ...data,
            timestamp,
            relativeTime: toRelativeTime(timestamp)
        } as AdminActionLog;
    });
}

/**
 * קבלת הודעות מערכת של משתמש
 * @param uid ID המשתמש
 * @param onlyUnread רק הודעות שלא נקראו
 * @returns רשימת הודעות
 */
export async function getUserNotifications(
    uid: string,
    onlyUnread: boolean = false
): Promise<SystemNotification[]> {
    let q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('recipientUid', '==', uid),
        orderBy('timestamp', 'desc')
    );

    if (onlyUnread) {
        q = query(q, where('read', '==', false));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof Timestamp
            ? data.timestamp.toDate()
            : new Date(data.timestamp);

        return {
            id: doc.id,
            ...data,
            timestamp
        } as SystemNotification;
    });
}

/**
 * סימון הודעה כנקראה
 * @param notificationId ID ההודעה
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { read: true });
}

/**
 * סימון כל ההודעות של משתמש כנקראו
 * @param uid ID המשתמש
 */
export async function markAllNotificationsAsRead(uid: string): Promise<void> {
    const notifications = await getUserNotifications(uid, true);

    const updatePromises = notifications.map(notification =>
        markNotificationAsRead(notification.id!)
    );

    await Promise.all(updatePromises);
}

/**
 * קבלת תווית פעולה בעברית
 * @param actionType סוג הפעולה
 * @returns תווית בעברית
 */
export function getActionLabel(actionType: AdminActionType): string {
    return ACTION_LABELS[actionType] || 'פעולה לא ידועה';
}

/**
 * פעולות נוחות לרישום סוגי פעולות ספציפיים
 */

export async function logBlockUser(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.BLOCK_USER,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            timestamp: new Date()
        },
        {
            type: 'warning',
            title: 'החשבון שלך נחסם',
            message: `החשבון שלך נחסם על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

export async function logUnblockUser(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.UNBLOCK_USER,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            timestamp: new Date()
        },
        {
            type: 'success',
            title: 'החשבון שלך שוחרר',
            message: `החשבון שלך שוחרר על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

export async function logPromoteUser(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string,
    newLevel: string,
    newRole: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.PROMOTE_USER,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            details: { newLevel, newRole },
            timestamp: new Date()
        },
        {
            type: 'success',
            title: 'קודמת! 🎉',
            message: `קודמת לרמה ${newLevel} על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

export async function logDeleteQuestion(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string,
    questionId: string,
    questionTitle: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.DELETE_QUESTION,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            details: { questionId, questionTitle },
            timestamp: new Date()
        },
        {
            type: 'warning',
            title: 'השאלה שלך נמחקה',
            message: `השאלה "${questionTitle}" נמחקה על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

export async function logDeleteAnswer(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string,
    answerId: string,
    answerPreview: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.DELETE_ANSWER,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            details: { answerId, answerPreview },
            timestamp: new Date()
        },
        {
            type: 'warning',
            title: 'התשובה שלך נמחקה',
            message: `התשובה שלך נמחקה על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

export async function logEditQuestion(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string,
    questionId: string,
    oldTitle: string,
    newTitle: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.EDIT_QUESTION,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            details: { questionId, oldTitle, newTitle },
            timestamp: new Date()
        },
        {
            type: 'info',
            title: 'השאלה שלך נערכה',
            message: `השאלה שלך נערכה על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

export async function logEditAnswer(
    admin: { uid: string; displayName: string; email: string },
    target: { uid: string; displayName: string; email: string },
    reason: string,
    answerId: string,
    oldContent: string,
    newContent: string
): Promise<string> {
    return logActionAndNotify(
        {
            actionType: AdminActionType.EDIT_ANSWER,
            adminUid: admin.uid,
            adminDisplayName: admin.displayName,
            adminEmail: admin.email,
            targetUid: target.uid,
            targetDisplayName: target.displayName,
            targetEmail: target.email,
            reason,
            details: { answerId, oldContent, newContent },
            timestamp: new Date()
        },
        {
            type: 'info',
            title: 'התשובה שלך נערכה',
            message: `התשובה שלך נערכה על ידי ${admin.displayName}. סיבה: ${reason}`
        }
    );
}

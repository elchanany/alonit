/**
 * דוגמאות שימוש במערכת הדירוג
 * 
 * קובץ זה מכיל דוגמאות לאינטגרציה של מערכת הדירוג בקוד שלך
 */

import { updateUserStats } from '@/services/user-level.service';

/**
 * כשמשתמש שואל שאלה חדשה
 */
export async function onQuestionAsked(userId: string) {
    const result = await updateUserStats(userId, {
        points: 5,           // 5 נקודות על שאלה
        questionsAsked: 1    // +1 שאלה
    });
    return result; // { leveledUp: boolean, newLevel?: UserLevel }
}

/**
 * כשמשתמש עונה על שאלה
 */
export async function onAnswerSubmitted(userId: string) {
    const result = await updateUserStats(userId, {
        points: 10,          // 10 נקודות על תשובה
    });
    return result;
}

/**
 * כשתשובה מסומנת כנכונה
 */
export async function onAnswerMarkedCorrect(userId: string) {
    const result = await updateUserStats(userId, {
        points: 20,          // 20 נקודות בונוס
        correctAnswers: 1    // +1 תשובה נכונה
    });
    return result;
}

/**
 * כשתשובה מקבלת לייק/הצבעה
 */
export async function onAnswerUpvoted(userId: string) {
    await updateUserStats(userId, {
        points: 2,           // 2 נקודות על הצבעה
        helpfulAnswers: 1    // +1 תשובה מועילה
    });
}

/**
 * כשמישהו נותן פרח למשתמש
 */
export async function onFlowerReceived(userId: string) {
    const result = await updateUserStats(userId, {
        points: 5,           // 5 נקודות
        flowers: 1           // +1 פרח
    });
    return result;
}

/**
 * כשמשתמש מתחבר (פעם ביום)
 */
export async function onDailyLogin(userId: string, isConsecutive: boolean) {
    const result = await updateUserStats(userId, {
        points: 1,           // 1 נקודה על התחברות
        daysActive: 1,       // +1 יום פעיל
        streak: isConsecutive ? 1 : 0  // +1 לרצף אם רצוף, אחרת 0
    });
    return result;
}

/**
 * כשמשתמש משלים משימה מיוחדת
 */
export async function onSpecialAchievement(userId: string, points: number) {
    const result = await updateUserStats(userId, {
        points: points
    });
    return result;
}

/**
 * דוגמה לשימוש בבדיקת הרשאות
 */
import { getUserProfile, hasPermission } from '@/services/user-level.service';

export async function canUserDeletePost(userId: string): Promise<boolean> {
    const profile = await getUserProfile(userId);
    if (!profile) return false;

    return hasPermission(profile, 'canDeletePosts');
}

export async function canUserBanOthers(userId: string): Promise<boolean> {
    const profile = await getUserProfile(userId);
    if (!profile) return false;

    return hasPermission(profile, 'canBanUsers');
}

export async function canUserViewReports(userId: string): Promise<boolean> {
    const profile = await getUserProfile(userId);
    if (!profile) return false;

    return hasPermission(profile, 'canViewReports');
}

/**
 * דוגמה לשימוש בקומפוננט
 */
/*
// בתוך קומפוננט של שאלה:
import { onQuestionAsked } from '@/utils/level-integration-examples';
import { useLevelUpNotification } from '@/components/ui/LevelUpNotification';

function MyComponent() {
  const { showLevelUp, LevelUpNotification } = useLevelUpNotification();
  
  async function handleSubmitQuestion() {
    // ... שמור את השאלה
    
    // עדכן סטטיסטיקות
    const result = await onQuestionAsked(userId);
    
    // הצג התראה אם המשתמש עלה רמה
    if (result.leveledUp && result.newLevel) {
      showLevelUp(result.newLevel);
    }
  }
  
  return (
    <div>
      {LevelUpNotification}
      {/* ... שאר הקומפוננט */}
</div>
  );
}

// בתוך קומפוננט של תשובה:
import { onAnswerSubmitted, onAnswerMarkedCorrect } from '@/utils/level-integration-examples';

async function handleSubmitAnswer() {
    // ... שמור את התשובה

    // עדכן סטטיסטיקות
    const result = await onAnswerSubmitted(userId);

    if (result.leveledUp && result.newLevel) {
        showLevelUp(result.newLevel);
    }
}

async function handleMarkAsCorrect(answerId: string, answerUserId: string) {
    // ... סמן את התשובה כנכונה

    // תן בונוס למשתמש
    const result = await onAnswerMarkedCorrect(answerUserId);

    if (result.leveledUp && result.newLevel) {
        showLevelUp(result.newLevel);
    }
}

// בתוך קומפוננט של פרחים:
import { onFlowerReceived } from '@/utils/level-integration-examples';

async function handleGiveFlower(recipientUserId: string) {
    // ... תן פרח

    // עדכן סטטיסטיקות
    const result = await onFlowerReceived(recipientUserId);

    if (result.leveledUp && result.newLevel) {
        showLevelUp(result.newLevel);
    }
}
*/

# מערכת דירוג שתיל-גזע-אלון 🌱🌳🌲

מערכת התקדמות משתמשים עם שלושה שלבים: שתיל, גזע ואלון.

## 📊 רמות המערכת

### 🌱 שתיל (Seedling)
- **רמת התחלה** - כל משתמש חדש מתחיל כשתיל
- **יכולות:**
  - שאל שאלות
  - ענה על שאלות
  - תן לייקים ופרחים
  - שלח הודעות

### 🌳 גזע (Trunk)
- **דרישות:**
  - 100 נקודות
  - 20 פרחים
  - 10 תשובות נכונות
  - 5 שאלות שנשאלו
  - 7 ימים פעילים
- **יכולות נוספות:**
  - מחק תגובות לא הולמות
  - צפה בדיווחים
  - נהל תוכן
  - תג מומחה בתשובות

### 🌲 אלון (Oak)
- **דרישות:**
  - 500 נקודות
  - 100 פרחים
  - 50 תשובות נכונות
  - 20 שאלות שנשאלו
  - 30 ימים פעילים
- **יכולות מלאות:**
  - מחק פוסטים
  - חסום משתמשים
  - קדם משתמשים
  - ערוך כל פוסט
  - גישה לאנליטיקס
  - ניהול מלא של הקהילה

## 👑 מנהל ראשי

המשתמש עם האימייל `eyceyceyc139@gmail.com` הוא המנהל הראשי (Super Admin) עם הרשאות מלאות:
- מתחיל ברמת אלון
- יכול לקדם משתמשים לכל רמה
- יכול לחסום ולבטל חסימה
- גישה מלאה לפאנל הניהול

## 📈 מערכת הניקוד

המערכת עוקבת אחרי:
- **נקודות (Points)** - ניקוד כללי על פעילות
- **פרחים (Flowers)** - תגמולים מיוחדים
- **תשובות נכונות (Correct Answers)** - תשובות שסומנו כנכונות
- **שאלות שנשאלו (Questions Asked)** - כמות השאלות
- **תשובות מועילות (Helpful Answers)** - תשובות שקיבלו הצבעות
- **ימים פעילים (Days Active)** - כמה ימים המשתמש היה פעיל
- **רצף ימים (Streak)** - ימים רצופים של פעילות

## 🛠️ שימוש במערכת

### עבור משתמשים רגילים:

1. **צפייה בהתקדמות:**
   ```
   נווט ל: /progress
   ```
   תראה את הרמה הנוכחית שלך, הסטטיסטיקות, ומה נדרש כדי לעלות רמה.

### עבור מנהלים (גזע/אלון):

1. **גישה לפאנל ניהול:**
   ```
   נווט ל: /admin
   ```

2. **ניהול משתמשים:**
   - צפה בכל המשתמשים
   - קדם משתמשים לרמות גבוהות יותר
   - חסום/בטל חסימה של משתמשים
   - צפה בסטטיסטיקות

## 🔧 אינטגרציה בקוד

### יצירת פרופיל משתמש חדש:

```typescript
import { createUserProfile } from '@/services/user-level.service';

// בעת הרשמה
await createUserProfile(
  user.uid,
  user.email,
  user.displayName,
  user.photoURL
);
```

### עדכון סטטיסטיקות:

```typescript
import { updateUserStats } from '@/services/user-level.service';

// כשמשתמש עונה על שאלה
await updateUserStats(userId, {
  points: 10,
  questionsAsked: 1
});

// כשמשתמש מקבל פרח
await updateUserStats(userId, {
  flowers: 1,
  points: 5
});

// כשתשובה מסומנת כנכונה
await updateUserStats(userId, {
  correctAnswers: 1,
  points: 20
});
```

### בדיקת הרשאות:

```typescript
import { getUserProfile, hasPermission } from '@/services/user-level.service';

const profile = await getUserProfile(userId);

if (hasPermission(profile, 'canDeletePosts')) {
  // המשתמש יכול למחוק פוסטים
}

if (hasPermission(profile, 'canBanUsers')) {
  // המשתמש יכול לחסום משתמשים
}
```

### קידום משתמש:

```typescript
import { promoteUser } from '@/services/user-level.service';
import { UserLevel, UserRole } from '@/types/user-levels';

// קדם משתמש לגזע
await promoteUser(
  targetUserId,
  UserLevel.TRUNK,
  UserRole.MODERATOR,
  adminUserId
);

// קדם משתמש לאלון (רק מנהל ראשי)
await promoteUser(
  targetUserId,
  UserLevel.OAK,
  UserRole.ADMIN,
  superAdminUserId
);
```

## 📁 מבנה הקבצים

```
src/
├── types/
│   └── user-levels.ts          # הגדרות טיפוסים, רמות, הרשאות
├── services/
│   └── user-level.service.ts   # לוגיקה עסקית ופונקציות
├── components/
│   ├── admin/
│   │   └── AdminPanel.tsx      # פאנל ניהול
│   └── features/
│       └── ProgressPage.tsx    # עמוד התקדמות
└── app/
    ├── admin/
    │   └── page.tsx            # נתיב פאנל ניהול
    └── progress/
        └── page.tsx            # נתיב עמוד התקדמות
```

## 🎨 עיצוב

המערכת כוללת עיצוב מודרני ויפה עם:
- גרדיאנטים צבעוניים
- אנימציות חלקות
- ממשק משתמש אינטואיטיבי
- תמיכה מלאה בעברית (RTL)
- אייקונים ואמוג'ים

## 🔄 עדכון אוטומטי של רמות

המערכת בודקת אוטומטית אם משתמש עמד בדרישות לעלייה ברמה בכל פעם שהסטטיסטיקות שלו מתעדכנות. אם המשתמש עמד בכל הדרישות, הוא יעלה רמה אוטומטית.

## 🚀 התחלה מהירה

1. המערכת כבר מוכנה לשימוש!
2. התחבר עם האימייל `eyceyceyc139@gmail.com` כדי לקבל הרשאות מנהל ראשי
3. נווט ל-`/admin` לניהול משתמשים
4. נווט ל-`/progress` לראות את ההתקדמות שלך

## 📝 הערות חשובות

- רק המנהל הראשי יכול לקדם משתמשים לרמת אלון
- גזעים יכולים לקדם רק לרמת גזע
- חסימת משתמש מונעת ממנו גישה למערכת
- כל הפעולות נרשמות ב-Firestore

/**
 * Hebrew Date Utilities
 * המרת תאריכים לפורמט עברי
 */

// מערך שמות החודשים העבריים
const HEBREW_MONTHS = [
    'ניסן', 'אייר', 'סיוון', 'תמוז', 'אב', 'אלול',
    'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר ב\''
];

// מערך הספרות העבריות
const HEBREW_ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const HEBREW_TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HEBREW_HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

/**
 * המרת מספר לגימטריה עברית
 */
function numberToHebrewGematria(num: number): string {
    if (num <= 0 || num > 999) return String(num);

    // מקרים מיוחדים
    if (num === 15) return 'ט"ו';
    if (num === 16) return 'ט"ז';

    let result = '';

    // מאות
    if (num >= 100) {
        result += HEBREW_HUNDREDS[Math.floor(num / 100)];
        num %= 100;
    }

    // עשרות
    if (num >= 10) {
        result += HEBREW_TENS[Math.floor(num / 10)];
        num %= 10;
    }

    // יחידות
    if (num > 0) {
        result += HEBREW_ONES[num];
    }

    // הוספת גרש או גרשיים
    if (result.length === 1) {
        result += '\'';
    } else if (result.length > 1) {
        result = result.slice(0, -1) + '"' + result.slice(-1);
    }

    return result;
}

/**
 * המרת תאריך לפורמט עברי
 * @param date תאריך JavaScript
 * @returns מחרוזת בפורמט עברי (לדוגמה: "כ\"ד בטבת תשפ\"ד")
 */
export function toHebrewDate(date: Date): string {
    try {
        // שימוש ב-Intl.DateTimeFormat לקבלת תאריך עברי
        const formatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const parts = formatter.formatToParts(date);
        const day = parts.find(p => p.type === 'day')?.value || '';
        const month = parts.find(p => p.type === 'month')?.value || '';
        const year = parts.find(p => p.type === 'year')?.value || '';

        // המרת היום למספר עברי
        const dayNum = parseInt(day, 10);
        const hebrewDay = numberToHebrewGematria(dayNum);

        return `${hebrewDay} ב${month} ${year}`;
    } catch {
        // fallback אם Intl לא עובד
        return date.toLocaleDateString('he-IL');
    }
}

/**
 * המרת תאריך לפורמט לועזי קריא
 * @param date תאריך JavaScript
 * @returns מחרוזת בפורמט לועזי (לדוגמה: "05/01/2024")
 */
export function toGregorianDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * המרת תאריך לפורמט יחסי ("לפני X דקות/שעות/ימים")
 * @param date תאריך JavaScript
 * @returns מחרוזת בפורמט יחסי
 */
export function toRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSeconds < 60) {
        return 'לפני רגע';
    }
    if (diffMinutes < 60) {
        return diffMinutes === 1 ? 'לפני דקה' : `לפני ${diffMinutes} דקות`;
    }
    if (diffHours < 24) {
        return diffHours === 1 ? 'לפני שעה' : `לפני ${diffHours} שעות`;
    }
    if (diffDays < 7) {
        return diffDays === 1 ? 'לפני יום' : `לפני ${diffDays} ימים`;
    }
    if (diffWeeks < 4) {
        return diffWeeks === 1 ? 'לפני שבוע' : `לפני ${diffWeeks} שבועות`;
    }
    if (diffMonths < 12) {
        return diffMonths === 1 ? 'לפני חודש' : `לפני ${diffMonths} חודשים`;
    }

    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? 'לפני שנה' : `לפני ${diffYears} שנים`;
}

/**
 * המרת תאריך לפורמט חכם ("לפני X זמן בשעה HH:MM")
 * @param date תאריך JavaScript
 * @returns מחרוזת בפורמט חכם
 */
export function toSmartDate(date: Date): string {
    const relative = toRelativeTime(date);
    const time = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // אם עבר פחות מיום, נציג רק את הזמן היחסי או "היום ב-XX:XX"
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday) {
        return `${relative} (${time})`;
    }

    return `${relative} בשעה ${time}`;
}

/**
 * יצירת אובייקט עם כל פורמטי התאריכים
 */
export function getAllDateFormats(date: Date): {
    hebrewDate: string;
    gregorianDate: string;
    relativeTime: string;
} {
    return {
        hebrewDate: toHebrewDate(date),
        gregorianDate: toGregorianDate(date),
        relativeTime: toRelativeTime(date)
    };
}

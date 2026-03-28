/**
 * seed-questions.mjs — v2
 * תוכן לגיל נוער: שאלות, סקרים, ותשובות אמיתיות
 * הרצה: node scripts/seed-questions.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env.local');
let serviceAccountKey;
try {
    const envFile = readFileSync(envPath, 'utf8');
    const match = envFile.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
    if (!match) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY לא נמצא ב-.env.local');
    serviceAccountKey = match[1].trim().replace(/^['"]|['"]$/g, '');
} catch (e) {
    console.error('❌ לא ניתן לקרוא .env.local:', e.message);
    process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) });
const db = getFirestore();

// ─── Authors ──────────────────────────────────────────────────────────────────
const A = [
    { id: 'seed_u1', name: 'נועה כהן',    photo: 'https://i.pravatar.cc/150?img=47', gender: 'female' },
    { id: 'seed_u2', name: 'יובל לוי',    photo: 'https://i.pravatar.cc/150?img=15', gender: 'male'   },
    { id: 'seed_u3', name: 'מיה גולן',    photo: 'https://i.pravatar.cc/150?img=32', gender: 'female' },
    { id: 'seed_u4', name: 'תום אברהם',   photo: 'https://i.pravatar.cc/150?img=67', gender: 'male'   },
    { id: 'seed_u5', name: 'שיר פרץ',     photo: 'https://i.pravatar.cc/150?img=56', gender: 'female' },
    { id: 'seed_u6', name: 'איתי שלום',   photo: 'https://i.pravatar.cc/150?img=8',  gender: 'male'   },
    { id: 'seed_u7', name: 'ליאור דוד',   photo: 'https://i.pravatar.cc/150?img=44', gender: 'male'   },
    { id: 'seed_u8', name: 'רוני ישראל',  photo: 'https://i.pravatar.cc/150?img=25', gender: 'female' },
];

function ts(daysAgo, hoursOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursOffset);
    return Timestamp.fromDate(d);
}

// ─── Seed data ────────────────────────────────────────────────────────────────
const QUESTIONS = [
    {
        author: A[0], daysAgo: 1, isAnonymous: false,
        title: 'איך שוברים את הקרח עם מישהו שאתם מתים עליו?',
        content: 'יש לי כיתה שאני פשוט לא מצליחה לדבר איתו. כל פעם שהוא מסתכל עלי אני קופאת. מישהי עברה את זה? מה עשיתן?',
        tags: ['אהבה', 'כיתה', 'ביישנות'], flowerCount: 67, answerCount: 0, viewCount: 1203,
        answers: [
            { author: A[2], content: 'שאלי אותו שאלה על שיעור — זה הכי טבעי ולא נראה מאולץ', daysAgo: 1, hoursOffset: 10 },
            { author: A[4], content: 'אני הייתי בדיוק באותו מצב! בסוף שלחתי הודעה עם שאלה על שיעורי בית. שבוע אחר כך התחלנו לצאת 😅', daysAgo: 0, hoursOffset: 5 },
            { author: A[6], content: 'צחוק עובד טוב. כשמשהו מצחיק קורה בכיתה, תחצי מבט איתו. זה יוצר קשר בלי מילים', daysAgo: 0, hoursOffset: 3 },
        ]
    },
    {
        author: A[1], daysAgo: 2, isAnonymous: true,
        title: 'ריב עם החבר הכי טוב שלי — כבר שבוע לא מדברים',
        content: 'ריבנו על משהו טיפשי ועכשיו שניהם עקשנים. אני כבר רוצה לסיים את זה אבל לא יודע איך להתחיל בלי להיראות חלש. מה עושים?',
        tags: ['חברות', 'ריב', 'כיתה'], flowerCount: 89, answerCount: 0, viewCount: 2140,
        answers: [
            { author: A[0], content: 'שלח לו ממים שקשור למשהו שרק שניכם מבינים. זה שובר את הקרח בלי לומר "אני מצטער" ישירות', daysAgo: 2, hoursOffset: 8 },
            { author: A[3], content: 'להיות הראשון שמתקרב זה לא חולשה — זה בשלות. אני עשיתי את זה עם החבר שלי ועכשיו אנחנו בסדר גמור', daysAgo: 1, hoursOffset: 12 },
            { author: A[7], content: 'אל תמתין שהוא יגיע אליך. ככל שמחכים יותר זה הופך להיות יותר מוגזם ממה שהיה', daysAgo: 1, hoursOffset: 4 },
        ]
    },
    {
        author: A[2], daysAgo: 3, isAnonymous: false,
        title: 'בגרות באנגלית בעוד שבועיים — כבר מתחילה לפחד',
        content: 'יש לי רמה 5 יחידות ואני ממש לא מוכנה. הכי קשה לי על הספרות. מישהו יש לו טיפים לאיך לזכור את הנושאים של הספרים?',
        tags: ['בגרות', 'אנגלית', 'לימודים'], flowerCount: 112, answerCount: 0, viewCount: 3450,
        answers: [
            { author: A[5], content: 'עשי כרטיסיות עם theme + quote + character לכל ספר. אני עשיתי את זה ויצא לי 95', daysAgo: 3, hoursOffset: 6 },
            { author: A[1], content: 'יוטיוב! יש ערוצים שמסבירים את הספרים ב-10 דקות. הרבה יותר נשאר ממה שקוראים', daysAgo: 2, hoursOffset: 14 },
            { author: A[4], content: 'תתמקדי בנושאים חוצי ספרים — identity, relationships, power. הם חוזרים בכל שאלת הספרות', daysAgo: 2, hoursOffset: 8 },
            { author: A[7], content: 'תכתבי 2 פסקאות לדוגמא לכל ספר עכשיו. הידיים זוכרות מה שהמוח שוכח', daysAgo: 1, hoursOffset: 20 },
        ]
    },
    {
        author: A[3], daysAgo: 4, isAnonymous: true,
        title: 'ההורים לא מרשים לי לצאת בסופי שבוע — אני תקוע בבית',
        content: 'כל החברים שלי יוצאים בשישי ואני לא יכול להצטרף. ההורים שלי פשוט לא מבינים שאני כבר 16. יש לכם רעיון איך לשכנע אותם?',
        tags: ['הורים', 'חרות', 'נוער'], flowerCount: 203, answerCount: 0, viewCount: 5670,
        answers: [
            { author: A[0], content: 'תדבר איתם ברצינות, שב ושאל מה הם מפחדים ממנו. כשהורים מרגישים שמקשיבים להם הם פחות מחמירים', daysAgo: 4, hoursOffset: 5 },
            { author: A[6], content: 'הצע מינימום: יציאה עד 10, שיידעו איפה אתה. כל פעם שתחזור בזמן אתה צובר אמון', daysAgo: 3, hoursOffset: 10 },
            { author: A[2], content: 'תזמין חברים הביתה תחילה. זה מראה להורים מי הם, ואז הם יותר בנוח שאתה יוצא איתם', daysAgo: 3, hoursOffset: 7 },
        ]
    },
    {
        author: A[4], daysAgo: 5, isAnonymous: false,
        title: 'יש כאן מישהו שלמד לכלום לבגרות ועדיין עבר?',
        content: 'כנה לגמרי — בגרות במתמטיקה ב-4 שבועות ולא פתחתי ספר. כבר מגלה לעצמי שכנראה לא אעבור. יש תקווה?',
        tags: ['מתמטיקה', 'בגרות', 'לימודים'], flowerCount: 445, answerCount: 0, viewCount: 12300,
        answers: [
            { author: A[1], content: 'עברתי עם 62 אחרי שלמדתי שבועיים ביחד עם חבר. האנרגיה משותפת עושה הבדל. תמצא שותף', daysAgo: 5, hoursOffset: 4 },
            { author: A[7], content: 'תפתח ישר בגרויות ישנות ותתחיל לפתור. לא צריך ספר — צריך לראות את הפורמט', daysAgo: 4, hoursOffset: 18 },
            { author: A[3], content: 'המורה? תשאל אותה איזה נושאים יוצאים ב-90% מהמקרים. אין טעם ללמוד הכל — תתמקד', daysAgo: 4, hoursOffset: 12 },
        ]
    },
    {
        author: A[5], daysAgo: 7, isAnonymous: true,
        title: 'יש לכם חרדה לפני הצגות בכיתה?',
        content: 'אני אמור להציג פרויקט מחר ואני כבר לא ישן מהלחץ. כל פעם שמסתכלים עלי אני שוכח הכל. מה עוזר לכם?',
        tags: ['חרדה', 'הצגות', 'כיתה'], flowerCount: 178, answerCount: 0, viewCount: 4230,
        answers: [
            { author: A[0], content: 'לנשום עמוק 4 שניות, להחזיק 4, לנשוף 4. תעשה את זה שלוש פעמים לפני שאתה עולה — עוזר ממש', daysAgo: 7, hoursOffset: 6 },
            { author: A[4], content: 'תסתכל על נקודה קבועה בקיר מאחורי הכיתה. הוא לא מסתכל בחזרה עליך 😄', daysAgo: 6, hoursOffset: 20 },
            { author: A[2], content: 'אני תמיד מכינה שקופיות שאני אוהבת — כשאתה נהנה מהחומר זה נראה שמשרד', daysAgo: 6, hoursOffset: 14 },
            { author: A[6], content: 'הסוד האמיתי: לחזור על ההצגה בקול רם 3 פעמים. לא בראש — בקול. אחרי זה הגוף עושה את זה אוטומטי', daysAgo: 6, hoursOffset: 10 },
        ]
    },
    {
        author: A[6], daysAgo: 8, isAnonymous: false,
        title: 'מה לענות כשמישהו שואל לאן אתה הולך לצבא?',
        content: 'אני בכיתה יב ועדיין לא מחליט. כל פעם ששואלים אותי אני מרגיש לחץ. זה נורמלי לא לדעת עדיין?',
        tags: ['צבא', 'כיתה יב', 'לחץ חברתי'], flowerCount: 234, answerCount: 0, viewCount: 6780,
        answers: [
            { author: A[5], content: 'כן! אני הלכתי לגיוס בלי לדעת. הרבה מה שחשבת שאתה רוצה משתנה שם', daysAgo: 8, hoursOffset: 8 },
            { author: A[3], content: 'תגיד פשוט "עוד לא החלטתי, אבל אני שוקל כמה אפשרויות." זה תשובה לגמרי לגיטימית', daysAgo: 7, hoursOffset: 16 },
            { author: A[1], content: 'מי שיודע בדיוק לאן הולכים בגיל 17 — כנראה פשוט לא חושב מספיק 😂', daysAgo: 7, hoursOffset: 10 },
        ]
    },
    {
        author: A[7], daysAgo: 10, isAnonymous: true,
        title: 'איך מפסיקים להתנהל לפי מה שחושבים עליך?',
        content: 'אני כל הזמן שוקלת מה אנשים יגידו. האם להעלות את הסטורי הזה? מה תחשוב הכיתה? זה מתיש. איך משתחררים מזה?',
        tags: ['דימוי עצמי', 'אינסטגרם', 'נוער'], flowerCount: 312, answerCount: 0, viewCount: 8900,
        answers: [
            { author: A[0], content: 'שאלתי את עצמי: "האם אני אזכור את הדעה של אנשים אחרי 5 שנים?" התשובה כמעט תמיד לא. עזר לי המון', daysAgo: 10, hoursOffset: 4 },
            { author: A[4], content: 'אנשים עסוקים הרבה יותר בעצמם ממה שנדמה לנו. הם כבר לא ממש חושבים על מה שאת עושה', daysAgo: 9, hoursOffset: 18 },
            { author: A[2], content: 'תעלי מה שבא לך. מי שמעיר — הוא כנראה עסוק בכל מיני בעיות משלו', daysAgo: 9, hoursOffset: 12 },
        ]
    },
    {
        author: A[0], daysAgo: 12, isAnonymous: false,
        title: 'מישהו מצליח לא לגעת בטלפון בלילה?',
        content: 'אני מבטיחה לעצמי שאני הולכת לישון ב-11 ומוצאת את עצמי בשעה 2 עדיין בטיקטוק. מה עוזר לכם?',
        tags: ['טלפון', 'שינה', 'נוער'], flowerCount: 567, answerCount: 0, viewCount: 15600,
        answers: [
            { author: A[3], content: 'הטעינה של הטלפון — במטבח. לא ליד המיטה. זה הדבר הכי פשוט שעבד בשבילי', daysAgo: 12, hoursOffset: 5 },
            { author: A[6], content: 'כיביתי את האינטרנט בראוטר ב-23:00. אי אפשר לגלול בלי Wi-Fi 😂', daysAgo: 11, hoursOffset: 22 },
            { author: A[7], content: 'אפליקציית Screen Time — מגדירה מגבלה ל-30 דקות טיקטוק ביום. כואב אבל עובד', daysAgo: 11, hoursOffset: 14 },
            { author: A[1], content: 'פשוט לא. אין קיצורי דרך 😂 אני פשוט מתרגלת שכל לילה זה קצת יותר קל', daysAgo: 11, hoursOffset: 8 },
        ]
    },
    {
        author: A[1], daysAgo: 14, isAnonymous: true,
        title: 'למה בני נוער לא יודעים לדבר על רגשות?',
        content: 'שוב ישבתי עם חברים וכולם דיברו על כל מיני שטויות. ניסיתי להגיד שאני עובר תקופה קשה ופשוט שינו נושא. מה הסיפור?',
        tags: ['רגשות', 'חברים', 'תקשורת'], flowerCount: 289, answerCount: 0, viewCount: 7890,
        answers: [
            { author: A[5], content: 'הם לא יודעים מה לענות ומפחדים להגיד משהו טיפשי. זה לא שלא אכפת להם', daysAgo: 14, hoursOffset: 6 },
            { author: A[2], content: 'תנסה עם חברה בודדת, לא בקבוצה. שיחות אחד על אחד ממש שונות', daysAgo: 13, hoursOffset: 18 },
            { author: A[0], content: 'תתחיל ישירות: "יש לי משהו שאני רוצה לשתף אתך." זה נותן לו הזדמנות להתכונן', daysAgo: 13, hoursOffset: 10 },
        ]
    },
    {
        author: A[2], daysAgo: 16, isAnonymous: false,
        title: 'כמה זמן לוקח לעבור דחיה?',
        content: 'אמרה לי שהיא לא מעוניינת. כבר שבועיים ואני לא מצליח להפסיק לחשוב עליה. יש גבול לכמה זמן זה אמור לקחת?',
        tags: ['דחיה', 'אהבה', 'לב שבור'], flowerCount: 178, answerCount: 0, viewCount: 5430,
        answers: [
            { author: A[4], content: 'חוק הכלל: מחצית מאורך הקשר לריפוי. אם יצאתם חודשיים — חודש. אם זה רק סיכוי ששיערת — שבועיים מקסימום', daysAgo: 16, hoursOffset: 5 },
            { author: A[7], content: 'תפסיק לפנות אליה ברשת. כל פעם שאתה רואה את החשבון שלה — שוב מהתחלה', daysAgo: 15, hoursOffset: 18 },
            { author: A[1], content: 'עבר לי בחצי שנה. אחרי שהתחלתי לשחק כדורגל ברצינות ולא היה לי זמן לחשוב 😄', daysAgo: 15, hoursOffset: 10 },
        ]
    },
];

const POLLS = [
    {
        author: A[1], daysAgo: 1, isAnonymous: false,
        title: 'מה הכי מפריע לכם בכיתה?',
        tags: ['כיתה', 'בית ספר', 'נוער'],
        flowerCount: 134, viewCount: 4560,
        allowVoteChange: false,
        pollOptions: [
            { id: 'q1o1', text: 'אנשים שמדברים בזמן שיעור', votes: 567 },
            { id: 'q1o2', text: 'מישהו שמלשין למורה', votes: 389 },
            { id: 'q1o3', text: 'כשהמורה מפנה אותך בפני כולם', votes: 712 },
            { id: 'q1o4', text: 'קיר גבוה בין הכיסאות', votes: 145 },
        ],
    },
    {
        author: A[3], daysAgo: 3, isAnonymous: true,
        title: 'איך אתם מתמודדים עם שיעורי בית?',
        tags: ['שיעורי בית', 'לימודים', 'בית ספר'],
        flowerCount: 89, viewCount: 2340,
        allowVoteChange: false,
        pollOptions: [
            { id: 'q2o1', text: 'עושה מיד אחרי הבית ספר', votes: 234 },
            { id: 'q2o2', text: 'עושה לפני השינה', votes: 445 },
            { id: 'q2o3', text: 'עושה בבוקר לפני בית הספר', votes: 678 },
            { id: 'q2o4', text: 'לא עושה ומעתיק', votes: 312 },
        ],
    },
    {
        author: A[5], daysAgo: 5, isAnonymous: false,
        title: 'מה הרשת החברתית שאתם הכי עליה?',
        tags: ['רשתות חברתיות', 'טיקטוק', 'נוער'],
        flowerCount: 223, viewCount: 7890,
        allowVoteChange: true,
        pollOptions: [
            { id: 'q3o1', text: 'טיקטוק', votes: 1234 },
            { id: 'q3o2', text: 'אינסטגרם', votes: 876 },
            { id: 'q3o3', text: 'סנאפצ\'ט', votes: 456 },
            { id: 'q3o4', text: 'יוטיוב', votes: 345 },
            { id: 'q3o5', text: 'וואטסאפ (כן זה נחשב)', votes: 234 },
        ],
    },
    {
        author: A[0], daysAgo: 6, isAnonymous: false,
        title: 'מה הכי גרוע בלהיות בני נוער היום?',
        tags: ['נוער', 'חברה', 'לחצים'],
        flowerCount: 312, viewCount: 9870,
        allowVoteChange: false,
        pollOptions: [
            { id: 'q4o1', text: 'לחץ הבגרויות', votes: 789 },
            { id: 'q4o2', text: 'השוואה ברשתות החברתיות', votes: 654 },
            { id: 'q4o3', text: 'ההורים שלא מבינים', votes: 543 },
            { id: 'q4o4', text: 'לא יודע מה לעשות אחרי הצבא', votes: 432 },
        ],
    },
    {
        author: A[7], daysAgo: 8, isAnonymous: false,
        title: 'כמה שעות אתם ישנים בלילה בממוצע?',
        tags: ['שינה', 'בריאות', 'נוער'],
        flowerCount: 178, viewCount: 5670,
        allowVoteChange: false,
        pollOptions: [
            { id: 'q5o1', text: 'פחות מ-6 שעות 😬', votes: 567 },
            { id: 'q5o2', text: '6-7 שעות', votes: 445 },
            { id: 'q5o3', text: '7-8 שעות', votes: 312 },
            { id: 'q5o4', text: 'מעל 8 שעות (מזל)', votes: 189 },
        ],
    },
    {
        author: A[2], daysAgo: 10, isAnonymous: true,
        title: 'מה הסיבה שתגרום לכם לעזוב קבוצת וואטסאפ?',
        tags: ['וואטסאפ', 'קבוצות', 'סושיאל'],
        flowerCount: 245, viewCount: 6780,
        allowVoteChange: true,
        pollOptions: [
            { id: 'q6o1', text: 'ספאם של \'בוקר טוב\'', votes: 890 },
            { id: 'q6o2', text: 'ויכוחים פוליטיים', votes: 678 },
            { id: 'q6o3', text: 'הודעות קוליות של 10 דקות', votes: 756 },
            { id: 'q6o4', text: 'אף פעם לא עוזב, גיבור שקט', votes: 234 },
        ],
    },
    {
        author: A[4], daysAgo: 12, isAnonymous: false,
        title: 'מה הייתם מדלגים עליו בבית ספר אם יכולתם?',
        tags: ['בית ספר', 'שיעורים', 'נוער'],
        flowerCount: 567, viewCount: 14500,
        allowVoteChange: false,
        pollOptions: [
            { id: 'q7o1', text: 'תנ"ך', votes: 1234 },
            { id: 'q7o2', text: 'ספרות', votes: 876 },
            { id: 'q7o3', text: 'מתמטיקה (לא, רציני)', votes: 456 },
            { id: 'q7o4', text: 'היסטוריה', votes: 543 },
        ],
    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    // 0. Delete previous fictional users
    console.log('🧹 מוחק משתמשים פיקטיביים ישנים...');
    const oldUsers = await db.collection('users').where('isFictional', '==', true).get();
    if (oldUsers.size > 0) {
        const ub = db.batch();
        oldUsers.docs.forEach(d => ub.delete(d.ref));
        await ub.commit();
        console.log(`   נמחקו ${oldUsers.size} משתמשים פיקטיביים.`);
    }

    // 1. Create fictional user profiles in Firestore
    console.log('👤 יוצר פרופילי משתמשים פיקטיביים...');
    const userBatch = db.batch();
    const BIOS = [
        'בת 17, אוהבת מוזיקה ואמנות 🎨', 'בן 16, כדורגל וגיימינג 🎮',
        'בת 17, כותבת שירה בלילות 🌙', 'בן 18, בכיתה יב, קצת לחוץ 😅',
        'בת 16, מת על ריצה ופודקאסטים 🎧', 'בן 17, מוזיקה וטיול 🎸',
        'בן 16, גיימר מושבע ואוהב מדע 🔭', 'בת 17, meme queen 👑',
    ];
    for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const ref = db.collection('users').doc(a.id);
        userBatch.set(ref, {
            displayName: a.name,
            photoURL: a.photo,
            gender: a.gender,
            bio: BIOS[i],
            flowerCount: Math.floor(Math.random() * 200) + 20,
            questionCount: Math.floor(Math.random() * 8) + 1,
            answerCount: Math.floor(Math.random() * 15) + 3,
            trustLevel: ['NEWBIE', 'TRUSTED', 'MENTOR'][Math.floor(Math.random() * 3)],
            isFictional: true,          // ← מסומן כפיקטיבי
            createdAt: ts(Math.floor(Math.random() * 60) + 10),
        });
    }
    await userBatch.commit();
    console.log(`   נוצרו ${A.length} פרופילים פיקטיביים (isFictional: true).`);

    // 2. Delete all existing questions
    console.log('🗑  מוחק שאלות קיימות...');
    const snap = await db.collection('questions').get();
    if (snap.size > 0) {
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log(`   נמחקו ${snap.size} מסמכים.`);
    }

    // 3. Add questions with answers
    console.log('✍️  מוסיף שאלות עם תשובות...');
    for (const q of QUESTIONS) {
        const qRef = db.collection('questions').doc();
        await qRef.set({
            type: 'question',
            title: q.title,
            content: q.content,
            authorId: q.author.id,
            authorName: q.author.name,
            authorPhoto: q.author.photo,
            authorGender: q.author.gender,
            tags: q.tags,
            isAnonymous: q.isAnonymous,
            flowerCount: q.flowerCount,
            answerCount: q.answers.length,
            viewCount: q.viewCount,
            isSeedData: true,
            createdAt: ts(q.daysAgo),
            updatedAt: ts(q.daysAgo),
        });

        for (const ans of q.answers) {
            await qRef.collection('answers').add({
                content: ans.content,
                authorId: ans.author.id,
                authorName: ans.author.name,
                authorPhoto: ans.author.photo,
                isAnonymous: false,
                likeCount: Math.floor(Math.random() * 30),
                isSeedData: true,
                createdAt: ts(ans.daysAgo, ans.hoursOffset),
            });
        }
        process.stdout.write('.');
    }

    // 4. Add polls
    console.log('\n📊 מוסיף סקרים...');
    for (const p of POLLS) {
        const totalVotes = p.pollOptions.reduce((s, o) => s + o.votes, 0);
        await db.collection('questions').add({
            type: 'poll',
            title: p.title,
            content: '',
            authorId: p.author.id,
            authorName: p.author.name,
            authorPhoto: p.author.photo,
            authorGender: p.author.gender,
            tags: p.tags,
            isAnonymous: p.isAnonymous,
            flowerCount: p.flowerCount,
            answerCount: 0,
            viewCount: p.viewCount,
            pollOptions: p.pollOptions,
            totalVotes,
            votedUsers: {},
            allowVoteChange: p.allowVoteChange,
            isSeedData: true,
            createdAt: ts(p.daysAgo),
            updatedAt: ts(p.daysAgo),
        });
        process.stdout.write('.');
    }

    console.log(`\n✅ הושלם!`);
    console.log(`   👤 ${A.length} משתמשים פיקטיביים (isFictional: true) — ניתן למחוק בעתיד`);
    console.log(`   📝 ${QUESTIONS.length} שאלות + ${POLLS.length} סקרים`);
    console.log(`\n💡 למחיקת כל הפיקטיביים בעתיד:`);
    console.log(`   node scripts/delete-fictional.mjs`);
    process.exit(0);
}

main().catch(e => { console.error('❌ שגיאה:', e); process.exit(1); });

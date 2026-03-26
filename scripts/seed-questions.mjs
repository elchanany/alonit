/**
 * seed-questions.mjs
 * מוחק את כל השאלות הקיימות ומוסיף 30 שאלות וסקרים אמיתיים
 *
 * הרצה: node scripts/seed-questions.mjs
 * (צריך להיות FIREBASE_SERVICE_ACCOUNT_KEY ב-.env.local)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load env ───────────────────────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env.local');
let serviceAccountKey;
try {
    const envFile = readFileSync(envPath, 'utf8');
    const match = envFile.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
    if (!match) throw new Error('Key not found in .env.local');
    serviceAccountKey = match[1].trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
} catch (e) {
    console.error('❌ Could not read .env.local:', e.message);
    process.exit(1);
}

// ─── Init Firebase ───────────────────────────────────────────────────────────
const credentials = JSON.parse(serviceAccountKey);
initializeApp({ credential: cert(credentials) });
const db = getFirestore();

// ─── Fake users for variety ──────────────────────────────────────────────────
const AUTHORS = [
    { id: 'user_seed_1', name: 'דנה לוי', photo: 'https://i.pravatar.cc/150?img=47', gender: 'female' },
    { id: 'user_seed_2', name: 'יוסף כהן', photo: 'https://i.pravatar.cc/150?img=12', gender: 'male' },
    { id: 'user_seed_3', name: 'מיכל רוזן', photo: 'https://i.pravatar.cc/150?img=32', gender: 'female' },
    { id: 'user_seed_4', name: 'אמיר שלום', photo: 'https://i.pravatar.cc/150?img=67', gender: 'male' },
    { id: 'user_seed_5', name: 'שירה פרץ', photo: 'https://i.pravatar.cc/150?img=56', gender: 'female' },
    { id: 'user_seed_6', name: 'רון אברהם', photo: 'https://i.pravatar.cc/150?img=8', gender: 'male' },
    { id: 'user_seed_7', name: 'נועה גולן', photo: 'https://i.pravatar.cc/150?img=44', gender: 'female' },
];

// ─── Seed data ───────────────────────────────────────────────────────────────
const SEED = [
    // ── QUESTIONS ──────────────────────────────────────────────────────────
    {
        type: 'question',
        title: 'איך אני מפסיק לדחות דברים חשובים עד הרגע האחרון?',
        content: 'כבר שנים אני מרגיש שאני פרוקרסטינטור כרוני. בדיוק היום שוב פספסתי דדליין חשוב. מה עזר לכם לשבור את המחזור הזה?',
        tags: ['פרוקרסטינציה', 'פרודוקטיביות', 'התפתחות אישית'],
        author: AUTHORS[0], flowerCount: 34, answerCount: 12, viewCount: 287,
        isAnonymous: false, daysAgo: 2,
    },
    {
        type: 'question',
        title: 'בן 28, לא יודע מה לעשות עם החיים שלי — זה נורמלי?',
        content: 'כולם מסביבי נראים יציבים עם קריירה ומערכות יחסים. אני עדיין מרגיש אבוד לגמרי. מישהו עבר את זה?',
        tags: ['גיל 20', 'קריירה', 'בריאות נפשית'],
        author: AUTHORS[1], flowerCount: 89, answerCount: 31, viewCount: 1204,
        isAnonymous: true, daysAgo: 5,
    },
    {
        type: 'question',
        title: 'הבוס שלי לוקח קרדיט על העבודה שלי — מה עושים?',
        content: 'כבר חצי שנה שהמנהל שלי מציג את הרעיונות שלי בפגישות כאילו הם שלו. לא רוצה ליצור קונפליקט אבל זה הורג אותי. יש לכם ניסיון עם זה?',
        tags: ['עבודה', 'מנהל', 'קונפליקט במשרד'],
        author: AUTHORS[2], flowerCount: 56, answerCount: 18, viewCount: 643,
        isAnonymous: false, daysAgo: 1,
    },
    {
        type: 'question',
        title: 'איך שומרים על חברויות כשכולם עסוקים עם ילדים ועבודה?',
        content: 'בגיל 32 מרגיש שהחברויות מתמוססות. אף אחד לא מגיע לאירועים, כולם מבטלים ברגע האחרון. איך אתם מתמודדים עם זה?',
        tags: ['חברים', 'קשרים חברתיים', 'גיל 30'],
        author: AUTHORS[3], flowerCount: 71, answerCount: 24, viewCount: 882,
        isAnonymous: false, daysAgo: 3,
    },
    {
        type: 'question',
        title: 'כמה שעות שינה אתם באמת ישנים בלילה?',
        content: 'שמעתי כל כך הרבה על חשיבות 8 שעות שינה אבל אני בקושי מצליח 6. האם זה פוגע בי משמעותית לאורך זמן?',
        tags: ['שינה', 'בריאות', 'שגרה יומית'],
        author: AUTHORS[4], flowerCount: 45, answerCount: 28, viewCount: 756,
        isAnonymous: false, daysAgo: 7,
    },
    {
        type: 'question',
        title: 'קיבלתי הצעת עבודה עם שכר גבוה יותר אבל בחברה פחות מעניינת — מה לעשות?',
        content: 'המקום הנוכחי שלי הוא חברת סטארטאפ מגניב עם אנשים נהדרים אבל שכר בינוני. ההצעה החדשה היא 40% יותר בחברה גדולה ומשעממת. אני 26. מה הייתם עושים?',
        tags: ['קריירה', 'שכר', 'החלטות'],
        author: AUTHORS[5], flowerCount: 92, answerCount: 41, viewCount: 1873,
        isAnonymous: false, daysAgo: 4,
    },
    {
        type: 'question',
        title: 'איך מתמודדים עם בדידות בעיר גדולה?',
        content: 'עברתי לתל אביב לפני שנה ועדיין מרגיש לבד. יש לי עבודה טובה, יצאתי לאירועים, אבל לא הצלחתי ליצור חברויות אמיתיות. מה עזר לכם?',
        tags: ['בדידות', 'תל אביב', 'חברויות'],
        author: AUTHORS[6], flowerCount: 103, answerCount: 38, viewCount: 2140,
        isAnonymous: true, daysAgo: 6,
    },
    {
        type: 'question',
        title: 'הורים שמבקרים כל בחירה שלי — איך שומרים על שפיות?',
        content: 'גרה עצמאית כבר 4 שנים, בת 29, ועדיין ההורים שלי מבקרים כל החלטה — מה אני אוכלת, עם מי אני יוצאת, מתי אני הולכת לישון. איך שמים גבולות בלי לפגוע בקשר?',
        tags: ['הורים', 'גבולות', 'משפחה'],
        author: AUTHORS[0], flowerCount: 134, answerCount: 52, viewCount: 3201,
        isAnonymous: true, daysAgo: 9,
    },
    {
        type: 'question',
        title: 'חרדה חברתית — מישהו פה כבר "ניצח" אותה?',
        content: 'סובל מחרדה חברתית שנים. פגשתי פסיכולוג, ניסיתי תרופות, CBT. דברים השתפרו אבל עדיין קשה. מישהו פה הצליח ממש לעבור את זה? מה עזר?',
        tags: ['חרדה', 'בריאות נפשית', 'CBT'],
        author: AUTHORS[1], flowerCount: 167, answerCount: 63, viewCount: 4520,
        isAnonymous: true, daysAgo: 12,
    },
    {
        type: 'question',
        title: 'איך מסבירים לאנשים שאני אינטרוברט ולא "עצוב"?',
        content: 'כל הזמן אנשים שואלים אם אני בסדר כי אני שקט. אני לא עצוב, אני פשוט נהנה מדממה ורצה להיות לבד לפעמים. יש לכם אסטרטגיות להסביר את זה בלי להיכנס להרצאה?',
        tags: ['אינטרובורט', 'חברה', 'אופי'],
        author: AUTHORS[2], flowerCount: 88, answerCount: 29, viewCount: 1102,
        isAnonymous: false, daysAgo: 8,
    },
    {
        type: 'question',
        title: 'מה עשיתם עם החיסכון הראשון שלכם?',
        content: 'הצלחתי לחסוך 30,000 שקל לראשונה בחיי. אני 24. כולם אומרים משהו אחר — קרן נאמנות, מניות, קרן פנסיה... מה הייתם עושים במקומי?',
        tags: ['כסף', 'חסכון', 'השקעות'],
        author: AUTHORS[3], flowerCount: 214, answerCount: 87, viewCount: 5670,
        isAnonymous: false, daysAgo: 14,
    },
    {
        type: 'question',
        title: 'יש לכם "טקס בוקר" שבאמת שינה לכם את היום?',
        content: 'ניסיתי הרבה דברים — מדיטציה, ריצה, כתיבה — ואף אחד לא נדבק. מה אתם עושים בבוקר שבאמת עובד לכם לאורך זמן?',
        tags: ['בוקר', 'שגרה', 'פרודוקטיביות'],
        author: AUTHORS[4], flowerCount: 76, answerCount: 33, viewCount: 978,
        isAnonymous: false, daysAgo: 11,
    },
    {
        type: 'question',
        title: 'איך מפסיקים להשוות את עצמי לאחרים ברשתות חברתיות?',
        content: 'אני יודעת שרשתות חברתיות הן תמונה מתוקתקת של המציאות, אבל עדיין נכנסת לאינסטגרם ויוצאת עם תחושה גרועה. מה עוזר לכם?',
        tags: ['רשתות חברתיות', 'השוואות', 'דימוי עצמי'],
        author: AUTHORS[5], flowerCount: 145, answerCount: 48, viewCount: 2330,
        isAnonymous: false, daysAgo: 3,
    },
    {
        type: 'question',
        title: 'מה עושים כשמרגישים תקועים בסיפור אהבה שלא מתקדם?',
        content: 'אני ב"מה שיש בינינו" כבר שנה וחצי. הוא אומר שהוא לא מוכן למערכת יחסים אבל גם לא מוותר עלי. אני לא יודעת איך לצאת מזה.',
        tags: ['אהבה', 'מערכות יחסים', 'גבולות'],
        author: AUTHORS[0], flowerCount: 178, answerCount: 71, viewCount: 6230,
        isAnonymous: true, daysAgo: 5,
    },

    // ── POLLS ──────────────────────────────────────────────────────────────
    {
        type: 'poll',
        title: 'מה הכי מרגיז אתכם בדייטינג של היום?',
        tags: ['דייטינג', 'מערכות יחסים', 'מציאות מודרנית'],
        author: AUTHORS[1],
        flowerCount: 67, answerCount: 0, viewCount: 1543,
        isAnonymous: false, daysAgo: 2,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p1o1', text: 'גוסטינג ללא הסבר', votes: 389 },
            { id: 'p1o2', text: 'הבטחות שלא מתממשות', votes: 241 },
            { id: 'p1o3', text: 'תקשורת על טלפון בלבד, אף פעם לא נפגשים', votes: 178 },
            { id: 'p1o4', text: 'ציפיות לא מוצהרות', votes: 134 },
        ],
    },
    {
        type: 'poll',
        title: 'מה הפלטפורמה שממנה אתם הכי לומדים?',
        tags: ['למידה', 'תוכן', 'פרודוקטיביות'],
        author: AUTHORS[2],
        flowerCount: 43, answerCount: 0, viewCount: 987,
        isAnonymous: false, daysAgo: 6,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p2o1', text: 'יוטיוב', votes: 512 },
            { id: 'p2o2', text: 'פודקאסטים', votes: 284 },
            { id: 'p2o3', text: 'ספרים', votes: 203 },
            { id: 'p2o4', text: 'קורסים מקוונים', votes: 145 },
            { id: 'p2o5', text: 'טיקטוק / רילס', votes: 89 },
        ],
    },
    {
        type: 'poll',
        title: 'בפגישת עבודה שמשעממת — מה אתם עושים?',
        tags: ['עבודה', 'פגישות', 'כנות'],
        author: AUTHORS[3],
        flowerCount: 118, answerCount: 0, viewCount: 2840,
        isAnonymous: true, daysAgo: 4,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p3o1', text: 'בטלפון מתחת לשולחן', votes: 634 },
            { id: 'p3o2', text: 'כותב רשימות שאין לי כוונה לבדוק', votes: 312 },
            { id: 'p3o3', text: 'מקשיב בכל הכוח', votes: 198 },
            { id: 'p3o4', text: 'מנסה לא להירדם', votes: 271 },
        ],
    },
    {
        type: 'poll',
        title: 'מה הדבר שהכי קשה לכם לומר "לא" אליו?',
        tags: ['גבולות', 'פסיכולוגיה', 'מערכות יחסים'],
        author: AUTHORS[4],
        flowerCount: 93, answerCount: 0, viewCount: 2210,
        isAnonymous: false, daysAgo: 8,
        allowVoteChange: true,
        pollOptions: [
            { id: 'p4o1', text: 'בקשה מחבר קרוב', votes: 445 },
            { id: 'p4o2', text: 'בקשה מהמנהל', votes: 389 },
            { id: 'p4o3', text: 'עוד פרק בסדרה', votes: 567 },
            { id: 'p4o4', text: 'מנה נוספת של אוכל', votes: 234 },
        ],
    },
    {
        type: 'poll',
        title: 'מה הסגנון שלכם לכתיבת הודעות?',
        tags: ['תקשורת', 'הודעות', 'אישיות'],
        author: AUTHORS[5],
        flowerCount: 55, answerCount: 0, viewCount: 1120,
        isAnonymous: false, daysAgo: 1,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p5o1', text: 'הודעות קצרות וענייניות', votes: 298 },
            { id: 'p5o2', text: 'הודעות ארוכות ומפורטות', votes: 156 },
            { id: 'p5o3', text: 'הרבה סטיקרים ואמוג\'י', votes: 134 },
            { id: 'p5o4', text: 'מתאים לפי האדם ממול', votes: 412 },
        ],
    },
    {
        type: 'poll',
        title: 'כמה מקובל עליכם לשלם עבור אפליקציית מנוי?',
        tags: ['כסף', 'אפליקציות', 'צריכה'],
        author: AUTHORS[6],
        flowerCount: 38, answerCount: 0, viewCount: 876,
        isAnonymous: false, daysAgo: 10,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p6o1', text: 'כלום, רק חינמי', votes: 312 },
            { id: 'p6o2', text: 'עד 20 ₪ בחודש', votes: 445 },
            { id: 'p6o3', text: 'עד 50 ₪ בחודש', votes: 234 },
            { id: 'p6o4', text: 'משלם אם זה שווה לי', votes: 189 },
        ],
    },
    {
        type: 'poll',
        title: 'מה המצב שהכי קשה לכם להתמודד איתו?',
        tags: ['רגשות', 'פסיכולוגיה', 'חיים'],
        author: AUTHORS[0],
        flowerCount: 142, answerCount: 0, viewCount: 3780,
        isAnonymous: true, daysAgo: 7,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p7o1', text: 'אי-ודאות לגבי העתיד', votes: 678 },
            { id: 'p7o2', text: 'תחושת כישלון', votes: 345 },
            { id: 'p7o3', text: 'אכזבה מאנשים קרובים', votes: 512 },
            { id: 'p7o4', text: 'בדידות', votes: 289 },
        ],
    },

    // ── MORE QUESTIONS ──────────────────────────────────────────────────────
    {
        type: 'question',
        title: 'טיפים ליציאה מאזור הנוחות בלי להרגיש מתאמץ?',
        content: 'כל פעם שאני מנסה לעשות משהו חדש אני מרגיש לחץ עצום. אין לי מוטיבציה לדברים שאמורים "לשפר אותי". כיצד יוצאים מאזור הנוחות בצורה שמרגישה טבעית?',
        tags: ['אזור נוחות', 'מוטיבציה', 'שינוי'],
        author: AUTHORS[1], flowerCount: 62, answerCount: 22, viewCount: 892,
        isAnonymous: false, daysAgo: 13,
    },
    {
        type: 'question',
        title: 'מה הייתם אומרים לעצמכם לפני 10 שנים?',
        content: 'מחשבה אחת, משפט אחד. מה הייתם הכי רוצים שהגרסה הצעירה שלכם תדע?',
        tags: ['רפלקציה', 'חיים', 'חוכמה'],
        author: AUTHORS[2], flowerCount: 231, answerCount: 104, viewCount: 7890,
        isAnonymous: false, daysAgo: 15,
    },
    {
        type: 'question',
        title: 'כיצד מתמודדים עם עמית לעבודה שמרגיז אתכם?',
        content: 'יש לי עמית שמפריע לי בכל ישיבה, מדבר עלי מאחורי הגב, ומנסה להיראות חכם על חשבוני. HR לא ממש עוזרת. מה הייתם עושים?',
        tags: ['עבודה', 'קונפליקטים', 'עמיתים'],
        author: AUTHORS[3], flowerCount: 78, answerCount: 34, viewCount: 1456,
        isAnonymous: true, daysAgo: 3,
    },
    {
        type: 'question',
        title: 'האם שווה ללמוד תואר שני בישראל היום?',
        content: 'לומדת תואר ראשון בכלכלה ומתלבטת אם ללכת לתואר שני. שמעתי שהתעשייה לא ממש מעריכה אותו בהרבה מקרים. מה אתם חושבים?',
        tags: ['השכלה', 'קריירה', 'תואר'],
        author: AUTHORS[4], flowerCount: 45, answerCount: 19, viewCount: 678,
        isAnonymous: false, daysAgo: 6,
    },
    {
        type: 'question',
        title: 'האם אי פעם התחרטתם על כך שסלחתם למישהו?',
        content: 'סלחתי לחבר טוב שפגע בי קשות, אבל מאז ההתנהגות שלו לא השתנתה ואני חש שניצלו את הטוב שלי. האם זה אומר שלא היה כדאי לסלוח?',
        tags: ['סליחה', 'מערכות יחסים', 'גבולות'],
        author: AUTHORS[5], flowerCount: 167, answerCount: 59, viewCount: 3450,
        isAnonymous: true, daysAgo: 2,
    },

    // ── MORE POLLS ──────────────────────────────────────────────────────────
    {
        type: 'poll',
        title: 'מתי אתם הכי פרודוקטיביים?',
        tags: ['פרודוקטיביות', 'שגרה', 'עבודה'],
        author: AUTHORS[6],
        flowerCount: 87, answerCount: 0, viewCount: 1890,
        isAnonymous: false, daysAgo: 5,
        allowVoteChange: false,
        pollOptions: [
            { id: 'p8o1', text: 'בוקר מוקדם (לפני 9)', votes: 534 },
            { id: 'p8o2', text: 'בוקר סטנדרטי (9-12)', votes: 312 },
            { id: 'p8o3', text: 'אחר הצהריים', votes: 178 },
            { id: 'p8o4', text: 'לילה', votes: 445 },
        ],
    },
    {
        type: 'poll',
        title: 'מה גורם לכם לעזוב מסעדה עם תחושה רעה?',
        tags: ['מסעדות', 'חוויה', 'שירות'],
        author: AUTHORS[0],
        flowerCount: 54, answerCount: 0, viewCount: 1230,
        isAnonymous: false, daysAgo: 9,
        allowVoteChange: true,
        pollOptions: [
            { id: 'p9o1', text: 'שירות לא מכבד', votes: 623 },
            { id: 'p9o2', text: 'אוכל לא טעים', votes: 512 },
            { id: 'p9o3', text: 'המחיר לא שווה את האיכות', votes: 389 },
            { id: 'p9o4', text: 'אווירה לא נעימה', votes: 156 },
        ],
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return Timestamp.fromDate(d);
}

function totalVotes(options) {
    return options.reduce((s, o) => s + o.votes, 0);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🗑  מוחק שאלות קיימות...');
    const snap = await db.collection('questions').get();
    const delBatch = db.batch();
    snap.docs.forEach(d => delBatch.delete(d.ref));
    await delBatch.commit();
    console.log(`   נמחקו ${snap.size} שאלות.`);

    console.log('✍️  מוסיף שאלות וסקרים חדשים...');
    const addBatch = db.batch();
    let count = 0;

    for (const item of SEED) {
        const ref = db.collection('questions').doc();
        const author = item.author;

        const doc = {
            type: item.type,
            title: item.title,
            content: item.content || '',
            authorId: author.id,
            authorName: author.name,
            authorPhoto: author.photo,
            authorGender: author.gender,
            tags: item.tags,
            isAnonymous: item.isAnonymous,
            flowerCount: item.flowerCount,
            answerCount: item.answerCount,
            viewCount: item.viewCount,
            createdAt: daysAgo(item.daysAgo),
            updatedAt: daysAgo(item.daysAgo),
        };

        if (item.type === 'poll') {
            doc.pollOptions = item.pollOptions;
            doc.totalVotes = totalVotes(item.pollOptions);
            doc.votedUsers = {};
            doc.allowVoteChange = item.allowVoteChange;
        }

        addBatch.set(ref, doc);
        count++;
    }

    await addBatch.commit();
    console.log(`✅ נוספו ${count} פריטים בהצלחה!`);
    process.exit(0);
}

main().catch(e => { console.error('❌ שגיאה:', e); process.exit(1); });

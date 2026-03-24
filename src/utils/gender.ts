/**
 * Gender-aware Hebrew text utility.
 * Provides correct masculine/feminine verb forms based on user gender.
 */

export type Gender = 'male' | 'female' | undefined;

interface GenderedTexts {
    send: string;         // שלח / שלחי
    write: string;        // כתוב / כתבי
    answer: string;       // ענה / עני
    ask: string;          // שאל / שאלי
    search: string;       // חפש / חפשי
    connect: string;      // התחבר / התחברי
    share: string;        // שתף / שתפי
    edit: string;         // ערוך / ערכי
    delete_: string;      // מחק / מחקי
    save: string;         // שמור / שמרי
    cancel: string;       // בטל / בטלי
    report: string;       // דווח / דווחי
    upload: string;       // העלה / העלי
    record: string;       // הקלט / הקליטי
    login: string;        // התחבר / התחברי
    register: string;     // הירשם / הירשמי
    joined: string;       // הצטרף / הצטרפה
}

const MALE_TEXTS: GenderedTexts = {
    send: 'שלח',
    write: 'כתוב',
    answer: 'ענה',
    ask: 'שאל',
    search: 'חפש',
    connect: 'התחבר',
    share: 'שתף',
    edit: 'ערוך',
    delete_: 'מחק',
    save: 'שמור',
    cancel: 'בטל',
    report: 'דווח',
    upload: 'העלה',
    record: 'הקלט',
    login: 'התחבר',
    register: 'הירשם',
    joined: 'הצטרף',
};

const FEMALE_TEXTS: GenderedTexts = {
    send: 'שלחי',
    write: 'כתבי',
    answer: 'עני',
    ask: 'שאלי',
    search: 'חפשי',
    connect: 'התחברי',
    share: 'שתפי',
    edit: 'ערכי',
    delete_: 'מחקי',
    save: 'שמרי',
    cancel: 'בטלי',
    report: 'דווחי',
    upload: 'העלי',
    record: 'הקליטי',
    login: 'התחברי',
    register: 'הירשמי',
    joined: 'הצטרפה',
};

/**
 * Get the gendered text map for a given gender.
 * Falls back to masculine if no gender is provided.
 */
export function getGenderedTexts(gender?: Gender): GenderedTexts {
    return gender === 'female' ? FEMALE_TEXTS : MALE_TEXTS;
}

/**
 * Get a single gendered text by key.
 */
export function g(gender: Gender, key: keyof GenderedTexts): string {
    return gender === 'female' ? FEMALE_TEXTS[key] : MALE_TEXTS[key];
}

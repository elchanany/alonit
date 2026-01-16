import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Hebrew stop words to filter out
const HEBREW_STOP_WORDS = new Set([
    'את', 'של', 'על', 'עם', 'אני', 'הוא', 'היא', 'הם', 'הן', 'אנחנו', 'אתה', 'אתם',
    'זה', 'זו', 'זאת', 'אלה', 'אלו', 'כל', 'כמה', 'מה', 'מי', 'איך', 'למה', 'מתי',
    'איפה', 'לאן', 'האם', 'או', 'גם', 'רק', 'אבל', 'כי', 'אז', 'לא', 'כן', 'יש',
    'אין', 'היה', 'היו', 'יהיה', 'להיות', 'עוד', 'כבר', 'מאוד', 'יותר', 'פחות',
    'בין', 'לפני', 'אחרי', 'תחת', 'מעל', 'ליד', 'בתוך', 'מחוץ', 'דרך', 'בלי',
    'שלי', 'שלו', 'שלה', 'שלנו', 'שלהם', 'אותו', 'אותה', 'אותם', 'אותן',
    'ב', 'ל', 'מ', 'ה', 'ו', 'כ', 'ש', 'the', 'a', 'an', 'is', 'are', 'was', 'were'
]);

export interface Question {
    id: string;
    title: string;
    content: string;
    category: string;
    authorName: string;
    authorPhoto?: string;
    flowerCount: number;
    answerCount: number;
    createdAt: any;
}

export interface RelatedQuestion {
    question: Question;
    score: number;
}

// Extract keywords from text
export function extractKeywords(text: string): string[] {
    if (!text) return [];

    // Clean and split text
    const words = text
        .toLowerCase()
        .replace(/[^\u0590-\u05FF\w\s]/g, '') // Keep Hebrew, English letters, and spaces
        .split(/\s+/)
        .filter(word => word.length > 2) // Only words with 3+ chars
        .filter(word => !HEBREW_STOP_WORDS.has(word));

    // Count word frequency
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

// Calculate similarity score between two sets of keywords
function calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    let overlap = 0;

    set1.forEach(keyword => {
        if (set2.has(keyword)) {
            overlap++;
        }
    });

    return overlap;
}

// Find related questions based on category and keywords
export async function findRelatedQuestions(
    currentQuestion: Question,
    allQuestions: Question[],
    maxResults: number = 6
): Promise<RelatedQuestion[]> {
    const currentKeywords = extractKeywords(currentQuestion.title + ' ' + currentQuestion.content);

    const scoredQuestions: RelatedQuestion[] = allQuestions
        .filter(q => q.id !== currentQuestion.id) // Exclude current question
        .map(question => {
            let score = 0;

            // Category match (highest priority)
            if (question.category === currentQuestion.category) {
                score += 10;
            }

            // Keyword overlap
            const questionKeywords = extractKeywords(question.title + ' ' + question.content);
            const overlap = calculateKeywordOverlap(currentKeywords, questionKeywords);
            score += overlap * 3;

            // Recency bonus (questions from last 7 days get a boost)
            if (question.createdAt?.toDate) {
                const daysOld = (Date.now() - question.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
                if (daysOld < 7) {
                    score += Math.max(0, 5 - daysOld);
                }
            }

            // Engagement bonus
            score += Math.min(question.answerCount * 0.5, 5);
            score += Math.min(question.flowerCount * 0.2, 3);

            return { question, score };
        })
        .filter(rq => rq.score > 0) // Only include questions with some relevance
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

    return scoredQuestions;
}

// Get questions for left/right sidebar tiles
export function getRelatedTiles(
    relatedQuestions: RelatedQuestion[]
): { left: Question[], right: Question[] } {
    const left: Question[] = [];
    const right: Question[] = [];

    relatedQuestions.forEach((rq, index) => {
        if (index % 2 === 0) {
            left.push(rq.question);
        } else {
            right.push(rq.question);
        }
    });

    return { left, right };
}

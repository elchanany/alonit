import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import semanticClustersRaw from '@/lib/semantic-clusters.json';

const semanticClusters = semanticClustersRaw as Record<string, string[]>;

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
    description?: string;
    category: string;
    tags?: string[];
    authorName: string;
    authorId?: string; 
    authorPhoto?: string;
    isAnonymous?: boolean;
    flowerCount: number;
    answerCount: number;
    viewCount?: number;
    createdAt: any;
    timeAgo?: string;
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

// Find related questions based on category and keywords (Original method for sidebars)
export async function findRelatedQuestions(
    currentQuestion: Question,
    allQuestions: Question[],
    maxResults: number = 6
): Promise<RelatedQuestion[]> {
    const rawKeywords = extractKeywords(currentQuestion.title + ' ' + currentQuestion.content);
    
    // Semantic Vector Expansion: Expand keywords using local clusters to find dimensionally close areas
    let expandedTerms = [...rawKeywords];
    rawKeywords.forEach(term => {
        for (const [clusterId, words] of Object.entries(semanticClusters)) {
            if (words.includes(term) || clusterId === term) {
                expandedTerms.push(clusterId);
                words.forEach(w => expandedTerms.push(w));
            }
        }
    });
    const currentKeywordsExpanded = Array.from(new Set(expandedTerms));
    
    const scoredQuestions: RelatedQuestion[] = allQuestions
        .filter(q => q.id !== currentQuestion.id) // Exclude current question
        .map(question => {
            let score = 0;
            
            // Category match (important dimension)
            if (question.category === currentQuestion.category) {
                score += 15;
            }
            
            // Vector proximity calculation via Semantic Keyword Expansion
            const questionKeywords = extractKeywords(question.title + ' ' + question.content);
            const rawOverlap = calculateKeywordOverlap(rawKeywords, questionKeywords);
            const semanticOverlap = calculateKeywordOverlap(currentKeywordsExpanded, questionKeywords);
            
            score += rawOverlap * 5; // Direct word matches are worth more
            score += (semanticOverlap - rawOverlap) * 2; // Semantically/vectorially similar words give bonus
            
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

// ==========================================
// MONOLITH-LITE: TIKTOK STYLE RECOMMENDATION
// ==========================================

export interface UserAffinityProfile {
    categoryWeights: { [category: string]: number };
    authorWeights: { [authorId: string]: number };
    keywordWeights: { [keyword: string]: number };
    seenQuestions: string[];
    isDirty?: boolean;
    lastSyncAt?: number;
}

const AFFINITY_STORAGE_KEY = 'alonit_user_affinities';
const MAX_SEEN_HISTORY = 100; // Keep track of last 100 seen questions

// Get local affinity profile
export function getStoredAffinities(): UserAffinityProfile {
    if (typeof window === 'undefined') {
        return { categoryWeights: {}, authorWeights: {}, keywordWeights: {}, seenQuestions: [], isDirty: false, lastSyncAt: 0 };
    }
    
    try {
        const stored = localStorage.getItem(AFFINITY_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                categoryWeights: parsed.categoryWeights || {},
                authorWeights: parsed.authorWeights || {},
                keywordWeights: parsed.keywordWeights || {},
                seenQuestions: parsed.seenQuestions || [],
                isDirty: parsed.isDirty || false,
                lastSyncAt: parsed.lastSyncAt || 0
            };
        }
    } catch (e) {
        console.error("Error reading affinities", e);
    }
    
    return { categoryWeights: {}, authorWeights: {}, keywordWeights: {}, seenQuestions: [], isDirty: false, lastSyncAt: 0 };
}

// Save local affinity profile
function saveStoredAffinities(profile: UserAffinityProfile) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(AFFINITY_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error("Error saving affinities", e);
    }
}

export type InteractionType = 'view' | 'like' | 'dislike' | 'answer' | 'share';

/**
 * Updates the local user affinity profile based on interaction type and watch time (if 'view').
 */
export function trackInteraction(question: Question, type: InteractionType, durationMs: number = 0) {
    if (!question) return;
    
    const profile = getStoredAffinities();
    let weightDelta = 0;
    
    // TIKTOK 5-POINT ENGAGEMENT ALGORITHM WEIGHTS
    switch (type) {
        case 'view':
            if (durationMs < 2000) {
                weightDelta = -2; // Skipped quickly
            } else if (durationMs >= 5000 && durationMs < 15000) {
                weightDelta = 4; // Watched to completion equivalent
            } else if (durationMs >= 15000) {
                weightDelta = 8; // Rewatch / Deep engagement equivalent
            }
            break;
        case 'like':
            weightDelta = 2; // Base 1x
            break;
        case 'dislike':
            weightDelta = -2;
            break;
        case 'answer':
            weightDelta = 4; // Comment 2x
            break;
        case 'share':
            weightDelta = 6; // Share 3x
            break;
    }

    if (weightDelta !== 0) {
        // Update category weight
        if (question.category) {
            profile.categoryWeights[question.category] = (profile.categoryWeights[question.category] || 0) + weightDelta;
            // Prevent going below -10 or above 100 for balance
            profile.categoryWeights[question.category] = Math.max(-10, Math.min(100, profile.categoryWeights[question.category]));
        }
        
        // Update author weight (if not anonymous)
        if (question.authorId && question.authorId !== 'anonymous') {
            profile.authorWeights[question.authorId] = (profile.authorWeights[question.authorId] || 0) + (weightDelta * 0.5); 
            // Authors weight is slightly less aggressive than category
        }
        
            // Update keyword weights (TF-IDF style vector)
        const keywords = extractKeywords(question.title + ' ' + (question.content || ''));
        keywords.forEach(kw => {
            profile.keywordWeights[kw] = (profile.keywordWeights[kw] || 0) + (weightDelta * 0.2); // Smaller increments for words
            profile.keywordWeights[kw] = Math.max(-5, Math.min(20, profile.keywordWeights[kw])); // Cap word influence
        });

        profile.isDirty = true;
    }
    
    // Add to seen history if not already there
    if (!profile.seenQuestions.includes(question.id)) {
        profile.seenQuestions.push(question.id);
        if (profile.seenQuestions.length > MAX_SEEN_HISTORY) {
            profile.seenQuestions.shift(); // Remove oldest
        }
        profile.isDirty = true;
    }
    
    saveStoredAffinities(profile);
}

// Add function to track generic events
export function trackEvent(
    type: 'SEARCH' | 'VIEW_PROFILE' | 'ASK_QUESTION', 
    data: { category?: string, keywords?: string, authorId?: string }
) {
    const profile = getStoredAffinities();
    
    let weight = 0;
    
    // Process keyword additions
    if (data.keywords) {
        if (type === 'SEARCH') weight = 2; // Searching for it shows high intent
        else if (type === 'ASK_QUESTION') weight = 10; // Asking about it shows extremely high intent
        
        if (weight > 0) {
            const words = extractKeywords(data.keywords);
            words.forEach(kw => {
                profile.keywordWeights[kw] = (profile.keywordWeights[kw] || 0) + weight;
                profile.keywordWeights[kw] = Math.max(-5, Math.min(20, profile.keywordWeights[kw]));
            });
        }
    }

    if (data.category && type === 'ASK_QUESTION') {
        profile.categoryWeights[data.category] = (profile.categoryWeights[data.category] || 0) + 15;
        // Prevent going below -10 or above 100 for balance
        profile.categoryWeights[data.category] = Math.max(-10, Math.min(100, profile.categoryWeights[data.category]));
    }

    if (data.authorId && type === 'VIEW_PROFILE' && data.authorId !== 'anonymous') {
        profile.authorWeights[data.authorId] = (profile.authorWeights[data.authorId] || 0) + 2;
        profile.isDirty = true;
    }
    
    // Catch-all dirty flag if any of the above modified weights
    if (weight > 0 || data.category || (data.authorId && data.authorId !== 'anonymous')) {
        profile.isDirty = true;
    }
    
    saveStoredAffinities(profile);
}

/**
 * Ranks a pool of questions using the Monolith-Lite algorithm:
 * - Exploitation Phase: Score based on local affinity profile.
 * - Exploration Phase: Inject random/low-affinity questions for discovery.
 */
export function rankFeedForUser(pool: Question[]): Question[] {
    const profile = getStoredAffinities();
    
    // 1. Score all questions in pool
    const scoredPool = pool.map(question => {
        let score = 0;
        
        // --- BASE SCORE (Global Quality & Relevance) --- //
        // P_interaction proxy
        let globalScore = 0;
        globalScore += Math.min((question.answerCount || 0) * 2, 10);
        globalScore += Math.min((question.flowerCount || 0) * 1, 5);
        
        // Base Recency (Steeper time decay to keep feed ultra-fresh)
        if (question.createdAt?.toDate) {
            const daysOld = (Date.now() - question.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
            if (daysOld < 1) globalScore += 20;
            else if (daysOld < 3) globalScore += 10;
            else if (daysOld < 7) globalScore += 2;
        }

        // --- AFFINITY SCORE (V_interaction proxy / Personalization) --- //
        let userScore = 0;
        if (question.category && profile.categoryWeights[question.category]) {
            userScore += profile.categoryWeights[question.category] * 3; // Enhanced category multiplier
        }
        
        if (question.authorId && profile.authorWeights[question.authorId]) {
            userScore += profile.authorWeights[question.authorId] * 2;
        }

        // Feature Vector Dot Product (Keyword similarity)
        const qKeywords = extractKeywords(question.title + ' ' + (question.content || ''));
        let keywordScore = 0;
        qKeywords.forEach(kw => {
            if (profile.keywordWeights[kw]) {
                keywordScore += profile.keywordWeights[kw];
            }
        });
        userScore += keywordScore;

        // TikTok formula implementation: (P * V approach) 
        // We add global engagement/recency to user contextual weights
        score = (globalScore + 1) + userScore;

        // --- SEEN PENALTY --- //
        // If seen recently, heavily penalize so they don't see it twice in the same session
        if (profile.seenQuestions.includes(question.id)) {
            score -= 500; // Almost guarantee it goes to the bottom
        }

        return { question, score, rand: Math.random() };
    });

    // 2. Separate into Exploitation and Exploration Sets
    // Filter out seen (-100 score threshold broadly) as best we can, unless pool is empty
    const unseenScored = scoredPool.filter(s => s.score > -50).sort((a, b) => b.score - a.score);
    
    // If we don't have enough unseen, just use everything sorted
    if (unseenScored.length < 5) {
        return scoredPool.sort((a, b) => b.score - a.score).map(s => s.question);
    }

    const totalNeeded = unseenScored.length;
    const exploitationCount = Math.floor(totalNeeded * 0.7); // 70% Exploitation
    
    // Top 70% by score 
    const exploitationItems = unseenScored.slice(0, exploitationCount);
    const exploitationIds = new Set(exploitationItems.map(i => i.question.id));
    
    // Remaining are potential exploration items (not in the top 70%)
    // Sort randomly to inject serendipity
    const explorationItems = unseenScored
        .filter(i => !exploitationIds.has(i.question.id))
        .sort((a, b) => a.rand - b.rand); // Randomize

    // 3. Mix the Feed
    const mixedFeed: Question[] = [];
    let expIndex = 0;
    let exporIndex = 0;
    
    // Every 3 items: 2 Exploitation, 1 Exploration (roughly 66-33 mix)
    for (let i = 0; i < totalNeeded; i++) {
        if ((i + 1) % 3 === 0 && exporIndex < explorationItems.length) {
            mixedFeed.push(explorationItems[exporIndex].question);
            exporIndex++;
        } else if (expIndex < exploitationItems.length) {
            mixedFeed.push(exploitationItems[expIndex].question);
            expIndex++;
        } else if (exporIndex < explorationItems.length) {
            // Fallback if exploitation is empty
            mixedFeed.push(explorationItems[exporIndex].question);
            exporIndex++;
        }
    }

    return mixedFeed;
}

/**
 * Ranks questions based on a search query, using both keyword matching
 * and the user's affinity profile for personalization.
 */
export function searchAndRank(pool: Question[], query: string): Question[] {
    if (!query || query.trim() === '') return [];
    
    const profile = getStoredAffinities();
    const queryKeywords = extractKeywords(query);
    
    // Semantic Expansion: Expand keywords using our local clusters
    let expandedTerms = [...queryKeywords];
    queryKeywords.forEach(term => {
        for (const [clusterId, words] of Object.entries(semanticClusters)) {
            if (words.includes(term)) {
                expandedTerms.push(clusterId);
                words.forEach(w => expandedTerms.push(w));
            }
        }
    });
    
    // Deduplicate expanded terms
    const finalKeywords = Array.from(new Set(expandedTerms));
    
    // If no valuable keywords extracted (e.g. only stop words), use the raw string
    const searchTerms = finalKeywords.length > 0 ? finalKeywords : [query.trim().toLowerCase()];

    const scoredPool = pool.map(question => {
        let score = 0;
        
        const qTitle = (question.title || '').toLowerCase();
        const qContent = (question.content || '').toLowerCase();
        const qAuthor = (question.authorName || '').toLowerCase();
        const qCategory = (question.category || '').toLowerCase();

        // 1. Direct Search Match (Highest priority)
        let matchCount = 0;
        searchTerms.forEach(term => {
            if (qTitle.includes(term)) {
                score += 50;
                matchCount++;
            }
            if (qContent.includes(term)) {
                score += 20;
                matchCount++;
            }
            if (qAuthor.includes(term)) {
                score += 30;
                matchCount++;
            }
            if (qCategory.includes(term)) {
                score += 30;
                matchCount++;
            }
        });

        // If no match at all, score is negative infinite (filter out)
        if (matchCount === 0) {
            return { question, score: -1000 };
        }

        // 2. Personalization Bonus (Vector Mapping)
        if (question.category && profile.categoryWeights[question.category]) {
            score += profile.categoryWeights[question.category] * 0.5; // Slight bonus for liked categories
        }
        
        if (question.authorId && profile.authorWeights[question.authorId]) {
            score += profile.authorWeights[question.authorId] * 0.5;
        }

        const qKeywords = extractKeywords(qTitle + ' ' + qContent);
        let keywordScore = 0;
        qKeywords.forEach(kw => {
            if (profile.keywordWeights[kw]) {
                keywordScore += profile.keywordWeights[kw] * 0.2; // Small bonus for mapped keywords
            }
        });
        score += keywordScore;

        // Base Engagement Bonus
        score += Math.min((question.answerCount || 0) * 0.5, 5);
        score += Math.min((question.flowerCount || 0) * 0.2, 5);

        return { question, score };
    });

    // Filter out non-matches (-1000) and sort by score
    return scoredPool
        .filter(s => s.score > -1000)
        .sort((a, b) => b.score - a.score)
        .map(s => s.question);
}

// ==========================================
// LAZY SYNC SYSTEM
// ==========================================

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function syncAffinitiesToFirestore(userId: string) {
    if (!userId || typeof window === 'undefined') return;
    
    const profile = getStoredAffinities();
    
    // Check if dirty (changes exist)
    if (!profile.isDirty) return;
    
    // Check if 24 hours have passed since last sync
    const now = Date.now();
    if (profile.lastSyncAt && (now - profile.lastSyncAt) < SYNC_INTERVAL_MS) {
        return; // Too soon to sync again
    }
    
    try {
        const ref = doc(db, 'user_affinities', userId);
        
        // Strip out local flags before saving
        const { isDirty, lastSyncAt, ...dataToSave } = profile;
        
        await setDoc(ref, {
            ...dataToSave,
            updatedAt: now
        }, { merge: true });
        
        // Mark as synced locally
        profile.isDirty = false;
        profile.lastSyncAt = now;
        saveStoredAffinities(profile);
        
        console.log('✅ Vector Affinities lazy-synced to Firestore (1/day max)');
    } catch (error) {
        console.error('Failed to sync affinities', error);
    }
}

export async function fetchAffinitiesFromFirestore(userId: string) {
    if (!userId || typeof window === 'undefined') return;
    
    const profile = getStoredAffinities();
    const hasData = Object.keys(profile.categoryWeights).length > 0 || profile.seenQuestions.length > 0;
    
    // Only fetch if local profile is completely empty (e.g., fresh login on new device)
    if (!hasData) {
        try {
            const ref = doc(db, 'user_affinities', userId);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                const newProfile: UserAffinityProfile = {
                    categoryWeights: data.categoryWeights || {},
                    authorWeights: data.authorWeights || {},
                    keywordWeights: data.keywordWeights || {},
                    seenQuestions: data.seenQuestions || [],
                    isDirty: false,
                    lastSyncAt: data.updatedAt || Date.now()
                };
                saveStoredAffinities(newProfile);
                console.log('📥 Vector Affinities restored from Firestore');
            }
        } catch (error) {
            console.error('Failed to fetch affinities', error);
        }
    }
}


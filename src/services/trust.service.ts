import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface UserData {
    answerCount?: number;
    flowerCount?: number;
    lastActiveAt?: Date | { toDate: () => Date };
    trustLevel?: string;
}

export class TrustScoreService {
    private static readonly FLOWER_WEIGHT = 1.0;
    private static readonly MIN_INTERACTIONS = 10;
    private static readonly GLOBAL_AVERAGE = 0.4; // avg flowers per answer site-wide
    private static readonly BAYESIAN_CONSTANT = 5; // 'm' in the formula

    /**
     * Calculates the reliability score (R) using Bayesian Average.
     * R = (v * S + m * C) / (v + m) * D(t)
     * 
     * @param userId - The ID of the user to calculate for
     * @returns number - Normalized score between 0 and 100
     */
    async calculateScore(userId: string): Promise<number> {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) throw new Error("User not found");

        const user = userSnap.data() as UserData;

        const v = user.answerCount || 0; // Total interactions (answers given)
        const S = v === 0 ? 0 : (user.flowerCount || 0) / v; // User's average (Flowers / Answers)
        const m = TrustScoreService.BAYESIAN_CONSTANT;
        const C = TrustScoreService.GLOBAL_AVERAGE;

        // Bayesian Average
        let rawScore = (v * S + m * C) / (v + m);

        // Apply Time Decay D(t)
        // If inactive for > 180 days, score starts to decay
        const lastActive = user.lastActiveAt;
        const lastActiveDate = lastActive
            ? (typeof (lastActive as any).toDate === 'function'
                ? (lastActive as { toDate: () => Date }).toDate()
                : new Date(lastActive as unknown as string))
            : new Date();

        const daysInactive = this.calculateDaysInactive(lastActiveDate);
        const decayFactor = this.calculateDecayFactor(daysInactive);

        const finalScore = rawScore * decayFactor;

        // Normalize to 0-100 scale (Assuming max possible rawScore is roughly 1.0 if S=1)
        const normalizedScore = Math.min(Math.max(finalScore * 100, 0), 100);

        return normalizedScore;
    }

    /**
     * Updates the user's rank based on their new score.
     */
    async updateRank(userId: string): Promise<void> {
        const score = await this.calculateScore(userId);
        let newLevel: string = "NEWBIE";

        if (score >= 90) newLevel = "LEGEND";
        else if (score >= 75) newLevel = "TRUSTED";
        else if (score >= 50) newLevel = "ACTIVE";
        else if (score >= 20) newLevel = "MEMBER";

        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            reliabilityScore: score / 100.0, // Store as 0-1 float in DB
            trustLevel: newLevel
        });
    }

    private calculateDaysInactive(lastActive: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastActive.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private calculateDecayFactor(daysInactive: number): number {
        if (daysInactive < 30) return 1.0;
        // Linear decay after 30 days of inactivity: loses 10% every 30 days approx
        const decay = 1.0 - ((daysInactive - 30) * 0.003);
        return Math.max(decay, 0.1); // Minimum score multiplier 0.1
    }
}


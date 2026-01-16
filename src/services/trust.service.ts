import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                answerCount: true,
                flowerCount: true,
                lastActiveAt: true,
                trustLevel: true,
            }
        });

        if (!user) throw new Error("User not found");

        const v = user.answerCount; // Total interactions (answers given)
        const S = v === 0 ? 0 : user.flowerCount / v; // User's average (Flowers / Answers)
        const m = TrustScoreService.BAYESIAN_CONSTANT;
        const C = TrustScoreService.GLOBAL_AVERAGE;

        // Bayesian Average
        let rawScore = (v * S + m * C) / (v + m);

        // Apply Time Decay D(t)
        // If inactive for > 180 days, score starts to decay
        const daysInactive = this.calculateDaysInactive(user.lastActiveAt);
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

        await prisma.user.update({
            where: { id: userId },
            data: {
                reliabilityScore: score / 100.0, // Store as 0-1 float in DB
                trustLevel: newLevel
            }
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

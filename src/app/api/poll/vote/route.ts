import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Smart notification thresholds
const BATCH_THRESHOLD = 10;          // votes per hour before we switch to batching
const BATCH_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

export async function POST(req: Request) {
    try {
        const { questionId, optionId, userId } = await req.json();

        if (!questionId || !optionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const identifier = userId || ip;

        const questionRef = adminDb().collection('questions').doc(questionId);

        const result = await adminDb().runTransaction(async (transaction: any) => {
            const questionDoc = await transaction.get(questionRef);

            if (!questionDoc.exists) {
                throw new Error('Question not found');
            }

            const data = questionDoc.data();
            
            if (data?.type !== 'poll') {
                throw new Error('Not a poll');
            }

            const votedUsers = data?.votedUsers || {};
            const allowVoteChange = data?.allowVoteChange === true;
            const previousOptionId = votedUsers[identifier];
            
            if (previousOptionId && !allowVoteChange) {
                throw new Error('Already voted');
            }

            if (previousOptionId === optionId) {
                throw new Error('Already voted for this option');
            }

            const pollOptions = data?.pollOptions || [];
            const optionIndex = pollOptions.findIndex((opt: any) => opt.id === optionId);

            if (optionIndex === -1) {
                throw new Error('Option not found');
            }

            // If changing vote: decrement old option
            if (previousOptionId) {
                const prevIndex = pollOptions.findIndex((opt: any) => opt.id === previousOptionId);
                if (prevIndex !== -1) {
                    pollOptions[prevIndex].votes = Math.max(0, (pollOptions[prevIndex].votes || 1) - 1);
                }
            }

            pollOptions[optionIndex].votes = (pollOptions[optionIndex].votes || 0) + 1;
            votedUsers[identifier] = optionId;
            const newTotal = previousOptionId ? (data?.totalVotes || 0) : (data?.totalVotes || 0) + 1;

            // Smart notification tracking
            const now = Date.now();
            const lastNotifAt: number = data?.lastVoteNotificationAt?.toMillis?.() || 0;
            const pendingVotes: number = data?.pendingVoteNotifications || 0;
            const timeSinceLastNotif = now - lastNotifAt;
            
            // Decide: send now, or batch?
            // If less than BATCH_THRESHOLD votes in the last hour → send per-vote
            // If >= BATCH_THRESHOLD votes in last hour → batch (notify once an hour)
            const isHighTraffic = pendingVotes >= BATCH_THRESHOLD && timeSinceLastNotif < BATCH_WINDOW_MS;
            const hourPassed = timeSinceLastNotif >= BATCH_WINDOW_MS;

            let shouldNotifyNow = false;
            let notifPendingCount = 0;

            if (!previousOptionId) { // only notify for NEW votes, not vote changes
                if (isHighTraffic && !hourPassed) {
                    // High traffic: accumulate, don't notify yet
                    notifPendingCount = pendingVotes + 1;
                    shouldNotifyNow = false;
                } else {
                    // Low traffic OR hour passed: notify now, reset counter
                    shouldNotifyNow = true;
                    notifPendingCount = 0; // reset after notifying
                }
            }

            transaction.update(questionRef, {
                pollOptions,
                votedUsers,
                totalVotes: newTotal,
                pendingVoteNotifications: notifPendingCount + (shouldNotifyNow ? 0 : 0),
                ...(shouldNotifyNow ? { lastVoteNotificationAt: Timestamp.now() } : {}),
                ...(!shouldNotifyNow && !previousOptionId ? { pendingVoteNotifications: FieldValue.increment(1) } : {}),
                ...(shouldNotifyNow ? { pendingVoteNotifications: 0 } : {}),
            });

            return { 
                success: true, newTotal, options: pollOptions, 
                authorId: data?.authorId, title: data?.title, 
                isVoteChange: !!previousOptionId,
                shouldNotifyNow,
                pendingVotes: pendingVotes + 1, // total pending including this vote
            };
        });

        // Send notifications outside the transaction
        if (result.success && result.authorId && !result.isVoteChange) {
            const authorId = result.authorId;

            if (result.shouldNotifyNow) {
                const pendingCount = result.pendingVotes;
                
                let message: string;
                if (pendingCount === 1) {
                    message = `מישהו הצביע בסקר שלך! "${result.title}"`;
                } else {
                    message = `${pendingCount} אנשים הצביעו בסקר שלך מאז ההתראה האחרונה!`;
                }

                // Don't notify the author about their own poll if they're the voter
                if (authorId !== userId) {
                    await adminDb().collection('notifications').add({
                        type: 'POLL_VOTE',
                        recipientId: authorId,
                        questionId,
                        questionTitle: result.title,
                        message,
                        voteCount: pendingCount,
                        read: false,
                        createdAt: FieldValue.serverTimestamp()
                    });
                }
            }

            // Milestone notifications (every 50 votes)
            if (result.newTotal > 0 && result.newTotal % 50 === 0) {
                await adminDb().collection('notifications').add({
                    type: 'POLL_MILESTONE',
                    recipientId: authorId,
                    questionId,
                    questionTitle: result.title,
                    message: `🎉 הסקר שלך "${result.title}" הגיע ל-${result.newTotal} הצבעות!`,
                    read: false,
                    createdAt: FieldValue.serverTimestamp()
                });
            }
        }

        return NextResponse.json({ success: true, options: result.options, totalVotes: result.newTotal });

    } catch (error: any) {
        console.error('API Vote Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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
            
            // Block if already voted AND vote change is not allowed
            if (previousOptionId && !allowVoteChange) {
                throw new Error('Already voted');
            }

            // If same option selected again, no-op
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

            // Increment chosen option
            pollOptions[optionIndex].votes = (pollOptions[optionIndex].votes || 0) + 1;
            votedUsers[identifier] = optionId;
            // Total only increases if this is a NEW vote (not a change)
            const newTotal = previousOptionId ? (data?.totalVotes || 0) : (data?.totalVotes || 0) + 1;

            transaction.update(questionRef, {
                pollOptions,
                votedUsers,
                totalVotes: newTotal
            });

            return { success: true, newTotal, options: pollOptions, authorId: data?.authorId, title: data?.title, isVoteChange: !!previousOptionId };

        });

        // Notifications
        if (result.success && result.authorId) {
            // Milestone notification
            if (result.newTotal > 0 && result.newTotal % 20 === 0) {
                await adminDb().collection('notifications').add({
                    type: 'SYSTEM',
                    recipientId: result.authorId,
                    questionId,
                    questionTitle: result.title,
                    message: `הסקר שלך חצה ציון דרך עם ${result.newTotal} הצבעות!`,
                    read: false,
                    createdAt: FieldValue.serverTimestamp()
                });
            }
            // Add a regular notification for every vote? Could be too noisy.
            // Let's add it but make it simple
            await adminDb().collection('notifications').add({
                type: 'SYSTEM',
                recipientId: result.authorId,
                questionId,
                questionTitle: result.title,
                message: `מישהו הרגע הצביע בסקר שלך!`,
                read: false,
                createdAt: FieldValue.serverTimestamp()
            });
        }

        return NextResponse.json({ success: true, options: result.options, totalVotes: result.newTotal });

    } catch (error: any) {
        console.error('API Vote Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

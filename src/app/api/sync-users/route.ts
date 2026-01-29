import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const SUPER_ADMIN_EMAIL = 'eyceyceyc139@gmail.com';

export async function POST(request: NextRequest) {
    try {
        // Get the requesting user's token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify the token and check if user is admin
        const decodedToken = await adminAuth().verifyIdToken(token);
        const requesterDoc = await adminDb().collection('users').doc(decodedToken.uid).get();
        const requesterData = requesterDoc.data();

        if (!requesterData || !['super_admin', 'admin'].includes(requesterData.role)) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        // List all users from Firebase Auth
        const listUsersResult = await adminAuth().listUsers(1000);
        const authUsers = listUsersResult.users;

        // Get existing Firestore user docs
        const usersSnapshot = await adminDb().collection('users').get();
        const existingUids = new Set(usersSnapshot.docs.map((doc: any) => doc.id));

        // Sync missing users
        let created = 0;
        let updated = 0;
        const errors: string[] = [];

        for (const authUser of authUsers) {
            const isSuperAdmin = authUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

            if (!existingUids.has(authUser.uid)) {
                // Create new profile
                try {
                    await adminDb().collection('users').doc(authUser.uid).set({
                        uid: authUser.uid,
                        email: authUser.email || '',
                        displayName: authUser.displayName || authUser.email?.split('@')[0] || 'משתמש',
                        photoURL: authUser.photoURL || null,
                        level: isSuperAdmin ? 'oak' : 'seedling',
                        role: isSuperAdmin ? 'super_admin' : 'user',
                        stats: {
                            points: 0,
                            flowers: 0,
                            correctAnswers: 0,
                            questionsAsked: 0,
                            helpfulAnswers: 0,
                            daysActive: 0,
                            streak: 0
                        },
                        createdAt: new Date(),
                        lastActive: new Date(),
                        isBlocked: false
                    });
                    created++;
                } catch (err: any) {
                    errors.push(`Create ${authUser.email}: ${err.message}`);
                }
            } else {
                // Update existing profile with missing data
                const existingDoc = usersSnapshot.docs.find((d: any) => d.id === authUser.uid);
                const existingData = existingDoc?.data();

                if (existingData && (!existingData.email || existingData.displayName === 'משתמש ללא מייל')) {
                    try {
                        await adminDb().collection('users').doc(authUser.uid).update({
                            email: authUser.email || existingData.email || '',
                            displayName: authUser.displayName || authUser.email?.split('@')[0] || existingData.displayName,
                            photoURL: authUser.photoURL || existingData.photoURL || null
                        });
                        updated++;
                    } catch (err: any) {
                        errors.push(`Update ${authUser.email}: ${err.message}`);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            authUsersCount: authUsers.length,
            firestoreUsersCount: existingUids.size,
            created,
            updated,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Sync users error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync users',
            hint: 'Make sure FIREBASE_SERVICE_ACCOUNT_KEY is set in .env.local'
        }, { status: 500 });
    }
}

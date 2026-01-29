import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;

function getAdminApp(): App {
    if (adminApp) {
        return adminApp;
    }

    const apps = getApps();
    if (apps.length > 0) {
        adminApp = apps[0];
        return adminApp;
    }

    // Check if we have service account credentials
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    console.log('Firebase Admin Init - Checking for credentials...');
    console.log('FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!serviceAccountKey);
    console.log('Key length:', serviceAccountKey?.length || 0);

    if (serviceAccountKey) {
        try {
            // Parse the JSON credentials
            const credentials = JSON.parse(serviceAccountKey);
            console.log('Credentials parsed successfully, project_id:', credentials.project_id);

            adminApp = initializeApp({
                credential: cert(credentials),
                projectId: credentials.project_id || 'alonit-d5cf9'
            });
            console.log('Firebase Admin initialized with service account');
        } catch (error: any) {
            console.error('Error parsing service account JSON:', error.message);
            throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ' + error.message);
        }
    } else {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    return adminApp;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

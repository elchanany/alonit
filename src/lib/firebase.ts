import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const isBrowser = typeof window !== 'undefined';
const isCustomDomain = isBrowser && (window.location.hostname.endsWith('vercel.app') || window.location.hostname.includes('alonit'));
const authDomain = isCustomDomain ? window.location.host : "alonit-d5cf9.firebaseapp.com";

const firebaseConfig = {
    apiKey: "AIzaSyDUn8SyXrMoCZQAyMbJ8rA62bycdGOfjGk",
    authDomain: authDomain,
    projectId: "alonit-d5cf9",
    storageBucket: "alonit-d5cf9.firebasestorage.app",
    messagingSenderId: "819573739570",
    appId: "1:819573739570:web:9ada26c4e02903f643ec2b",
    measurementId: "G-BXRWWP79BH"
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let analytics;
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, auth, db, storage, analytics };

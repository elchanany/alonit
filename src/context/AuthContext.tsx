'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isVerified: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
    signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
    resendVerification: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isVerified: false,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => ({}),
    signUpWithEmail: async () => ({}),
    resendVerification: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const isVerified = user?.emailVerified || false;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            console.log("Google Sign In Success:", result.user.email);
            router.push('/');
        } catch (error: any) {
            console.error("Error signing in with Google:", error.code, error.message);
            // Don't show error for cancelled popups
            if (error.code === 'auth/cancelled-popup-request' ||
                error.code === 'auth/popup-closed-by-user') {
                return; // User cancelled - no need for error message
            }
            if (error.code === 'auth/popup-blocked') {
                alert("החלון נחסם. אנא אפשר חלונות קופצים עבור אתר זה ונסה שוב.");
                return;
            }
            alert("שגיאה בהתחברות עם גוגל. נסה שוב.");
        }
    };

    const signInWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/');
            return {};
        } catch (error: any) {
            console.error("Email Sign In Error:", error.code);
            if (error.code === 'auth/user-not-found') return { error: 'המשתמש לא נמצא' };
            if (error.code === 'auth/wrong-password') return { error: 'סיסמה שגויה' };
            if (error.code === 'auth/invalid-credential') return { error: 'פרטים שגויים' };
            return { error: 'שגיאה בהתחברות' };
        }
    };

    const signUpWithEmail = async (email: string, password: string): Promise<{ error?: string }> => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            // Send verification email
            await sendEmailVerification(result.user);
            alert('נשלח אליך מייל אימות. אנא לחץ על הקישור במייל כדי להפעיל את החשבון.');
            return {};
        } catch (error: any) {
            console.error("Email Sign Up Error:", error.code);
            if (error.code === 'auth/email-already-in-use') return { error: 'המייל כבר קיים במערכת' };
            if (error.code === 'auth/weak-password') return { error: 'הסיסמה חלשה מדי (מינימום 6 תווים)' };
            if (error.code === 'auth/invalid-email') return { error: 'כתובת מייל לא תקינה' };
            return { error: 'שגיאה בהרשמה' };
        }
    };

    const resendVerification = async () => {
        if (user && !user.emailVerified) {
            try {
                await sendEmailVerification(user);
                alert('מייל אימות נשלח מחדש!');
            } catch (error) {
                console.error("Resend verification error:", error);
            }
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isVerified, signInWithGoogle, signInWithEmail, signUpWithEmail, resendVerification, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

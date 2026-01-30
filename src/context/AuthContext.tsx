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
import { createUserProfile, getUserProfile } from '@/services/user-level.service';
import { fixUserProfile } from '@/services/fix-profile.service';
import { UserProfile, UserRole } from '@/types/user-levels';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isVerified: boolean;
    needsOnboarding: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
    signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
    resendVerification: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isVerified: false,
    needsOnboarding: false,
    signInWithGoogle: async () => { },
    signInWithEmail: async () => ({}),
    signUpWithEmail: async () => ({}),
    resendVerification: async () => { },
    signOut: async () => { },
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const isVerified = user?.emailVerified || false;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    let profile = await getUserProfile(user.uid);

                    if (!profile) {
                        // Auto-create profile for existing auth users who miss a doc
                        console.log("Profile missing for logged-in user, creating...");
                        await createUserProfile(
                            user.uid,
                            user.email || '',
                            user.displayName || user.email?.split('@')[0] || 'User',
                            user.photoURL || undefined
                        );
                        profile = await getUserProfile(user.uid);
                    } else {
                        // Check if needs repair or admin restore
                        const userEmail = user.email?.toLowerCase();
                        const adminEmail = 'eyceyceyc139@gmail.com';
                        const isSuperAdminEmail = userEmail === adminEmail;
                        const needsAdminRestore = isSuperAdminEmail && profile.role !== UserRole.SUPER_ADMIN;

                        // Check if profile is broken (has placeholder name or missing email while auth has one)
                        const isProfileBroken = profile.displayName === 'משתמש ללא מייל' || !profile.email;

                        console.log('Auth Debug:', { userEmail, role: profile.role, needsAdminRestore, isProfileBroken });

                        if (isProfileBroken || needsAdminRestore) {
                            console.log("Profile incomplete/broken/missing permissions, updating from Auth data...");

                            // Use Auth data (user.*) as the source of truth if profile is broken
                            const correctEmail = user.email || '';
                            const correctName = user.displayName || user.email?.split('@')[0] || 'משתמש';

                            await fixUserProfile(
                                user.uid,
                                correctEmail,
                                correctName
                            );

                            // Force reload profile
                            profile = await getUserProfile(user.uid);
                            console.log('Profile updated:', profile);

                            if (needsAdminRestore) alert('מערכת: הרשאות מנהל שוחזרו אוטומטית. אנא רענן את העמוד.');
                            if (isProfileBroken) console.log('Fixed broken profile data');
                        }
                    }

                    setUserProfile(profile);
                } catch (error) {
                    console.error("Error fetching/creating user profile:", error);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            console.log("Google Sign In Success:", result.user.email);

            // Create user profile if it doesn't exist
            const existingProfile = await getUserProfile(result.user.uid);
            if (!existingProfile) {
                await createUserProfile(
                    result.user.uid,
                    result.user.email || '',
                    result.user.displayName || 'משתמש',
                    result.user.photoURL || undefined
                );
                // Fetch the new profile
                const newProfile = await getUserProfile(result.user.uid);
                setUserProfile(newProfile);
            } else {
                // If profile exists but missing info, update it
                const SUPER_ADMIN_EMAIL = 'eyc139@gmail.com';
                const isSuperAdminEmail = result.user.email === SUPER_ADMIN_EMAIL;
                const needsRoleUpdate = isSuperAdminEmail && existingProfile.role !== UserRole.SUPER_ADMIN;

                if (!existingProfile.email || !existingProfile.displayName || !existingProfile.photoURL || needsRoleUpdate) {
                    const needsUpdate = {
                        email: existingProfile.email || result.user.email || '',
                        displayName: existingProfile.displayName || result.user.displayName || 'משתמש',
                        photoURL: existingProfile.photoURL || result.user.photoURL || undefined
                    };
                    await fixUserProfile(result.user.uid, needsUpdate.email, needsUpdate.displayName);
                    // Refetch
                    const updatedProfile = await getUserProfile(result.user.uid);
                    setUserProfile(updatedProfile);
                    if (needsRoleUpdate) alert('הרשאות מנהל שוחזרו בהצלחה!');
                } else {
                    setUserProfile(existingProfile);
                }
            }

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
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (result.user) {
                const profile = await getUserProfile(result.user.uid);
                setUserProfile(profile);
            }
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

            // Create user profile
            await createUserProfile(
                result.user.uid,
                email,
                email.split('@')[0], // Use email prefix as display name
                undefined
            );

            // Fetch the new profile
            const newProfile = await getUserProfile(result.user.uid);
            setUserProfile(newProfile);

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
            setUserProfile(null);
            router.push('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
        }
    };

    // Check if user needs to complete onboarding
    const needsOnboarding = Boolean(
        user &&
        userProfile &&
        !userProfile.isProfileCompleted
    );

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, isVerified, needsOnboarding, signInWithGoogle, signInWithEmail, signUpWithEmail, resendVerification, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

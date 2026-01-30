'use client';

import { useAuth } from "@/context/AuthContext";
import { OnboardingModal } from "@/components/auth/OnboardingModal";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
    const { needsOnboarding, refreshProfile, loading } = useAuth();

    if (loading) {
        return <>{children}</>;
    }

    return (
        <>
            {children}
            <OnboardingModal
                isOpen={needsOnboarding}
                onComplete={refreshProfile}
            />
        </>
    );
}

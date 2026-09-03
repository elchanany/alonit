'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, Heart, MessageCircle, TrendingUp, PlusCircle, Compass } from 'lucide-react';

interface Step {
    targetSelector: string;
    title: string;
    tag: string;
    description: string;
    pointerPosition: 'top' | 'bottom' | 'left' | 'right';
    icon: any;
}

const STEPS: Step[] = [
    {
        targetSelector: '[data-tour="feed-card"]',
        tag: 'הפיד שלכם',
        title: 'גלילה אנכית כמו בטיקטוק',
        description: 'כל שאלה או סקר מוצגים במסך מלא. גללו למעלה ולמטה כדי לעבור בין נושאים, בדיוק כמו ברשתות החברתיות המובילות.',
        pointerPosition: 'bottom',
        icon: Compass,
    },
    {
        targetSelector: '[data-tour="like-button"]',
        tag: 'פרגון והערכה',
        title: 'תנו פרח (לייק)',
        description: 'ראיתם שאלה מעניינת או תשובה שאהבתם? הקישו פעמיים (Double-Tap) על הכרטיסייה או לחצו על הלב כדי לפרגן.',
        pointerPosition: 'top',
        icon: Heart,
    },
    {
        targetSelector: '[data-tour="answer-button"]',
        tag: 'שיתוף ומענה',
        title: 'תשובות ודיונים',
        description: 'יש לכם עצה טובה, דעה או ניסיון אישי? לחצו כאן כדי לקרוא מה אחרים ענו ולהוסיף את התשובה שלכם.',
        pointerPosition: 'top',
        icon: MessageCircle,
    },
    {
        targetSelector: '[data-tour="author-rank"]',
        tag: 'סולם ההשפעה',
        title: 'דרגות המוניטין',
        description: 'כל חבר מתחיל כ"שתיל". ככל שתענו יותר תשובות איכותיות, תעלו ל"גזע" ול"אלון" – נאמני הקהילה עם סמכויות פיקוח.',
        pointerPosition: 'bottom',
        icon: TrendingUp,
    },
    {
        targetSelector: '[data-tour="ask-button"]',
        tag: 'התייעצות ופריקה',
        title: 'שאלו שאלה (אפשר גם באנונימיות!)',
        description: 'יש משהו שיושב עליכם או רוצים לשמוע דעות? לחצו כאן. אפשר לפרסם בשמכם או להפעיל מצב אנונימי בלחיצה אחת.',
        pointerPosition: 'bottom',
        icon: PlusCircle,
    },
];

const STORAGE_KEY = 'alonit_spotlight_tour_v3';

export function SpotlightTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updateTargetRect = useCallback(() => {
        if (!isOpen) return;
        const step = STEPS[currentStep];
        if (!step) return;

        const el = document.querySelector(step.targetSelector);
        if (el) {
            // Scroll element into view smoothly
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = el.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            // If element not ready yet, retry in 300ms
            retryTimeoutRef.current = setTimeout(() => {
                const retryEl = document.querySelector(step.targetSelector);
                if (retryEl) {
                    setTargetRect(retryEl.getBoundingClientRect());
                }
            }, 300);
        }
    }, [isOpen, currentStep]);

    useEffect(() => {
        const handleOpenTour = () => {
            setCurrentStep(0);
            setIsOpen(true);
        };
        window.addEventListener('open-alonit-tour', handleOpenTour);

        // Auto-show on first visit
        try {
            const seen = localStorage.getItem(STORAGE_KEY);
            if (!seen) {
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 1200);
                return () => clearTimeout(timer);
            }
        } catch {}

        return () => {
            window.removeEventListener('open-alonit-tour', handleOpenTour);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateTargetRect();
            const handleResize = () => updateTargetRect();
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleResize, true);
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('scroll', handleResize, true);
            };
        }
    }, [isOpen, currentStep, updateTargetRect]);

    const handleClose = () => {
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {}
        setIsOpen(false);
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    if (!isOpen) return null;

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const IconComponent = step.icon;

    // Calculate position for the guidance card relative to the target
    const getCardStyle = (): React.CSSProperties => {
        if (!targetRect || typeof window === 'undefined') {
            return {
                position: 'fixed',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '92vw',
                width: '420px',
            };
        }

        const isMobile = window.innerWidth < 768;
        const windowHeight = window.innerHeight;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        // On mobile or if target is near top, place card at bottom
        if (isMobile || targetCenterY < windowHeight / 2) {
            return {
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '92vw',
                width: '420px',
            };
        } else {
            // Place card near top
            return {
                position: 'fixed',
                top: '76px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '92vw',
                width: '420px',
            };
        }
    };

    return (
        <div className="fixed inset-0 z-[200] pointer-events-auto" dir="rtl">
            {/* Dark backdrop overlay */}
            <div
                onClick={handleClose}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300"
            />

            {/* Target Highlight Ring & Ripple Pointer */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none transition-all duration-500 ease-out z-[205]"
                    style={{
                        top: `${Math.max(4, targetRect.top - 6)}px`,
                        left: `${Math.max(4, targetRect.left - 6)}px`,
                        width: `${targetRect.width + 12}px`,
                        height: `${targetRect.height + 12}px`,
                    }}
                >
                    {/* Glowing highlight box */}
                    <div className="w-full h-full rounded-2xl ring-4 ring-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.6)] animate-pulse" />

                    {/* Animated Arrow / Pointer Badge */}
                    <div className="absolute -top-10 right-1/2 translate-x-1/2 flex items-center gap-1.5 bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xl border border-indigo-300/40 animate-bounce whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>שימו לב לכאן!</span>
                    </div>
                </div>
            )}

            {/* Floating Guidance Card */}
            <div
                style={getCardStyle()}
                className="z-[210] bg-slate-950/95 border border-indigo-500/40 rounded-3xl shadow-2xl p-5 backdrop-blur-2xl text-white flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <IconComponent size={16} />
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold text-indigo-400 block leading-tight">
                                {step.tag}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                שלב {currentStep + 1} מתוך {STEPS.length}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                        title="סגור הדרכה"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {step.description}
                    </p>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    {/* Stepper Dots */}
                    <div className="flex items-center gap-1.5">
                        {STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStep
                                        ? 'w-6 bg-indigo-500'
                                        : 'w-2 bg-slate-700 hover:bg-slate-600'
                                }`}
                                aria-label={`עבור לשלב ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1"
                            >
                                <ChevronRight size={14} />
                                הקודם
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 active:scale-95 shadow-md ${
                                isLastStep
                                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                            }`}
                        >
                            <span>{isLastStep ? 'הבנתי, בואו נתחיל!' : 'הבא'}</span>
                            <ChevronLeft size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function triggerWelcomeTour() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-alonit-tour'));
    }
}

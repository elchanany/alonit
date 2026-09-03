'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    X,
    Heart,
    MessageCircle,
    TrendingUp,
    PlusCircle,
    Compass,
    ShieldCheck,
    Lock,
    Sparkles,
    CheckCircle2,
    ArrowUp,
    ChevronDown,
    Award
} from 'lucide-react';

interface Step {
    id: string;
    targetSelector?: string; // If null/empty, centered modal without cutout
    tag: string;
    title: string;
    description: string;
    rulesList?: string[];
    isAgreementRequired?: boolean;
    icon: any;
    demoType?: 'welcome' | 'rules' | 'scroll' | 'double_tap' | 'anonymous_toggle' | 'rank_ladder';
}

const STEPS: Step[] = [
    {
        id: 'welcome',
        tag: 'מה זה אלונית?',
        title: 'הרשת החברתית הבטוחה והאנונימית של הנוער',
        description: 'אלונית היא המקום שלכם להתייעץ, לשאול שאלות על כל נושא, לפרוק מכל הלב ולהשתתף בסקרים – באווירה תומכת, מכבדת ובלי שיפוטיות.',
        icon: Compass,
        demoType: 'welcome',
    },
    {
        id: 'rules',
        tag: 'כללי הקהילה ותנאי שימוש',
        title: 'הסכם השימוש והמרחב הבטוח',
        description: 'כדי לשמור על אלונית כבית בטוח לכולם, אנו מקפידים על שלושה כללי ברזל:',
        rulesList: [
            'שיח מכבד ואפס סובלנות לבריונות, קללות, הטרדות או שיימינג.',
            'שמירה על פרטיות: חל איסור לפרסם שמות מלאים, מספרי טלפון, כתובות או רשתות חברתיות של עצמכם או של אחרים.',
            'עזרה ותמיכה: שאלות ודיונים נשמרים ברמה גבוהה. תוכן פוגעני מוסר מיידית על ידי מודרציה ונאמני אלון.',
        ],
        isAgreementRequired: true,
        icon: ShieldCheck,
        demoType: 'rules',
    },
    {
        id: 'feed_scroll',
        targetSelector: '[data-tour="feed-card"]',
        tag: 'הפיד שלכם',
        title: 'גלילה אנכית רציפה כמו בטיקטוק',
        description: 'כל שאלה, פריקה או סקר מוצגים בכרטיסייה במסך מלא. פשוט גללו למעלה או למטה כדי לעבור בין שאלות בצורה חלקה.',
        icon: ArrowUp,
        demoType: 'scroll',
    },
    {
        id: 'double_tap_like',
        targetSelector: '[data-tour="like-button"]',
        tag: 'פרגון והערכה',
        title: 'תנו פרח (לייק) או הקליקו פעמיים',
        description: 'ראיתם שאלה שדיברה אליכם או תשובה שאהבתם? לחצו על הלב או הקליקו פעמיים (Double-Tap) על הכרטיסייה כדי לפרגן.',
        icon: Heart,
        demoType: 'double_tap',
    },
    {
        id: 'anonymous_ask',
        targetSelector: '[data-tour="ask-button"]',
        tag: 'שאלת שאלה',
        title: 'שאלו שאלה – כולל מצב אנונימי מלא!',
        description: 'משהו מטריד אתכם? לחצו על "שאל שאלה". תוכלו לשאול בשמכם או להפעיל מצב אנונימי כדי שאף אחד לא יידע מי שאל.',
        icon: PlusCircle,
        demoType: 'anonymous_toggle',
    },
    {
        id: 'ranks',
        targetSelector: '[data-tour="author-rank"]',
        tag: 'המוניטין וההשפעה שלכם',
        title: 'סולם הדרגות: שתיל, גזע ואלון',
        description: 'כולם מתחילים כ"שתיל". ככל שתענו תשובות שיעזרו לאחרים, תעלו בסולם הדרגות עד לדרגת "אלון" – נאמני הקהילה המובילים.',
        icon: TrendingUp,
        demoType: 'rank_ladder',
    },
];

const STORAGE_KEY = 'alonit_spotlight_tour_v4';

export function SpotlightTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [agreedToRules, setAgreedToRules] = useState(false);

    // Interactive Demo States
    const [demoLiked, setDemoLiked] = useState(false);
    const [likeExplosion, setLikeExplosion] = useState(false);
    const [demoAnonymous, setDemoAnonymous] = useState(true);
    const [demoScrollProgress, setDemoScrollProgress] = useState(0);

    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updateTargetRect = useCallback(() => {
        if (!isOpen) return;
        const step = STEPS[currentStep];
        if (!step || !step.targetSelector) {
            setTargetRect(null);
            return;
        }

        const el = document.querySelector(step.targetSelector);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = el.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            retryTimeoutRef.current = setTimeout(() => {
                const retryEl = document.querySelector(step.targetSelector!);
                if (retryEl) {
                    setTargetRect(retryEl.getBoundingClientRect());
                }
            }, 300);
        }
    }, [isOpen, currentStep]);

    useEffect(() => {
        const handleOpenTour = () => {
            setCurrentStep(0);
            setAgreedToRules(false);
            setDemoLiked(false);
            setIsOpen(true);
        };
        window.addEventListener('open-alonit-tour', handleOpenTour);

        // Auto-show on first visit
        try {
            const seen = localStorage.getItem(STORAGE_KEY);
            if (!seen) {
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 1000);
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

    // Demo scroll animation effect
    useEffect(() => {
        if (isOpen && STEPS[currentStep]?.demoType === 'scroll') {
            const interval = setInterval(() => {
                setDemoScrollProgress(prev => (prev >= 100 ? 0 : prev + 20));
            }, 800);
            return () => clearInterval(interval);
        }
    }, [isOpen, currentStep]);

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

    const handleDemoLikeClick = () => {
        setDemoLiked(prev => !prev);
        setLikeExplosion(true);
        setTimeout(() => setLikeExplosion(false), 700);
    };

    if (!isOpen) return null;

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const IconComponent = step.icon;
    const canProceed = !step.isAgreementRequired || agreedToRules;

    // Calculate position for the guidance card relative to the target
    const getCardStyle = (): React.CSSProperties => {
        if (!targetRect || typeof window === 'undefined') {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '92vw',
                width: '460px',
            };
        }

        const isMobile = window.innerWidth < 768;
        const windowHeight = window.innerHeight;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        if (isMobile || targetCenterY < windowHeight / 2) {
            return {
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '94vw',
                width: '440px',
            };
        } else {
            return {
                position: 'fixed',
                top: '76px',
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '94vw',
                width: '440px',
            };
        }
    };

    return (
        <div className="fixed inset-0 z-[200] pointer-events-auto select-none" dir="rtl">
            {/* Standard Backdrop if no target cutout */}
            {!targetRect && (
                <div
                    onClick={handleClose}
                    className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity duration-300"
                />
            )}

            {/* TRUE SPOTLIGHT CUTOUT - inside is 100% transparent and crystal clear! */}
            {targetRect && (
                <div
                    className="fixed rounded-2xl pointer-events-none transition-all duration-400 ease-out z-[190]"
                    style={{
                        top: `${Math.max(0, targetRect.top - 8)}px`,
                        left: `${Math.max(0, targetRect.left - 8)}px`,
                        width: `${targetRect.width + 16}px`,
                        height: `${targetRect.height + 16}px`,
                        // This 9999px box-shadow darkens everything outside, leaving the inside 100% clear!
                        boxShadow: '0 0 0 9999px rgba(3, 7, 18, 0.85)',
                    }}
                >
                    {/* Glowing highlight border */}
                    <div className="w-full h-full rounded-2xl ring-4 ring-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.8)] animate-pulse" />

                    {/* Animated bouncing pointer badge */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xl border border-white/30 animate-bounce whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>שימו לב לכאן</span>
                        <ChevronDown size={14} className="text-white/80" />
                    </div>
                </div>
            )}

            {/* Floating Guidance & Live Demo Card */}
            <div
                style={getCardStyle()}
                className="z-[210] bg-slate-950/95 border border-indigo-500/40 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] p-5 md:p-6 backdrop-blur-2xl text-white flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 max-h-[88vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                            <IconComponent size={18} />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-indigo-400 block leading-tight">
                                {step.tag}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                שלב {currentStep + 1} מתוך {STEPS.length}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-800"
                        title="סגור הדרכה"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="space-y-2">
                    <h3 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                        {step.title}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                        {step.description}
                    </p>
                </div>

                {/* Rules List (if Step 2) */}
                {step.rulesList && (
                    <div className="space-y-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300">
                        {step.rulesList.map((rule, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                    {idx + 1}
                                </span>
                                <span className="leading-tight">{rule}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Terms Agreement Checkbox (Step 2) */}
                {step.isAgreementRequired && (
                    <label className="flex items-center gap-2.5 bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500/60 p-3 rounded-2xl cursor-pointer transition-all active:scale-98">
                        <input
                            type="checkbox"
                            checked={agreedToRules}
                            onChange={(e) => setAgreedToRules(e.target.checked)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-indigo-200 select-none">
                            קראתי ואני מתחייב/ת לשמור על שפה מכבדת ולשמור על הכללים
                        </span>
                    </label>
                )}

                {/* LIVE INTERACTIVE DEMOS */}

                {/* Welcome Demo */}
                {step.demoType === 'welcome' && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-around text-center">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                                <Lock size={18} />
                            </div>
                            <span className="text-[11px] font-bold text-white">100% אנונימי</span>
                        </div>
                        <div className="w-px h-8 bg-slate-800" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center">
                                <Heart size={18} />
                            </div>
                            <span className="text-[11px] font-bold text-white">קהילה תומכת</span>
                        </div>
                        <div className="w-px h-8 bg-slate-800" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                                <ShieldCheck size={18} />
                            </div>
                            <span className="text-[11px] font-bold text-white">פיקוח פעיל</span>
                        </div>
                    </div>
                )}

                {/* Scroll Demo */}
                {step.demoType === 'scroll' && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center animate-bounce">
                                <ArrowUp size={16} />
                            </div>
                            <span>החליקו למעלה כדי להגיע לשאלה הבאה</span>
                        </div>
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
                                style={{ width: `${demoScrollProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Double Tap Like Demo */}
                {step.demoType === 'double_tap' && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                        <div className="text-xs text-slate-300">
                            <span className="font-bold text-white block">נסו בעצמכם:</span>
                            <span>לחצו על הלב כדי להדגים לייק</span>
                        </div>

                        <button
                            onClick={handleDemoLikeClick}
                            className={`relative p-2.5 rounded-2xl border transition-all active:scale-90 flex items-center gap-2 ${
                                demoLiked
                                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                        >
                            <Heart
                                size={20}
                                fill={demoLiked ? 'currentColor' : 'none'}
                                className={likeExplosion ? 'animate-ping' : ''}
                            />
                            <span className="text-xs font-bold">{demoLiked ? '1' : '0'}</span>
                        </button>
                    </div>
                )}

                {/* Anonymous Toggle Demo */}
                {step.demoType === 'anonymous_toggle' && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                        <div className="text-xs text-slate-300">
                            <span className="font-bold text-white block">פרסום שאלה:</span>
                            <span>{demoAnonymous ? 'מופיע כ: משתמש אנונימי' : 'מופיע כ: השם הפרטי שלכם'}</span>
                        </div>

                        <button
                            onClick={() => setDemoAnonymous(prev => !prev)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 active:scale-95 ${
                                demoAnonymous
                                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                        >
                            <Lock size={12} />
                            <span>{demoAnonymous ? 'אנונימי פעיל' : 'מצב גלוי'}</span>
                        </button>
                    </div>
                )}

                {/* Rank Ladder Demo */}
                {step.demoType === 'rank_ladder' && (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2">
                            <span className="block font-bold text-emerald-300">שתיל</span>
                            <span className="text-[10px] text-slate-400">התחלה</span>
                        </div>
                        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2">
                            <span className="block font-bold text-amber-300">גזע</span>
                            <span className="text-[10px] text-slate-400">משתמש פעיל</span>
                        </div>
                        <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-2">
                            <span className="block font-bold text-purple-300">אלון</span>
                            <span className="text-[10px] text-slate-400">נאמן קהילה</span>
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                    {/* Stepper Dots */}
                    <div className="flex items-center gap-1.5">
                        {STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (idx <= currentStep || agreedToRules) {
                                        setCurrentStep(idx);
                                    }
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStep
                                        ? 'w-6 bg-indigo-500'
                                        : 'w-2 bg-slate-800 hover:bg-slate-700'
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
                            disabled={!canProceed}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 active:scale-95 shadow-md disabled:opacity-40 disabled:pointer-events-none ${
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

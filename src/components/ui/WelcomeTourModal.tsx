'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, ShieldCheck, TrendingUp, BarChart3, HelpCircle, Layers, CheckCircle2, Lock, Smartphone } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';

interface TourStep {
    tag: string;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    color: string;
    renderInteractivePreview: () => React.ReactNode;
}

const TOUR_STORAGE_KEY = 'alonit_welcome_tour_v2';

export function WelcomeTourModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Mini interactive state for the live demo cards inside the tour
    const [demoLiked, setDemoLiked] = useState(false);
    const [demoVote, setDemoVote] = useState<number | null>(null);
    const [demoAnonymous, setDemoAnonymous] = useState(true);

    useEffect(() => {
        const handleOpenTour = () => {
            setCurrentStep(0);
            setDemoLiked(false);
            setDemoVote(null);
            setIsOpen(true);
        };
        window.addEventListener('open-alonit-tour', handleOpenTour);

        try {
            const seen = localStorage.getItem(TOUR_STORAGE_KEY);
            if (!seen) {
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 600);
                return () => clearTimeout(timer);
            }
        } catch {}

        return () => window.removeEventListener('open-alonit-tour', handleOpenTour);
    }, []);

    const handleClose = () => {
        try {
            localStorage.setItem(TOUR_STORAGE_KEY, 'true');
        } catch {}
        setIsOpen(false);
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
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

    const steps: TourStep[] = [
        {
            tag: 'היכרות עם הפלטפורמה',
            title: 'ברוכים הבאים לאלונית',
            subtitle: 'פלטפורמת שאלות ותשובות לנוער בישראל',
            description: 'אלונית היא קהילה דיגיטלית שנועדה לאפשר שיח פתוח, כנה ומכבד. כאן תוכלו להתייעץ, לשתף חוויות, לשאול שאלות על כל נושא ולקבל מענה ממשתמשים בני גילכם.',
            icon: Layers,
            color: 'from-indigo-600/30 to-purple-600/30',
            renderInteractivePreview: () => (
                <div className="p-5 bg-slate-900/90 rounded-2xl border border-indigo-500/20 flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-xl flex items-center justify-center">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                            <AppLogo className="h-8 w-auto" showText={false} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-white tracking-wide">קהילת אלונית</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            שאלות, סקרים ודיונים מסביב לשעון בממשק מודרני, מהיר ובטוח.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-800">
                        <div className="p-2 rounded-xl bg-slate-800/60 text-center">
                            <span className="block text-xs font-bold text-indigo-300">שיח מכבד</span>
                            <span className="text-[10px] text-slate-400">פיקוח קהילתי</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-800/60 text-center">
                            <span className="block text-xs font-bold text-purple-300">אנונימיות</span>
                            <span className="text-[10px] text-slate-400">פרטיות מלאה</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-800/60 text-center">
                            <span className="block text-xs font-bold text-emerald-300">סקרים חיים</span>
                            <span className="text-[10px] text-slate-400">תוצאות מיידיות</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            tag: 'ניווט ומחוות',
            title: 'פיד אנכי רציף',
            subtitle: 'מעבר מהיר בין שאלות בלחיצה וגלילה',
            description: 'השאלות מוצגות במסך מלא. גללו מעלה ומטה כדי לעבור בין נושאים. כדי להביע הערכה לתשובה או שאלה שאהבתם, הקישו פעמיים על הכרטיסייה לסימון אהבתי.',
            icon: Smartphone,
            color: 'from-pink-600/30 to-rose-600/30',
            renderInteractivePreview: () => (
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                        <span>התנסו כעת בלייב:</span>
                        <span className="text-indigo-400 font-medium">לחיצה כפולה על התיבה</span>
                    </div>
                    <div
                        onDoubleClick={() => setDemoLiked(!demoLiked)}
                        onClick={() => setDemoLiked(!demoLiked)}
                        className="cursor-pointer p-4 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:border-pink-500/50 transition-all text-center select-none flex flex-col items-center justify-center gap-2"
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${demoLiked ? 'bg-pink-500/20 text-pink-400 scale-110' : 'bg-slate-700 text-slate-400'}`}>
                            <Heart size={22} fill={demoLiked ? 'currentColor' : 'none'} />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">
                            {demoLiked ? 'סימנתם אהבתי (לחיצה לביטול)' : 'הקישו כאן לסימון אהבתי'}
                        </span>
                    </div>
                </div>
            )
        },
        {
            tag: 'מוניטין והשפעה',
            title: 'סולם הדרגות',
            subtitle: 'שתיל, גזע ואלון',
            description: 'כל משתמש מתחיל בדרגת שתיל. ככל שתוסיפו תשובות איכותיות ותצברו הערכה ממשתמשים אחרים, תתקדמו לדרגת גזע. המשתמשים הבולטים והאמינים ביותר ממונים לדרגת אלון, בעלי סמכויות פיקוח וניהול בקהילה.',
            icon: TrendingUp,
            color: 'from-emerald-600/30 to-teal-600/30',
            renderInteractivePreview: () => (
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col gap-3">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">שתיל</span>
                                <span className="text-xs text-slate-300">דרגת כניסה לחברים חדשים</span>
                            </div>
                            <span className="text-[11px] text-slate-400">שלב 1</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">גזע</span>
                                <span className="text-xs text-slate-300">משתמשים פעילים ותורמים</span>
                            </div>
                            <span className="text-[11px] text-slate-400">שלב 2</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">אלון</span>
                                <span className="text-xs text-slate-300">נאמני קהילה עם הרשאות ניהול</span>
                            </div>
                            <span className="text-[11px] text-indigo-400 font-semibold">פיקוח</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            tag: 'בטיחות ופרטיות',
            title: 'אנונימיות מובנית',
            subtitle: 'שמירה מלאה על זהותכם',
            description: 'מעוניינים לשאול שאלה רגישה או לשתף מבלי ששמכם יופיע? בכל פרסום שאלה או תגובה תוכלו להפעיל את מתג האנונימיות. פרטיכם יישארו חסויים לחלוטין.',
            icon: ShieldCheck,
            color: 'from-purple-600/30 to-indigo-600/30',
            renderInteractivePreview: () => (
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <Lock size={16} className="text-indigo-400" />
                            <div>
                                <span className="block text-xs font-bold text-white">מצב פרסום אנונימי</span>
                                <span className="text-[10px] text-slate-400">הזהות שלכם לא תוצג לשאר המשתמשים</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDemoAnonymous(!demoAnonymous)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                demoAnonymous
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-700 text-slate-400'
                            }`}
                        >
                            {demoAnonymous ? 'פעיל' : 'כבוי'}
                        </button>
                    </div>
                    <div className="text-[11px] text-slate-400 text-center">
                        ניתן לשנות בכל רגע בעת כתיבת שאלה או מענה לתשובה
                    </div>
                </div>
            )
        },
        {
            tag: 'סקרים ותוכן קשור',
            title: 'סקרים והמלצות תוכן',
            subtitle: 'הצבעה בזמן אמת וניווט לפי נושאים',
            description: 'מלבד שאלות רגילות, תפגשו בפיד סקרים שבהם ניתן להצביע בלחיצה אחת ולצפות בהתפלגות התוצאות. במחשב תוכלו לראות בצידי המסך שאלות קשורות לתוכן שבו אתם צופים.',
            icon: BarChart3,
            color: 'from-cyan-600/30 to-blue-600/30',
            renderInteractivePreview: () => (
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                    <span className="text-xs font-semibold text-slate-300">הדמיית סקר: באיזה שעה אתם מתעוררים?</span>
                    <div className="space-y-1.5 pt-1">
                        {[
                            { id: 0, text: 'לפני 07:00', pct: 45 },
                            { id: 1, text: 'אחרי 07:00', pct: 55 }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setDemoVote(opt.id)}
                                className={`w-full p-2 rounded-xl text-xs font-medium relative overflow-hidden transition-all flex items-center justify-between border ${
                                    demoVote === opt.id
                                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                                        : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:border-slate-600'
                                }`}
                            >
                                <span className="relative z-10">{opt.text}</span>
                                <span className="relative z-10 text-[11px] font-bold text-slate-400">{demoVote !== null ? `${opt.pct}%` : 'הצבע'}</span>
                                {demoVote !== null && (
                                    <div
                                        className="absolute top-0 bottom-0 right-0 bg-indigo-600/20 transition-all duration-500"
                                        style={{ width: `${opt.pct}%` }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )
        }
    ];

    if (!isOpen) return null;

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;
    const IconComponent = step.icon;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" dir="rtl">
            <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Subtle top glow */}
                <div className={`absolute top-0 inset-x-0 h-40 bg-gradient-to-b ${step.color} opacity-40 blur-2xl pointer-events-none transition-all duration-500`} />

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 relative z-10 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <IconComponent size={15} />
                        </div>
                        <span className="text-xs font-semibold text-slate-300">
                            {step.tag}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">
                            {currentStep + 1} מתוך {steps.length}
                        </span>
                        <button
                            onClick={handleClose}
                            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                            title="סגור מדריך"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 flex flex-col gap-4 relative z-10">
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {step.title}
                        </h3>
                        <p className="text-xs font-medium text-indigo-400 mt-0.5">
                            {step.subtitle}
                        </p>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[48px]">
                        {step.description}
                    </p>

                    {/* Interactive Live Demo Preview */}
                    <div className="mt-1">
                        {step.renderInteractivePreview()}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between gap-4 relative z-10">
                    {/* Stepper indicators */}
                    <div className="flex items-center gap-1.5">
                        {steps.map((_, idx) => (
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

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1"
                            >
                                <ChevronRight size={14} />
                                הקודם
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 active:scale-95 ${
                                isLastStep
                                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                            }`}
                        >
                            <span>{isLastStep ? 'התחל לגלוש' : 'הבא'}</span>
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

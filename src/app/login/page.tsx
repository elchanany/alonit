'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // If already logged in, redirect
    if (user) {
        router.push('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = isSignUp
            ? await signUpWithEmail(email, password)
            : await signInWithEmail(email, password);

        if (result.error) {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back Link */}
                <Link href="/" className="flex items-center gap-2 text-indigo-300 hover:text-white mb-6 transition-colors">
                    <ArrowLeft size={20} />
                    <span>חזרה לאתר</span>
                </Link>

                {/* Card */}
                <div className="bg-gray-900/80 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="text-4xl mb-2">🌺</div>
                        <h1 className="text-2xl font-bold text-white">
                            {isSignUp ? 'הרשמה לאלונית' : 'התחברות לאלונית'}
                        </h1>
                        <p className="text-indigo-300 text-sm mt-1">
                            {isSignUp ? 'צור חשבון חדש והצטרף לקהילה' : 'ברוך שובך!'}
                        </p>
                    </div>

                    {/* Google Button */}
                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex items-center justify-center gap-3 bg-white/10 border border-gray-700 px-4 py-3 rounded-xl shadow-sm hover:bg-white/20 transition-all font-medium text-white mb-6"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        המשך עם גוגל
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gray-700"></div>
                        <span className="text-gray-400 text-sm">או</span>
                        <div className="flex-1 h-px bg-gray-700"></div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">אימייל</label>
                            <div className="relative">
                                <Mail className="absolute right-3 top-3 text-gray-500" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pr-10 pl-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">סיסמה</label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-3 text-gray-500" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pr-10 pl-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder:text-gray-500"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm text-center bg-red-900/30 border border-red-800/50 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'רגע...' : (isSignUp ? 'צור חשבון' : 'התחבר')}
                        </button>
                    </form>

                    {/* Toggle Sign-up/Sign-in */}
                    <div className="text-center mt-6 text-sm text-gray-400">
                        {isSignUp ? (
                            <>
                                כבר יש לך חשבון?{' '}
                                <button onClick={() => setIsSignUp(false)} className="text-indigo-400 font-bold hover:underline">
                                    התחבר
                                </button>
                            </>
                        ) : (
                            <>
                                אין לך חשבון?{' '}
                                <button onClick={() => setIsSignUp(true)} className="text-indigo-400 font-bold hover:underline">
                                    הירשם עכשיו
                                </button>
                            </>
                        )}
                    </div>

                    {isSignUp && (
                        <p className="text-xs text-gray-500 text-center mt-4">
                            * לאחר ההרשמה תקבל מייל אימות. יש ללחוץ על הקישור במייל כדי להפעיל את החשבון.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

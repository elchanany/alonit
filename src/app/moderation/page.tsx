'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ArrowRight, Shield, Check, X, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Report {
    id: string;
    type: 'ANSWER' | 'QUESTION' | 'USER';
    questionId?: string;
    answerId?: string;
    answerContent?: string;
    answerAuthorName?: string;
    reporterId: string;
    reporterName: string;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    createdAt: any;
}

export default function ModerationPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAlon, setIsAlon] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Check if user is Alon (moderator)
        const checkAlonStatus = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setIsAlon(userData.trustLevel === 'ALON');
                }
            } catch (error) {
                console.error('Error checking Alon status:', error);
            }
        };
        checkAlonStatus();

        // Listen to reports
        const reportsQuery = query(
            collection(db, 'reports'),
            where('status', '==', 'PENDING'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
            const loadedReports = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Report[];
            setReports(loadedReports);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleResolve = async (reportId: string) => {
        try {
            await updateDoc(doc(db, 'reports', reportId), {
                status: 'RESOLVED',
                resolvedBy: user?.uid,
                resolvedAt: new Date()
            });
            showToast('הדיווח טופל ✓', 'success');
        } catch (error) {
            showToast('שגיאה בטיפול', 'error');
        }
    };

    const handleDismiss = async (reportId: string) => {
        try {
            await updateDoc(doc(db, 'reports', reportId), {
                status: 'DISMISSED',
                resolvedBy: user?.uid,
                resolvedAt: new Date()
            });
            showToast('הדיווח נדחה', 'info');
        } catch (error) {
            showToast('שגיאה בדחייה', 'error');
        }
    };

    const handleDeleteContent = async (report: Report) => {
        try {
            if (report.type === 'ANSWER' && report.questionId && report.answerId) {
                await deleteDoc(doc(db, 'questions', report.questionId, 'answers', report.answerId));
                await handleResolve(report.id);
                showToast('התשובה נמחקה והדיווח טופל', 'success');
            }
        } catch (error) {
            showToast('שגיאה במחיקה', 'error');
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <Shield size={48} className="text-indigo-400 mb-4" />
                <p className="text-indigo-300 mb-4">עמוד זה מיועד לאלונים בלבד</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
                טוען...
            </div>
        );
    }

    if (!isAlon) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900">
                <Shield size={48} className="text-red-400 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">גישה מוגבלת</h1>
                <p className="text-gray-400 text-center mb-4">עמוד זה מיועד לאלונים (מנהלים) בלבד.<br />עליך להיות בדרגת "אלון" כדי לגשת לכאן.</p>
                <button
                    onClick={() => router.back()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold transition-colors"
                >
                    חזרה
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 pb-24">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-amber-500/30 z-10 px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                    <ArrowRight size={24} />
                </button>
                <h1 className="font-bold text-white flex-1 flex items-center gap-2">
                    <Shield size={20} className="text-amber-500" />
                    אזור האלונים - דיווחים
                </h1>
                <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full">
                    🌳 אלון
                </span>
            </div>

            <div className="max-w-2xl mx-auto p-4">
                {reports.length === 0 ? (
                    <div className="text-center py-16">
                        <Check size={48} className="text-green-500 mx-auto mb-4" />
                        <p className="text-gray-400">אין דיווחים ממתינים 🎉</p>
                        <p className="text-gray-600 text-sm mt-2">הקהילה נקייה!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">{reports.length} דיווחים ממתינים</p>

                        {reports.map(report => (
                            <div key={report.id} className="bg-gray-800/50 border border-red-500/20 rounded-xl p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                                        <AlertTriangle size={20} className="text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-400">
                                            <span className="text-white font-medium">{report.reporterName}</span>
                                            {' '}דיווח על {report.type === 'ANSWER' ? 'תשובה' : 'תוכן'}
                                        </p>
                                        {report.answerAuthorName && (
                                            <p className="text-xs text-gray-500">מאת: {report.answerAuthorName}</p>
                                        )}
                                    </div>
                                </div>

                                {report.answerContent && (
                                    <div className="bg-gray-900/50 rounded-lg p-3 mb-3 border-r-2 border-red-500">
                                        <p className="text-sm text-gray-300">{report.answerContent}</p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDeleteContent(report)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 py-2 rounded-lg hover:bg-red-600/30 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        מחק תוכן
                                    </button>
                                    <button
                                        onClick={() => handleDismiss(report.id)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gray-700/50 text-gray-400 py-2 rounded-lg hover:bg-gray-600/50 transition-colors"
                                    >
                                        <X size={16} />
                                        דחה דיווח
                                    </button>
                                    <button
                                        onClick={() => handleResolve(report.id)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-600/20 border border-green-500/30 text-green-400 py-2 rounded-lg hover:bg-green-600/30 transition-colors"
                                    >
                                        <Check size={16} />
                                        טופל
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

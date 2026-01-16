'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, HardDrive, TrendingUp, Trash2, RefreshCw } from 'lucide-react';

interface Usage {
    storage: {
        used: number;
        total: number;
        percentage: number;
    };
    bandwidth: {
        used: number;
        total: number;
        percentage: number;
    };
}

export default function CloudinaryUsageDashboard() {
    const [usage, setUsage] = useState<Usage | null>(null);
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);

    const fetchUsage = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cloudinary/usage');
            const data = await res.json();
            setUsage(data.usage);
        } catch (error) {
            console.error('Failed to fetch usage:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
    }, []);

    const runCleanup = async () => {
        if (!confirm('האם למחוק קבצים ישנים (מעל 6 חודשים)?')) return;

        setCleaning(true);
        try {
            const res = await fetch('/api/cloudinary/cleanup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threshold: 80, olderThanMonths: 6 })
            });

            const data = await res.json();

            if (data.success) {
                alert(`נמחקו ${data.deletedCount} קבצים! ${formatBytes(data.deletedSize)} שוחררו.`);
                fetchUsage(); // Refresh usage
            } else {
                alert(data.message || 'לא נדרש ניקוי');
            }
        } catch (error) {
            console.error('Cleanup failed:', error);
            alert('שגיאה בניקוי');
        } finally {
            setCleaning(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (!usage) {
        return (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 text-center">
                <AlertCircle className="mx-auto mb-2 text-red-400" size={32} />
                <p className="text-red-300">שגיאה בטעינת נתוני שימוש</p>
            </div>
        );
    }

    const storageWarning = usage.storage.percentage > 80;
    const bandwidthWarning = usage.bandwidth.percentage > 80;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">שימוש ב-Cloudinary</h2>
                <button
                    onClick={fetchUsage}
                    disabled={loading}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Storage Card */}
            <div className={`bg-gray-800/60 backdrop-blur-sm rounded-2xl border p-6 ${storageWarning ? 'border-orange-500/50' : 'border-gray-700/50'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <HardDrive className={storageWarning ? 'text-orange-400' : 'text-indigo-400'} size={24} />
                    <h3 className="text-lg font-bold text-white">אחסון</h3>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">
                            {formatBytes(usage.storage.used)} / {formatBytes(usage.storage.total)}
                        </span>
                        <span className={storageWarning ? 'text-orange-400 font-bold' : 'text-gray-400'}>
                            {usage.storage.percentage.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${storageWarning ? 'bg-orange-500' : 'bg-indigo-500'
                                }`}
                            style={{ width: `${Math.min(usage.storage.percentage, 100)}%` }}
                        />
                    </div>
                </div>

                {storageWarning && (
                    <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 mb-3">
                        <p className="text-orange-300 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            אחסון מלא! מומלץ להריץ ניקוי
                        </p>
                    </div>
                )}
            </div>

            {/* Bandwidth Card */}
            <div className={`bg-gray-800/60 backdrop-blur-sm rounded-2xl border p-6 ${bandwidthWarning ? 'border-orange-500/50' : 'border-gray-700/50'
                }`}>
                <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className={bandwidthWarning ? 'text-orange-400' : 'text-purple-400'} size={24} />
                    <h3 className="text-lg font-bold text-white">Bandwidth (חודש נוכחי)</h3>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">
                            {formatBytes(usage.bandwidth.used)} / {formatBytes(usage.bandwidth.total)}
                        </span>
                        <span className={bandwidthWarning ? 'text-orange-400 font-bold' : 'text-gray-400'}>
                            {usage.bandwidth.percentage.toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${bandwidthWarning ? 'bg-orange-500' : 'bg-purple-500'
                                }`}
                            style={{ width: `${Math.min(usage.bandwidth.percentage, 100)}%` }}
                        />
                    </div>
                </div>

                {bandwidthWarning && (
                    <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3">
                        <p className="text-orange-300 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            Bandwidth כמעט מלא!
                        </p>
                    </div>
                )}
            </div>

            {/* Cleanup Button */}
            <button
                onClick={runCleanup}
                disabled={cleaning || usage.storage.percentage < 50}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
                {cleaning ? (
                    <>
                        <RefreshCw size={20} className="animate-spin" />
                        מנקה...
                    </>
                ) : (
                    <>
                        <Trash2 size={20} />
                        נקה קבצים ישנים (6+ חודשים)
                    </>
                )}
            </button>

            <p className="text-gray-500 text-xs text-center">
                הניקוי מוחק אוטומטית קבצים ישנים מ-6 חודשים ומעלה כשהאחסון עובר 80%
            </p>
        </div >
    );
}

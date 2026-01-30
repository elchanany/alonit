'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { X, ChevronDown, Send, Heart, ThumbsDown, Reply, Edit2, Trash2, Flag } from 'lucide-react';
import Link from 'next/link';
import { LiveAuthorDisplay } from '@/components/ui/LiveAuthorDisplay';
import { toSmartDate } from '@/utils/hebrewDate';

interface Answer {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    flowerCount: number;
    dislikeCount?: number;
    createdAt: any;
    isAnonymous?: boolean;
    realAuthorName?: string;
    replyTo?: {
        authorName: string;
        content: string;
    };
}

interface AnswersModalProps {
    isOpen: boolean;
    onClose: () => void;
    answers: Answer[];
    questionId: string;
    user: any;
    isAdmin?: boolean;
    authorId?: string;
    likedAnswers: Set<string>;
    dislikedAnswers: Set<string>;
    onSubmitAnswer: (content: string, isAnonymous: boolean, replyTo?: Answer) => Promise<void>;
    onLikeAnswer: (answerId: string) => void;
    onDislikeAnswer: (answerId: string) => void;
    onEditAnswer: (answerId: string, newContent: string) => void;
    onDeleteAnswer: (answerId: string, authorId: string, authorName: string, content: string) => void;
    onReportAnswer: (answer: Answer) => void;
}

const ANSWERS_PER_PAGE = 10;

export function AnswersModal({
    isOpen,
    onClose,
    answers,
    questionId,
    user,
    isAdmin = false,
    authorId = '',
    likedAnswers,
    dislikedAnswers,
    onSubmitAnswer,
    onLikeAnswer,
    onDislikeAnswer,
    onEditAnswer,
    onDeleteAnswer,
    onReportAnswer,
}: AnswersModalProps) {
    const answersContainerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const [visibleCount, setVisibleCount] = useState(ANSWERS_PER_PAGE);
    const [loadingMore, setLoadingMore] = useState(false);
    const [newAnswer, setNewAnswer] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Answer | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setVisibleCount(ANSWERS_PER_PAGE);
            setNewAnswer('');
            setReplyingTo(null);
            setEditingId(null);
            setEditContent('');
        }
    }, [isOpen]);

    // Track scroll position for scroll-to-bottom button
    useEffect(() => {
        const container = answersContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Show button if not near bottom
            setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [isOpen]);

    const scrollToBottom = useCallback(() => {
        if (answersContainerRef.current) {
            answersContainerRef.current.scrollTo({
                top: answersContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, []);

    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose();
        }
    }, [onClose]);

    const loadMore = useCallback(() => {
        setLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(prev => prev + ANSWERS_PER_PAGE);
            setLoadingMore(false);
        }, 300);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnswer.trim() || submitting) return;

        setSubmitting(true);
        try {
            await onSubmitAnswer(newAnswer.trim(), isAnonymous, replyingTo || undefined);
            setNewAnswer('');
            setReplyingTo(null);
            // Scroll to see new answer
            setTimeout(scrollToBottom, 300);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (answerId: string) => {
        onEditAnswer(answerId, editContent);
        setEditingId(null);
        setEditContent('');
    };

    if (!isOpen) return null;

    const visibleAnswers = answers.slice(0, visibleCount);
    const hasMore = answers.length > visibleCount;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
        >
            <div className="bg-slate-900 rounded-t-3xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-700 shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
                    <h3 className="text-lg font-bold text-white">תשובות ({answers.length})</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div
                    ref={answersContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {/* Reply indicator */}
                    {replyingTo && (
                        <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-3 text-sm sticky top-0 z-10">
                            <div className="flex justify-between items-center">
                                <span className="text-indigo-300">משיב ל-{replyingTo.authorName}:</span>
                                <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">✕</button>
                            </div>
                            <p className="text-gray-400 text-xs truncate mt-1">"{replyingTo.content.slice(0, 80)}..."</p>
                        </div>
                    )}

                    {/* Answer Input */}
                    {user ? (
                        <form onSubmit={handleSubmit} className="space-y-3 sticky top-0 z-10 bg-slate-900 pb-3 -mt-1 pt-1">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    placeholder="כתוב תשובה..."
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white placeholder:text-gray-500 resize-none min-h-[80px] max-h-[150px]"
                                    value={newAnswer}
                                    onChange={(e) => setNewAnswer(e.target.value)}
                                    rows={3}
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !newAnswer.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 min-w-[60px]"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Send size={18} />
                                    )}
                                </button>
                            </div>
                            {/* Anonymous toggle */}
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-8 h-5 bg-gray-700 rounded-full peer-checked:bg-indigo-500 transition-colors"></div>
                                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gray-400 rounded-full peer-checked:translate-x-3 peer-checked:bg-white transition-all shadow-sm"></div>
                                </div>
                                <span className={`text-sm transition-colors ${isAnonymous ? 'text-indigo-400' : 'text-gray-500'}`}>
                                    🙈 אנונימי
                                </span>
                            </label>
                        </form>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center justify-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                        >
                            🔐 התחבר כדי להשאיר תשובה
                        </Link>
                    )}

                    {/* Answers List */}
                    <div className="space-y-3">
                        {visibleAnswers.map(ans => (
                            <div key={ans.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                                {/* Reply Quote */}
                                {ans.replyTo && (
                                    <div className="bg-gray-900/50 rounded-lg p-2 mb-3 text-xs border-r-2 border-indigo-500">
                                        <span className="text-indigo-400">↩️ {ans.replyTo.authorName}:</span>
                                        <span className="text-gray-500 mr-1">"{ans.replyTo.content}"</span>
                                    </div>
                                )}

                                {/* Author & Date */}
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        {ans.isAnonymous ? (
                                            <>
                                                <span className="text-sm font-bold text-gray-400">🙈 אנונימי</span>
                                                {isAdmin && ans.realAuthorName && (
                                                    <span className="text-xs text-red-400/70">(באמת: {ans.realAuthorName})</span>
                                                )}
                                            </>
                                        ) : (
                                            <LiveAuthorDisplay
                                                authorId={ans.authorId}
                                                fallbackName={ans.authorName}
                                                nameClassName="text-sm font-bold text-indigo-300"
                                            />
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {ans.createdAt ? toSmartDate(ans.createdAt.toDate ? ans.createdAt.toDate() : new Date(ans.createdAt)) : ''}
                                    </span>
                                </div>

                                {/* Content */}
                                {editingId === ans.id ? (
                                    <div className="space-y-2 mb-3">
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full bg-gray-900 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-gray-300 min-h-[80px]"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(ans.id)}
                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                                            >
                                                שמור
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setEditContent(''); }}
                                                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                                            >
                                                ביטול
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-300 leading-relaxed mb-3 whitespace-pre-wrap break-words">
                                        {ans.content}
                                    </p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-4 text-sm">
                                    <button
                                        onClick={() => onLikeAnswer(ans.id)}
                                        className={`flex items-center gap-1 transition-colors ${likedAnswers.has(ans.id) ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'}`}
                                    >
                                        <Heart size={16} fill={likedAnswers.has(ans.id) ? "currentColor" : "none"} />
                                        <span>{ans.flowerCount}</span>
                                        {likedAnswers.has(ans.id) && user?.uid === authorId && (
                                            <span className="text-yellow-400">🌸</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => onDislikeAnswer(ans.id)}
                                        className={`flex items-center gap-1 transition-colors ${dislikedAnswers.has(ans.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-400'}`}
                                    >
                                        <ThumbsDown size={16} fill={dislikedAnswers.has(ans.id) ? "currentColor" : "none"} />
                                        {(ans.dislikeCount || 0) > 0 && <span>{ans.dislikeCount}</span>}
                                    </button>
                                    <button
                                        onClick={() => setReplyingTo(ans)}
                                        className="flex items-center gap-1 text-gray-500 hover:text-indigo-400 transition-colors"
                                    >
                                        <Reply size={16} />
                                        <span>השב</span>
                                    </button>
                                    {user?.uid === ans.authorId && (
                                        <>
                                            <button
                                                onClick={() => { setEditingId(ans.id); setEditContent(ans.content); }}
                                                className="flex items-center gap-1 text-gray-500 hover:text-indigo-400 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteAnswer(ans.id, ans.authorId, ans.authorName, ans.content)}
                                                className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => onReportAnswer(ans)}
                                        className="flex items-center gap-1 text-gray-600 hover:text-orange-400 transition-colors mr-auto"
                                    >
                                        <Flag size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="w-full py-3 text-center text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-indigo-500/50 transition-all disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                                    טוען...
                                </span>
                            ) : (
                                `טען עוד ${Math.min(ANSWERS_PER_PAGE, answers.length - visibleCount)} תשובות`
                            )}
                        </button>
                    )}

                    {/* Empty state */}
                    {answers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>אין תשובות עדיין</p>
                            <p className="text-sm mt-1">היה הראשון לענות! 🌸</p>
                        </div>
                    )}
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-24 left-4 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
                        title="גלול לסוף"
                    >
                        <ChevronDown size={20} />
                    </button>
                )}
            </div>

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

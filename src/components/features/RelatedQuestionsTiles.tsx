'use client';

import { useEffect, useState } from 'react';
import { Question } from '@/services/recommendation.service';

interface RelatedQuestionsTilesProps {
    questions: Question[];
    side: 'left' | 'right';
    onQuestionClick: (questionId: string) => void;
}

// Varied, Large, and "Scattered but Organized" styles
const TILE_STYLES = [
    // 1. Wide & Short (Good for titles)
    { width: 'w-64', height: 'h-32', textSize: 'text-sm' },
    // 2. Large Square (Feature)
    { width: 'w-72', height: 'h-64', textSize: 'text-xl font-bold' },
    // 3. Tall & Narrow (Portrait)
    { width: 'w-48', height: 'h-56', textSize: 'text-sm' },
    // 4. Standard Box
    { width: 'w-56', height: 'h-48', textSize: 'text-base' },
    // 5. Massive Hero (Rare)
    { width: 'w-80', height: 'h-60', textSize: 'text-lg font-bold' },
    // 6. Compact
    { width: 'w-44', height: 'h-40', textSize: 'text-xs' },
];

export function RelatedQuestionsTiles({ questions, side, onQuestionClick }: RelatedQuestionsTilesProps) {
    const [visible, setVisible] = useState(false);
    const [key, setKey] = useState(0);

    // Trigger animation when questions change
    useEffect(() => {
        setVisible(false);
        setKey(prev => prev + 1);
        const timer = setTimeout(() => setVisible(true), 150);
        return () => clearTimeout(timer);
    }, [questions]);

    if (questions.length === 0) return null;

    return (
        <div
            className={`
                flex flex-col h-full w-full py-16 px-8 overflow-y-auto no-scrollbar
                ${side === 'left' ? 'items-start' : 'items-end'} // Push away from center
            `}
        >
            <h4 className={`
                text-xs text-indigo-400 uppercase tracking-widest font-bold mb-8 opacity-70
                ${side === 'left' ? 'text-left pl-2' : 'text-right pr-2'} 
                w-full
            `}>
                {side === 'left' ? '✨ שאלות קשורות' : '🔥 עוד בנושא'}
            </h4>

            <div className={`
                flex flex-col gap-6 w-full 
                ${side === 'left' ? 'items-start' : 'items-end'} // Align items to outer edges
            `} key={key}>
                {questions.map((question, index) => {
                    // Pseduo-random mix to ensure variety without strict ordering
                    // Using primes to scatter the patterns
                    const styleIndex = (index * 7 + 3) % TILE_STYLES.length;
                    const style = TILE_STYLES[styleIndex];

                    // Very subtle fadeIn only
                    const delay = `${index * 75}ms`;

                    return (
                        <div
                            key={question.id}
                            onClick={() => onQuestionClick(question.id)}
                            className={`
                                group cursor-pointer relative flex flex-col justify-between
                                ${style.width} ${style.height}
                                bg-slate-900/60 hover:bg-slate-800/80
                                backdrop-blur-xl
                                border border-white/5 hover:border-indigo-500/40
                                rounded-3xl p-5
                                transition-all duration-500 ease-out
                                hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-indigo-900/20
                                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} 
                            `}
                            style={{
                                transitionDelay: visible ? delay : '0ms',
                                maxWidth: '100%'
                            }}
                        >
                            {/* Category Badge */}
                            {question.category && (
                                <div className={`flex ${side === 'left' ? 'justify-end' : 'justify-start'} mb-2`}>
                                    <span className="px-2.5 py-1 bg-white/5 text-indigo-200/90 rounded-lg text-[10px] font-bold border border-white/5 group-hover:bg-indigo-500/20 transition-colors">
                                        {question.category}
                                    </span>
                                </div>
                            )}

                            {/* Title */}
                            <p className={`${style.textSize} text-gray-100 leading-tight text-right line-clamp-3 group-hover:text-white transition-colors`}>
                                {question.title}
                            </p>

                            {/* Stats Footer */}
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-auto pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
                                <span className="truncate max-w-[50%] opacity-50 font-medium">{question.authorName}</span>
                                <div className="flex items-center gap-2 opacity-60">
                                    {(question.answerCount > 0) && (
                                        <span className="flex items-center gap-1">
                                            <span className="text-[10px]">💬</span> {question.answerCount}
                                        </span>
                                    )}
                                    {(question.flowerCount > 0) && (
                                        <span className="flex items-center gap-1">
                                            <span className="text-[10px] grayscale group-hover:grayscale-0 transition-all">❤️</span> {question.flowerCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

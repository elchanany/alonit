'use client';

import { useEffect, useState } from 'react';
import { Question } from '@/services/recommendation.service';
import { MessageCircle, Heart } from 'lucide-react';

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
    if (questions.length === 0) return null;

    return (
        <div
            className={`
                flex flex-col h-full w-full py-16 px-8 overflow-y-auto no-scrollbar
                ${side === 'left' ? 'items-start' : 'items-end'} // Push away from center
            `}
        >
            <div className={`
                flex flex-col gap-6 w-full 
                ${side === 'left' ? 'items-start' : 'items-end'} // Align items to outer edges
            `}>
                {questions.map((question, index) => {
                    // Pseduo-random mix to ensure variety without strict ordering
                    // Using primes to scatter the patterns
                    const styleIndex = (index * 7 + 3) % TILE_STYLES.length;
                    const style = TILE_STYLES[styleIndex];

                    return (
                        <div
                            key={index} // Use index to prevent unmounting and ensure only text swaps
                            onClick={() => onQuestionClick(question.id)}
                            className={`
                                group cursor-pointer relative flex flex-col justify-between
                                ${style.width} ${style.height}
                                bg-gradient-to-br from-white/[0.03] to-white/[0.01] hover:from-white/[0.07] hover:to-white/[0.02]
                                backdrop-blur-2xl
                                border border-white/5 hover:border-indigo-500/30
                                rounded-[24px] p-5
                                transition-all duration-300 ease-out
                                hover:translate-y-[-4px] shadow-2xl shadow-black/40 hover:shadow-indigo-500/20
                            `}
                            style={{
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
                            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-auto pt-4 border-t border-white/5 group-hover:border-white/15 transition-colors">
                                <span className="truncate max-w-[50%] opacity-60 font-medium tracking-wide">{question.authorName}</span>
                                <div className="flex items-center gap-3 opacity-70 group-hover:opacity-100 transition-opacity">
                                    {(question.answerCount > 0) && (
                                        <span className="flex items-center gap-1.5 transition-colors group-hover:text-indigo-300">
                                            <MessageCircle size={13} strokeWidth={2.5} />
                                            <span className="font-semibold text-[11px]">{question.answerCount}</span>
                                        </span>
                                    )}
                                    {(question.flowerCount > 0) && (
                                        <span className="flex items-center gap-1.5 transition-colors group-hover:text-pink-400">
                                            <Heart size={13} strokeWidth={2.5} className="group-hover:fill-pink-400/20 transition-all" />
                                            <span className="font-semibold text-[11px]">{question.flowerCount}</span>
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

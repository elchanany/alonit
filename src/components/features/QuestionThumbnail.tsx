import React from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Heart, MessageCircle } from 'lucide-react';
import { Question } from '@/services/recommendation.service';

interface QuestionThumbnailProps {
    question: Question;
}

export function QuestionThumbnail({ question }: QuestionThumbnailProps) {
    return (
        <Link href={`/question/${question.id}`} className="block relative w-full aspect-[3/4] rounded-lg overflow-hidden group border border-gray-700 hover:border-indigo-500 transition-all bg-gray-900">
            {/* Background gradient abstract cover matching standard TikTok text-video style */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-gray-900 opacity-80 group-hover:scale-105 transition-transform duration-500"></div>
            
            <div className="absolute inset-0 p-3 flex flex-col justify-between">
                {/* Top: Category Tag */}
                <div className="self-start px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] font-medium text-indigo-300 border border-white/10">
                    {question.category || 'כללי'}
                </div>
                
                {/* Middle: Title snippet */}
                <div className="flex-1 flex flex-col justify-center items-center text-center px-1 md:px-2 mt-1 md:mt-2">
                    <h3 className="text-xs sm:text-sm md:text-md font-bold text-white line-clamp-3 md:line-clamp-4 leading-tight drop-shadow-md">
                        {question.title}
                    </h3>
                </div>

                {/* Bottom: Author and Stats */}
                <div className="flex items-center justify-between w-full mt-1 md:mt-2 pt-1.5 md:pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1 overflow-hidden shrink border-r border-transparent pr-1">
                        <UserAvatar src={question.isAnonymous ? undefined : question.authorPhoto} name={question.isAnonymous ? 'אנונימי' : question.authorName} size="xs" />
                        <span className="text-[9px] md:text-[10px] font-medium text-gray-300 truncate max-w-[50px] sm:max-w-[70px]">
                            {question.isAnonymous ? 'אנונימי' : question.authorName}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <div className="flex items-center gap-0.5 text-gray-400">
                            <Heart size={10} className={question.flowerCount > 0 ? "text-pink-500 fill-pink-500" : ""} />
                            <span className="text-[10px] font-semibold">{question.flowerCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                            <MessageCircle size={10} />
                            <span className="text-[10px] font-semibold">{question.answerCount || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

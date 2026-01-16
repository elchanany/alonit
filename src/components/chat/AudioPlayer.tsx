'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    duration?: number;
    isMine?: boolean;
}

export default function AudioPlayer({ src, duration, isMine = false }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);

    // Generate random waveform bars (simulated)
    const [bars] = useState(() =>
        Array.from({ length: 28 }, () => Math.random() * 0.7 + 0.3)
    );

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setAudioDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleBarClick = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio || !audioDuration) return;

        const progress = index / bars.length;
        audio.currentTime = progress * audioDuration;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = audioDuration > 0 ? currentTime / audioDuration : 0;

    return (
        <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all transform hover:scale-105 active:scale-95 ${isMine
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-purple-600 hover:bg-purple-500'
                    }`}
            >
                {isPlaying ? (
                    <Pause size={18} className="text-white" />
                ) : (
                    <Play size={18} className="text-white ml-0.5" />
                )}
            </button>

            {/* Waveform */}
            <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-[2px] h-8 cursor-pointer">
                    {bars.map((height, i) => {
                        const isPlayed = i / bars.length < progress;
                        return (
                            <div
                                key={i}
                                onClick={(e) => handleBarClick(i, e)}
                                className={`w-[3px] rounded-full transition-all duration-100 hover:opacity-80 ${isPlayed
                                        ? isMine
                                            ? 'bg-white'
                                            : 'bg-purple-400'
                                        : isMine
                                            ? 'bg-white/40'
                                            : 'bg-gray-500'
                                    }`}
                                style={{
                                    height: `${height * 100}%`,
                                    minHeight: '4px'
                                }}
                            />
                        );
                    })}
                </div>

                {/* Time Display */}
                <div className={`flex justify-between text-[10px] ${isMine ? 'text-indigo-200/70' : 'text-gray-400'
                    }`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(audioDuration)}</span>
                </div>
            </div>
        </div>
    );
}

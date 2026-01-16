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
        Array.from({ length: 24 }, () => Math.random() * 0.6 + 0.4)
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
        <div className="flex items-center gap-2 py-1">
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all transform hover:scale-105 active:scale-95 ${isMine
                        ? 'bg-white/20 hover:bg-white/30'
                        : 'bg-purple-600 hover:bg-purple-500'
                    }`}
            >
                {isPlaying ? (
                    <Pause size={16} className="text-white" />
                ) : (
                    <Play size={16} className="text-white ml-0.5" />
                )}
            </button>

            {/* Waveform */}
            <div className="flex items-center gap-[2px] h-6 cursor-pointer flex-1">
                {bars.map((height, i) => {
                    const isPlayed = i / bars.length < progress;
                    return (
                        <div
                            key={i}
                            onClick={(e) => handleBarClick(i, e)}
                            className={`w-[3px] rounded-full transition-all duration-75 ${isPlayed
                                    ? isMine
                                        ? 'bg-white'
                                        : 'bg-purple-400'
                                    : isMine
                                        ? 'bg-white/40'
                                        : 'bg-gray-500'
                                }`}
                            style={{
                                height: `${height * 100}%`,
                                minHeight: '3px'
                            }}
                        />
                    );
                })}
            </div>

            {/* Time */}
            <span className={`text-[10px] min-w-[28px] ${isMine ? 'text-indigo-200/70' : 'text-gray-400'}`}>
                {formatTime(audioDuration - currentTime)}
            </span>
        </div>
    );
}

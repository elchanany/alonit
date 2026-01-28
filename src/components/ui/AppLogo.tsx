import React from 'react';

export const AppLogo = ({ className = "w-10 h-10", showText = true }: { className?: string, showText?: boolean }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <svg
            viewBox="0 0 100 100"
            className="w-full h-full max-w-[3rem] max-h-[3rem]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="oakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#166534" /> {/* green-800 */}
                    <stop offset="100%" stopColor="#15803d" /> {/* green-700 */}
                </linearGradient>
            </defs>

            {/* Background Shape (Squircle) */}
            <rect x="5" y="5" width="90" height="90" rx="25" fill="url(#oakGradient)" />

            {/* Minimalist Oak Tree / Aleph hybrid */}
            {/* Trunk */}
            <path
                d="M50 80 L 50 65"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
            />
            {/* Branches - curved to resemble an abstracted tree or Aleph */}
            <path
                d="M50 65 Q 30 50 25 35 M 50 65 Q 70 50 75 35 M 50 65 V 30"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
            />
            {/* Foliage Circles (Implicit canopy) */}
            <circle cx="25" cy="35" r="8" fill="white" />
            <circle cx="75" cy="35" r="8" fill="white" />
            <circle cx="50" cy="25" r="8" fill="white" />
        </svg>
        {showText && (
            <span className="font-bold text-xl text-white tracking-wide hidden md:block">
                אלונית
            </span>
        )}
    </div>
);

import React from 'react';

export const AppLogo = ({ className = "w-12 h-12", showText = true }: { className?: string, showText?: boolean }) => (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
        <img
            src="/logo.png"
            alt="Alonit Logo"
            className="w-full h-full object-contain drop-shadow-md rounded-[22%]"
        />
        {showText && (
            <span className="font-bold text-2xl text-white tracking-wide hidden md:block drop-shadow-sm">
                אלונית
            </span>
        )}
    </div>
);

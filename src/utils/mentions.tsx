import React from 'react';

/**
 * Parses text containing @[mentions] and returns React elements
 * with rich styled, clickable mention chips.
 * 
 * Mentions are stored as @[שם משתמש] in the text (bracket syntax).
 * This makes it reliable to detect where the name starts and ends.
 */
export function renderMentions(text: string): React.ReactNode[] {
    if (!text) return [text];
    
    // Match @[Username] — brackets make detection reliable
    const mentionRegex = /@\[([^\]]+)\]/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before the mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        
        const username = match[1].trim();
        
        parts.push(
            <a
                key={`mention-${match.index}`}
                href={`/user/${encodeURIComponent(username)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-indigo-200 px-2 py-0.5 rounded-lg text-sm font-semibold border border-indigo-400/40 hover:border-indigo-400/70 hover:from-indigo-500/35 hover:to-purple-500/35 transition-all cursor-pointer mx-0.5 no-underline"
                style={{ textDecoration: 'none' }}
            >
                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {username[0]}
                </span>
                <span>{username}</span>
            </a>
        );
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
}

/**
 * Extract mentioned usernames from text.
 * Matches @[name] bracket syntax.
 */
export function extractMentions(text: string): string[] {
    if (!text) return [];
    const mentionRegex = /@\[([^\]]+)\]/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        const name = match[1].trim();
        if (name && !mentions.includes(name)) {
            mentions.push(name);
        }
    }
    return mentions;
}

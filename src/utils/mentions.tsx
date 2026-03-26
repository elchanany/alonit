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
                className="inline-flex items-center text-indigo-400 font-semibold hover:text-indigo-300 transition-colors mx-0.5 no-underline"
                style={{ textDecoration: 'none' }}
            >
                <span>@{username}</span>
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

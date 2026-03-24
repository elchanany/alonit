'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface MentionUser {
    id: string;
    displayName: string;
    photoURL?: string;
    trustLevel?: string;
}

interface MentionTextareaProps {
    onValueChange: (val: string) => void;
    value?: string;
    className?: string;
    placeholder?: string;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

export interface MentionTextareaRef {
    getFormattedValue: () => string;
}

export const MentionTextarea = forwardRef<MentionTextareaRef, MentionTextareaProps>(
    function MentionTextareaInner({ onValueChange, value = '', className, placeholder, onKeyDown: parentOnKeyDown }, ref) {
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);

    // Extract text from the contentEditable, converting mention spans to @[name]
    const getFormattedText = useCallback((): string => {
        if (!editorRef.current) return '';
        let result = '';
        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent || '';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (el.tagName === 'BR') {
                    result += '\n';
                } else if (el.dataset.mention) {
                    result += `@[${el.dataset.mention}]`;
                } else {
                    el.childNodes.forEach(walk);
                }
            }
        };
        editorRef.current.childNodes.forEach(walk);
        return result;
    }, []);

    // Extract plain display text (for parent value tracking)
    const getPlainText = useCallback((): string => {
        if (!editorRef.current) return '';
        let result = '';
        const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent || '';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (el.tagName === 'BR') {
                    result += '\n';
                } else if (el.dataset.mention) {
                    result += `@${el.dataset.mention}`;
                } else {
                    el.childNodes.forEach(walk);
                }
            }
        };
        editorRef.current.childNodes.forEach(walk);
        return result;
    }, []);

    useImperativeHandle(ref, () => ({
        getFormattedValue: getFormattedText
    }), [getFormattedText]);

    // Detect @mention while typing
    const detectMention = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !editorRef.current) {
            setMentionQuery(null);
            return;
        }
        
        const range = sel.getRangeAt(0);
        const container = range.startContainer;
        
        // Only detect in text nodes
        if (container.nodeType !== Node.TEXT_NODE) {
            setMentionQuery(null);
            return;
        }
        
        const textBefore = (container.textContent || '').slice(0, range.startOffset);
        const match = /(?:^|\s)@([a-zA-Zא-ת0-9_ -]*)$/.exec(textBefore);
        
        if (match) {
            setMentionQuery(match[1]);
            setSelectedIndex(0);
        } else {
            setMentionQuery(null);
        }
    }, []);

    const handleInput = useCallback(() => {
        isInternalUpdate.current = true;
        const plain = getPlainText();
        onValueChange(plain);
        detectMention();
    }, [getPlainText, onValueChange, detectMention]);

    // Sync editor when value is externally cleared (e.g. after submit)
    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        if (editorRef.current && value === '') {
            editorRef.current.innerHTML = '';
        }
    }, [value]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && editorRef.current !== e.target) {
                setMentionQuery(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch users
    useEffect(() => {
        if (mentionQuery === null) return;
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const qLower = mentionQuery.toLowerCase();
                let matched: MentionUser[] = usersSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as MentionUser));
                if (qLower !== '') {
                    matched = matched.filter(u => u.displayName?.toLowerCase().includes(qLower));
                }
                setSuggestions(matched.slice(0, 5));
            } catch (err) {
                console.error("Error fetching users:", err);
            } finally {
                setLoading(false);
            }
        };
        const to = setTimeout(fetchUsers, 150);
        return () => clearTimeout(to);
    }, [mentionQuery]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (mentionQuery !== null && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(suggestions[selectedIndex]);
                return;
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
                return;
            }
        }

        // Handle deleting the mention chip smoothly
        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const container = range.startContainer;
                const offset = range.startOffset;

                let nodeToRemove: Node | null = null;
                
                // Cursor is at beginning of text node
                if (container.nodeType === Node.TEXT_NODE && offset === 0) {
                    nodeToRemove = container.previousSibling;
                } 
                // Cursor is between nodes
                else if (container.nodeType === Node.ELEMENT_NODE && offset > 0) {
                    nodeToRemove = container.childNodes[offset - 1];
                }

                if (nodeToRemove && nodeToRemove.nodeType === Node.ELEMENT_NODE && (nodeToRemove as HTMLElement).dataset.mention) {
                    e.preventDefault();
                    (nodeToRemove as HTMLElement).remove();
                    
                    // Trigger input update manually
                    isInternalUpdate.current = true;
                    onValueChange(getPlainText());
                }
            }
        }

        if (parentOnKeyDown) parentOnKeyDown(e);
    };

    const insertMention = (user: MentionUser) => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || !editorRef.current) return;

        const range = sel.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        const textBefore = text.slice(0, cursorPos);
        
        // Find the @ position
        const atMatch = /(?:^|\s)@([a-zA-Zא-ת0-9_ -]*)$/.exec(textBefore);
        if (!atMatch) return;
        
        const atIdx = textBefore.lastIndexOf('@');
        const beforeAt = text.slice(0, atIdx);
        const afterCursor = text.slice(cursorPos);

        // Create the mention span
        const mentionSpan = document.createElement('span');
        mentionSpan.setAttribute('data-mention', user.displayName);
        mentionSpan.contentEditable = 'false';
        mentionSpan.className = 'inline-flex items-center gap-0.5 bg-indigo-500/25 text-indigo-300 px-1.5 py-0 rounded-md text-sm font-semibold border border-indigo-400/30 mx-0.5 cursor-default select-none';
        mentionSpan.textContent = `@${user.displayName}`;

        // Build new DOM nodes
        const parent = textNode.parentNode!;
        const beforeTextNode = document.createTextNode(beforeAt);
        const afterTextNode = document.createTextNode(' ' + afterCursor);

        parent.insertBefore(beforeTextNode, textNode);
        parent.insertBefore(mentionSpan, textNode);
        parent.insertBefore(afterTextNode, textNode);
        parent.removeChild(textNode);

        // Move cursor after the mention
        const newRange = document.createRange();
        newRange.setStart(afterTextNode, 1); // after the space
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        setMentionQuery(null);
        
        // Notify parent
        isInternalUpdate.current = true;
        onValueChange(getPlainText());
    };

    const isEmpty = !value || value.trim() === '';

    return (
        <div className="relative w-full">
            {/* Editable div */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className={`${className || ''} whitespace-pre-wrap break-words outline-none`}
                style={{ minHeight: '70px', maxHeight: '150px', overflowY: 'auto' }}
                dir="rtl"
            />
            
            {/* Placeholder */}
            {isEmpty && (
                <div className="absolute top-3 right-4 text-gray-500 text-sm pointer-events-none">
                    {placeholder}
                </div>
            )}
            
            {/* Suggestions */}
            {mentionQuery !== null && (
                <div ref={menuRef} className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-slate-900 border border-indigo-500/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-2 bg-slate-800 border-b border-indigo-500/20 text-xs font-bold text-indigo-300">
                        {loading ? 'מחפש...' : suggestions.length > 0 ? '🏷️ תיוג משתמש' : 'לא נמצאו'}
                    </div>
                    {suggestions.length > 0 && (
                        <div className="max-h-60 overflow-y-auto">
                            {suggestions.map((u, idx) => (
                                <button key={u.id} type="button"
                                    onClick={(e) => { e.preventDefault(); insertMention(u); }}
                                    className={`w-full flex items-center gap-3 p-3 text-right transition-colors ${idx === selectedIndex ? 'bg-indigo-600/30 border-l-2 border-indigo-500' : 'hover:bg-gray-800'}`}>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover"/> : <span className="text-xs text-white font-bold">{u.displayName[0]}</span>}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-sm font-bold text-white truncate">{u.displayName}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

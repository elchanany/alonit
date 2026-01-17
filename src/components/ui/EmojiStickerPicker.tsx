'use client';

import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiStyle, Categories, SuggestionMode } from 'emoji-picker-react';
import { Smile, Image, X } from 'lucide-react';

interface EmojiStickerPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onStickerSelect?: (stickerUrl: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

// Placeholder stickers - will be replaced with user stickers from Firebase later
const defaultStickers = [
    { id: '1', url: 'https://em-content.zobj.net/thumbs/120/apple/354/thumbs-up_1f44d.png', name: 'לייק' },
    { id: '2', url: 'https://em-content.zobj.net/thumbs/120/apple/354/red-heart_2764-fe0f.png', name: 'לב' },
    { id: '3', url: 'https://em-content.zobj.net/thumbs/120/apple/354/fire_1f525.png', name: 'אש' },
    { id: '4', url: 'https://em-content.zobj.net/thumbs/120/apple/354/face-with-tears-of-joy_1f602.png', name: 'צוחק' },
    { id: '5', url: 'https://em-content.zobj.net/thumbs/120/apple/354/clapping-hands_1f44f.png', name: 'מחיאות כפיים' },
    { id: '6', url: 'https://em-content.zobj.net/thumbs/120/apple/354/party-popper_1f389.png', name: 'מסיבה' },
];

export function EmojiStickerPicker({ onEmojiSelect, onStickerSelect, isOpen, onClose }: EmojiStickerPickerProps) {
    const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
    const [stickers, setStickers] = useState(defaultStickers);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleEmojiClick = (emojiData: { emoji: string }) => {
        onEmojiSelect(emojiData.emoji);
    };

    const handleStickerClick = (stickerUrl: string) => {
        if (onStickerSelect) {
            onStickerSelect(stickerUrl);
        }
    };

    // Inline style for keyboard layout
    return (
        <div
            className="w-full bg-gray-900 border-t border-gray-800 flex flex-col animate-in slide-in-from-bottom-10 duration-200"
            style={{ height: '320px' }}
        >
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('emoji')}
                    className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'emoji'
                            ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/10'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Smile size={18} />
                    אימוג'ים
                </button>
                <button
                    onClick={() => setActiveTab('sticker')}
                    className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'sticker'
                            ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-900/10'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Image size={18} />
                    סטיקרים
                </button>
                <div className="flex items-center px-2">
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'emoji' ? (
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={Theme.DARK}
                        emojiStyle={EmojiStyle.APPLE}
                        width="100%"
                        height="100%"
                        searchPlaceHolder="חפש אימוג'י..."
                        suggestedEmojisMode={SuggestionMode.RECENT}
                        skinTonesDisabled={false}
                        lazyLoadEmojis={true}
                        previewConfig={{ showPreview: false }}
                        categories={[
                            { category: Categories.SUGGESTED, name: 'שימוש תכוף' },
                            { category: Categories.SMILEYS_PEOPLE, name: 'פרצופים ואנשים' },
                            { category: Categories.ANIMALS_NATURE, name: 'חיות וטבע' },
                            { category: Categories.FOOD_DRINK, name: 'אוכל ושתייה' },
                            { category: Categories.TRAVEL_PLACES, name: 'נסיעות ומקומות' },
                            { category: Categories.ACTIVITIES, name: 'פעילויות' },
                            { category: Categories.OBJECTS, name: 'אובייקטים' },
                            { category: Categories.SYMBOLS, name: 'סמלים' },
                            { category: Categories.FLAGS, name: 'דגלים' },
                        ]}
                    />
                ) : (
                    <div className="p-4 h-full overflow-y-auto">
                        {/* Stickers Grid */}
                        <div className="grid grid-cols-4 gap-3">
                            {stickers.map((sticker) => (
                                <button
                                    key={sticker.id}
                                    onClick={() => handleStickerClick(sticker.url)}
                                    className="w-full aspect-square rounded-xl bg-gray-800/50 hover:bg-gray-700 p-2 transition-all hover:scale-105 active:scale-95"
                                    title={sticker.name}
                                >
                                    <img
                                        src={sticker.url}
                                        alt={sticker.name}
                                        className="w-full h-full object-contain"
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Add Sticker Button - Future */}
                        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                            <p className="text-xs text-gray-500 mb-3">סטיקרים נוספים בקרוב</p>
                            <button
                                disabled
                                className="inline-flex items-center gap-2 py-2 px-4 bg-gray-800 text-gray-400 rounded-full text-xs font-bold cursor-not-allowed border border-gray-700"
                            >
                                + חבילות סטיקרים
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

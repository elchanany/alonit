'use client';

import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Theme, EmojiStyle, Categories, SuggestionMode } from 'emoji-picker-react';
import { Smile, Image, X, Search, Clapperboard, Loader2 } from 'lucide-react';
import { tenorService, TenorItem } from '@/services/tenorService';
import { processStickerImage } from '@/utils/stickerUtils';

interface EmojiStickerPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onStickerSelect?: (stickerUrl: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function EmojiStickerPicker({ onEmojiSelect, onStickerSelect, isOpen, onClose }: EmojiStickerPickerProps) {
    const [activeTab, setActiveTab] = useState<'emoji' | 'stickers' | 'gifs'>('emoji');
    const [items, setItems] = useState<TenorItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Default trending on load
    useEffect(() => {
        if (activeTab === 'emoji') return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            // Debounce search
            const delayDebounceFn = setTimeout(async () => {
                // const results = await tenorService.search(searchQuery, activeTab, 24);
                // if (results.length === 0) {
                //    setError('לא נמצאו תוצאות או שיש בעיה בחיבור ל-Tenor');
                // }
                const results = await tenorService.search(searchQuery, activeTab, 24);
                setItems(results);
                setIsLoading(false);
            }, searchQuery ? 500 : 0);

            return () => clearTimeout(delayDebounceFn);
        };

        fetchData();
    }, [activeTab, searchQuery]);

    if (!isOpen) return null;

    const handleStickerClick = (url: string) => {
        if (onStickerSelect) {
            onStickerSelect(url);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to get correct image URL based on type (Klipy/Tenor compatible)
    const getItemUrl = (item: TenorItem) => {
        // Klipy returns a direct 'url' field with the image URL
        const directUrl = (item as any).url;
        if (directUrl && typeof directUrl === 'string' && directUrl.length > 0) {
            return directUrl;
        }

        // Fallback to media_formats (both Tenor and Klipy use this)
        const formats = item.media_formats || {};
        if (activeTab === 'stickers') {
            return formats.tpng?.url || formats.tinygif?.url || formats.gif?.url || '';
        }
        return formats.tinygif?.url || formats.gif?.url || '';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Let parent handle the processing and uploading via a new callback prop logic would be here
        // But since we need to process it first to standards:
        if (onStickerSelect && file) {
            // For now, we will pass the file url directly or implement the full flow in parent
            // Ideally we pass the file to parent to upload
            // We'll trust the parent has a handler, or we emit a custom event
        }
    };

    // We need to extend the props interface to support onUpload
    // But since I can't change the interface in this specific replacement block easily without context of the top of file
    // I will add the UI first.

    // Actually, I should update the Interface first.
    // Let's assume onStickerCreate is passed or we handle it here.

    return (
        <div
            className="w-full bg-gray-900 border-t border-gray-800 flex flex-col animate-in slide-in-from-bottom-10 duration-200"
            style={{ height: '350px' }}
        >
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('emoji')}
                    className={`flex-1 py-3 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'emoji'
                        ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/10'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Smile size={18} />
                    אימוג'ים
                </button>
                <button
                    onClick={() => setActiveTab('stickers')}
                    className={`flex-1 py-3 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'stickers'
                        ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-900/10'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Image size={18} />
                    סטיקרים
                </button>
                <button
                    onClick={() => setActiveTab('gifs')}
                    className={`flex-1 py-3 px-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'gifs'
                        ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-900/10'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Clapperboard size={18} />
                    GIFs
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
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'emoji' ? (
                    <EmojiPicker
                        onEmojiClick={(data) => onEmojiSelect(data.emoji)}
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
                            { category: Categories.SMILEYS_PEOPLE, name: 'פרצופים' },
                            { category: Categories.ANIMALS_NATURE, name: 'חיות' },
                            { category: Categories.FOOD_DRINK, name: 'אוכל' },
                            { category: Categories.ACTIVITIES, name: 'פעילויות' },
                            { category: Categories.TRAVEL_PLACES, name: 'נסיעות' },
                            { category: Categories.OBJECTS, name: 'חפצים' },
                            { category: Categories.SYMBOLS, name: 'סמלים' },
                            { category: Categories.FLAGS, name: 'דגלים' },
                        ]}
                    />
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Search Bar & Create Button */}
                        <div className="p-2 border-b border-gray-800 flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={activeTab === 'stickers' ? 'חפש סטיקרים...' : 'חפש GIFs...'}
                                    className="w-full bg-gray-800 text-white text-sm rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-gray-700 placeholder-gray-500"
                                />
                                <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
                            </div>

                            {/* Create Sticker Button - Only in Stickers Tab */}
                            {activeTab === 'stickers' && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition-colors flex items-center justify-center w-10 h-10 shadow-lg"
                                    title="צור סטיקר"
                                >
                                    <span className="text-xl font-bold">+</span>
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file && onStickerSelect) {
                                        try {
                                            // Convert to Tenor/WhatsApp Standard (512x512 WebP)
                                            const { url } = await processStickerImage(file);
                                            onStickerSelect(url);
                                        } catch (err) {
                                            console.error("Sticker processing failed", err);
                                        }
                                    }
                                }}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        {/* Grid Results */}
                        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={32} className="animate-spin text-gray-500" />
                                </div>
                            ) : error ? (
                                <div className="text-center p-8">
                                    <p className="text-red-400 text-sm mb-2 font-bold">חסר מפתח (Tenor API)</p>
                                    <p className="text-gray-500 text-xs">{error}</p>
                                    <p className="text-gray-600 text-[10px] mt-4">
                                        (פתח פרויקט ב-Google Cloud והפעל את Tenor API)
                                    </p>
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-center p-8 text-gray-500 text-sm">
                                    לא נמצאו תוצאות 🤷‍♂️
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {items.map((item) => {
                                        const url = getItemUrl(item);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => handleStickerClick(url)}
                                                className="w-full aspect-square rounded-lg bg-gray-800/30 overflow-hidden relative group flex items-center justify-center p-1"
                                            >
                                                <img
                                                    src={url}
                                                    alt={item.content_description}
                                                    className="max-w-full max-h-full object-contain hover:scale-110 transition-transform duration-200"
                                                    loading="lazy"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="mt-4 text-center">
                                <span className="text-[10px] text-gray-600 font-mono">Via Klipy</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}





const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || 'sandbox-mJokm7E2jH'; // Klipy Sandbox Key
const BASE_URL = 'https://api.klipy.com/v2';
const CLIENT_KEY = 'alonit_web_app'; // Optional client identifier

// Unified interface for Tenor and Klipy responses
export interface TenorItem {
    id: string;
    title?: string;
    content_description?: string;
    // Tenor format
    media_formats?: {
        gif?: { url: string; dims?: [number, number] };
        tinygif?: { url: string; dims?: [number, number] };
        tpng?: { url: string; dims?: [number, number] };
    };
    // Klipy format
    files?: {
        gif?: { url: string };
        tinygif?: { url: string };
        webp?: { url: string };
        mp4?: { url: string };
    };
    // Direct URL fallback
    url?: string;
}

export const tenorService = {
    async getTrending(type: 'gifs' | 'stickers' = 'gifs', limit = 24): Promise<TenorItem[]> {
        if (!TENOR_API_KEY) return [];

        const searchType = type === 'stickers' ? '&searchfilter=sticker' : '';
        const endpoint = `${BASE_URL}/featured?key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&limit=${limit}${searchType}`;

        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            console.log('Klipy Trending Response:', data); // Debug log
            return data.results || data.data || [];
        } catch (error) {
            console.error('Error fetching trending:', error);
            return [];
        }
    },

    async search(query: string, type: 'gifs' | 'stickers' = 'gifs', limit = 24): Promise<TenorItem[]> {
        if (!TENOR_API_KEY) return [];

        const searchQuery = query.trim() || 'trending';
        const searchType = type === 'stickers' ? '&searchfilter=sticker' : '';
        const endpoint = `${BASE_URL}/search?key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(searchQuery)}&limit=${limit}${searchType}`;

        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            console.log('Klipy Search Response:', data); // Debug log
            return data.results || data.data || [];
        } catch (error) {
            console.error('Error searching:', error);
            return [];
        }
    }
};

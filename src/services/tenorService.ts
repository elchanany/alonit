
const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY;
const BASE_URL = 'https://tenor.googleapis.com/v2';
const CLIENT_KEY = 'alonit_web_app'; // Optional client identifier

export interface TenorItem {
    id: string;
    title: string;
    media_formats: {
        gif: {
            url: string;
            dims: [number, number];
        };
        tinygif: {
            url: string;
            dims: [number, number];
        };
        tpng: { // Transparent PNG for stickers
            url: string;
            dims: [number, number];
        };
    };
    content_description: string;
}

export const tenorService = {
    async getTrending(type: 'gifs' | 'stickers' = 'gifs', limit = 24): Promise<TenorItem[]> {
        if (!TENOR_API_KEY) return [];

        // Tenor uses 'search' with specific filters for stickers, or 'featured' endpoint
        // For stickers, we search for tag "sticker" if using v2 or use explicit params

        const searchType = type === 'stickers' ? '&searchfilter=sticker' : '';
        const endpoint = `${BASE_URL}/featured?key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&limit=${limit}${searchType}&media_filter=minimal`;

        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.error('Error fetching trending Tenor:', error);
            return [];
        }
    },

    async search(query: string, type: 'gifs' | 'stickers' = 'gifs', limit = 24): Promise<TenorItem[]> {
        if (!TENOR_API_KEY) return [];

        const searchType = type === 'stickers' ? '&searchfilter=sticker' : '';
        const endpoint = `${BASE_URL}/search?key=${TENOR_API_KEY}&client_key=${CLIENT_KEY}&q=${encodeURIComponent(query)}&limit=${limit}${searchType}&media_filter=minimal`;

        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            return data.results || [];
        } catch (error) {
            console.error('Error searching Tenor:', error);
            return [];
        }
    }
};

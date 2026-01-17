
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const BASE_URL = 'https://api.giphy.com/v1';

export interface GiphyItem {
    id: string;
    title: string;
    images: {
        fixed_height: {
            url: string;
            width: string;
            height: string;
        };
        original: {
            url: string;
        };
    };
}

export const giphyService = {
    async getTrending(type: 'gifs' | 'stickers' = 'gifs', limit = 20): Promise<GiphyItem[]> {
        if (!GIPHY_API_KEY) return [];

        try {
            const res = await fetch(`${BASE_URL}/${type}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`);
            const data = await res.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching trending Giphy:', error);
            return [];
        }
    },

    async search(query: string, type: 'gifs' | 'stickers' = 'gifs', limit = 20): Promise<GiphyItem[]> {
        if (!GIPHY_API_KEY) return [];
        if (!query.trim()) return this.getTrending(type, limit);

        try {
            const res = await fetch(`${BASE_URL}/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`);
            const data = await res.json();
            return data.data || [];
        } catch (error) {
            console.error('Error searching Giphy:', error);
            return [];
        }
    }
};

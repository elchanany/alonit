import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper function to upload file
export async function uploadToCloudinary(
    file: string,
    folder: string = 'chat',
    resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<{ url: string; publicId: string; duration?: number }> {
    try {
        const result = await cloudinary.uploader.upload(file, {
            folder,
            resource_type: resourceType,
            transformation: resourceType === 'image' ? [
                { quality: 'auto:good', fetch_format: 'auto' }
            ] : undefined
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload file');
    }
}

// Helper function to delete file
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return false;
    }
}

// Get usage statistics
export async function getCloudinaryUsage() {
    try {
        const usage = await cloudinary.api.usage();
        return {
            credits: usage.credits,
            usedCredits: usage.credits.used_percent,
            storage: {
                total: 25 * 1024 * 1024 * 1024, // 25GB in bytes
                used: usage.storage.usage,
                percentage: (usage.storage.usage / (25 * 1024 * 1024 * 1024)) * 100
            },
            bandwidth: {
                total: 25 * 1024 * 1024 * 1024, // 25GB in bytes
                used: usage.bandwidth.usage,
                percentage: (usage.bandwidth.usage / (25 * 1024 * 1024 * 1024)) * 100
            }
        };
    } catch (error) {
        console.error('Error fetching usage:', error);
        throw error;
    }
}

// List files in a folder
export async function listFiles(folder: string = 'chat', maxResults: number = 100) {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: folder,
            max_results: maxResults,
            context: true
        });

        return result.resources;
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
}

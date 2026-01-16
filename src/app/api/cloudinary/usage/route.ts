import { NextResponse } from 'next/server';
import {
    get

CloudinaryUsage
} from '@/lib/cloudinary';

export async function GET() {
    try {
        const usage = await getCloudinaryUsage();

        return NextResponse.json({
            success: true,
            usage
        });
    } catch (error: any) {
        console.error('Usage fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch usage' },
            { status: 500 }
        );
    }
}

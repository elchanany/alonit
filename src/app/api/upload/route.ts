import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
    console.log('🚀 API /upload called');
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'image' or 'audio'

        console.log('📁 File received:', file?.name, file?.size, 'Type:', type);

        if (!file) {
            console.error('❌ No file in request');
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        console.log('🔄 Converting to buffer...');
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert buffer to base64 data URI
        const base64 = buffer.toString('base64');
        const dataURI = `data:${file.type};base64,${base64}`;
        console.log('📦 Data URI created, length:', dataURI.length);

        // Upload to Cloudinary
        console.log('☁️ Uploading to Cloudinary...');
        const result = await uploadToCloudinary(
            dataURI,
            'chat',
            type === 'audio' ? 'video' : 'image' // Cloudinary treats audio as video
        );

        console.log('✅ Upload successful!', result.url);
        return NextResponse.json({
            success: true,
            url: result.url,
            publicId: result.publicId,
            duration: result.duration
        });
    } catch (error: any) {
        console.error('💥 API Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

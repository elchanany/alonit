import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string || 'image';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Check file size (Catbox limit is 200MB)
        if (file.size > 200 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File too large (max 200MB)' }, { status: 400 });
        }

        // Create FormData for Catbox API
        const catboxFormData = new FormData();
        catboxFormData.append('reqtype', 'fileupload');
        catboxFormData.append('fileToUpload', file);

        // Upload to Catbox
        const response = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: catboxFormData,
        });

        if (!response.ok) {
            console.error('Catbox upload failed:', response.status, response.statusText);
            return NextResponse.json({
                success: false,
                error: 'Upload failed - service may be temporarily unavailable',
                serviceError: true
            }, { status: 500 });
        }

        const url = await response.text();

        // Check if we got a valid URL back
        if (!url.startsWith('https://')) {
            console.error('Catbox returned invalid response:', url);
            return NextResponse.json({
                success: false,
                error: url || 'Upload failed',
                serviceError: true
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            url: url.trim(),
            type
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to upload file',
            serviceError: true
        }, { status: 500 });
    }
}

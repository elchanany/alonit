import { NextRequest, NextResponse } from 'next/server';
import { deleteFromCloudinary, listFiles, getCloudinaryUsage } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
    try {
        const { threshold = 80, olderThanMonths = 6 } = await request.json();

        // Get current usage
        const usage = await getCloudinaryUsage();

        // Only run if usage is above threshold
        if (usage.storage.percentage < threshold) {
            return NextResponse.json({
                success: true,
                message: 'Usage below threshold, no cleanup needed',
                currentUsage: usage.storage.percentage,
                threshold
            });
        }

        // List all files
        const files = await listFiles('chat', 500);

        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths);

        // Filter old files
        const oldFiles = files
            .filter((file: any) => new Date(file.created_at) < cutoffDate)
            .sort((a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

        const deletedFiles: string[] = [];
        let deletedSize = 0;

        // Delete oldest files until we're back under threshold
        for (const file of oldFiles) {
            if (usage.storage.percentage - (deletedSize / usage.storage.total * 100) < threshold * 0.9) {
                break; // Stop when we reach 90% of threshold
            }

            const deleted = await deleteFromCloudinary(file.public_id);
            if (deleted) {
                deletedFiles.push(file.public_id);
                deletedSize += file.bytes || 0;
            }
        }

        // Get updated usage
        const updatedUsage = await getCloudinaryUsage();

        return NextResponse.json({
            success: true,
            deletedCount: deletedFiles.length,
            deletedSize,
            previousUsage: usage.storage.percentage,
            currentUsage: updatedUsage.storage.percentage,
            deletedFiles
        });
    } catch (error: any) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { error: error.message || 'Cleanup failed' },
            { status: 500 }
        );
    }
}

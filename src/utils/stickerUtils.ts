
/**
 * Processes an image file to meet Sticker standards (512x512, WebP).
 * @param file The input image file
 * @returns Promise resolving to a WebP Blob and Data URL
 */
export async function processStickerImage(file: File): Promise<{ blob: Blob, url: string }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Standard Sticker Size
            const SIZE = 512;
            canvas.width = SIZE;
            canvas.height = SIZE;

            // Calculations to fit image within 512x512 while maintaining aspect ratio
            const scale = Math.min(SIZE / img.width, SIZE / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (SIZE - w) / 2;
            const y = (SIZE - h) / 2;

            // Draw content
            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.drawImage(img, x, y, w, h);

            // Convert to WebP
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    resolve({ blob, url });
                } else {
                    reject(new Error('Conversion to WebP failed'));
                }
            }, 'image/webp', 0.8);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

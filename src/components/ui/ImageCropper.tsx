'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
    imageUrl: string;
    onSave: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export function ImageCropper({ imageUrl, onSave, onCancel }: ImageCropperProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Handle touch events
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => setIsDragging(false);

    const resetPosition = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleSave = async () => {
        if (!imageRef.current || saving) return;

        setSaving(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setSaving(false);
                return;
            }

            const outputSize = 256;
            canvas.width = outputSize;
            canvas.height = outputSize;

            const img = imageRef.current;

            // Wait for image to be fully loaded
            if (!img.complete) {
                await new Promise(resolve => {
                    img.onload = resolve;
                });
            }

            // Calculate crop area based on what's visible in the circle
            const containerSize = 256; // Size of the visible circle (w-64 = 256px)

            // The image is positioned with transform: translate(calc(-50% + posX), calc(-50% + posY)) scale(scale)
            // So the center of the image is at (containerSize/2 + position.x, containerSize/2 + position.y) in container coords
            // The visible area is a circle of containerSize centered at (containerSize/2, containerSize/2)

            // Calculate where in the original image the visible center is
            const imgCenterInContainerX = containerSize / 2 + position.x;
            const imgCenterInContainerY = containerSize / 2 + position.y;

            // The visible crop starts at this offset from the image center
            const cropOffsetX = (containerSize / 2 - imgCenterInContainerX) / scale;
            const cropOffsetY = (containerSize / 2 - imgCenterInContainerY) / scale;

            // Size of the visible area in original image pixels
            const cropSizeInOriginal = containerSize / scale;

            // Source coordinates in the original image
            const sx = (img.naturalWidth / 2) + cropOffsetX - (cropSizeInOriginal / 2);
            const sy = (img.naturalHeight / 2) + cropOffsetY - (cropSizeInOriginal / 2);
            const sWidth = cropSizeInOriginal;
            const sHeight = cropSizeInOriginal;

            // Draw circular clip
            ctx.beginPath();
            ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Draw the cropped image
            ctx.drawImage(
                img,
                sx, sy, sWidth, sHeight,
                0, 0, outputSize, outputSize
            );

            canvas.toBlob((blob) => {
                setSaving(false);
                if (blob) {
                    onSave(blob);
                }
            }, 'image/jpeg', 0.9);
        } catch (err) {
            console.error('Error cropping image:', err);
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">התאם את התמונה</h3>
                <p className="text-gray-400 text-sm">גרור להזזה, צביטה או גלגלת לזום</p>
            </div>

            {/* Crop Area */}
            <div
                ref={containerRef}
                className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)] cursor-move touch-none select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.1 : 0.1;
                    setScale(Math.min(3, Math.max(0.5, scale + delta)));
                }}
            >
                {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <span className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                    </div>
                )}
                <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Crop preview"
                    className="absolute pointer-events-none select-none"
                    style={{
                        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                        left: '50%',
                        top: '50%',
                        maxWidth: 'none',
                        transformOrigin: 'center center',
                        opacity: imageLoaded ? 1 : 0
                    }}
                    draggable={false}
                    onLoad={() => setImageLoaded(true)}
                    crossOrigin="anonymous"
                />
            </div>

            {/* Grid overlay hint */}
            <div className="w-64 h-64 absolute pointer-events-none rounded-full border-2 border-white/10" style={{ top: 'calc(50% - 128px - 24px)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-px h-full bg-white/5" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-px bg-white/5" />
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-4 mt-8 bg-gray-800/50 rounded-full px-4 py-2">
                <button
                    type="button"
                    onClick={() => setScale(Math.max(0.5, scale - 0.2))}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="הקטן"
                >
                    <ZoomOut size={22} />
                </button>

                <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-28 accent-indigo-500"
                />

                <button
                    type="button"
                    onClick={() => setScale(Math.min(3, scale + 0.2))}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="הגדל"
                >
                    <ZoomIn size={22} />
                </button>

                <div className="w-px h-6 bg-gray-600" />

                <button
                    type="button"
                    onClick={resetPosition}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="איפוס"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                    <X size={18} />
                    ביטול
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !imageLoaded}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-bold disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            שומר...
                        </>
                    ) : (
                        <>
                            <Check size={18} />
                            שמור תמונה
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

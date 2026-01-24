import React, { useEffect, useState, useRef } from 'react';

interface HeroImageSequenceProps {
    totalFrames?: number;
    duration?: number; // in milliseconds
}

const HeroImageSequence: React.FC<HeroImageSequenceProps> = ({
    totalFrames = 192,
    duration = 8000
}) => {
    const [currentFrame, setCurrentFrame] = useState(1);
    const [isPlaying, setIsPlaying] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const frameInterval = duration / totalFrames;

    // Preload all images
    useEffect(() => {
        const loadImages = async () => {
            const images: HTMLImageElement[] = [];
            let loadedCount = 0;

            for (let i = 1; i <= totalFrames; i++) {
                const img = new Image();
                const frameNumber = String(i).padStart(5, '0');
                img.src = `/images/${frameNumber}.png`;

                img.onload = () => {
                    loadedCount++;
                    setLoadingProgress(loadedCount);
                    if (loadedCount === totalFrames) {
                        setImagesLoaded(true);
                    }
                };

                img.onerror = () => {
                    console.error(`Failed to load image: ${frameNumber}.png`);
                };

                images.push(img);
            }

            imagesRef.current = images;
        };

        loadImages();
    }, [totalFrames]);

    // Draw current frame to canvas
    useEffect(() => {
        if (!imagesLoaded || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imagesRef.current[currentFrame - 1];
        if (!img || !img.complete) return;

        // Set canvas dimensions to match image
        if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        // Clear and draw the image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    }, [currentFrame, imagesLoaded]);

    // Animation loop
    useEffect(() => {
        if (!isPlaying || !imagesLoaded) return;

        const intervalId = setInterval(() => {
            setCurrentFrame((prev) => {
                if (prev >= totalFrames) {
                    return 1; // Loop back to start
                }
                return prev + 1;
            });
        }, frameInterval);

        return () => clearInterval(intervalId);
    }, [isPlaying, frameInterval, totalFrames, imagesLoaded]);

    return (
        <div className="w-full relative bg-black">
            {!imagesLoaded && (
                <div className="w-full h-[85vh] flex items-center justify-center">
                    <div className="text-center max-w-md px-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-6"></div>
                        <p className="text-zinc-400 text-lg mb-4">Loading experience...</p>

                        {/* Progress bar */}
                        <div className="w-full bg-zinc-800 rounded-full h-2 mb-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-gold to-yellow-200 h-full transition-all duration-300 ease-out"
                                style={{ width: `${(loadingProgress / totalFrames) * 100}%` }}
                            ></div>
                        </div>

                        {/* Progress counter */}
                        <p className="text-zinc-500 text-sm">
                            {loadingProgress} / {totalFrames} frames loaded
                        </p>
                    </div>
                </div>
            )}

            <canvas
                ref={canvasRef}
                className={`w-full h-auto object-contain max-h-[85vh] mx-auto transition-opacity duration-500 ${imagesLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{ display: imagesLoaded ? 'block' : 'none' }}
            />

            {/* Subtle gradient to blend image bottom into black background */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </div>
    );
};

export default HeroImageSequence;

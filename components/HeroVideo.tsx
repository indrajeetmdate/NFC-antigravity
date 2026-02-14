import React, { useRef, useEffect, useState } from 'react';

interface HeroVideoProps {
    videoSrc?: string;
    fallbackPoster?: string;
}

const HeroVideo: React.FC<HeroVideoProps> = ({
    videoSrc = '/video/1080pnowatermarkmp4.mp4',
    fallbackPoster
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadStart = () => {
            setIsLoading(true);
            setLoadingProgress(0);
        };

        const handleProgress = () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const duration = video.duration;
                if (duration > 0) {
                    const progress = (bufferedEnd / duration) * 100;
                    setLoadingProgress(Math.round(progress));
                }
            }
        };

        const handleCanPlay = () => {
            setIsLoading(false);
            setLoadingProgress(100);
            // Auto-play the video once it's ready
            video.play().catch(err => {
                console.error('Auto-play failed:', err);
            });
        };

        const handleError = () => {
            setError('Failed to load video. Please refresh the page.');
            setIsLoading(false);
        };

        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('progress', handleProgress);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
        };
    }, []);

    return (
        <div className="w-full relative bg-black">
            {/* Loading Indicator */}
            {isLoading && (
                <div className="w-full h-[85vh] flex items-center justify-center absolute top-0 left-0 z-10 bg-black">
                    <div className="text-center max-w-md px-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-6"></div>
                        <p className="text-zinc-400 text-lg mb-4">Loading experience...</p>

                        {/* Progress bar */}
                        <div className="w-full bg-zinc-800 rounded-full h-2 mb-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-gold to-yellow-200 h-full transition-all duration-300 ease-out"
                                style={{ width: `${loadingProgress}%` }}
                            ></div>
                        </div>

                        {/* Progress counter */}
                        <p className="text-zinc-500 text-sm">
                            {loadingProgress}% loaded
                        </p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="w-full h-[85vh] flex items-center justify-center absolute top-0 left-0 z-10 bg-black">
                    <div className="text-center max-w-md px-4">
                        <p className="text-red-400 text-lg">{error}</p>
                    </div>
                </div>
            )}

            {/* Video Element */}
            <video
                ref={videoRef}
                className={`w-full h-auto object-contain max-h-[85vh] mx-auto transition-opacity duration-500 ${!isLoading ? 'opacity-100' : 'opacity-0'
                    }`}
                loop
                muted
                playsInline
                preload="auto"
                poster={fallbackPoster}
            >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* Subtle gradient to blend video bottom into black background */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </div>
    );
};

export default HeroVideo;

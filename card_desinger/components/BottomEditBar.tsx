
import React from 'react';

interface BottomEditBarProps {
    onDesignYourOwn: () => void;
    onAiGenerate: () => void;
    isDesignModeActive: boolean;
}

const BottomEditBar: React.FC<BottomEditBarProps> = ({
    onDesignYourOwn,
    onAiGenerate,
    isDesignModeActive
}) => {
    return (
        <div className="flex-shrink-0 z-50 bg-black border-t border-zinc-800">
            <div className="flex justify-center items-center px-4 py-2 gap-4">
                {/* Design Your Own Button */}
                <button
                    onClick={onDesignYourOwn}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md border text-[11px] font-bold transition-all ${isDesignModeActive
                            ? 'bg-gold/20 border-gold text-gold'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-gold hover:text-gold'
                        }`}
                    title="Design your card manually with text, images, and colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Design</span>
                </button>

                {/* AI Generate Button */}
                <button
                    onClick={onAiGenerate}
                    className="group relative flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 via-purple-600 to-gold text-white text-[11px] font-bold shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-105 transition-all"
                    title="Generate Custom Design with AI"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 6 6.5 9.5 3 12l3.5 2.5L9 18l2.5-3.5L15 12l-3.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                    </svg>
                    <span>AI Magic</span>
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">Beta</span>
                </button>
            </div>
        </div>
    );
};

export default BottomEditBar;

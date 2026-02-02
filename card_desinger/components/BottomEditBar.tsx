
import React from 'react';

interface BottomEditBarProps {
    onDesignYourOwn: () => void;
    onUploadDesign: () => void;
    onAiGenerate: () => void;
    themeColor: string;
    onThemeColorChange: (color: string) => void;
}

const BottomEditBar: React.FC<BottomEditBarProps> = ({
    onDesignYourOwn,
    onUploadDesign,
    onAiGenerate,
    themeColor,
    onThemeColorChange
}) => {
    return (
        <div className="flex-shrink-0 z-50 bg-black border-t border-zinc-800">
            <div className="flex justify-between items-center px-2 py-2 overflow-x-auto scrollbar-hide gap-2">
                {/* Design Your Own Button */}
                <button
                    onClick={onDesignYourOwn}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold hover:border-gold hover:text-gold transition-all"
                    title="Design your card manually with text, images, and colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="hidden sm:inline">Design Your Own</span>
                    <span className="sm:hidden">Design</span>
                </button>

                {/* Upload Existing Card Button */}
                <button
                    onClick={onUploadDesign}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold hover:border-gold hover:text-gold transition-all"
                    title="Upload an existing card design image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="hidden sm:inline">Upload Card</span>
                    <span className="sm:hidden">Upload</span>
                </button>

                {/* AI Generate Button */}
                <button
                    onClick={onAiGenerate}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 via-purple-600 to-gold text-white text-[10px] font-bold shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-105 transition-all"
                    title="Generate Custom Design with AI"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 6 6.5 9.5 3 12l3.5 2.5L9 18l2.5-3.5L15 12l-3.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                    </svg>
                    <span className="hidden sm:inline">AI Magic</span>
                    <span className="sm:hidden">AI</span>
                    <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">Beta</span>
                </button>

                {/* Theme Color Picker */}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] text-zinc-400 hidden sm:inline">Theme</span>
                    <div className="relative group">
                        <input
                            type="color"
                            value={themeColor || '#d7ba52'}
                            onChange={(e) => onThemeColorChange(e.target.value)}
                            className="w-7 h-7 rounded-md border border-zinc-600 cursor-pointer bg-transparent p-0 appearance-none overflow-hidden"
                            title="Theme color - Updates QR, NFC Icon & Branding"
                        />
                        <div className="absolute inset-0 pointer-events-none rounded-md ring-2 ring-transparent group-hover:ring-gold transition-all"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BottomEditBar;

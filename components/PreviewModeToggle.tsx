import React from 'react';

interface PreviewModeToggleProps {
    mode: 'mobile' | 'desktop';
    onChange: (mode: 'mobile' | 'desktop') => void;
    className?: string;
}

const PreviewModeToggle: React.FC<PreviewModeToggleProps> = ({ mode, onChange, className = '' }) => {
    return (
        <div className={`flex items-center gap-2 bg-zinc-800 rounded-lg p-1 ${className}`}>
            <button
                onClick={() => onChange('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'mobile'
                        ? 'bg-zinc-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                title="Mobile Preview"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                </svg>
                <span className="hidden sm:inline">Mobile</span>
            </button>

            <button
                onClick={() => onChange('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'desktop'
                        ? 'bg-zinc-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                title="Desktop Preview"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>
                <span className="hidden sm:inline">Desktop</span>
            </button>
        </div>
    );
};

export default PreviewModeToggle;

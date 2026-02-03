import React from 'react';

interface ReconnectingOverlayProps {
    isVisible: boolean;
}

const ReconnectingOverlay: React.FC<ReconnectingOverlayProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
            <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-3 pointer-events-auto">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold"></div>
                <span className="text-sm font-medium text-white">Reconnecting...</span>
            </div>
        </div>
    );
};

export default ReconnectingOverlay;

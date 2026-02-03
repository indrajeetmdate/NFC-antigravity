import React from 'react';
import Auth from './Auth';

interface InlineLoginModalProps {
    isVisible: boolean;
    onDismiss: () => void;
    onSuccess?: () => void;
}

const InlineLoginModal: React.FC<InlineLoginModalProps> = ({ isVisible, onDismiss, onSuccess }) => {
    if (!isVisible) return null;

    const handleAuthSuccess = () => {
        // Call optional success callback
        onSuccess?.();
        // Dismiss modal (ProfileContext will handle session restoration)
        onDismiss();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">Session Expired</h2>
                        <p className="text-sm text-zinc-400 mt-1">Please log in again to continue</p>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-zinc-400 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Auth Component */}
                <div className="p-6">
                    <Auth type="login" onSuccess={handleAuthSuccess} disableRedirect />
                </div>
            </div>
        </div>
    );
};

export default InlineLoginModal;

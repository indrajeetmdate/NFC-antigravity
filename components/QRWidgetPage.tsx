
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

declare const QRCodeStyling: any;

const QRWidgetPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { profile } = useProfile();
    const qrRef = useRef<HTMLDivElement>(null);
    const [qrReady, setQrReady] = useState(false);

    const profileUrl = `https://canopycorp.in/#/p/${slug}`;
    const standaloneUrl = `/qr-widget.html?slug=${encodeURIComponent(slug || '')}&name=${encodeURIComponent(profile?.full_name || 'My Profile')}`;

    useEffect(() => {
        if (!slug || !qrRef.current) return;

        // Clear any previous QR
        qrRef.current.innerHTML = '';

        // Use the globally loaded QRCodeStyling from CDN
        if (typeof QRCodeStyling !== 'undefined') {
            const size = Math.min(window.innerWidth - 80, 320);
            const qrCode = new QRCodeStyling({
                width: size,
                height: size,
                data: profileUrl,
                dotsOptions: {
                    color: "#d7ba52",
                    type: "rounded"
                },
                backgroundOptions: {
                    color: "#09090b"
                },
                cornersSquareOptions: {
                    color: "#d7ba52",
                    type: "extra-rounded"
                },
                cornersDotOptions: {
                    color: "#d7ba52",
                    type: "dot"
                },
                imageOptions: {
                    crossOrigin: "anonymous",
                    margin: 4
                }
            });
            qrCode.append(qrRef.current);
            setQrReady(true);
        }
    }, [slug, profileUrl]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${profile?.full_name || 'Profile'}'s Digital Card`,
                    text: `Check out ${profile?.full_name || 'this'} digital profile`,
                    url: profileUrl,
                });
            } catch { }
        } else {
            // Fallback: Copy to clipboard
            await navigator.clipboard.writeText(profileUrl);
            alert('Profile URL copied to clipboard!');
        }
    };

    const handleAddToHomeScreen = () => {
        window.open(standaloneUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-8">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
                {/* User Name */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {profile?.full_name || 'Profile QR'}
                    </h1>
                    {profile?.company && (
                        <p className="text-sm text-zinc-500 mt-1">{profile.company}</p>
                    )}
                </div>

                {/* QR Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/40 w-full flex flex-col items-center gap-4">
                    <div ref={qrRef} className="rounded-2xl overflow-hidden flex items-center justify-center min-h-[200px]">
                        {!qrReady && (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                        )}
                    </div>

                    <p className="text-xs text-zinc-500 text-center break-all select-all font-mono">
                        {profileUrl}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col gap-3">
                    <button
                        onClick={handleAddToHomeScreen}
                        className="w-full py-3.5 px-6 bg-gold text-black font-bold rounded-xl hover:bg-gold-600 transition-all duration-200 shadow-lg shadow-gold/10 hover:shadow-gold/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Add QR to Home Screen
                    </button>

                    <button
                        onClick={handleShare}
                        className="w-full py-3 px-6 bg-transparent text-zinc-400 font-semibold rounded-xl border border-zinc-800 hover:border-gold/50 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share Profile Link
                    </button>
                </div>

                {/* Back to Dashboard */}
                <Link
                    to="/dashboard"
                    className="text-xs text-zinc-600 hover:text-gold transition-colors mt-2"
                >
                    ← Back to Dashboard
                </Link>

                {/* Branding */}
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest">
                    NFC cards by CanopyCorp
                </p>
            </div>

            <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default QRWidgetPage;

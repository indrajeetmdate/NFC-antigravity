
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Options, FileExtension, DotType, CornerSquareType, CornerDotType } from '../types';
import { DOT_TYPES, CORNER_SQUARE_TYPES, CORNER_DOT_TYPES } from '../constants';
import { supabase } from '../../lib/supabase';

declare const QRCodeStyling: any;

const safeBtoa = (str: string) => {
    try { return btoa(unescape(encodeURIComponent(str))); } catch (e) { return btoa(str); }
};

const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="215 500 700 700" xml:space="preserve"><circle cx="565.23" cy="847.27" r="331.15" style="stroke:#d6ba52;stroke-width:15;stroke-miterlimit:10"/><path d="M698.32 1029.78c-101.8 71.25-242.09 46.48-313.34-55.32S338.5 732.37 440.3 661.12" style="fill:none;stroke:#d9be44;stroke-width:80;stroke-miterlimit:10"/><path d="M816.7 694.29c-34.72 40.91-87.52 63.93-153.7 65.65-133.45 3.47-221.77-93.3-306.02-72.77 70.92-96.51 168.85-104.3 223.52-100.34 125.44 9.09 143.97 99.79 236.2 107.46" style="fill:#ca9e2a"/><path d="M791.79 702.62c-2.56 1.69 2.75-1.51 0 0-81.63 13.92-121.54-6.92-230.57-44.66-43.85-15.18-120.34-24.29-201.12 25.04 82.56-55.09 163.53-45.62 208.79-29.95 109.16 37.78 138.02 56.3 222.9 49.57" style="opacity:.6;fill:#d7e6a0"/><path d="M696.18 1031.33c16.83-14.15-7.11 6.64 7.73-6.07" style="fill:#d9be44;stroke:#d9be42;stroke-width:80;stroke-linecap:round;stroke-miterlimit:10"/></svg>`;

const QrCodeGenerator: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [displayValue, setDisplayValue] = useState('');
    const [isUsingDefault, setIsUsingDefault] = useState(true);
    const [profile, setProfile] = useState<{ id: string; full_name: string; profile_slug: string } | null>(null);
    const [image, setImage] = useState<string | null>(`data:image/svg+xml;base64,${safeBtoa(DEFAULT_LOGO_SVG)}`); 
    const [showAdvanced, setShowAdvanced] = useState(false);
    const navigate = useNavigate();

    const [options, setOptions] = useState<Options>({
        width: 300,
        height: 300,
        data: '',
        margin: 10,
        image: '',
        dotsOptions: { color: '#d7ba52', type: 'rounded' },
        backgroundOptions: { color: '#000000' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#d7ba52' },
        cornersDotOptions: { type: 'dots', color: '#d7ba52' },
        imageOptions: { imageSize: 0.25, margin: 0, hideBackgroundDots: true }
    });

    const qrCodeRef = useRef<HTMLDivElement>(null);
    const qrCodeInstanceRef = useRef<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
                if (data) setProfile(data);
                else navigate('/dashboard/carddesign');
            } else navigate('/login');
        };
        fetchProfile();
    }, [navigate]);
    
    useEffect(() => {
        if (profile) {
            const defaultUrl = `https://www.canopycorp.in/#/p/${profile.profile_slug}`;
            const friendlyLabel = `${profile.full_name}'s Profile`;
            
            setUrl(defaultUrl);
            setDisplayValue(friendlyLabel);
            setIsUsingDefault(true);
        }
    }, [profile]);

    useEffect(() => {
        if (qrCodeRef.current && !qrCodeInstanceRef.current) {
            qrCodeInstanceRef.current = new QRCodeStyling({ ...options, data: url, image: image ?? '' });
            qrCodeInstanceRef.current.append(qrCodeRef.current);
        }
    }, []);

    useEffect(() => {
        if (qrCodeInstanceRef.current) {
            // Update the QR with the actual URL (or whatever the user typed if they edited it)
            qrCodeInstanceRef.current.update({ ...options, data: url, image: image ?? '' });
        }
    }, [url, image, options]);

    const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayValue(val);
        // If the user edits the input, the QR code now encodes exactly what they type
        setUrl(val); 
        setIsUsingDefault(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
            <div className="lg:col-span-2 p-6 bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800 h-fit">
                <h2 className="text-xl font-bold mb-6 text-gold border-b pb-3 border-zinc-700">QR Content</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">URL or Text</label>
                        <div className="relative">
                            <input
                                type="text" 
                                value={displayValue}
                                onFocus={() => { 
                                    // Optional: Select text on focus for easier replacement
                                }}
                                onBlur={() => { 
                                    if(profile && url === `https://www.canopycorp.in/#/p/${profile.profile_slug}`) { 
                                        setIsUsingDefault(true); 
                                        setDisplayValue(`${profile.full_name}'s Profile`); 
                                    } 
                                }}
                                onChange={handleContentChange}
                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-white outline-none focus:border-gold"
                            />
                            {isUsingDefault && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded border border-gold/30">Default Link</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {isUsingDefault 
                                ? "This QR code currently links to your Canopy Profile." 
                                : "You are creating a custom QR code. It will encode exactly what you type above."}
                        </p>
                    </div>
                    <div className="flex justify-center py-2">
                        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-gold font-medium text-sm">
                            {showAdvanced ? 'Simple View' : 'Advanced Styles'}
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    {showAdvanced && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs text-zinc-400">Dots Color</label><input type="color" value={options.dotsOptions.color} onChange={e => setOptions(prev => ({ ...prev, dotsOptions: { ...prev.dotsOptions, color: e.target.value } }))} className="w-full h-8 bg-zinc-800 rounded mt-1 cursor-pointer" /></div>
                                <div><label className="block text-xs text-zinc-400">Bg Color</label><input type="color" value={options.backgroundOptions.color} onChange={e => setOptions(prev => ({ ...prev, backgroundOptions: { ...prev.backgroundOptions, color: e.target.value } }))} className="w-full h-8 bg-zinc-800 rounded mt-1 cursor-pointer" /></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-6 bg-zinc-900 rounded-2xl shadow-lg border border-zinc-800 flex flex-col items-center justify-between space-y-6">
                <h2 className="text-xl font-bold text-gold">Preview</h2>
                <div ref={qrCodeRef} className="p-4 bg-white rounded-lg" />
                <button onClick={async () => {
                    const buffer = await qrCodeInstanceRef.current.getRawData('png');
                    if (buffer) {
                        const reader = new FileReader();
                        reader.onloadend = () => { localStorage.setItem('customQrCodeUrl', reader.result as string); navigate('/dashboard/carddesign'); };
                        reader.readAsDataURL(new Blob([buffer], { type: 'image/png' }));
                    }
                }} className="w-full bg-gold text-black font-bold py-3 rounded-lg hover:bg-gold-600 transition-colors shadow-lg">Apply & Continue</button>
            </div>
        </div>
    );
};

export default QrCodeGenerator;

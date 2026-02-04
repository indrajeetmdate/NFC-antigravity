
import React, { useState, useEffect, useRef } from 'react';
import type { Options, FileExtension, DotType, CornerSquareType, CornerDotType } from '../../custom_qr/types';
import { DOT_TYPES, CORNER_SQUARE_TYPES, CORNER_DOT_TYPES } from '../../custom_qr/constants';
import { getSupabase } from '../../lib/supabase';

declare const QRCodeStyling: any;

const safeBtoa = (str: string) => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return btoa(str);
    }
};

const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="215 500 700 700" xml:space="preserve"><circle cx="565.23" cy="847.27" r="331.15" style="stroke:#d6ba52;stroke-width:15;stroke-miterlimit:10"/><path d="M698.32 1029.78c-101.8 71.25-242.09 46.48-313.34-55.32S338.5 732.37 440.3 661.12" style="fill:none;stroke:#d9be44;stroke-width:80;stroke-miterlimit:10"/><path d="M816.7 694.29c-34.72 40.91-87.52 63.93-153.7 65.65-133.45 3.47-221.77-93.3-306.02-72.77 70.92-96.51 168.85-104.3 223.52-100.34 125.44 9.09 143.97 99.79 236.2 107.46" style="fill:#ca9e2a"/><path d="M791.79 702.62c-2.56 1.69 2.75-1.51 0 0-81.63 13.92-121.54-6.92-230.57-44.66-43.85-15.18-120.34-24.29-201.12 25.04 82.56-55.09 163.53-45.62 208.79-29.95 109.16 37.78 138.02 56.3 222.9 49.57" style="opacity:.6;fill:#d7e6a0"/><path d="M696.18 1031.33c16.83-14.15-7.11 6.64 7.73-6.07" style="fill:#d9be44;stroke:#d9be42;stroke-width:80;stroke-linecap:round;stroke-miterlimit:10"/></svg>`;

interface CompactQrGeneratorProps {
    onUpdate: (dataUrl: string) => void;
    onCancel: () => void;
}

const CompactQrGenerator: React.FC<CompactQrGeneratorProps> = ({ onUpdate, onCancel }) => {
    const [profile, setProfile] = useState<{ id: string; full_name: string; profile_slug: string } | null>(null);
    const [url, setUrl] = useState<string>('');
    const [displayContent, setDisplayContent] = useState<string>('');
    const [image, setImage] = useState<string | null>(null);
    const [logoSize, setLogoSize] = useState(0.25);
    const [options, setOptions] = useState<Options>({
        width: 300,
        height: 300,
        data: '',
        margin: 10,
        image: '',
        dotsOptions: { color: '#d7ba52', type: 'rounded' },
        backgroundOptions: { color: 'transparent' },
        cornersSquareOptions: { type: 'extra-rounded', color: '#d7ba52' },
        cornersDotOptions: { type: 'dots', color: '#d7ba52' },
        imageOptions: { imageSize: 0.25, margin: 0, hideBackgroundDots: true }
    });

    const qrCodeInstanceRef = useRef<any>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await getSupabase().auth.getUser();
            if (user) {
                const { data } = await getSupabase().from('profiles').select('id, full_name, profile_slug').eq('user_id', user.id).single();
                if (data) {
                    setProfile(data);
                    const targetUrl = `https://www.canopycorp.in/#/p/${data.profile_slug}`;
                    setUrl(targetUrl);
                    setDisplayContent(`${data.full_name}'s Profile`);
                }
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!qrCodeInstanceRef.current) {
            qrCodeInstanceRef.current = new QRCodeStyling({ ...options, data: url, image: image ?? '' });
        }
        qrCodeInstanceRef.current.update({ ...options, data: url, image: image ?? '', imageOptions: { ...options.imageOptions, imageSize: logoSize } });
    }, [url, image, options, logoSize]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        try {
            const buffer = await qrCodeInstanceRef.current.getRawData('png');
            if (buffer) {
                const blob = new Blob([buffer], { type: 'image/png' });
                const reader = new FileReader();
                reader.onloadend = () => onUpdate(reader.result as string);
                reader.readAsDataURL(blob);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const SelectField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: readonly { value: string; label: string }[] }> = ({ label, value, onChange, options }) => (
        <div>
            <label className="text-[10px] text-zinc-400 block mb-1 uppercase tracking-wide">{label}</label>
            <select value={value} onChange={onChange} className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-white focus:outline-none focus:border-gold">
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );

    return (
        <div className="flex flex-col gap-2 text-white animate-slide-up px-3 pb-3 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-700/50 pb-1 mb-1">
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider pl-1">QR Code Designer</span>
                <button onClick={onCancel} className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded hover:text-white transition-colors">Cancel</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-zinc-400 block mb-1">Dots Color</label>
                    <input type="color" value={options.dotsOptions.color} onChange={e => setOptions({ ...options, dotsOptions: { ...options.dotsOptions, color: e.target.value }, cornersSquareOptions: { ...options.cornersSquareOptions, color: e.target.value }, cornersDotOptions: { ...options.cornersDotOptions, color: e.target.value } })} className="w-full h-6 bg-zinc-800 rounded cursor-pointer" />
                </div>
                <div>
                    <label className="text-xs text-zinc-400 block mb-1">Background</label>
                    <input type="color" value={options.backgroundOptions.color} onChange={e => setOptions({ ...options, backgroundOptions: { ...options.backgroundOptions, color: e.target.value } })} className="w-full h-6 bg-zinc-800 rounded cursor-pointer" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
                <SelectField label="Dots Style" value={options.dotsOptions.type} onChange={e => setOptions(prev => ({ ...prev, dotsOptions: { ...prev.dotsOptions, type: e.target.value as DotType } }))} options={DOT_TYPES} />
                <SelectField label="Corners" value={options.cornersSquareOptions.type ?? ''} onChange={e => setOptions(prev => ({ ...prev, cornersSquareOptions: { ...prev.cornersSquareOptions, type: e.target.value as CornerSquareType } }))} options={CORNER_SQUARE_TYPES} />
                <SelectField label="Corner Dots" value={options.cornersDotOptions.type ?? ''} onChange={e => setOptions(prev => ({ ...prev, cornersDotOptions: { ...prev.cornersDotOptions, type: e.target.value as CornerDotType } }))} options={CORNER_DOT_TYPES} />
            </div>

            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs text-zinc-400 block mb-1">QR embedded logo</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs text-zinc-500 w-full" />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-zinc-400 block mb-1">Logo Size</label>
                    <input type="range" min="0.1" max="0.6" step="0.05" value={logoSize} onChange={(e) => setLogoSize(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-gold" />
                </div>
            </div>

            <div className="w-full">
                <label className="text-xs text-zinc-400 block mb-1">Content</label>
                <input
                    type="text"
                    value={displayContent}
                    onChange={(e) => {
                        setDisplayContent(e.target.value);
                        setUrl(e.target.value); // Editing overwrites the data with raw text
                    }}
                    onBlur={() => {
                        if (profile && url === `https://www.canopycorp.in/#/p/${profile.profile_slug}`) {
                            setDisplayContent(`${profile.full_name}'s Profile`);
                        }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:border-gold outline-none"
                />
            </div>

            <button onClick={handleGenerate} className="w-full bg-gold text-black font-bold py-1 rounded hover:bg-gold-600 transition-colors text-xs mt-1">
                Apply QR to Card
            </button>
        </div>
    );
};

export default CompactQrGenerator;


import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { BUCKET_CARD_IMAGES, FONTS } from '../../constants';
import { generateCardDesign } from '../../utils/aiService';
import { useToast } from '../../context/ToastContext';
import { CardFaceData } from '../../types';

interface AiGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (data: CardFaceData, side: 'front' | 'back') => void;
    userProfile: any;
    side: 'front' | 'back';
}

const STYLES = ['Modern', 'Luxury', 'Minimalist', 'Cyberpunk', 'Playful', 'Professional'];
const COLORS = [
    { name: 'Gold & Black', colors: ['#d7ba52', '#000000'] },
    { name: 'Blue & White', colors: ['#2563eb', '#ffffff'] },
    { name: 'Neon Purple', colors: ['#a855f7', '#18181b'] },
    { name: 'Emerald', colors: ['#10b981', '#064e3b'] },
    { name: 'Custom', colors: [] }
];

const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({ isOpen, onClose, onApply, userProfile, side }) => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input');

    // Form State
    const [style, setStyle] = useState('Modern');
    const [description, setDescription] = useState('');
    const [selectedColors, setSelectedColors] = useState<string[]>(['#d7ba52', '#000000']);
    const [customColor, setCustomColor] = useState('#ffffff');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [generatedData, setGeneratedData] = useState<CardFaceData | null>(null);
    const { showToast } = useToast();
    const logoInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        // 1. Check Limits
        const limitKey = side === 'front' ? 'front' : 'back';
        const usage = userProfile.ai_generation_count || { front: 0, back: 0 };

        if (usage[limitKey] >= 1) {
            showToast(`You have reached the limit for ${side} side AI generation (1/1).`, 'error');
            return;
        }

        setLoading(true);
        setStep('generating');

        try {
            // 2. Upload Logo if exists
            let uploadedLogoUrl = undefined;
            if (logoFile && userProfile?.id) {
                const filePath = `temp_ai/${userProfile.id}/${Math.random().toString(36).substring(7)}.png`;
                const { data, error } = await supabase.storage.from(BUCKET_CARD_IMAGES).upload(filePath, logoFile);
                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from(BUCKET_CARD_IMAGES).getPublicUrl(filePath);
                    uploadedLogoUrl = publicUrl;
                }
            } else if (userProfile?.profile_photo_url) {
                // Use profile photo as fallback logo if available
                uploadedLogoUrl = userProfile.profile_photo_url;
            }

            // 3. Call AI Service
            const companyName = userProfile?.company || "Your Company";
            const personName = userProfile?.full_name || "Your Name";

            const { data, error } = await generateCardDesign({
                side,
                style,
                description,
                colors: selectedColors,
                companyName,
                personName,
                logoUrl: uploadedLogoUrl
            });

            if (data) {
                setGeneratedData(data);
                setStep('preview');

                // 4. Update Usage Limit
                const newUsage = { ...usage, [limitKey]: usage[limitKey] + 1 };
                await supabase.from('profiles').update({ ai_generation_count: newUsage }).eq('id', userProfile.id);
            } else {
                showToast(error || "AI could not generate a valid design. Try again.", 'error');
                setStep('input');
            }

        } catch (error) {
            console.error(error);
            showToast("Generation failed.", 'error');
            setStep('input');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (generatedData) {
            onApply(generatedData, side);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border-2 border-transparent bg-clip-padding"
                style={{
                    backgroundImage: 'linear-gradient(#18181b, #18181b), linear-gradient(to right, #2563eb, #a855f7, #d7ba52)',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'content-box, border-box'
                }}>

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-gold bg-clip-text text-transparent flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L9.09 9.09L2 12L9.09 14.91L12 22L14.91 14.91L22 12L14.91 9.09L12 2Z" />
                        </svg>
                        AI {side === 'front' ? 'Front' : 'Back'} Generator
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                    {step === 'input' && (
                        <div className="space-y-6">
                            {/* Style Selector */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Choose Design Style</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {STYLES.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s)}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${style === s ? 'bg-white/10 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Colors */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Color Palette</label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.name}
                                            onClick={() => {
                                                if (c.colors.length > 0) setSelectedColors(c.colors);
                                                else setSelectedColors([customColor]);
                                            }}
                                            className={`p-1 rounded-full border-2 transition-all ${JSON.stringify(selectedColors) === JSON.stringify(c.colors) ? 'border-gold scale-110' : 'border-transparent hover:border-zinc-500'}`}
                                            title={c.name}
                                        >
                                            <div className="flex h-8 w-8 rounded-full overflow-hidden">
                                                {c.colors.length > 0 ? (
                                                    c.colors.map((hex, i) => (
                                                        <div key={i} style={{ backgroundColor: hex }} className="flex-1 h-full" />
                                                    ))
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-tr from-gray-700 to-gray-400 flex items-center justify-center text-[10px] text-white font-bold">?</div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                    <input
                                        type="color"
                                        value={customColor}
                                        onChange={(e) => {
                                            setCustomColor(e.target.value);
                                            setSelectedColors([e.target.value]);
                                        }}
                                        className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Describe the Vibe (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Elegant and prestigious for a CEO, or Fun and energetic for a creative agency..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none resize-none h-24"
                                />
                            </div>

                            {/* Logo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Upload Logo (Optional)</label>
                                <div
                                    onClick={() => logoInputRef.current?.click()}
                                    className="border-dashed border-2 border-zinc-700 hover:border-purple-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-800/50"
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="h-16 object-contain" />
                                    ) : (
                                        <div className="text-center text-zinc-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs">Click to upload logo</span>
                                        </div>
                                    )}
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </div>
                            </div>

                            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-xs text-blue-200 flex gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    You have 1 Front and 1 Back generation included. Make it count!
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 border-r-blue-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-2 border-4 border-transparent border-b-gold rounded-full animate-spin-reverse"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L9.09 9.09L2 12L9.09 14.91L12 22L14.91 14.91L22 12L14.91 9.09L12 2Z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Gemini is Designing...</h3>
                            <p className="text-zinc-400 text-sm text-center max-w-xs animate-pulse">
                                Analyzing vibe compliance • Choosing typography • Balancing layout • Optimizing for print
                            </p>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="text-center py-8">
                            <div className="mb-6 flex justify-center">
                                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Design Ready!</h3>
                            <p className="text-zinc-400 mb-8">
                                Your custom design has been generated. Apply it to the canvas to make further edits.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setStep('input')} className="py-3 rounded-xl border border-zinc-600 text-zinc-300 font-bold hover:bg-zinc-800">
                                    Discard
                                </button>
                                <button onClick={handleApply} className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:opacity-90 shadow-lg shadow-purple-900/50">
                                    Apply to Canvas
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {step === 'input' && (
                    <div className="p-6 border-t border-white/10 flex justify-end">
                        <button
                            onClick={handleGenerate}
                            className="bg-gradient-to-r from-blue-600 via-purple-600 to-gold text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/50 hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 6 6.5 9.5 3 12l3.5 2.5L9 18l2.5-3.5L15 12l-3.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                            </svg>
                            Generate Magic
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiGeneratorModal;


import React, { useState, useRef, useEffect } from 'react';
import type { CardFaceData, TextElement, ImageElement } from '../../types';
import CompactQrGenerator from './components_CompactQrGenerator';
import { FONTS } from '../../constants';

interface ControlPanelProps {
    activeCardData: CardFaceData;
    setCardData: React.Dispatch<React.SetStateAction<CardFaceData>>;
    activeSide: 'front' | 'back';
    setActiveSide: (side: 'front' | 'back') => void;
    onDownload: (side: 'front' | 'back', format: 'jpeg' | 'png', size: number) => void;
    selectedElement: { id: string; type: 'text' | 'image' } | null;
    onDeselect: () => void;
    onSave: (side?: 'front' | 'back') => void;
    isSaving: boolean;
    saveStatus?: string; // New prop for detailed status
    cardType: 'business_card' | 'standie';
    setCardType: (type: 'business_card' | 'standie') => void;
    onReset: () => void;
    onAiGenerate: () => void;
    onTriggerUpload: () => void;
}

const uuid = () => Math.random().toString(36).substring(2, 9);

type Mode = 'HOME' | 'TOOLS' | 'QR' | 'SETTINGS' | 'COLOR';

// Helper: HSV to Hex
const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100; v /= 100;
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    const rgb = [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0'));
    return `#${rgb.join('')}`;
};

// Helper: Hex to HSV
const hexToHsv = (hex: string) => {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    let d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
};

const ControlPanel: React.FC<ControlPanelProps> = ({
    activeCardData,
    setCardData,
    activeSide,
    setActiveSide,
    selectedElement,
    onDeselect,
    onSave,
    onDownload,
    isSaving,
    saveStatus,
    cardType,
    setCardType,
    onReset,
    onAiGenerate,
    onTriggerUpload
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<Mode>('HOME');

    // Color picker states
    const [hsv, setHsv] = useState({ h: 180, s: 50, v: 50 });
    const [hexInput, setHexInput] = useState(activeCardData.backgroundColor);

    useEffect(() => {
        setHexInput(activeCardData.backgroundColor);
        setHsv(hexToHsv(activeCardData.backgroundColor));
    }, [activeCardData.backgroundColor]);

    const handleHsvChange = (key: 'h' | 's' | 'v', val: number) => {
        const newHsv = { ...hsv, [key]: val };
        setHsv(newHsv);
        const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
        setHexInput(newHex);
        setCardData(p => ({ ...p, backgroundColor: newHex }));
    };

    const handleHexInputChange = (val: string) => {
        setHexInput(val);
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            setCardData(p => ({ ...p, backgroundColor: val }));
            setHsv(hexToHsv(val));
        }
    };

    // --- Handlers ---

    const handleTextChange = (id: string, field: keyof TextElement, value: any) => {
        setCardData(prev => ({
            ...prev,
            texts: prev.texts.map(t => t.id === id ? { ...t, [field]: value } : t)
        }));
    };

    const handleImageChange = (id: string, field: keyof ImageElement, value: any) => {
        setCardData(prev => ({
            ...prev,
            images: prev.images.map(i => i.id === id ? { ...i, [field]: value } : i)
        }));
    };

    const handleAddText = () => {
        const newText: TextElement = {
            id: `text_${uuid()}`,
            content: 'New Text',
            x: 50, y: 50, scale: 1, color: '#d7ba52', fontWeight: '700', fontFamily: 'Poppins', isLocked: false, fontSize: 24, letterSpacing: 0, textAlign: 'center'
        };
        setCardData(prev => ({ ...prev, texts: [...prev.texts, newText] }));
    };

    const handleAddImage = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 150;
                let width = img.width, height = img.height;
                if (width > maxDim || height > maxDim) {
                    const ratio = width / height;
                    if (width > height) { width = maxDim; height = maxDim / ratio; }
                    else { height = maxDim; width = maxDim * ratio; }
                }
                const newImage: ImageElement = { id: `image_${uuid()}`, url: reader.result as string, x: 50, y: 50, scale: 1, width, height };
                setCardData(prev => ({ ...prev, images: [...prev.images, newImage] }));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleQrUpdate = (dataUrl: string) => {
        setCardData(prev => {
            const hasQr = prev.images.find(i => i.id === 'qr');
            if (hasQr) return { ...prev, images: prev.images.map(i => i.id === 'qr' ? { ...i, url: dataUrl } : i) };
            return { ...prev, images: [...prev.images, { id: 'qr', url: dataUrl, x: 50, y: 50, scale: 1, width: 100, height: 100 }] };
        });
        setMode('TOOLS');
    };

    const handleDelete = () => {
        if (!selectedElement) return;
        if (selectedElement.type === 'text') setCardData(prev => ({ ...prev, texts: prev.texts.filter(t => t.id !== selectedElement.id) }));
        else setCardData(prev => ({ ...prev, images: prev.images.filter(i => i.id !== selectedElement.id) }));
        onDeselect();
    };


    const IconButton = ({ icon, label, onClick, active = false, tooltip }: any) => (
        <button
            onClick={onClick}
            title={tooltip || label}
            className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors ${active ? 'text-gold bg-zinc-800' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
        >
            {icon}
            <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
        </button>
    );

    const RangeSlider = ({ label, value, onChange, min, max, step }: any) => (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 uppercase tracking-wide">
                <span>{label}</span>
                <span className="text-white font-mono">{Math.round(value)}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-gold" />
        </div>
    );

    const editorHeightClass = "min-h-[160px]";

    const renderContent = () => {
        if (selectedElement) {
            const textItem = selectedElement.type === 'text' ? activeCardData.texts.find(t => t.id === selectedElement.id) : null;
            const imageItem = selectedElement.type === 'image' ? activeCardData.images.find(i => i.id === selectedElement.id) : null;

            if (!textItem && !imageItem) return <div className={`p-4 ${editorHeightClass} text-zinc-500 text-xs text-center`}>Item not found</div>;

            const item: any = textItem || imageItem;

            return (
                <div className={`w-full bg-zinc-900 p-2 animate-slide-up ${editorHeightClass}`}>
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                        <span className="text-xs font-bold text-gold uppercase tracking-wider">Editing {selectedElement.type}</span>
                        <button onClick={onDeselect} className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1 rounded hover:text-white">Done</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            {selectedElement.type === 'text' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Text Content</label>
                                    <input
                                        type="text"
                                        value={item.content}
                                        onChange={(e) => handleTextChange(selectedElement.id, 'content', e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-gold outline-none"
                                    />
                                </div>
                            )}
                            <RangeSlider label="Position X" value={item.x} onChange={(e: any) => (selectedElement.type === 'text' ? handleTextChange(selectedElement.id, 'x', parseFloat(e.target.value)) : handleImageChange(selectedElement.id, 'x', parseFloat(e.target.value)))} min={0} max={100} step={1} />
                            <RangeSlider label="Position Y" value={item.y} onChange={(e: any) => (selectedElement.type === 'text' ? handleTextChange(selectedElement.id, 'y', parseFloat(e.target.value)) : handleImageChange(selectedElement.id, 'y', parseFloat(e.target.value)))} min={0} max={100} step={1} />
                            {selectedElement.type === 'text' && (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Font Family</label>
                                        <select
                                            value={item.fontFamily || 'Poppins'}
                                            onChange={(e) => handleTextChange(selectedElement.id, 'fontFamily', e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:border-gold outline-none"
                                        >
                                            {FONTS.map(f => (
                                                <option key={f.value} value={f.value}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="color"
                                                value={item.color}
                                                onChange={(e) => handleTextChange(selectedElement.id, 'color', e.target.value)}
                                                className="w-8 h-8 rounded border border-zinc-700 cursor-pointer bg-transparent p-0"
                                            />
                                            <span className="text-xs text-zinc-500 font-mono uppercase">{item.color}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="space-y-3">
                            <RangeSlider label="Scale" value={item.scale} onChange={(e: any) => (selectedElement.type === 'text' ? handleTextChange(selectedElement.id, 'scale', parseFloat(e.target.value)) : handleImageChange(selectedElement.id, 'scale', parseFloat(e.target.value)))} min={0.2} max={4} step={0.1} />
                            <div className="flex justify-center pt-1">
                                <button onClick={handleDelete} className="text-red-500 bg-red-900/20 px-3 py-1.5 rounded-md text-[10px] font-bold border border-red-900/50">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (mode === 'COLOR') {
            return (
                <div className={`w-full bg-zinc-900 p-2 animate-slide-up ${editorHeightClass}`}>
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                        <span className="text-xs font-bold text-gold uppercase tracking-wider">Background Color</span>
                        <button onClick={() => setMode('TOOLS')} className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1 rounded hover:text-white">Done</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <RangeSlider label="Hue" value={hsv.h} onChange={(e: any) => handleHsvChange('h', parseInt(e.target.value))} min={0} max={360} step={1} />
                        <RangeSlider label="Saturation" value={hsv.s} onChange={(e: any) => handleHsvChange('s', parseInt(e.target.value))} min={0} max={100} step={1} />
                        <RangeSlider label="Value" value={hsv.v} onChange={(e: any) => handleHsvChange('v', parseInt(e.target.value))} min={0} max={100} step={1} />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-zinc-700 shadow-sm" style={{ backgroundColor: activeCardData.backgroundColor }}></div>
                        <input
                            type="text" value={hexInput} onChange={(e) => handleHexInputChange(e.target.value)}
                            placeholder="#000000" className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm font-mono text-white outline-none focus:border-gold"
                        />
                    </div>
                </div>
            );
        }

        if (mode === 'QR') return <div className={`w-full bg-zinc-900 p-2 ${editorHeightClass}`}><CompactQrGenerator onUpdate={handleQrUpdate} onCancel={() => setMode('TOOLS')} /></div>;

        if (mode === 'SETTINGS') {
            return (
                <div className={`w-full bg-zinc-900 p-2 animate-slide-up ${editorHeightClass}`}>
                    <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                        <span className="text-xs font-bold text-gold uppercase tracking-wider">Card Settings</span>
                        <button onClick={() => setMode('TOOLS')} className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1 rounded hover:text-white">Done</button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold">NFC Icon Color</span>
                                <input type="color" value={activeCardData.nfcIconColor} onChange={(e) => setCardData(p => ({ ...p, nfcIconColor: e.target.value }))} className="w-full h-8 rounded border border-zinc-700 cursor-pointer bg-transparent p-0" />
                            </div>

                            {activeSide === 'back' && (
                                <div className="space-y-1">
                                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Branding Color</span>
                                    <input
                                        type="color"
                                        value={activeCardData.urlColor || activeCardData.nfcIconColor}
                                        onChange={(e) => setCardData(p => ({ ...p, urlColor: e.target.value }))}
                                        className="w-full h-8 rounded border border-zinc-700 cursor-pointer bg-transparent p-0"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold">Quick Actions</span>
                            <div className="flex gap-2">
                                <button onClick={() => onDownload(activeSide, 'png', 2)} className="flex-1 bg-zinc-800 py-2 rounded text-[10px] font-bold border border-zinc-700 hover:text-white hover:border-zinc-500">PNG</button>
                                <button onClick={() => onDownload(activeSide, 'jpeg', 2)} className="flex-1 bg-zinc-800 py-2 rounded text-[10px] font-bold border border-zinc-700 hover:text-white hover:border-zinc-500">JPG</button>
                            </div>
                            <button onClick={onReset} className="w-full mt-2 bg-red-900/30 text-red-500 border border-red-900/50 py-2 rounded text-[10px] font-bold hover:bg-red-900/50 hover:text-red-400">
                                Reset to Default
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (mode === 'TOOLS') {
            return (
                <div className="flex overflow-x-auto gap-2 px-2 pb-1 scrollbar-hide justify-between sm:justify-start pt-2">
                    <IconButton
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M11.03 3.97a.75.75 0 010 1.06l-6.22 6.22H21a.75.75 0 010 1.5H4.81l6.22 6.22a.75.75 0 11-1.06 1.06l-7.5-7.5a.75.75 0 010-1.06l7.5-7.5a.75.75 0 011.06 0z" clipRule="evenodd" />
                            </svg>
                        }
                        label="Back"
                        tooltip="Back to Menu"
                        onClick={() => setMode('HOME')}
                    />
                    <IconButton
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-4H9v-2h6v2h-2v4z" />
                            </svg>
                        }
                        label="Add Text"
                        tooltip="Add custom text labels to your card (e.g., name, title, phone)"
                        onClick={handleAddText}
                    />

                    <div className="relative">
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleAddImage(e.target.files[0]); e.target.value = ''; }} />
                        <IconButton
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                                </svg>
                            }
                            label="Add Logo"
                            tooltip="Upload your company logo or any image (JPG, PNG)"
                            onClick={() => fileInputRef.current?.click()}
                        />
                    </div>

                    <IconButton
                        icon={
                            <div className="w-5 h-5 rounded-full border border-zinc-600 shadow-sm" style={{ backgroundColor: activeCardData.backgroundColor }}></div>
                        }
                        label="BG Color"
                        tooltip="Change card background color with intuitive color picker"
                        onClick={() => setMode('COLOR')}
                    />

                    <IconButton
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h4.5A1.5 1.5 0 0110.5 4.5v4.5A1.5 1.5 0 019 10.5H4.5A1.5 1.5 0 013 9V4.5zm1.5 0v4.5h4.5V4.5h-4.5zM13.5 4.5A1.5 1.5 0 0115 3h4.5A1.5 1.5 0 0121 4.5v4.5A1.5 1.5 0 0119.5 10.5H15A1.5 1.5 0 0113.5 9V4.5zm1.5 0v4.5h4.5V4.5h-4.5zM3 15a1.5 1.5 0 011.5-1.5h4.5A1.5 1.5 0 0110.5 15v4.5A1.5 1.5 0 019 21H4.5A1.5 1.5 0 013 19.5V15zm1.5 0v4.5h4.5V15h-4.5zM13.5 15a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v4.5a1.5 1.5 0 01-1.5 1.5h-4.5A1.5 1.5 0 0113.5 19.5V15z" clipRule="evenodd" />
                            </svg>
                        }
                        label="Add QR"
                        tooltip="Generate QR code that links to your profile (transparent background)"
                        onClick={() => setMode('QR')}
                    />

                    <IconButton
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                            </svg>
                        }
                        label="Settings"
                        tooltip="Card settings, download options, and reset"
                        onClick={() => setMode('SETTINGS')}
                    />
                </div>
            );
        }

        // HOME View
        return (
            <div className={`grid grid-cols-2 gap-4 p-4 ${editorHeightClass} items-center`}>
                <button
                    onClick={() => setMode('TOOLS')}
                    className="flex flex-col items-center justify-center gap-3 bg-zinc-800 p-6 rounded-xl border border-zinc-700 hover:border-gold hover:bg-zinc-700 transition-all group shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span className="text-sm font-bold text-white group-hover:text-gold uppercase tracking-wider">Design Your Own</span>
                </button>
                <button
                    onClick={onTriggerUpload}
                    className="flex flex-col items-center justify-center gap-3 bg-zinc-800 p-6 rounded-xl border border-zinc-700 hover:border-gold hover:bg-zinc-700 transition-all group shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-sm font-bold text-white group-hover:text-gold uppercase tracking-wider">Upload Design</span>
                </button>
            </div>
        );
    };

    return (
        <div className="w-full bg-zinc-900 border-b border-zinc-800 p-2">
            <div className="flex justify-between items-center px-4 mb-3 pt-2 border-b border-zinc-800 pb-2">
                <div className="flex bg-zinc-800 rounded-lg p-0.5 shadow-inner">
                    <button onClick={() => setCardType('business_card')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${cardType === 'business_card' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-500'}`}>Card</button>
                    <button onClick={() => setCardType('standie')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${cardType === 'standie' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-500'}`}>Standie</button>
                </div>

                <div className="flex items-center gap-3">
                    {/* AI Generate Button (New) */}
                    <button
                        onClick={onAiGenerate}
                        className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 via-purple-600 to-gold text-white text-[10px] font-bold shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:scale-105 transition-all mr-2"
                        title="Generate Custom Design with AI"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 6 6.5 9.5 3 12l3.5 2.5L9 18l2.5-3.5L15 12l-3.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
                        </svg>
                        <span className="hidden sm:inline">AI Magic</span>
                        <span className="sm:hidden">AI</span>
                        <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">Beta</span>
                    </button>

                    {/* View Toggles */}
                    <div className="flex bg-zinc-800 rounded-lg p-0.5">
                        <button onClick={() => setActiveSide('front')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeSide === 'front' ? 'bg-zinc-600 text-white' : 'text-zinc-500'}`}>Front</button>
                        <button onClick={() => setActiveSide('back')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${activeSide === 'back' ? 'bg-zinc-600 text-white' : 'text-zinc-500'}`}>Back</button>
                    </div>

                    {/* Save Buttons */}
                    <div className="flex gap-1 items-center">
                        {isSaving ? (
                            <div className="px-3 py-1.5 bg-zinc-800 rounded text-[10px] font-mono text-gold animate-pulse border border-zinc-700">
                                {saveStatus || 'Saving...'}
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => onSave()}
                                    className="bg-green-600 text-white border border-green-500 px-4 py-1.5 rounded-md text-[10px] font-bold hover:bg-green-500 hover:border-green-400 transition-all shadow-sm flex items-center gap-1"
                                    title="Save Design & Continue"
                                >
                                    <span>Save & Continue</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default ControlPanel;


import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import BusinessCard from './components/components_BusinessCard';
import ControlPanel from './components/components_ControlPanel';
import AiGeneratorModal from './components/components_AiGeneratorModal';
import BottomEditBar from './components/BottomEditBar';
import type { CardFaceData, ImageElement, TextElement } from '../types';
import { supabase, getSupabase } from '../lib/supabase';
import { BUCKET_CARD_IMAGES } from '../constants';
import { useToast } from '../context/ToastContext';
import PreviewModeToggle from '../components/PreviewModeToggle';
import { getPreferredPreviewMode, setPreferredPreviewMode } from '../utils/deviceDetection';

declare const QRCodeStyling: any;

const initialFrontData: CardFaceData = {
    texts: [],
    images: [
        { id: 'logo', url: null, x: 50, y: 65, scale: 1, width: 112, height: 112 },
        { id: 'qr', url: null, x: 10, y: 85, scale: 1, width: 64, height: 64 }, // Will be generated for user's profile
    ],
    backgroundColor: '#000000',
    backgroundImageUrl: null,
    nfcIconColor: '#d7ba52',
    urlColor: '#d7ba52',
};

const initialBackData: CardFaceData = {
    texts: [],
    images: [
        { id: 'logo', url: null, x: 50, y: 50, scale: 1.5, width: 112, height: 112 },
    ],
    backgroundColor: '#000000',
    backgroundImageUrl: null,
    nfcIconColor: '#d7ba52',
    urlColor: '#d7ba52',
};

const dataURLtoBlob = (dataurl: string): Blob | null => {
    try {
        const arr = dataurl.split(',');
        if (arr.length < 2) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Error converting DataURL to Blob", e);
        return null;
    }
};

const fontsEmbedCss = `
    @font-face { font-family: 'Poppins'; src: url(https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfecg.woff2) format('woff2'); font-weight: 400; }
    @font-face { font-family: 'Poppins'; src: url(https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLGT9V1s.woff2) format('woff2'); font-weight: 500; }
    @font-face { font-family: 'Poppins'; src: url(https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7V1s.woff2) format('woff2'); font-weight: 700; }
    @font-face { font-family: 'Inter'; src: url(https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2) format('woff2'); }
    @font-face { font-family: 'Roboto'; src: url(https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2) format('woff2'); }
    @font-face { font-family: 'Merriweather'; src: url(https://fonts.gstatic.com/s/merriweather/v30/u-440qyriQwlOrhSvowK_l5-fCzm.woff2) format('woff2'); }
    @font-face { font-family: 'Montserrat'; src: url(https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2) format('woff2'); }
    @font-face { font-family: 'Playfair Display'; src: url(https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff2) format('woff2'); }
`;

declare const htmlToImage: any;

type SelectedElement = {
    id: string;
    type: 'text' | 'image';
} | null;

const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: (e as any).clientX, y: (e as any).clientY };
};

const CardDesignerPage: React.FC = () => {
    const [frontData, setFrontData] = useState<CardFaceData>(initialFrontData);
    const [backData, setBackData] = useState<CardFaceData>(initialBackData);

    // AI Modal State
    const [aiModalOpen, setAiModalOpen] = useState(false);

    const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string>(''); // For detailed feedback

    const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
    const [draggedItem, setDraggedItem] = useState<{
        side: 'front' | 'back';
        type: 'text' | 'image';
        id: string;
        offsetX: number;
        offsetY: number;
    } | null>(null);

    const [cardType, setCardType] = useState<'business_card' | 'standie'>('business_card');
    const [profileId, setProfileId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [storagePath, setStoragePath] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>(getPreferredPreviewMode());
    const [isDesignModeActive, setIsDesignModeActive] = useState(false);

    const handlePreviewModeChange = (mode: 'mobile' | 'desktop') => {
        setPreviewMode(mode);
        setPreferredPreviewMode(mode);
    };

    const uploadDesignRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const frontCardRef = useRef<HTMLDivElement>(null);
    const backCardRef = useRef<HTMLDivElement>(null);
    const autoSaveTimerRef = useRef<number | null>(null);
    const mountedRef = useRef(true);
    const hasPendingChanges = useRef(false);

    const getDimensions = useCallback(() => {
        if (cardType === 'standie') return { width: 400, height: 600 };
        return { width: 525, height: 300 };
    }, [cardType]);

    const { width: CARD_WIDTH, height: CARD_HEIGHT } = getDimensions();

    const generateDefaultQr = useCallback(async (slug: string, color: string = '#d7ba52') => {
        try {
            const profileUrl = `https://www.canopycorp.in/#/p/${slug}`;
            const qr = new QRCodeStyling({
                width: 300, height: 300, data: profileUrl,
                dotsOptions: { color, type: 'rounded' },
                backgroundOptions: { color: 'transparent' },
                cornersSquareOptions: { type: 'extra-rounded', color },
                cornersDotOptions: { type: 'dots', color }
            });
            const buffer = await qr.getRawData('png');
            if (buffer) {
                const blob = new Blob([buffer], { type: 'image/png' });
                return await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) { console.error(e); }
        return null;
    }, []);

    // Regenerate QR with new color (for theme color change)
    const handleRegenerateQr = useCallback(async (color: string) => {
        if (!userProfile?.profile_slug) return;

        const newQrUrl = await generateDefaultQr(userProfile.profile_slug, color);
        if (newQrUrl) {
            // Update QR on current side
            setFrontData(prev => ({
                ...prev,
                images: prev.images.map(img => img.id === 'qr' ? { ...img, url: newQrUrl } : img)
            }));
        }
    }, [userProfile, generateDefaultQr]);

    // Fetch Profile & Load Design
    useEffect(() => {
        mountedRef.current = true;
        const fetchProfileForUser = async (user: User | null) => {
            if (!mountedRef.current) return;
            if (!user) { navigate('/login'); return; }

            const client = getSupabase();
            let { data, error } = await client.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

            if (!mountedRef.current) return;

            // If no profile exists, create one with auto-generated slug
            if (!data) {
                const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'user';
                const sanitizedName = userName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
                const tempSlug = `${sanitizedName}_${Math.random().toString(36).substring(2, 7)}`;
                const storageFolder = `${tempSlug}_${user.id.substring(0, 5)}`;

                const { data: newProfile, error: createError } = await client.from('profiles').insert({
                    user_id: user.id,
                    full_name: user.user_metadata?.full_name || '',
                    profile_slug: tempSlug,
                    card_type: 'business_card',
                    storage_folder_path: storageFolder,
                    theme_color: '#d7ba52',
                    card_color: '#1f1f1f',
                    card_text_color: '#ffffff',
                    background_color: '#000000',
                    font_family: 'Poppins',
                    font_size: 16,
                    card_shape: 'rounded',
                    social_links: {},
                    custom_elements: [],
                    background_settings: { zoom: 1, offsetX: 0, offsetY: 0 }
                }).select().single();

                if (createError || !newProfile) {
                    console.error("Error creating profile:", createError);
                    showToast("Could not initialize profile. Please try again.", "error");
                    return;
                }
                data = newProfile;
            }

            // Now we have a profile (existing or newly created)
            setProfileId(data.id);
            setUserProfile(data);
            setStoragePath(data.storage_folder_path);
            const type = data.card_type === 'standie' ? 'standie' : 'business_card';
            setCardType(type);

            // Always generate QR code using profile_slug (now guaranteed to exist)
            const profileSlug = data.profile_slug;
            const generateAndSetQr = async () => {
                if (!profileSlug) return;

                // Check if we have a custom QR first
                const customQrUrl = localStorage.getItem('customQrCodeUrl');
                if (customQrUrl) {
                    setFrontData(prev => ({
                        ...prev,
                        images: prev.images.map(img => img.id === 'qr' ? { ...img, url: customQrUrl } : img)
                    }));
                    return;
                }

                // Generate default QR from profile slug
                const defaultQrUrl = await generateDefaultQr(profileSlug);
                if (mountedRef.current && defaultQrUrl) {
                    setFrontData(prev => ({
                        ...prev,
                        images: prev.images.map(img => img.id === 'qr' ? { ...img, url: defaultQrUrl } : img)
                    }));
                }
            };

            // Check if design_data has actual content (not just empty object)
            const hasSavedDesign = data.design_data && (data.design_data.front || data.design_data.back);

            if (hasSavedDesign) {
                if (data.design_data.front) setFrontData(data.design_data.front);
                if (data.design_data.back) setBackData(data.design_data.back);
                if (data.design_data.type) setCardType(data.design_data.type);

                // Check if QR code exists in saved design, if not, generate it
                const frontQrImage = data.design_data.front?.images?.find((img: any) => img.id === 'qr');
                if (!frontQrImage?.url) {
                    await generateAndSetQr();
                }
            } else {
                // INITIALIZE DEFAULT IF NO SAVED DESIGN
                if (type === 'standie') {
                    setFrontData(prev => ({
                        ...prev,
                        texts: [
                            { id: 'name', content: data.company || 'Brand Name', x: 50, y: 15, scale: 1.2, color: '#d7ba52', fontWeight: '700', fontFamily: data.font_family || 'Poppins', isLocked: false, fontSize: 36, letterSpacing: 0.05, textAlign: 'center' },
                            { id: 'cta', content: 'SCAN / TAP for Link', x: 50, y: 85, scale: 1, color: '#ffffff', fontWeight: '500', fontFamily: data.font_family || 'Poppins', isLocked: false, fontSize: 24, letterSpacing: 0.05, textAlign: 'center' }
                        ],
                        images: prev.images.map(img => {
                            if (img.id === 'qr') return { ...img, x: 50, y: 50, scale: 4 };
                            if (img.id === 'logo') return { ...img, x: 50, y: 5, scale: 0.5 };
                            return img;
                        })
                    }));
                } else {
                    setFrontData(prev => ({
                        ...prev,
                        texts: prev.texts.map(t => t.id === 'name' ? { ...t, content: data.full_name || 'Your Name', y: 50, fontFamily: data.font_family || 'Poppins' } : t)
                    }));
                }

                // Generate QR code for new users
                await generateAndSetQr();
            }
        };

        const client = getSupabase();
        client.auth.getSession().then(({ data: { session } }) => fetchProfileForUser(session?.user ?? null));
        const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => fetchProfileForUser(session?.user ?? null));
        return () => { mountedRef.current = false; subscription.unsubscribe(); };
    }, [navigate, generateDefaultQr, showToast]);

    // Debounced Auto-Save Logic (Saves 5s after last change)
    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        // Mark that we have pending changes
        hasPendingChanges.current = true;

        autoSaveTimerRef.current = window.setTimeout(async () => {
            if (profileId && mountedRef.current) {
                const client = getSupabase();
                const { error } = await client.from('profiles').update({
                    design_data: { front: frontData, back: backData, type: cardType },
                    updated_at: new Date().toISOString()
                }).eq('id', profileId);

                if (error) {
                    console.error("Auto-save failed:", error);
                } else {
                    console.log("Auto-saved design data");
                    hasPendingChanges.current = false;
                }
            }
        }, 5000);

        return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    }, [profileId, frontData, backData, cardType]);

    // Removed: visibility-based autosave (per minimal architecture - visibility changes trigger nothing)

    const handleReset = useCallback(async () => {
        if (!window.confirm("Are you sure you want to reset the design to default? All changes will be lost.")) return;

        let newFront = { ...initialFrontData };
        let newBack = { ...initialBackData };
        const fontFamily = userProfile?.font_family || 'Poppins';

        if (cardType === 'standie') {
            // Reset to Standie Defaults
            newFront = {
                ...newFront,
                texts: [
                    { id: 'name', content: userProfile?.company || 'Brand Name', x: 50, y: 15, scale: 1.2, color: '#d7ba52', fontWeight: '700', fontFamily: fontFamily, isLocked: false, fontSize: 36, letterSpacing: 0.05, textAlign: 'center' },
                    { id: 'cta', content: 'SCAN / TAP for Link', x: 50, y: 85, scale: 1, color: '#ffffff', fontWeight: '500', fontFamily: fontFamily, isLocked: false, fontSize: 24, letterSpacing: 0.05, textAlign: 'center' }
                ],
                images: newFront.images.map(img => {
                    if (img.id === 'qr') return { ...img, x: 50, y: 50, scale: 4 };
                    if (img.id === 'logo') return { ...img, x: 50, y: 5, scale: 0.5 };
                    return img;
                })
            };
        } else {
            // Reset to Business Card Defaults
            newFront = {
                ...newFront,
                texts: newFront.texts.map(t => t.id === 'name' ? { ...t, content: userProfile?.full_name || 'Your Name', y: 50, fontFamily: fontFamily } : t)
            };
        }

        // Restore QR
        const qrUrl = localStorage.getItem('customQrCodeUrl');
        if (qrUrl) {
            newFront.images = newFront.images.map(img => img.id === 'qr' ? { ...img, url: qrUrl } : img);
        } else if (userProfile?.profile_slug) {
            try {
                const defaultQr = await generateDefaultQr(userProfile.profile_slug);
                if (defaultQr) {
                    newFront.images = newFront.images.map(img => img.id === 'qr' ? { ...img, url: defaultQr } : img);
                }
            } catch (e) { console.error("Error generating QR on reset", e); }
        }

        setFrontData(newFront);
        setBackData(newBack);
        showToast("Design reset to default.", "success");
    }, [cardType, userProfile, generateDefaultQr, showToast]);


    const handleDragStart = (side: 'front' | 'back', type: 'text' | 'image', id: string, e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setSelectedElement({ id, type });

        const cardRect = (side === 'front' ? frontCardRef.current : backCardRef.current)?.getBoundingClientRect();
        if (!cardRect) return;

        const coords = getClientCoords(e);
        const startX = ((coords.x - cardRect.left) / cardRect.width) * 100;
        const startY = ((coords.y - cardRect.top) / cardRect.height) * 100;

        const data = side === 'front' ? frontData : backData;

        // Handle special elements (nfc-icon, branding)
        let itemX: number, itemY: number;
        if (id === 'nfc-icon') {
            itemX = data.nfcIconPosition?.x ?? 92;
            itemY = data.nfcIconPosition?.y ?? 10;
        } else if (id === 'branding') {
            itemX = data.brandingPosition?.x ?? 15;
            itemY = data.brandingPosition?.y ?? 90;
        } else {
            const item = type === 'text' ? data.texts.find(t => t.id === id) : data.images.find(i => i.id === id);
            if (!item) return;
            itemX = item.x;
            itemY = item.y;
        }

        setDraggedItem({
            side,
            type,
            id,
            offsetX: startX - itemX,
            offsetY: startY - itemY,
        });
    };

    const handleDrag = useCallback((e: MouseEvent | TouchEvent) => {
        if (!draggedItem) return;
        if (e.cancelable) e.preventDefault();

        const cardRect = (draggedItem.side === 'front' ? frontCardRef.current : backCardRef.current)?.getBoundingClientRect();
        if (!cardRect) return;

        const coords = getClientCoords(e as any);
        const newX = ((coords.x - cardRect.left) / cardRect.width) * 100 - draggedItem.offsetX;
        const newY = ((coords.y - cardRect.top) / cardRect.height) * 100 - draggedItem.offsetY;

        const setData = draggedItem.side === 'front' ? setFrontData : setBackData;
        setData(prev => {
            // Handle special elements
            if (draggedItem.id === 'nfc-icon') {
                return { ...prev, nfcIconPosition: { x: newX, y: newY } };
            } else if (draggedItem.id === 'branding') {
                return { ...prev, brandingPosition: { x: newX, y: newY } };
            } else if (draggedItem.type === 'text') {
                return { ...prev, texts: prev.texts.map(t => t.id === draggedItem.id ? { ...t, x: newX, y: newY } : t) };
            } else {
                return { ...prev, images: prev.images.map(i => i.id === draggedItem.id ? { ...i, x: newX, y: newY } : i) };
            }
        });
    }, [draggedItem]);

    const handleDragEnd = useCallback(() => setDraggedItem(null), []);

    useEffect(() => {
        if (draggedItem) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDrag, { passive: false });
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDrag);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [draggedItem, handleDrag, handleDragEnd]);

    const handleDownload = useCallback(async (side: 'front' | 'back', format: 'jpeg' | 'png', size: number) => {
        const element = side === 'front' ? frontCardRef.current : backCardRef.current;
        if (!element) { showToast(`Error: ${side} card design not found.`, 'error'); return; }
        try {
            // Use cacheBust: false for faster downloads
            const options = { quality: 0.95, pixelRatio: size, fontEmbedCss: fontsEmbedCss, cacheBust: false, width: CARD_WIDTH, height: CARD_HEIGHT };
            const dataUrl = format === 'jpeg' ? await htmlToImage.toJpeg(element, options) : await htmlToImage.toPng(element, options);
            const link = document.createElement('a');
            link.download = `card-${side}.${format}`;
            link.href = dataUrl;
            link.click();
        } catch (err) { showToast('Failed to download image.', 'error'); }
    }, [showToast, CARD_WIDTH, CARD_HEIGHT]);

    const captureAndUploadImage = async (side: 'front' | 'back', data: CardFaceData, folderPath: string): Promise<string> => {
        const client = getSupabase();
        if (data.fullDesignUrl) {
            try {
                const blob = dataURLtoBlob(data.fullDesignUrl);
                if (!blob) throw new Error("Failed to process uploaded design.");

                const filePath = `${folderPath}/${side}_card.png`;
                const { error } = await client.storage.from(BUCKET_CARD_IMAGES).upload(filePath, blob, { upsert: true, cacheControl: '0' });
                if (error) throw error;

                const { data: { publicUrl } } = client.storage.from(BUCKET_CARD_IMAGES).getPublicUrl(filePath);
                return publicUrl;
            } catch (e: any) {
                console.error(`Error processing direct upload for ${side}:`, e);
            }
        }

        const element = side === 'front' ? frontCardRef.current : backCardRef.current;
        if (!element) throw new Error(`${side} card ref not found.`);

        // Wrap htmlToImage in a timeout promise to prevent indefinite hanging
        const dataUrl = await Promise.race([
            htmlToImage.toPng(element, {
                fontEmbedCss: fontsEmbedCss,
                pixelRatio: 6, // Increased to 6 for ~600 DPI quality
                cacheBust: false,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                backgroundColor: null
            }),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Image generation timed out")), 30000)) // Extended timeout
        ]);

        const blob = dataURLtoBlob(dataUrl);
        if (!blob) throw new Error("Image generation failed (Blob conversion).");

        const filePath = `${folderPath}/${side}_card.png`;
        const { error } = await client.storage.from(BUCKET_CARD_IMAGES).upload(filePath, blob, { upsert: true, cacheControl: '0' });

        if (error) throw error;

        const { data: { publicUrl } } = client.storage.from(BUCKET_CARD_IMAGES).getPublicUrl(filePath);
        return publicUrl;
    };

    // ===== WATCHDOG TIMER: Guaranteed escape hatch for stuck states =====
    const saveStartTimeRef = useRef<number | null>(null);
    useEffect(() => {
        if (isSaving) {
            if (!saveStartTimeRef.current) {
                saveStartTimeRef.current = Date.now();
            }
            const watchdog = setInterval(() => {
                if (saveStartTimeRef.current && (Date.now() - saveStartTimeRef.current > 10000)) {
                    console.warn("Watchdog: Forcing isSaving reset after 10s timeout");
                    setIsSaving(false);
                    setSaveStatus('');
                    saveStartTimeRef.current = null;
                }
            }, 2000);
            return () => clearInterval(watchdog);
        } else {
            saveStartTimeRef.current = null;
        }
    }, [isSaving]);

    // ===== SIMPLIFIED SAVE: Only saves JSON data (fast & reliable) =====
    const handleSaveAndPrint = useCallback(async (sideToSave?: 'front' | 'back') => {
        if (isSaving) return;

        // Clear selection BEFORE saving to prevent golden highlight from being captured
        setSelectedElement(null);

        // Small delay to ensure UI updates before capture
        await new Promise(resolve => setTimeout(resolve, 50));

        setIsSaving(true);
        setSaveStatus('Saving design...');

        try {
            const client = getSupabase();
            const { data: { user } } = await client.auth.getUser();
            if (!user) throw new Error("Please log in to save.");

            let currentProfileId = profileId;
            let currentFolder = storagePath;

            if (!currentProfileId) {
                const { data: existing } = await client.from('profiles').select('id, storage_folder_path').eq('user_id', user.id).maybeSingle();
                if (existing) {
                    currentProfileId = existing.id;
                    currentFolder = existing.storage_folder_path;
                } else {
                    const tempSlug = `card_${Math.random().toString(36).substr(2, 5)}`;
                    const { data: newProfile, error } = await client.from('profiles').insert({
                        user_id: user.id,
                        full_name: user.user_metadata?.full_name || 'User',
                        profile_slug: tempSlug,
                        card_type: cardType,
                        storage_folder_path: `${tempSlug}_${user.id.substring(0, 5)}`
                    }).select().single();

                    if (error || !newProfile) throw new Error("Could not initialize profile.");
                    currentProfileId = newProfile.id;
                    currentFolder = newProfile.storage_folder_path;
                }
            }

            if (!currentFolder) throw new Error("Storage folder path is missing.");

            // Save JSON data only (instant, no html-to-image dependency)
            const { error: saveError } = await client.from('profiles').update({
                card_type: cardType,
                design_data: { front: frontData, back: backData, type: cardType },
                updated_at: new Date().toISOString()
            }).eq('id', currentProfileId);

            if (saveError) throw saveError;

            // Update status (kept true)
            setSaveStatus("Generating print-ready images...");

            // ===== PHASE 2: SEQUENTIAL IMAGE GENERATION (AWAITED) =====
            const imageUpdates: any = {};

            // Track image generation errors
            const genErrors: any[] = [];

            // Generate images sequentially with reduced quality for speed
            // Force await here to ensure images are ready before routing
            if (!sideToSave || sideToSave === 'front') {
                if (!sideToSave) setSaveStatus("Generating Front Side...");
                try {
                    const frontUrl = await captureAndUploadImage('front', frontData, currentFolder);
                    imageUpdates.front_side = frontUrl;
                } catch (e) {
                    console.error("Front side save failed", e);
                    genErrors.push(e);
                }
            }

            if (!sideToSave || sideToSave === 'back') {
                if (!sideToSave) setSaveStatus("Generating Back Side...");
                await new Promise(r => setTimeout(r, 500)); // Brief pause to unblock UI
                try {
                    const backUrl = await captureAndUploadImage('back', backData, currentFolder);
                    imageUpdates.back_side = backUrl;
                } catch (e) {
                    console.error("Back side save failed", e);
                    genErrors.push(e);
                }
            }

            if (Object.keys(imageUpdates).length > 0) {
                const client = getSupabase();
                const { error: imgUpdateError } = await client.from('profiles').update(imageUpdates).eq('id', currentProfileId);
                if (imgUpdateError) throw imgUpdateError;
            } else if (genErrors.length > 0 && (!sideToSave || (sideToSave && genErrors.length === 1))) {
                // If we tried to save images and ALL failed, throw error
                // Condition: If sideToSave is specified, 1 error is total failure.
                // If sideToSave is undefined (both), 2 errors is total failure. 
                // But actually, if we have NO imageUpdates and we had errors, it's a failure.
                throw new Error(`Image generation failed: ${(genErrors[0] as Error).message}`);
            }

            if (mountedRef.current) {
                setIsSaving(false);
                setSaveStatus('');
                if (genErrors.length > 0) {
                    showToast("Saved with warnings: One or more images failed to generate.", 'error');
                } else {
                    showToast("Design and images saved successfully!", 'success');
                }

                // Navigate immediately if saving "All" (Save & Continue)
                if (!sideToSave && currentProfileId) {
                    navigate(`/profile/${currentProfileId}/edit`);
                }
            }

        } catch (err: any) {
            console.error("Save error:", err);
            showToast(`Save failed: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
            setSaveStatus('');
        }
    }, [showToast, cardType, frontData, backData, profileId, storagePath, isSaving]);

    const activeData = activeSide === 'front' ? frontData : backData;
    const setActiveData = activeSide === 'front' ? setFrontData : setBackData;

    const handleDeselect = (e: React.MouseEvent | React.TouchEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedElement(null);
        }
    };

    const containerClasses = cardType === 'standie'
        ? `${previewMode === 'mobile' ? 'w-[95%] max-w-[320px]' : 'w-[80%] md:w-auto'} h-auto md:h-[85vh] aspect-[2/3] shadow-2xl transition-all duration-300`
        : `${previewMode === 'mobile' ? 'w-[95%] max-w-[400px]' : 'w-[90%] md:w-[45%]'} aspect-[1.75/1] shadow-2xl transition-all duration-300`;

    return (
        <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] bg-zinc-950 text-white flex flex-col overflow-hidden">
            <div className="flex-shrink-0 z-50 bg-black border-b border-zinc-800">
                <ControlPanel
                    activeCardData={activeData}
                    setCardData={setActiveData}
                    activeSide={activeSide}
                    setActiveSide={setActiveSide}
                    onDownload={handleDownload}
                    selectedElement={selectedElement}
                    onDeselect={() => setSelectedElement(null)}
                    onSave={handleSaveAndPrint}
                    isSaving={isSaving}
                    saveStatus={saveStatus}
                    cardType={cardType}
                    setCardType={setCardType}
                    onReset={handleReset}
                    onTriggerUpload={() => uploadDesignRef.current?.click()}
                    isDesignModeActive={isDesignModeActive}
                    onRegenerateQr={handleRegenerateQr}
                />
            </div>

            {/* AI Generator Modal */}
            <AiGeneratorModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                onApply={(data, side) => {
                    const setData = side === 'front' ? setFrontData : setBackData;
                    setData(prev => ({
                        ...prev,
                        ...data,
                        images: [
                            // Preserve QR code if exists in current design but not in AI design (though AI design should have it)
                            ...(prev.images.filter(img => img.id === 'qr' && !data.images.some(d => d.id === 'qr'))),
                            ...data.images
                        ]
                    }));
                    showToast(`AI Design applied to ${side} side!`, 'success');
                }}
                userProfile={userProfile}
                side={activeSide}
            />

            <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col items-center justify-start p-1 md:p-4 bg-zinc-900/50 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent" onMouseDown={handleDeselect} onTouchStart={handleDeselect}>
                <div className="absolute top-2 left-2 right-2 z-20 flex justify-between items-start pointer-events-none">
                    <div>
                        <h1 className="text-lg font-bold text-white drop-shadow-md">{activeSide === 'front' ? 'Front Side' : 'Back Side'}</h1>
                        <p className="text-xs text-zinc-400">Step 1: Design your card</p>
                    </div>
                    <div className="pointer-events-auto flex flex-col items-end gap-1">
                        <PreviewModeToggle
                            mode={previewMode}
                            onChange={handlePreviewModeChange}
                            className="mb-1"
                        />
                        <span className="text-[10px] text-zinc-300 font-medium bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm animate-pulse">Autosave enabled (5s)</span>
                        {/* Hidden Input for Upload Design */}
                        <input type="file" accept="image/*" className="hidden" ref={uploadDesignRef} onChange={(e) => {
                            if (e.target.files?.[0]) {
                                const reader = new FileReader();
                                reader.onloadend = () => setActiveData(prev => ({ ...prev, fullDesignUrl: reader.result as string }));
                                reader.readAsDataURL(e.target.files[0]);
                            }
                        }} />
                    </div>
                </div>

                <div className="w-full min-h-full flex flex-col items-center relative pt-32 pb-12">
                    <div className={`w-full flex-1 flex flex-col items-center transition-opacity duration-300 ${activeSide === 'front' ? 'relative z-10 opacity-100' : 'absolute inset-0 z-0 opacity-0 pointer-events-none'}`}>
                        <div className={`${containerClasses} flex items-center justify-center my-auto`}>
                            <BusinessCard
                                ref={frontCardRef}
                                data={frontData}
                                isActive={activeSide === 'front'}
                                side="Front"
                                onDragStart={(type, id, e) => handleDragStart('front', type, id, e)}
                                width={CARD_WIDTH}
                                height={CARD_HEIGHT}
                                selectedElementId={isDesignModeActive ? (selectedElement?.id || null) : null}
                                onSelect={(type, id) => isDesignModeActive && setSelectedElement({ type, id })}
                                isDesignModeActive={isDesignModeActive}
                            />
                        </div>
                    </div>
                    <div className={`w-full flex-1 flex flex-col items-center transition-opacity duration-300 ${activeSide === 'back' ? 'relative z-10 opacity-100' : 'absolute inset-0 z-0 opacity-0 pointer-events-none'}`}>
                        <div className={`${containerClasses} flex items-center justify-center my-auto`}>
                            <BusinessCard
                                ref={backCardRef}
                                data={backData}
                                isActive={activeSide === 'back'}
                                side="Back"
                                onDragStart={(type, id, e) => handleDragStart('back', type, id, e)}
                                width={CARD_WIDTH}
                                height={CARD_HEIGHT}
                                selectedElementId={isDesignModeActive ? (selectedElement?.id || null) : null}
                                onSelect={(type, id) => isDesignModeActive && setSelectedElement({ type, id })}
                                isDesignModeActive={isDesignModeActive}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Edit Bar */}
            <BottomEditBar
                onDesignYourOwn={() => setIsDesignModeActive(!isDesignModeActive)}
                onAiGenerate={() => setAiModalOpen(true)}
                isDesignModeActive={isDesignModeActive}
            />
        </div>
    );
};

export default CardDesignerPage;


import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import BusinessCard from './components/components_BusinessCard';
import ControlPanel from './components/components_ControlPanel';
import type { CardFaceData, ImageElement, TextElement } from '../types';
import { supabase } from '../lib/supabase';
import { BUCKET_CARD_IMAGES } from '../constants';
import { useToast } from '../context/ToastContext';

declare const QRCodeStyling: any;

const initialFrontData: CardFaceData = {
  texts: [
    { id: 'name', content: 'Your Name', x: 50, y: 50, scale: 1, color: '#d7ba52', fontWeight: '700', fontFamily: 'Poppins', isLocked: false, fontSize: 36, letterSpacing: 0.05, textAlign: 'center' },
  ],
  images: [
    { id: 'logo', url: null, x: 50, y: 65, scale: 1, width: 112, height: 112 },
    { id: 'qr', url: null, x: 10, y: 85, scale: 1, width: 64, height: 64 },
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

  const uploadDesignRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const getDimensions = useCallback(() => {
     if (cardType === 'standie') return { width: 400, height: 600 }; 
     return { width: 525, height: 300 }; 
  }, [cardType]);

  const { width: CARD_WIDTH, height: CARD_HEIGHT } = getDimensions();

  const generateDefaultQr = useCallback(async (slug: string) => {
    try {
        const profileUrl = `https://www.canopycorp.in/#/p/${slug}`;
        const qr = new QRCodeStyling({
            width: 300, height: 300, data: profileUrl,
            dotsOptions: { color: '#d7ba52', type: 'rounded' },
            backgroundOptions: { color: '#000000' },
            cornersSquareOptions: { type: 'extra-rounded', color: '#d7ba52' },
            cornersDotOptions: { type: 'dots', color: '#d7ba52' }
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

  // Fetch Profile & Load Design
  useEffect(() => {
    mountedRef.current = true;
    const fetchProfileForUser = async (user: User | null) => {
      if (!mountedRef.current) return;
      if (!user) { navigate('/login'); return; }

      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      
      if (!mountedRef.current) return;

      if (data) {
        setProfileId(data.id);
        setUserProfile(data);
        setStoragePath(data.storage_folder_path);
        const type = data.card_type === 'standie' ? 'standie' : 'business_card';
        setCardType(type);

        if (data.design_data) {
            if (data.design_data.front) setFrontData(data.design_data.front);
            if (data.design_data.back) setBackData(data.design_data.back);
            if (data.design_data.type) setCardType(data.design_data.type);
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

            const qrUrl = localStorage.getItem('customQrCodeUrl');
            if (qrUrl) {
                setFrontData(prev => ({ 
                    ...prev, 
                    images: prev.images.map(img => img.id === 'qr' ? { ...img, url: qrUrl } : img)
                }));
            } else if (data.profile_slug) {
                generateDefaultQr(data.profile_slug).then(defaultQrUrl => {
                if (mountedRef.current && defaultQrUrl) {
                    setFrontData(prev => ({ 
                        ...prev, 
                        images: prev.images.map(img => img.id === 'qr' ? { ...img, url: defaultQrUrl } : img)
                    }));
                }
                });
            }
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => fetchProfileForUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => fetchProfileForUser(session?.user ?? null));
    return () => { mountedRef.current = false; subscription.unsubscribe(); };
  }, [navigate, generateDefaultQr]);

  // Debounced Auto-Save Logic (Saves 5s after last change)
  useEffect(() => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      
      autoSaveTimerRef.current = window.setTimeout(async () => {
          if (profileId && mountedRef.current) {
              await supabase.from('profiles').update({
                  design_data: { front: frontData, back: backData, type: cardType },
                  updated_at: new Date().toISOString()
              }).eq('id', profileId);
              console.log("Auto-saved design data");
          }
      }, 5000);

      return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [profileId, frontData, backData, cardType]);

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
          } catch(e) { console.error("Error generating QR on reset", e); }
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
    const item = type === 'text' ? data.texts.find(t => t.id === id) : data.images.find(i => i.id === id);
    if (!item) return;

    setDraggedItem({
      side,
      type,
      id,
      offsetX: startX - item.x,
      offsetY: startY - item.y,
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
      if (draggedItem.type === 'text') {
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
      if (data.fullDesignUrl) {
          try {
              const blob = dataURLtoBlob(data.fullDesignUrl);
              if (!blob) throw new Error("Failed to process uploaded design.");
              
              const filePath = `${folderPath}/${side}_card.png`;
              const { error } = await supabase.storage.from(BUCKET_CARD_IMAGES).upload(filePath, blob, { upsert: true, cacheControl: '0' });
              if (error) throw error;
              
              const { data: { publicUrl } } = supabase.storage.from(BUCKET_CARD_IMAGES).getPublicUrl(filePath);
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
            pixelRatio: 2, 
            cacheBust: false, 
            width: CARD_WIDTH, 
            height: CARD_HEIGHT,
            backgroundColor: null
          }),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Image generation timed out")), 10000))
      ]);
      
      const blob = dataURLtoBlob(dataUrl);
      if (!blob) throw new Error("Image generation failed (Blob conversion).");
      
      const filePath = `${folderPath}/${side}_card.png`;
      const { error } = await supabase.storage.from(BUCKET_CARD_IMAGES).upload(filePath, blob, { upsert: true, cacheControl: '0' });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_CARD_IMAGES).getPublicUrl(filePath);
      return publicUrl;
  };

  const handleSaveAndPrint = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('Preparing...');
    
    // Safety timeout in case Promise.race inside calls fails or logic hangs
    const safetyTimeout = setTimeout(() => {
        if (mountedRef.current) {
            setIsSaving(false);
            setSaveStatus('');
            showToast("Save took too long and was reset. Please check if your changes were saved.", 'info');
        }
    }, 25000);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Login required.");
        }

        let currentProfileId = profileId;
        let currentFolder = storagePath;

        if (!currentProfileId) {
             const { data: existing } = await supabase.from('profiles').select('id, storage_folder_path').eq('user_id', user.id).maybeSingle();
             if (existing) {
                 currentProfileId = existing.id;
                 currentFolder = existing.storage_folder_path;
             } else {
                const tempSlug = `card_${Math.random().toString(36).substr(2, 5)}`;
                const { data: newProfile, error } = await supabase.from('profiles').insert({ 
                    user_id: user.id, 
                    full_name: user.user_metadata?.full_name || 'User', 
                    profile_slug: tempSlug, 
                    card_type: cardType, 
                    storage_folder_path: `${tempSlug}_${user.id.substring(0,5)}` 
                }).select().single();
                
                if (error || !newProfile) throw new Error("Could not initialize profile.");
                currentProfileId = newProfile.id;
                currentFolder = newProfile.storage_folder_path;
             }
        }

        if (!currentFolder) {
            throw new Error("Storage folder path is missing.");
        }

        setSaveStatus('Generating Images...');

        // Use Promise.all to generate images with the internal timeout logic from captureAndUploadImage
        const [frontUrl, backUrl] = await Promise.all([
            captureAndUploadImage('front', frontData, currentFolder),
            captureAndUploadImage('back', backData, currentFolder)
        ]);

        setSaveStatus('Saving Profile...');

        await supabase.from('profiles').update({ 
            front_side: frontUrl, 
            back_side: backUrl, 
            card_type: cardType, 
            design_data: { front: frontData, back: backData, type: cardType },
            updated_at: new Date().toISOString() 
        }).eq('id', currentProfileId);
        
        clearTimeout(safetyTimeout);
        if (mountedRef.current) {
            showToast("Design saved successfully!", 'success');
            navigate(`/profile/${currentProfileId}/edit`);
        }

    } catch (err: any) { 
        clearTimeout(safetyTimeout);
        console.error(err);
        if (mountedRef.current) {
            showToast(`${err.message}`, 'error');
        } 
    } finally { 
        if (mountedRef.current) {
            setIsSaving(false);
            setSaveStatus('');
        }
    }
  }, [navigate, showToast, cardType, frontData, backData, profileId, storagePath, isSaving]);

  const activeData = activeSide === 'front' ? frontData : backData;
  const setActiveData = activeSide === 'front' ? setFrontData : setBackData;

  const handleDeselect = (e: React.MouseEvent | React.TouchEvent) => {
      if (e.target === e.currentTarget) {
          setSelectedElement(null);
      }
  };

  const containerClasses = cardType === 'standie' 
    ? 'w-[80%] md:w-auto h-auto md:h-[85vh] aspect-[2/3] shadow-2xl transition-all duration-300' 
    : 'w-[90%] md:w-[45%] aspect-[1.75/1] shadow-2xl transition-all duration-300';

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
            />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col items-center justify-start p-1 md:p-4 bg-zinc-900/50 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent" onMouseDown={handleDeselect} onTouchStart={handleDeselect}>
             <div className="absolute top-2 left-2 right-2 z-20 flex justify-between items-start pointer-events-none">
                <div>
                    <h1 className="text-lg font-bold text-white drop-shadow-md">{activeSide === 'front' ? 'Front Side' : 'Back Side'}</h1>
                    <p className="text-xs text-zinc-400">Step 1: Design your card</p>
                </div>
                <div className="pointer-events-auto flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-300 font-medium bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm animate-pulse">Autosave enabled (5s)</span>
                    <input type="file" accept="image/*" className="hidden" ref={uploadDesignRef} onChange={(e) => {
                        if(e.target.files?.[0]) {
                            const reader = new FileReader();
                            reader.onloadend = () => setActiveData(prev => ({ ...prev, fullDesignUrl: reader.result as string }));
                            reader.readAsDataURL(e.target.files[0]);
                        }
                    }}/>
                    <button onClick={() => uploadDesignRef.current?.click()} className="flex items-center gap-2 bg-gold text-black px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-gold-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Upload Design
                    </button>
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
                            selectedElementId={selectedElement?.id || null} 
                            onSelect={(type, id) => setSelectedElement({type, id})} 
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
                            selectedElementId={selectedElement?.id || null} 
                            onSelect={(type, id) => setSelectedElement({type, id})} 
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CardDesignerPage;


import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Profile, ProfileUpdate, ProfileInsert, CustomButtonElement, ButtonStyle, BackgroundSettings } from '../types';
import { BUCKET_BACKGROUND_PHOTOS, BUCKET_PROFILE_PHOTOS, BUCKET_CARD_IMAGES, FONTS, SHAPES, SOCIAL_ICONS } from '../constants';
import { useToast } from '../context/ToastContext';
import { useProfile } from '../context/ProfileContext';
import PublicProfile from './PublicProfile';
import PreviewModeToggle from './PreviewModeToggle';
import { getPreferredPreviewMode, setPreferredPreviewMode } from '../utils/deviceDetection';

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 9);

const INITIAL_STATE: Partial<Profile> = {
    full_name: '',
    profile_slug: '',
    company: '',
    bio: '',
    phone: '',
    email: '',
    website: 'https://www.canopycorp.in',
    delivery_address_url: '',
    storage_folder_path: null,
    custom_button_text: '', // Main CTA text
    custom_button_url: '', // Main CTA URL (for Standies)
    custom_button_style: { // Default Main Button Style
        backgroundColor: '#d7ba52',
        textColor: '#ffffff',
        shape: 'rounded-lg',
        shadow: true,
        border: false
    },
    social_links: {}, // Legacy
    custom_elements: [], // All elements
    profile_photo_url: null,
    background_photo_url: 'https://jotjgsgadnwosofaonso.supabase.co/storage/v1/object/public/background_photos/templates/NFC_standing_cover.png',
    background_settings: { zoom: 1, offsetX: 50, offsetY: 50 },
    theme_color: '#d7ba52',
    card_color: '#000000',
    card_text_color: '#ffffff',
    background_color: '#09090b',
    font_family: 'Poppins',
    font_size: 16,
    card_shape: 'rounded-lg',
    card_type: 'business_card',
};

const TAB_ICONS = {
    DETAILS: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    LINKS: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    ),
    APPEARANCE: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    )
};

const SOCIAL_PRESETS = [
    { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
    { key: 'linkedin', label: 'LinkedIn', color: '#0077B5' },
    { key: 'instagram', label: 'Instagram', color: '#E1306C' },
    { key: 'facebook', label: 'Facebook', color: '#1877F2' },
    { key: 'twitter', label: 'X (Twitter)', color: '#000000' },
    { key: 'youtube', label: 'YouTube', color: '#FF0000' },
    { key: 'github', label: 'GitHub', color: '#333333' },
    { key: 'maps', label: 'Google Maps', color: '#34A853' },
    { key: 'website', label: 'Website', color: '#d7ba52' },
    { key: 'custom', label: 'Custom', color: '#888888' },
];

const ProfileEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { profile, refreshProfile } = useProfile();

    const [formData, setFormData] = useState<Partial<Profile>>(INITIAL_STATE);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'LINKS' | 'APPEARANCE' | null>('DETAILS');
    const [showSocialDropdown, setShowSocialDropdown] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);

    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [bgPhoto, setBgPhoto] = useState<File | null>(null);
    const [backgroundTemplates, setBackgroundTemplates] = useState<{ name: string; url: string; }[]>([]);
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>(getPreferredPreviewMode());

    const debounceTimeout = useRef<number | null>(null);
    const isSavingRef = useRef(false);
    const hasMounted = useRef(false);
    const mountedRef = useRef(true);

    // Handle preview mode changes
    const handlePreviewModeChange = (mode: 'mobile' | 'desktop') => {
        setPreviewMode(mode);
        setPreferredPreviewMode(mode);
    };

    useEffect(() => {
        mountedRef.current = true;
        const fetchBackgroundTemplates = async () => {
            const { data: files } = await supabase.storage.from(BUCKET_BACKGROUND_PHOTOS).list('templates');
            if (files && mountedRef.current) {
                const templates = files
                    .filter(file => file.name !== '.emptyFolderPlaceholder')
                    .map(file => {
                        const { data: { publicUrl } } = supabase.storage.from(BUCKET_BACKGROUND_PHOTOS).getPublicUrl(`templates/${file.name}`);
                        const displayName = file.name.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return { name: displayName, url: publicUrl };
                    });
                setBackgroundTemplates(templates);
            }
        };
        fetchBackgroundTemplates();
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        // If we are editing and have profile data from context, use it to initialize form
        if (id && profile && profile.id === id) {
            initializeForm(profile);
        } else if (id) {
            // If context doesn't have it (e.g. direct link or stale), fetch specific
            const fetchSpecific = async () => {
                const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
                if (data && mountedRef.current) initializeForm(data);
            };
            fetchSpecific();
        } else {
            // New profile
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user && mountedRef.current) {
                    setFormData(prev => ({
                        ...prev,
                        full_name: user.user_metadata?.full_name || prev.full_name,
                        phone: user.user_metadata?.phone || prev.phone,
                        email: user.email || prev.email
                    }));
                }
            });
        }
    }, [id, profile]);

    const initializeForm = (data: Profile) => {
        let customElements: CustomButtonElement[] = data.custom_elements || [];
        if (customElements.length === 0 && data.social_links) {
            const sl = data.social_links;
            const newElements: CustomButtonElement[] = [];
            if (sl.website) newElements.push(createButton('website', 'Website', sl.website));
            if (sl.whatsapp) newElements.push(createButton('whatsapp', 'WhatsApp', `https://wa.me/${sl.whatsapp}`));
            if (sl.linkedin) newElements.push(createButton('linkedin', 'LinkedIn', sl.linkedin));
            if (sl.instagram) newElements.push(createButton('instagram', 'Instagram', `https://instagram.com/${sl.instagram}`));
            customElements = newElements;
        }

        setFormData({
            ...INITIAL_STATE,
            ...data,
            custom_button_style: data.custom_button_style || INITIAL_STATE.custom_button_style,
            custom_elements: customElements,
            background_settings: data.background_settings || INITIAL_STATE.background_settings,
        });
    };

    const createButton = (subtype: string, label: string, url: string): CustomButtonElement => {
        const preset = SOCIAL_PRESETS.find(p => p.key === subtype);
        const isSocial = subtype !== 'link';

        return {
            id: uuid(),
            type: isSocial ? 'social' : 'link',
            subtype: subtype === 'link' ? undefined : subtype,
            label: label || (preset?.label || 'Link'),
            url: url || '',
            style: {
                backgroundColor: preset ? preset.color : '#333333',
                textColor: '#ffffff',
                shape: 'rounded-lg',
                shadow: true,
                border: false
            },
            isActive: true
        };
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const updateMainButtonStyle = (field: keyof ButtonStyle, value: any) => {
        setFormData(prev => ({
            ...prev,
            custom_button_style: {
                ...prev.custom_button_style!,
                [field]: value
            }
        }));
    };

    const updateBackgroundSettings = (field: keyof BackgroundSettings, value: number) => {
        setFormData(prev => ({
            ...prev,
            background_settings: {
                ...(prev.background_settings || { zoom: 1, offsetX: 50, offsetY: 50 }),
                [field]: value
            }
        }));
    };

    const addActionButton = () => {
        const newBtn = createButton('link', 'New Button', '');
        setFormData(prev => ({
            ...prev,
            custom_elements: [...(prev.custom_elements || []), newBtn]
        }));
        setEditingId(newBtn.id);
    };

    const addSocialLink = (subtype: string) => {
        const preset = SOCIAL_PRESETS.find(p => p.key === subtype);
        if (!preset) return;
        const newBtn = createButton(subtype, preset.label, '');
        setFormData(prev => ({
            ...prev,
            custom_elements: [...(prev.custom_elements || []), newBtn]
        }));
        setEditingId(newBtn.id);
        setShowSocialDropdown(false);
    };

    const updateElement = (id: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            custom_elements: prev.custom_elements?.map(btn => {
                if (btn.id !== id) return btn;
                if (field.includes('.')) {
                    const [parent, child] = field.split('.');
                    return { ...btn, [parent]: { ...(btn as any)[parent], [child]: value } };
                }
                return { ...btn, [field]: value };
            })
        }));
    };

    const deleteElement = (id: string) => {
        setFormData(prev => ({
            ...prev,
            custom_elements: prev.custom_elements?.filter(b => b.id !== id)
        }));
        if (editingId === id) setEditingId(null);
    };

    const moveElement = (id: string, direction: -1 | 1) => {
        const elements = [...(formData.custom_elements || [])];
        const index = elements.findIndex(e => e.id === id);
        if (index === -1) return;

        const element = elements[index];
        let targetIndex = -1;

        if (direction === -1) {
            for (let i = index - 1; i >= 0; i--) {
                if (elements[i].type === element.type) {
                    targetIndex = i;
                    break;
                }
            }
        } else {
            for (let i = index + 1; i < elements.length; i++) {
                if (elements[i].type === element.type) {
                    targetIndex = i;
                    break;
                }
            }
        }

        if (targetIndex !== -1) {
            elements[index] = elements[targetIndex];
            elements[targetIndex] = element;
            setFormData(prev => ({ ...prev, custom_elements: elements }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'bg' | 'custom_icon', elementId?: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);

            if (type === 'profile') {
                setProfilePhoto(file);
                setFormData(prev => ({ ...prev, profile_photo_url: previewUrl }));
            } else if (type === 'bg') {
                setBgPhoto(file);
                setFormData(prev => ({ ...prev, background_photo_url: previewUrl }));
            } else if (type === 'custom_icon' && elementId) {
                const uploadIcon = async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const path = `icons/${uuid()}_${file.name}`;
                    await supabase.storage.from(BUCKET_CARD_IMAGES).upload(path, file);
                    const { data: { publicUrl } } = supabase.storage.from(BUCKET_CARD_IMAGES).getPublicUrl(path);
                    updateElement(elementId, 'iconUrl', publicUrl);
                };
                uploadIcon();
            }
        }
    };

    const uploadFile = async (file: File, bucket: string, folderPath: string, baseFileName: string) => {
        const fileExt = file.name.split('.').pop();
        const filePath = `${folderPath}/${baseFileName}_${Date.now()}.${fileExt}`;
        await supabase.storage.from(bucket).upload(filePath, file);
        return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
    };

    const saveStateRef = useRef<'IDLE' | 'SAVING' | 'PENDING_SAVE'>('IDLE');

    const handleSubmit = useCallback(async (isAutosave = false) => {
        // If already saving, queue a pending save (coalescing multiple autosaves into one retry)
        if (saveStateRef.current === 'SAVING') {
            saveStateRef.current = 'PENDING_SAVE';
            return;
        }

        saveStateRef.current = 'SAVING';
        if (!isAutosave) setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            let folderPath = formData.storage_folder_path;
            if (!folderPath) {
                const baseName = (formData.full_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '_');
                folderPath = `${baseName}_${user.id.substring(0, 5)}`;
            }

            const updates: any = {};
            if (profilePhoto) updates.profile_photo_url = await uploadFile(profilePhoto, BUCKET_PROFILE_PHOTOS, folderPath, 'pfp');
            if (bgPhoto) updates.background_photo_url = await uploadFile(bgPhoto, BUCKET_BACKGROUND_PHOTOS, folderPath, 'bg');

            const finalData = { ...formData, ...updates };

            if (mountedRef.current) {
                setFormData(prev => ({ ...prev, ...updates, storage_folder_path: folderPath }));
            }

            if (!finalData.profile_slug) {
                const base = (finalData.full_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
                finalData.profile_slug = `${base}_${uuid().substring(0, 5)}`;
            }

            const payload = { ...finalData, storage_folder_path: folderPath, updated_at: new Date().toISOString() };

            if (id) {
                await supabase.from('profiles').update(payload as ProfileUpdate).eq('id', id);
            } else {
                const { data } = await supabase.from('profiles').insert({ ...payload, user_id: user.id } as ProfileInsert).select().single();
                if (data && mountedRef.current) navigate(`/profile/${data.id}/edit`, { replace: true });
            }

            if (profilePhoto && mountedRef.current) setProfilePhoto(null);
            if (bgPhoto && mountedRef.current) setBgPhoto(null);

            if (mountedRef.current) {
                if (!isAutosave) showToast('Saved Successfully!', 'success');
                refreshProfile();
            }

        } catch (err: any) {
            console.error(err);
            if (!isAutosave && mountedRef.current) showToast(err.message || "Failed to save profile.", 'error');
        } finally {
            if (mountedRef.current) setLoading(false);

            // If a save was requested while we were saving, trigger it now
            if ((saveStateRef.current as string) === 'PENDING_SAVE') {
                saveStateRef.current = 'IDLE';
                handleSubmit(true);
            } else {
                saveStateRef.current = 'IDLE';
            }
        }
    }, [formData, profilePhoto, bgPhoto, id, navigate, showToast, refreshProfile]);

    useEffect(() => {
        if (hasMounted.current && id) {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = window.setTimeout(() => handleSubmit(true), 3000);
        } else hasMounted.current = true;
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
    }, [formData, handleSubmit, id]);

    const IconButton = ({ icon, label, isActive, onClick }: any) => (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors ${isActive ? 'bg-zinc-800 text-gold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
        >
            {icon}
            <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
        </button>
    );

    const PanelHeader = ({ title, onClose }: any) => (
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
            <h3 className="text-sm font-bold text-gold uppercase tracking-wider">{title}</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white bg-zinc-800 rounded px-2 py-1 text-xs">Close</button>
        </div>
    );

    const inputClass = "w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus:border-gold outline-none placeholder-zinc-500";
    const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

    const actionButtons = formData.custom_elements?.filter(e => e.type === 'link') || [];
    const socialButtons = formData.custom_elements?.filter(e => e.type === 'social') || [];

    return (
        <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col bg-zinc-950 overflow-hidden relative">
            <div className="w-full flex-shrink-0 flex flex-col z-30 bg-zinc-900 border-b border-zinc-800 relative shadow-xl">

                {/* Top Toolbar */}
                <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Edit Profile</span>
                        <span className="hidden sm:inline text-xs text-zinc-500">Preview: Links are fully interactive - click to test!</span>
                    </div>
                    <div className="flex gap-2 items-center">
                        <PreviewModeToggle
                            mode={previewMode}
                            onChange={handlePreviewModeChange}
                            className=""
                        />
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={loading}
                            className="bg-gold text-black px-4 py-1.5 rounded-md text-[10px] font-bold hover:bg-gold-600 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>

                {/* Bottom Toolbar Row: Tabs */}
                <div className="flex gap-2 px-2 py-2 overflow-x-auto justify-start">
                    <IconButton icon={TAB_ICONS.DETAILS} label="Details" isActive={activeTab === 'DETAILS'} onClick={() => setActiveTab(activeTab === 'DETAILS' ? null : 'DETAILS')} />
                    <IconButton icon={TAB_ICONS.LINKS} label="Buttons & Links" isActive={activeTab === 'LINKS'} onClick={() => setActiveTab(activeTab === 'LINKS' ? null : 'LINKS')} />
                    <IconButton icon={TAB_ICONS.APPEARANCE} label="Cover & Style" isActive={activeTab === 'APPEARANCE'} onClick={() => setActiveTab(activeTab === 'APPEARANCE' ? null : 'APPEARANCE')} />
                </div>

                {/* Content Panel */}
                <div className={`flex-1 bg-zinc-900/85 backdrop-blur-md overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent ${activeTab ? 'block' : 'hidden'} absolute top-full left-0 w-full max-h-[45vh] border-b border-zinc-800 shadow-2xl z-50`}>
                    <div className="p-4 w-full max-w-4xl mx-auto">
                        {/* DETAILS TAB */}
                        {activeTab === 'DETAILS' && (
                            <div className="space-y-4 animate-fade-in">
                                <PanelHeader title="Profile Details" onClose={() => setActiveTab(null)} />
                                <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                                    <img src={formData.profile_photo_url || `https://ui-avatars.com/api/?name=${formData.full_name}`} className="w-12 h-12 rounded-full object-cover bg-zinc-950 border border-zinc-700" />
                                    <div className="flex-1">
                                        <label className="cursor-pointer bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] px-3 py-2 rounded inline-block transition-colors font-medium border border-zinc-600">
                                            Change Photo <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profile')} />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className={labelClass}>Full Name</label><input type="text" name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Company / Title</label><input type="text" name="company" value={formData.company || ''} onChange={handleInputChange} className={inputClass} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
                                    <div><label className={labelClass}>Phone</label><input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className={inputClass} /></div>
                                </div>
                                <div><label className={labelClass}>Bio</label><textarea name="bio" value={formData.bio || ''} onChange={handleInputChange} className={inputClass} rows={2} /></div>
                            </div>
                        )}

                        {/* LINKS & BUTTONS TAB */}
                        {activeTab === 'LINKS' && (
                            <div className="space-y-6 animate-fade-in pb-10">
                                <PanelHeader title="Buttons & Links" onClose={() => setActiveTab(null)} />

                                {/* Primary Action Button Config */}
                                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700 mb-4">
                                    <h4 className="text-xs font-bold text-gold uppercase tracking-wide mb-2">
                                        Primary Action {formData.card_type === 'standie' ? '(Standie)' : '(Save Contact)'}
                                    </h4>
                                    <div className="space-y-2">
                                        <div>
                                            <label className={labelClass}>Button Label</label>
                                            <input
                                                type="text"
                                                name="custom_button_text"
                                                value={formData.custom_button_text || ''}
                                                onChange={handleInputChange}
                                                placeholder={formData.card_type === 'standie' ? 'e.g., View Menu' : 'e.g., Save Contact'}
                                                className={inputClass}
                                            />
                                        </div>

                                        {formData.card_type === 'standie' ? (
                                            <div>
                                                <label className={labelClass}>Destination URL</label>
                                                <input
                                                    type="text"
                                                    name="custom_button_url"
                                                    value={formData.custom_button_url || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="https://..."
                                                    className={inputClass}
                                                />
                                                <p className="text-[10px] text-zinc-500 mt-1">Enter the link for your menu, review page, or website.</p>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-zinc-500 mt-1">
                                                <span className="text-green-500 font-bold">✓</span> Auto-configured to download your Contact (VCard).
                                            </p>
                                        )}

                                        {/* Main Button Style Controls */}
                                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-zinc-700/50">
                                            <div>
                                                <label className={labelClass}>Bg Color</label>
                                                <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 p-1 rounded">
                                                    <input type="color" value={formData.custom_button_style?.backgroundColor || '#d7ba52'} onChange={(e) => updateMainButtonStyle('backgroundColor', e.target.value)} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Text Color</label>
                                                <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 p-1 rounded">
                                                    <input type="color" value={formData.custom_button_style?.textColor || '#ffffff'} onChange={(e) => updateMainButtonStyle('textColor', e.target.value)} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Shape</label>
                                                <select value={formData.custom_button_style?.shape || 'rounded-lg'} onChange={(e) => updateMainButtonStyle('shape', e.target.value)} className={inputClass}>
                                                    <option value="rounded-none">Square</option>
                                                    <option value="rounded-lg">Rounded</option>
                                                    <option value="rounded-full">Pill</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2 pt-4">
                                                <input type="checkbox" checked={formData.custom_button_style?.shadow !== false} onChange={(e) => updateMainButtonStyle('shadow', e.target.checked)} />
                                                <label className="text-xs text-zinc-300">Shadow</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 1: Action Buttons (Vertical) */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Action Buttons</h4>
                                        <button onClick={addActionButton} className="text-xs bg-zinc-800 text-white border border-zinc-600 px-2 py-1 rounded font-bold hover:bg-zinc-700">+ Add Button</button>
                                    </div>
                                    <div className="space-y-2">
                                        {actionButtons.map((btn) => (
                                            <div key={btn.id} className="bg-zinc-800/50 border border-zinc-700 rounded p-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => moveElement(btn.id, -1)} className="text-zinc-500 hover:text-white">▲</button>
                                                        <button onClick={() => moveElement(btn.id, 1)} className="text-zinc-500 hover:text-white">▼</button>
                                                        <span className="text-sm font-medium text-white">{btn.label}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditingId(editingId === btn.id ? null : btn.id)} className="text-xs text-blue-400 hover:underline">{editingId === btn.id ? 'Close' : 'Edit'}</button>
                                                        <button onClick={() => deleteElement(btn.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                                                    </div>
                                                </div>
                                                {editingId === btn.id && (
                                                    <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-zinc-700/50">
                                                        <div className="col-span-2"><label className={labelClass}>Label</label><input type="text" value={btn.label} onChange={(e) => updateElement(btn.id, 'label', e.target.value)} className={inputClass} /></div>
                                                        <div className="col-span-2"><label className={labelClass}>URL</label><input type="text" value={btn.url} onChange={(e) => updateElement(btn.id, 'url', e.target.value)} placeholder="https://..." className={inputClass} /></div>
                                                        <div><label className={labelClass}>Bg Color</label><div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 p-1 rounded"><input type="color" value={btn.style.backgroundColor} onChange={(e) => updateElement(btn.id, 'style.backgroundColor', e.target.value)} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" /></div></div>
                                                        <div><label className={labelClass}>Text Color</label><div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 p-1 rounded"><input type="color" value={btn.style.textColor} onChange={(e) => updateElement(btn.id, 'style.textColor', e.target.value)} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" /></div></div>
                                                        <div><label className={labelClass}>Shape</label><select value={btn.style.shape} onChange={(e) => updateElement(btn.id, 'style.shape', e.target.value)} className={inputClass}><option value="rounded-none">Square</option><option value="rounded-lg">Rounded</option><option value="rounded-full">Pill</option></select></div>
                                                        <div className="flex items-center gap-2 pt-4">
                                                            <input type="checkbox" checked={btn.style.shadow} onChange={(e) => updateElement(btn.id, 'style.shadow', e.target.checked)} />
                                                            <label className="text-xs text-zinc-300">Shadow</label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {actionButtons.length === 0 && <p className="text-xs text-zinc-500 italic">No buttons added.</p>}
                                    </div>
                                </div>

                                {/* Section 2: Social Icons (Horizontal) */}
                                <div className="pt-4 border-t border-zinc-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Social Icons</h4>
                                        <div className="relative">
                                            <button onClick={() => setShowSocialDropdown(!showSocialDropdown)} className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-600 px-2 py-1 rounded font-bold hover:text-white transition-colors flex items-center gap-1">
                                                + Add Social
                                                <span className={`transform transition-transform ${showSocialDropdown ? 'rotate-180' : ''}`}>▼</span>
                                            </button>

                                            {showSocialDropdown && (
                                                <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 w-40 z-50 grid grid-cols-1 gap-1 animate-fade-in max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                                                    {SOCIAL_PRESETS.map(p => (
                                                        <button key={p.key} onClick={() => addSocialLink(p.key)} className="text-left text-xs px-2 py-2 hover:bg-zinc-800 rounded text-zinc-300 hover:text-white flex items-center gap-2 transition-colors w-full">
                                                            <div className="w-4 h-4 shrink-0" dangerouslySetInnerHTML={{ __html: SOCIAL_ICONS[p.key] || '' }}></div>
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {socialButtons.map((btn) => (
                                            <div key={btn.id} className="bg-zinc-800/50 border border-zinc-700 rounded p-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => moveElement(btn.id, -1)} className="text-zinc-500 hover:text-white">▲</button>
                                                        <button onClick={() => moveElement(btn.id, 1)} className="text-zinc-500 hover:text-white">▼</button>
                                                        {/* Icon Preview */}
                                                        <div
                                                            className="w-6 h-6 rounded-full flex items-center justify-center p-1"
                                                            style={{ backgroundColor: btn.style.backgroundColor }}
                                                        >
                                                            {btn.iconUrl ?
                                                                <img src={btn.iconUrl} className="w-full h-full object-cover rounded-full" /> :
                                                                <div className="w-full h-full" style={{ color: btn.style.textColor }} dangerouslySetInnerHTML={{ __html: SOCIAL_ICONS[btn.subtype || 'website'] || SOCIAL_ICONS['custom'] }} />
                                                            }
                                                        </div>
                                                        <span className="text-sm font-medium text-white">{btn.label}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditingId(editingId === btn.id ? null : btn.id)} className="text-xs text-blue-400 hover:underline">{editingId === btn.id ? 'Close' : 'Edit'}</button>
                                                        <button onClick={() => deleteElement(btn.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                                                    </div>
                                                </div>
                                                {editingId === btn.id && (
                                                    <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-2">
                                                        <div><label className={labelClass}>URL</label><input type="text" value={btn.url} onChange={(e) => updateElement(btn.id, 'url', e.target.value)} placeholder="https://..." className={inputClass} /></div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div><label className={labelClass}>Background Color</label><div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 p-1 rounded"><input type="color" value={btn.style.backgroundColor} onChange={(e) => updateElement(btn.id, 'style.backgroundColor', e.target.value)} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" /></div></div>
                                                            <div><label className={labelClass}>Icon Color</label><div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 p-1 rounded"><input type="color" value={btn.style.textColor} onChange={(e) => updateElement(btn.id, 'style.textColor', e.target.value)} className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" /></div></div>
                                                        </div>

                                                        <div>
                                                            <label className={labelClass}>Custom Icon Override</label>
                                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'custom_icon', btn.id)} className="text-xs text-zinc-500" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {socialButtons.length === 0 && <p className="text-xs text-zinc-500 italic">No social links added.</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE TAB */}
                        {activeTab === 'APPEARANCE' && (
                            <div className="space-y-5 animate-fade-in">
                                <PanelHeader title="Cover & Style Settings" onClose={() => setActiveTab(null)} />

                                {/* Cover Image Section */}
                                <div>
                                    <label className={labelClass}>Cover Image</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
                                        <label className="shrink-0 w-20 h-12 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-center cursor-pointer hover:border-gold transition-colors"><span className="text-[10px] text-zinc-400 font-medium">Upload</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bg')} /></label>
                                        {backgroundTemplates.map(t => <button key={t.url} onClick={() => setFormData(p => ({ ...p, background_photo_url: t.url }))} className="shrink-0 w-20 h-12 rounded overflow-hidden border border-zinc-800 hover:border-gold transition-colors"><img src={t.url} className="w-full h-full object-cover" /></button>)}
                                    </div>

                                    {/* New Controls */}
                                    <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700 space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-[10px] text-zinc-400 uppercase font-bold">Zoom</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{formData.background_settings?.zoom || 1}x</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1" max="3" step="0.1"
                                                value={formData.background_settings?.zoom || 1}
                                                onChange={(e) => updateBackgroundSettings('zoom', parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-gold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-[10px] text-zinc-400 uppercase font-bold">Vertical Position</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{formData.background_settings?.offsetY || 50}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0" max="100" step="1"
                                                value={formData.background_settings?.offsetY || 50}
                                                onChange={(e) => updateBackgroundSettings('offsetY', parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-gold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Accent</label><div className="flex items-center gap-2 bg-zinc-800 p-1.5 rounded border border-zinc-700"><input type="color" name="theme_color" value={formData.theme_color} onChange={handleInputChange} className="w-6 h-6 rounded border border-zinc-600 bg-transparent p-0 cursor-pointer" /><span className="text-[10px] text-zinc-400">{formData.theme_color}</span></div></div>
                                    <div><label className={labelClass}>Background</label><div className="flex items-center gap-2 bg-zinc-800 p-1.5 rounded border border-zinc-700"><input type="color" name="background_color" value={formData.background_color} onChange={handleInputChange} className="w-6 h-6 rounded border border-zinc-600 bg-transparent p-0 cursor-pointer" /><span className="text-[10px] text-zinc-400">{formData.background_color}</span></div></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelClass}>Font</label><select name="font_family" value={formData.font_family} onChange={handleInputChange} className={inputClass}>{FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}</select></div>
                                    <div><label className={labelClass}>Photo Shape</label><select name="card_shape" value={formData.card_shape} onChange={handleInputChange} className={inputClass}>{SHAPES.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}</select></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex-1 relative overflow-hidden bg-zinc-950/50 flex flex-col" onClick={() => setActiveTab(null)}>
                <div className="flex-1 overflow-y-auto scrollbar-hide pb-32 md:pb-0">
                    <div className="min-h-full py-8 flex justify-center">
                        <div className={`transition-all duration-300 ${previewMode === 'mobile' ? 'w-full max-w-md' : 'w-full'}`}>
                            <PublicProfile profileData={formData} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditor;

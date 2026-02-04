
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { Profile, CustomButtonElement } from '../types';
import { SOCIAL_ICONS } from '../constants';
import { generateVCardContent } from '../utils/vcardGenerator';

interface PublicProfileProps {
  profileData?: Partial<Profile> | null;
  isInteractive?: boolean; // When false, links/buttons are not clickable (preview mode)
}

const PublicProfile: React.FC<PublicProfileProps> = ({ profileData, isInteractive = true }) => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<Partial<Profile> | null>(profileData || null);
  const [loading, setLoading] = useState(!profileData);
  const mounted = useRef(true);

  // Helper to calculate expiry days
  const getDaysUntilExpiry = (p: Partial<Profile>) => {
    if (p.subscription_end_date) {
      const end = new Date(p.subscription_end_date);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    // Fallback: Created At + 365 days
    if (p.created_at) {
      const created = new Date(p.created_at);
      const end = new Date(created);
      end.setDate(end.getDate() + 365);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 365; // Safe default
  };

  const daysUntilExpiry = profile ? getDaysUntilExpiry(profile) : 365;
  const isExpired = daysUntilExpiry <= 0;
  const isWarning = daysUntilExpiry <= 45 && !isExpired; // Increased to 45 days

  useEffect(() => {
    mounted.current = true;

    // If we have passed data (Preview Mode), use it immediately
    if (profileData) {
      setProfile(profileData);
      setLoading(false);
      return;
    }

    if (!slug) {
      if (mounted.current) setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        // Attempt to fetch profile by slug
        // We use .select().limit(1) and then check array length for maximum robustness
        // vs .maybeSingle() which implies 0 or 1 row logic that sometimes varies by library version
        const { data, error } = await getSupabase()
          .from('profiles')
          .select('*')
          .eq('profile_slug', slug)
          .limit(1);

        if (error) {
          console.error("Supabase error fetching profile:", error);
          throw error;
        }

        if (mounted.current) {
          if (data && data.length > 0) {
            setProfile(data[0]);
          } else {
            console.log("No profile found for slug:", slug);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error("Unexpected error in fetchProfile:", err);
        // Don't set profile to null here if we want to support retry, 
        // but for now we treat error as 'not found' to exit loading state
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    // Safety timeout: If Supabase hangs (e.g. cold start), force stop loading after 10s
    const timer = setTimeout(() => {
      if (mounted.current && loading) {
        console.warn("Profile fetch timed out - forcing UI render");
        setLoading(false);
      }
    }, 10000);

    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [slug, profileData]);

  const handleDownloadVCard = (e: React.MouseEvent) => {
    if (!profile) return;

    if (profile.card_type === 'standie' && profile.custom_button_url) {
      return;
    }

    e.preventDefault();

    try {
      const vCardString = generateVCardContent(profile);
      const blob = new Blob([vCardString], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${profile.full_name || 'contact'}.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error generating vCard", e);
      alert("Could not generate contact file.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-zinc-950 gap-4">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full"></div>
        <p className="text-zinc-500 text-sm animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  // --- NEW: Expired State (Blocking Overlay) ---
  // Only show if not in preview mode (isPreview = !!profileData)
  if (profile && isExpired && !profileData && mounted.current) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center mb-6 border border-red-900/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Profile Expired</h1>
        <p className="text-zinc-400 max-w-md mb-8 leading-relaxed">
          This digital profile is currently inactive. If you are the owner, please renew your subscription to reactivate it.
        </p>
        <a
          href="https://canopycorp.in/#/login"
          className="px-8 py-3.5 bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 text-white rounded-xl font-bold transition-all shadow-lg border border-zinc-600/50"
        >
          Renew Subscription
        </a>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4 text-center">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
        <p className="text-zinc-400 mb-6 max-w-md">The profile you are looking for doesn't exist or has been removed.</p>
        <a href="/" className="text-gold hover:underline">Go to Home</a>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    fontFamily: profile.font_family || 'Poppins',
    fontSize: `${profile.font_size || 16}px`,
    backgroundColor: profile.background_color || '#09090b',
  };

  const textStyle = {
    color: profile.card_text_color || '#ffffff',
  };

  const backgroundSettings = profile.background_settings || { zoom: 1, offsetX: 50, offsetY: 50 };

  const actionButtons = profile.custom_elements?.filter(e => e.type === 'link') || [];
  const socialButtons = profile.custom_elements?.filter(e => e.type === 'social') || [];

  const isStandie = profile.card_type === 'standie';
  const mainButtonUrl = isStandie
    ? (profile.custom_button_url || '#')
    : '#';

  const mainBtnStyle = profile.custom_button_style || {
    backgroundColor: profile.theme_color || '#d7ba52',
    textColor: profile.card_text_color || '#ffffff',
    shape: 'rounded-lg',
    shadow: true,
    border: false
  };

  return (
    <div className="min-h-screen flex flex-col items-center overflow-x-hidden" style={containerStyle}>
      {/* --- NEW: Warning Banner (Subtle) --- */}
      {profile && isWarning && !profileData && (
        <div className="w-full bg-zinc-900 text-zinc-300 px-3 py-1.5 text-center relative z-50 border-b border-zinc-800 flex items-center justify-center gap-2">
          <p className="text-[10px] font-medium tracking-wide uppercase">
            Privilege Expiring in <span className="text-white font-bold">{daysUntilExpiry} Days</span>
            <span className="mx-2 text-zinc-600">|</span>
            <a href="https://canopycorp.in/#/login" className="text-gold hover:underline">Renew</a>
          </p>
        </div>
      )}
      <div
        className="w-full h-48 md:h-64 bg-zinc-800 relative overflow-hidden shrink-0"
        style={{ backgroundColor: profile.theme_color || '#d7ba52' }}
      >
        {profile.background_photo_url && (
          <img
            src={profile.background_photo_url}
            alt=""
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{
              transform: `scale(${backgroundSettings.zoom})`,
              objectPosition: `${backgroundSettings.offsetX}% ${backgroundSettings.offsetY}%`,
            }}
          />
        )}
      </div>

      <div className="max-w-2xl w-full px-4 -mt-20 md:-mt-24 mb-12 z-10 flex flex-col items-center text-center">
        <img
          src={profile.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&size=128`}
          alt={profile.full_name}
          className={`w-32 h-32 md:w-40 md:h-40 bg-zinc-800 border-4 border-white shadow-2xl object-cover ${profile.card_shape || 'rounded-lg'}`}
        />

        <h1 className="text-2xl md:text-3xl font-bold mt-4" style={textStyle}>{profile.full_name}</h1>

        {profile.company && (
          <p className="text-xl font-medium mt-1 opacity-90" style={textStyle}>{profile.company}</p>
        )}

        {profile.bio && (
          <p className="mt-2 max-w-lg opacity-80" style={textStyle}>{profile.bio}</p>
        )}

        <div className="mt-8 w-full max-w-md space-y-4">
          {isInteractive ? (
            <a
              href={mainButtonUrl}
              target={isStandie ? "_blank" : undefined}
              rel={isStandie ? "noopener noreferrer" : undefined}
              className={`block w-full py-3.5 px-4 font-bold text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2 ${mainBtnStyle.shape} ${mainBtnStyle.shadow ? 'shadow-lg hover:shadow-xl' : ''}`}
              style={{
                backgroundColor: mainBtnStyle.backgroundColor,
                color: mainBtnStyle.textColor,
                cursor: 'pointer'
              }}
              onClick={handleDownloadVCard}
              title={isStandie ? "Click to open link" : "Click to download contact card"}
            >
              {profile.custom_button_text || (isStandie ? 'Open Link' : 'Save Contact')}
            </a>
          ) : (
            <div
              className={`block w-full py-3.5 px-4 font-bold text-center flex items-center justify-center gap-2 ${mainBtnStyle.shape} ${mainBtnStyle.shadow ? 'shadow-lg' : ''}`}
              style={{
                backgroundColor: mainBtnStyle.backgroundColor,
                color: mainBtnStyle.textColor,
                cursor: 'default'
              }}
            >
              {profile.custom_button_text || (isStandie ? 'Open Link' : 'Save Contact')}
            </div>
          )}

          {actionButtons.map((btn: CustomButtonElement) => (
            isInteractive ? (
              <a
                key={btn.id}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full py-3 px-4 font-semibold text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2 ${btn.style.shape} ${btn.style.shadow ? 'shadow-md hover:shadow-lg' : ''} ${btn.style.border ? 'border border-white/20' : ''}`}
                style={{
                  backgroundColor: btn.style.backgroundColor,
                  color: btn.style.textColor,
                }}
                title={`Click to open: ${btn.label}`}
              >
                {btn.label}
              </a>
            ) : (
              <div
                key={btn.id}
                className={`block w-full py-3 px-4 font-semibold text-center flex items-center justify-center gap-2 ${btn.style.shape} ${btn.style.shadow ? 'shadow-md' : ''} ${btn.style.border ? 'border border-white/20' : ''}`}
                style={{
                  backgroundColor: btn.style.backgroundColor,
                  color: btn.style.textColor,
                  cursor: 'default'
                }}
              >
                {btn.label}
              </div>
            )
          ))}
        </div>

        {socialButtons.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-4 w-full max-w-md">
            {socialButtons.map((btn: CustomButtonElement) => (
              isInteractive ? (
                <a
                  key={btn.id}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-800/80 hover:scale-125 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-2xl animate-pulse-subtle"
                  style={{
                    backgroundColor: btn.style.backgroundColor,
                    color: btn.style.textColor
                  }}
                  title={`Open ${btn.label}`}
                >
                  {btn.iconUrl ? (
                    <img src={btn.iconUrl} alt={btn.label} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: SOCIAL_ICONS[btn.subtype || 'website'] || SOCIAL_ICONS['custom'] }} />
                  )}
                </a>
              ) : (
                <div
                  key={btn.id}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-800/80 shadow-lg"
                  style={{
                    backgroundColor: btn.style.backgroundColor,
                    color: btn.style.textColor,
                    cursor: 'default'
                  }}
                >
                  {btn.iconUrl ? (
                    <img src={btn.iconUrl} alt={btn.label} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-6 h-6" dangerouslySetInnerHTML={{ __html: SOCIAL_ICONS[btn.subtype || 'website'] || SOCIAL_ICONS['custom'] }} />
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <div className="pb-8 text-sm text-zinc-500 text-center space-y-4">
        {/* Business Details Footer */}
        {(profile.gst_number || profile.billing_address) && (
          <div className="flex flex-col items-center gap-1 opacity-70">
            {profile.gst_number && (
              <p className="text-[10px] uppercase tracking-wider font-medium">GST No: <span className="text-zinc-400 font-mono">{profile.gst_number}</span></p>
            )}
            {profile.billing_address && (
              <p className="text-[10px] max-w-xs whitespace-pre-line leading-snug">{profile.billing_address}</p>
            )}
          </div>
        )}

        <a href="https://www.canopycorp.in" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors block">
          NFC cards by CanopyCorp
        </a>
      </div>
    </div>
  );
};

export default PublicProfile;

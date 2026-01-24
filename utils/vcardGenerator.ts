
import { Profile, CustomButtonElement } from '../types';

export const generateVCardContent = (profile: Partial<Profile>): string => {
  const content = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.full_name || ''}`,
    `N:${(profile.full_name || '').split(' ').reverse().join(';')};;;`,
    profile.company ? `ORG:${profile.company}` : '',
    profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : '',
    profile.email ? `EMAIL;TYPE=INTERNET:${profile.email}` : '',
    profile.website ? `URL:${profile.website}` : '',
    profile.bio ? `NOTE:${profile.bio}` : '',
  ];

  // Helper to check if string is a valid URL
  const isValidUrl = (string: string) => {
    try { return Boolean(new URL(string)); } catch (e) { return false; }
  };

  // Add Custom Elements (Buttons & Socials)
  if (profile.custom_elements && Array.isArray(profile.custom_elements)) {
      profile.custom_elements.forEach((elem: CustomButtonElement) => {
          if (!elem.isActive || !elem.url) return;
          
          let label = elem.label || 'Link';
          
          if (elem.type === 'social') {
              // Format Label (e.g. "whatsapp" -> "WhatsApp")
              const presetLabel = elem.subtype ? elem.subtype.charAt(0).toUpperCase() + elem.subtype.slice(1) : 'Social';
              
              if (elem.subtype === 'whatsapp') {
                   // Ensure it's a clickable URL for VCard
                   const cleanNum = elem.url.replace(/\D/g, '');
                   // If user entered full URL, use it. If just number, format it.
                   const finalUrl = elem.url.startsWith('http') ? elem.url : `https://wa.me/${cleanNum}`;
                   content.push(`URL;TYPE=WhatsApp:${finalUrl}`); 
              } else {
                   content.push(`URL;TYPE=${presetLabel}:${elem.url}`);
              }
          } else {
              // Standard Custom Links
              // Remove special chars from label for VCard TYPE compatibility
              const cleanLabel = label.replace(/[^a-zA-Z0-9]/g, '');
              content.push(`URL;TYPE=${cleanLabel}:${elem.url}`);
          }
      });
  } else if (profile.social_links) {
      // Fallback for Legacy Data
      const sl = profile.social_links;
      if (sl.whatsapp) content.push(`URL;TYPE=WhatsApp:https://wa.me/${sl.whatsapp.replace(/\D/g, '')}`);
      if (sl.linkedin) content.push(`URL;TYPE=LinkedIn:${sl.linkedin}`);
      if (sl.twitter) content.push(`URL;TYPE=Twitter:${sl.twitter}`);
      if (sl.instagram) content.push(`URL;TYPE=Instagram:${sl.instagram}`);
      if (sl.facebook) content.push(`URL;TYPE=Facebook:${sl.facebook}`);
      if (sl.youtube) content.push(`URL;TYPE=YouTube:${sl.youtube}`);
      if (sl.maps) content.push(`URL;TYPE=Maps:${sl.maps}`);
      if (sl.custom_url) content.push(`URL;TYPE=Custom:${sl.custom_url}`);
  }

  content.push('END:VCARD');

  return content.filter(line => line !== '').join('\n');
};

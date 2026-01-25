
export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  github?: string;
  whatsapp?: string;
  youtube?: string;
  maps?: string;
  website?: string;
  menu_link?: string; // Target URL for Standies
  custom_url?: string;
  custom_icon_url?: string;
}

export interface BackgroundSettings {
  zoom: number;
  offsetX: number; // percentage
  offsetY: number; // percentage
}

export interface ButtonStyle {
  backgroundColor: string;
  textColor: string;
  shape: 'rounded-none' | 'rounded-lg' | 'rounded-full';
  shadow: boolean;
  border: boolean;
}

export interface CustomButtonElement {
  id: string;
  type: 'link' | 'social';
  subtype?: string; // e.g. 'instagram', 'whatsapp', 'custom'
  label: string;
  url: string;
  iconUrl?: string; // For custom icons
  style: ButtonStyle;
  isActive: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  profile_slug: string;
  full_name: string;
  company: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  social_links: SocialLinks; // stored as jsonb (Legacy, keeping for backward compat)
  custom_elements: CustomButtonElement[]; // New: For custom buttons and unified links
  profile_photo_url: string | null;
  background_photo_url: string | null;
  background_settings: BackgroundSettings; // stored as jsonb
  theme_color: string;
  card_color: string;
  card_text_color: string;
  background_color: string;
  font_family: string;
  font_size: number;
  card_shape: string;
  card_type: 'business_card' | 'standie'; // Combined Standie types
  custom_button_text?: string | null;
  custom_button_url?: string | null; // New: For Standie main button link
  custom_button_style?: ButtonStyle; // New: Specific style for main button
  vcard_url: string | null;
  upi_transaction_id?: string | null;
  delivery_address_url: string | null;
  storage_folder_path: string | null;
  front_side?: string | null;
  back_side?: string | null;
  design_data?: any; // New: Stores the raw JSON of the card design (frontData/backData)
  ai_generation_count?: { front: number; back: number }; // New: Track AI usage
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'user_id' | 'created_at'>>;

export interface ImageElement {
  id: string;
  url: string | null;
  x: number; // percentage from left
  y: number; // percentage from top
  scale: number;
  width: number; // px, for aspect ratio
  height: number; // px
  mixBlendMode?: 'normal' | 'multiply';
}

export interface TextElement {
  id: string;
  content: string;
  x: number; // percentage from left
  y: number; // percentage from top
  scale: number;
  color: string;
  fontWeight: '400' | '500' | '700';
  fontFamily?: string;
  isLocked: boolean;
  fontSize: number; // px
  letterSpacing: number; // em
  textAlign: 'left' | 'center' | 'right';
}

export interface CardFaceData {
  texts: TextElement[];
  images: ImageElement[];
  backgroundColor: string;
  backgroundImageUrl?: string | null;
  fullDesignUrl?: string | null;
  nfcIconColor: string;
  urlColor?: string;
}
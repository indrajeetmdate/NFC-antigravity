import { CardFaceData, TextElement, ImageElement } from "../types";

// Pollinations.ai Service (No API Key Required)

export interface GenerationParams {
    side: 'front' | 'back';
    style: string;
    description: string;
    colors: string[]; // ['#hex', '#hex']
    companyName: string;
    personName: string;
    logoUrl?: string;
}

export const generateCardDesign = async (params: GenerationParams): Promise<{ data: CardFaceData | null, error?: string }> => {
    try {
        // 1. Construct Quality Prompt for Pollinations
        // Emphasize abstract, texture, and no text to ensure good backgrounds
        const qualityKeywords = "luxury business card background, high quality, 8k render, photorealistic, elegant texture, abstract geometric patterns, no text, clean composition";
        const prompt = `${qualityKeywords}, ${params.style} style, ${params.description}, ${params.colors.join(' ')} color palette`;
        const encodedPrompt = encodeURIComponent(prompt);

        // Use a random seed to ensure variety on re-generation with same params
        const seed = Math.floor(Math.random() * 1000000);

        // 2. Generate Image URL
        // Standard business card ratio is 1.75 (e.g. 1050x600)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1050&height=600&seed=${seed}&nologo=true`;

        // 3. Construct Standard Text Layout (Updated per User Request)
        const texts: TextElement[] = [];

        const isDark = params.style.toLowerCase().includes('dark') || params.style.toLowerCase().includes('luxury') || params.style.toLowerCase().includes('cyberpunk');
        const textColor = isDark ? '#FFFFFF' : '#000000';

        if (params.side === 'front') {
            // Person Name (Top Right)
            texts.push({
                id: 'person',
                content: params.personName || 'Your Name',
                x: 90, y: 15,
                scale: 1,
                color: textColor,
                fontWeight: '700',
                fontFamily: 'Montserrat',
                isLocked: false,
                fontSize: 22,
                letterSpacing: 0,
                textAlign: 'right'
            });

            // Company Name (Below Person Name or separate - defaulting to below for clean top-right block)
            texts.push({
                id: 'company',
                content: params.companyName || 'Company Name',
                x: 90, y: 25,
                scale: 1,
                color: textColor,
                fontWeight: '500',
                fontFamily: 'Poppins',
                isLocked: false,
                fontSize: 14,
                letterSpacing: 0,
                textAlign: 'right'
            });

        } else {
            // Back Side - Contact Info (Keep readable)
            texts.push({
                id: 'contact',
                content: "+1 234 567 8900\nemail@example.com\nwww.website.com",
                x: 50, y: 50,
                scale: 1,
                color: textColor,
                fontWeight: '400',
                fontFamily: 'Poppins',
                isLocked: false,
                fontSize: 14,
                letterSpacing: 0,
                textAlign: 'center'
            });
        }

        // 4. Construct Images (Logo Center, QR Bottom Left)
        const images: ImageElement[] = [];

        // Logo - Center
        if (params.logoUrl) {
            images.push({
                id: "logo",
                url: params.logoUrl,
                x: 50, // Center X
                y: 50, // Center Y
                scale: 1.0,
                width: 100, height: 100
            });
        }

        // QR Code - Bottom Left (Both sides if needed, usually back, but user requested fixed pos)
        const qrUrl = 'https://cdn-icons-png.flaticon.com/512/714/714390.png';
        const addQr = params.side === 'back'; // Or if user wants it on front. Defaulting to back for standard workflow, or we can add to front if requested.
        // User "add QR code with fixed position at the bottom left". 
        // We'll add it if it's the back side OR if we assume they want it on the generated side. 
        // Usually front is logo/name, back is details/QR. Let's stick to Back for QR by default to not clutter front, unless explicitly asked.

        if (params.side === 'back') {
            images.push({
                id: 'qr',
                url: qrUrl,
                x: 10, // Left
                y: 85, // Bottom
                scale: 0.6,
                width: 100, height: 100
            });
        }

        const data: CardFaceData = {
            texts,
            images,
            backgroundColor: isDark ? '#1a1a1a' : '#ffffff', // Fallback
            backgroundImageUrl: imageUrl,
            nfcIconColor: textColor
        };

        return { data };

    } catch (error: any) {
        console.error("Pollinations Generation Failed:", error);
        return { data: null, error: "Failed to generate design. Please try again." };
    }
};

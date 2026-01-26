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
        const qualityKeywords = "abstract background texture, no text, no writing, no letters, geometric shapes, fluid art, luxury patterns, 8k resolution, minimalist wallpaper design";
        const prompt = `${qualityKeywords}, ${params.style} style, ${params.description}, ${params.colors.join(' ')} color palette`;
        const encodedPrompt = encodeURIComponent(prompt);

        // Use a random seed to ensure variety on re-generation with same params
        const seed = Math.floor(Math.random() * 1000000);

        // 2. Generate Image URL
        // Standard business card ratio is 1.75 (e.g. 1050x600)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1050&height=600&seed=${seed}&nologo=true`;

        // 3. Construct Standard Text Layout (Updated per User Request: Top Left)
        const texts: TextElement[] = [];

        const isDark = params.style.toLowerCase().includes('dark') || params.style.toLowerCase().includes('luxury') || params.style.toLowerCase().includes('cyberpunk');
        const textColor = isDark ? '#FFFFFF' : '#000000';

        if (params.side === 'front') {
            // Person Name (Top Left with proper margin)
            texts.push({
                id: 'person',
                content: params.personName || 'Your Name',
                x: 20, y: 15,
                scale: 1,
                color: textColor,
                fontWeight: '700',
                fontFamily: 'Montserrat',
                isLocked: false,
                fontSize: 24,
                letterSpacing: 0,
                textAlign: 'left'
            });

            // Company Name (Below Person Name)
            texts.push({
                id: 'company',
                content: params.companyName || 'Company Name',
                x: 20, y: 28,
                scale: 1,
                color: textColor,
                fontWeight: '500',
                fontFamily: 'Poppins',
                isLocked: false,
                fontSize: 16,
                letterSpacing: 0,
                textAlign: 'left'
            });

        } else {
            // Back Side - No text additions (as per user request)
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

        // QR Code - Bottom Right (Front side only with transparent background)
        if (params.side === 'front') {
            // Get preset color or fallback to black/white contrast
            let qrColorHex = params.colors[0] || (isDark ? 'ffffff' : '000000');
            // Remove hash if present
            qrColorHex = qrColorHex.replace('#', '');

            // Generate transparent QR with matching color using QuickChart
            const qrUrl = `https://quickchart.io/qr?text=https://example.com&size=300&dark=${qrColorHex}&light=00000000&margin=0`;

            images.push({
                id: 'qr',
                url: qrUrl,
                x: 85, // Right
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

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
        // 1. Construct Prompt for Pollinations
        const prompt = `business card background, ${params.style} style, ${params.description}, professional, high quality, 8k render, abstract, minimal text space, ${params.colors.join(' ')} color palette`;
        const encodedPrompt = encodeURIComponent(prompt);

        // Use a random seed to ensure variety on re-generation with same params
        const seed = Math.floor(Math.random() * 1000000);

        // 2. Generate Image URL
        // Standard business card ratio is 1.75 (e.g. 1050x600)
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1050&height=600&seed=${seed}&nologo=true`;

        // 3. Construct Standard Text Layout (Since we don't have AI layout generation anymore)
        const texts: TextElement[] = [];

        // Standard Layout Logic
        const isDark = params.style.toLowerCase().includes('dark') || params.style.toLowerCase().includes('luxury') || params.style.toLowerCase().includes('cyberpunk');
        const textColor = isDark ? '#FFFFFF' : '#000000';

        if (params.side === 'front') {
            // Company Name (Top Left or Center)
            texts.push({
                id: 'company',
                content: params.companyName || 'Company Name',
                x: 50, y: 35,
                scale: 1,
                color: textColor,
                fontWeight: '700',
                fontFamily: 'Montserrat',
                isLocked: false,
                fontSize: 28,
                letterSpacing: 0,
                textAlign: 'center'
            });

            // Person Name (Bottom Center)
            texts.push({
                id: 'person',
                content: params.personName || 'Your Name',
                x: 50, y: 65,
                scale: 1,
                color: textColor,
                fontWeight: '500',
                fontFamily: 'Poppins',
                isLocked: false,
                fontSize: 18,
                letterSpacing: 0,
                textAlign: 'center'
            });
        } else {
            // Back Side - Contact Info
            texts.push({
                id: 'title',
                content: params.personName || 'Your Name',
                x: 10, y: 20,
                scale: 1,
                color: textColor,
                fontWeight: '700',
                fontFamily: 'Montserrat',
                isLocked: false,
                fontSize: 22,
                letterSpacing: 0,
                textAlign: 'left'
            });

            texts.push({
                id: 'contact',
                content: "+1 234 567 8900\nemail@example.com\nwww.website.com",
                x: 10, y: 50,
                scale: 1,
                color: textColor,
                fontWeight: '400',
                fontFamily: 'Poppins',
                isLocked: false,
                fontSize: 12,
                letterSpacing: 0,
                textAlign: 'left'
            });
        }

        // 4. Construct Images (Logo / QR)
        const images: ImageElement[] = [];

        if (params.logoUrl) {
            images.push({
                id: "logo",
                url: params.logoUrl,
                x: params.side === 'front' ? 50 : 85,
                y: params.side === 'front' ? 20 : 20,
                scale: 0.8,
                width: 100, height: 100
            });
        }

        if (params.side === 'back') {
            images.push({
                id: 'qr',
                url: 'https://cdn-icons-png.flaticon.com/512/714/714390.png',
                x: 85,
                y: 50,
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

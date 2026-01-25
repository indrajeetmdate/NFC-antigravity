
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CardFaceData, TextElement, ImageElement } from "../types";

// Helper to get API key safely
const getApiKey = () => {
    const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!key) {
        console.warn("VITE_GEMINI_API_KEY is missing!");
        return "";
    }
    return key;
};

// Initialize Gemini
let genAI: GoogleGenerativeAI | null = null;

const initGemini = () => {
    const apiKey = getApiKey();
    if (apiKey && !genAI) {
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

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
        const ai = initGemini();
        if (!ai) return { data: null, error: "Missing API Key" };

        const model = ai.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `
    You are an expert Graphic Designer specializing in high-end, modern business cards.
    Your task is to generate a JSON configuration for a business card design based on the user's description and style preferences.
    
    The output must STRICTLY follow this JSON structure:
    {
      "texts": [
        { "id": "string", "content": "string", "x": number, "y": number, "scale": number, "color": "hex", "fontWeight": "400"|"700", "fontFamily": "Poppins"|"Montserrat"|"Playfair Display", "isLocked": boolean, "fontSize": number, "letterSpacing": number, "textAlign": "left"|"center"|"right" }
      ],
      "images": [
        { "id": "logo"|"qr"|"decor", "url": "string", "x": number, "y": number, "scale": number, "width": 100, "height": 100, "mixBlendMode": "normal"|"multiply" }
      ],
      "backgroundColor": "hex",
      "backgroundImageUrl": null,
      "nfcIconColor": "hex"
    }

    Constraints & Rules:
    1. CANVAS: Width=525, Height=300 (Business Card Aspect Ratio). x and y are PERCENTAGES (0-100).
    2. STYLE MAPPING:
       - "Modern": Clean lines, sans-serif fonts (Poppins/Montserrat), bold contrast.
       - "Luxury": Deep background colors (Black, Navy, Gold), serif fonts (Playfair Display), elegant spacing.
       - "Minimalist": Lots of whitespace, simple typography, subtle colors.
       - "Cyberpunk": Neon colors on dark background, glitches, tech feel.
       - "Playful": Bright colors, rounded fonts, fun layout.
    3. COLORS: Use the provided colors or generate harmonious ones if none provided.
    4. FONTS: Use only 'Poppins', 'Montserrat', or 'Playfair Display'.
    5. LOGO: If provided, place it prominently (usually x=10-20 or center x=50). id must be 'logo'.
    6. QR CODE: Always include a placeholder QR Code at x=85, y=50 (approx) with id='qr' if it's the Back side, or if specifically asked for front. Valid QR URL: 'https://cdn-icons-png.flaticon.com/512/714/714390.png'.
    7. DECOR: You can add 1-2 decorative elements (circles, lines) using ImageElement with id='decor'. Use transparent PNG urls for shapes if needed, or simple colored rectangles (simulated).
    8. TEXT HIERARCHY: Name should be large (fontSize 24-32), Title smaller (14-18), Contact info smallest (10-12).

    INPUT PARAMETERS:
    - Side: ${params.side}
    - Style: ${params.style}
    - Description: ${params.description}
    - Company: ${params.companyName}
    - Person: ${params.personName}
    - Colors: ${params.colors.join(', ')}
    - Logo provided: ${params.logoUrl ? 'Yes' : 'No'}

    Generate the most stunning, professional design possible. Surprise the user with creativity within the constraints.
    Return ONLY the JSON string, no markdown formatting.
    `;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;

        // Safety check
        if (!response.candidates || response.candidates.length === 0) {
            return { data: null, error: "AI Safety Filter Triggered. Try a different description." };
        }

        const text = response.text();
        // console.log("Gemini Raw Response:", text);

        // Clean potentially wrapped JSON just in case, though MIME type should fix it
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch (e: any) {
            return { data: null, error: "Invalid JSON from AI: " + e.message };
        }

        // Post-processing to ensure valid URLs/Images
        if (params.logoUrl) {
            const logoIdx = data.images.findIndex((img: any) => img.id === 'logo');
            if (logoIdx >= 0) {
                data.images[logoIdx].url = params.logoUrl;
            } else {
                // Should have generated one, but if not, force add it
                data.images.push({
                    id: "logo",
                    url: params.logoUrl,
                    x: 50, y: 30, scale: 0.8,
                    width: 100, height: 100
                });
            }
        } else {
            // Remove placeholder logo if no URL provided
            data.images = data.images.filter((img: any) => img.id !== 'logo');
        }

        // Ensure QR for back side
        if (params.side === 'back') {
            const qrExists = data.images.some((img: any) => img.id === 'qr');
            if (!qrExists) {
                data.images.push({
                    id: 'qr',
                    url: 'https://cdn-icons-png.flaticon.com/512/714/714390.png',
                    x: 85,
                    y: 50,
                    scale: 0.6,
                    width: 100, height: 100
                });
            }
        }

        return { data: data as CardFaceData };

    } catch (error: any) {
        console.error("Gemini Generation Failed. Full Error:", error);
        return { data: null, error: error.message || "Unknown Error" };
    }
};

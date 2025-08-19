import { Bookmark } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// This function determines if the app should use the mock service.
// It returns true if the API_KEY is not set.
const shouldUseMock = !process.env.API_KEY;

const MOCK_DELAY = 1500;
const createMockResponse = (url: string): Omit<Bookmark, 'id' | 'createdAt' | 'notes'> => ({
    url,
    title: `Mock Title for ${url}`,
    description: "This is a mock description generated because the Gemini API key is not available. The AI would normally generate a detailed summary here.",
    imageUrl: `https://picsum.photos/seed/${Date.now()}/600/400`,
    tags: ['mock', 'sample-data', 'placeholder'],
    openInIframe: true,
});

const callFrontendGemini = async (url: string): Promise<Omit<Bookmark, 'id' | 'createdAt' | 'notes'>> => {
    // =================================================================================
    // --- Frontend-Only Gemini API Implementation (INSECURE - for development) ---
    // This section calls the Gemini API directly from the browser.
    // WARNING: This is insecure and should NOT be used in production as it exposes your API key.
    // =================================================================================
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ['title', 'description', 'imageUrl', 'tags']
        };
        
        const prompt = `
            You are an expert bookmarking assistant. Based on the URL "${url}", infer the content and generate a suitable title, a one-paragraph description, and 4-5 relevant tags.
            For the image, create a placeholder URL using a service like picsum.photos, like this: \`https://picsum.photos/seed/example/600/400\`. Replace 'example' with a relevant keyword from the URL.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        let parsed;
        try {
            parsed = JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse Gemini JSON response (frontend):", response.text);
            throw new Error("Received invalid JSON from AI model.");
        }

        return {
            url,
            title: parsed.title,
            description: parsed.description,
            imageUrl: parsed.imageUrl,
            tags: parsed.tags,
            openInIframe: true, // Default to true for frontend-only mode.
        };
    } catch (geminiError: any) {
         console.error("Frontend Gemini call failed:", geminiError);
         throw new Error(`Frontend analysis failed: ${geminiError.message}`);
    }
};

export const analyzeUrl = async (url: string): Promise<Omit<Bookmark, 'id' | 'createdAt' | 'notes'>> => {
    // 1. If API key is missing entirely, use the mock service.
    if (shouldUseMock) {
        console.warn("API_KEY environment variable not set. Using a mock service. Please follow guide.md to set up the backend for full functionality.");
        return new Promise(resolve => setTimeout(() => resolve(createMockResponse(url)), MOCK_DELAY));
    }

    // 2. Prioritize using the backend service, which is more secure and powerful.
    const BACKEND_URL = 'http://localhost:3001/api/analyze-url';
    try {
        console.log(`Attempting to analyze URL via backend: ${url}`);
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Backend error: ${response.statusText}`);
        }
        // The backend provides the `openInIframe` property.
        return data;

    } catch (backendError: any) {
        // 3. If the backend fails (e.g., not running), fall back to the insecure frontend Gemini call.
        console.warn(`Backend request failed: ${backendError.message}. Falling back to insecure frontend Gemini API call.`);
        return callFrontendGemini(url);
    }
};

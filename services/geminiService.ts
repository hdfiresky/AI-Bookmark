import { Bookmark } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// This function determines if the app should use the mock service.
// It returns true if the API_KEY is not set, indicating a local development environment without a backend.
const shouldUseMock = !process.env.API_KEY;

const MOCK_DELAY = 1500;
const createMockResponse = (url: string): Omit<Bookmark, 'id' | 'createdAt' | 'notes'> => ({
    url,
    title: `Mock Title for ${url}`,
    description: "This is a mock description generated because the Gemini API key is not available, which means the backend is not running. The AI would normally generate a detailed summary here.",
    imageUrl: `https://picsum.photos/seed/${Date.now()}/600/400`,
    tags: ['mock', 'sample-data', 'placeholder'],
});


export const analyzeUrl = async (url: string): Promise<Omit<Bookmark, 'id' | 'createdAt' | 'notes'>> => {
    // Use the mock service if the API_KEY is not available (i.e., no backend is expected to be running).
    if (shouldUseMock) {
        console.warn("API_KEY environment variable not set. Using a mock service. Please run the backend for full functionality or set API_KEY in project metadata.");
        return new Promise(resolve => setTimeout(() => resolve(createMockResponse(url)), MOCK_DELAY));
    }

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
        };

    } catch (error) {
        console.error("Error calling Gemini API from frontend:", error);
        return {
            url,
            title: `Error analyzing: ${url}`,
            description: "Could not fetch metadata from Gemini API. Check your API key and network connection.",
            imageUrl: `https://picsum.photos/seed/error/600/400`,
            tags: ["error", "frontend-api"],
        };
    }
    
    /*
    // =================================================================================
    // --- Backend Integration (SECURE - for production) ---
    // This version communicates with your secure backend instead of the Gemini API directly.
    // See the guide.md file for instructions on setting up the backend server.
    // To enable this, comment out the "Frontend-Only" section above and uncomment this one.
    // =================================================================================
    const BACKEND_API_URL = 'http://localhost:3001/api/analyze-url';
    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Request failed with status ${response.status}` }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Error calling backend to analyze URL:", error);
        return {
            url,
            title: `Error analyzing: ${url}`,
            description: "Could not fetch metadata from backend. The backend server might be down or the URL is inaccessible.",
            imageUrl: `https://picsum.photos/seed/error/600/400`,
            tags: ["error", "backend"],
        };
    }
    */
};

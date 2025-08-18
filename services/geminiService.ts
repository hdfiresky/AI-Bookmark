import { GoogleGenAI } from "@google/genai";
import { Bookmark } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using a mock service.");
}

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

const MOCK_DELAY = 1500;
const createMockResponse = (url: string): Omit<Bookmark, 'id' | 'createdAt' | 'notes' | 'imageUrl'> & { imageUrl: string } => ({
    url,
    title: `Mock Title for ${url}`,
    description: "This is a mock description generated because the Gemini API key is not available. The AI would normally generate a detailed summary of the page content here.",
    imageUrl: `https://picsum.photos/seed/${Date.now()}/600/400`,
    tags: ['mock', 'sample-data', 'placeholder'],
});


// --- BACKEND INTEGRATION: The following code calls the Gemini API directly from the frontend. ---
// --- This is not secure for production. For backend integration, comment out this entire function... ---
export const analyzeUrl = async (url: string): Promise<Omit<Bookmark, 'id' | 'createdAt' | 'notes'>> => {
    if (!ai) {
        return new Promise(resolve => setTimeout(() => resolve(createMockResponse(url)), MOCK_DELAY));
    }

    try {
        const prompt = `Analyze the content of the URL: ${url}. Based on its live content, return ONLY a single JSON object with the following keys: "title", "description", "imageUrl", "tags".
- "title": A concise and accurate title for the webpage.
- "description": A detailed one-paragraph summary of the page's main content.
- "imageUrl": A relevant, high-quality image URL that represents the content. If no specific image is found, use a placeholder from a service like picsum.photos.
- "tags": An array of 4-5 relevant keywords or tags in lowercase.
Do not include any other text, markdown formatting (like \`\`\`json), or explanations outside of the single JSON object response.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        // The response text can sometimes be wrapped in markdown, so we clean it.
        const textResponse = response.text.trim();
        const jsonString = textResponse.replace(/^```(json)?\s*/, '').replace(/```\s*$/, '');
        
        const parsed = JSON.parse(jsonString);

        if (!parsed.title || !parsed.description || !parsed.tags) {
            throw new Error("Invalid data structure from API");
        }
        
        return {
            url,
            title: parsed.title,
            description: parsed.description,
            imageUrl: parsed.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(url)}/600/400`,
            tags: parsed.tags,
        };

    } catch (error) {
        console.error("Error analyzing URL with Gemini API:", error);
        // Fallback to a structured error response
        return {
            url,
            title: `Error analyzing: ${url}`,
            description: "Could not fetch metadata. The URL may be inaccessible or the API may have encountered an error.",
            imageUrl: `https://picsum.photos/seed/error/600/400`,
            tags: ["error"],
        };
    }
};
// --- ...and uncomment the function below. ---

/*
// --- START: BACKEND INTEGRATION CODE ---
// This version of analyzeUrl communicates with your secure backend instead of the Gemini API directly.
const BACKEND_API_URL = 'http://localhost:3001/api/analyze-url';

export const analyzeUrl = async (url: string): Promise<Omit<Bookmark, 'id' | 'createdAt' | 'notes'>> => {
    // If you want to keep the mock functionality for frontend dev without a running backend, you can add this check.
    if (!process.env.API_KEY) {
        console.warn("API_KEY not found. Using mock service for backend integration path.");
        return new Promise(resolve => setTimeout(() => resolve(createMockResponse(url)), MOCK_DELAY));
    }

    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json();
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
};
// --- END: BACKEND INTEGRATION CODE ---
*/

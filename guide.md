# Backend Setup Guide for AI Bookmark Manager

## Why You Need a Backend

The current frontend application calls the Gemini API directly. This requires placing your `API_KEY` in the frontend code's environment variables. While this works for development, it is **highly insecure for a production application**. Anyone who inspects your web app's code can find your API key and use it, potentially leading to unexpected charges and abuse of your account.

To secure your API key, we will create a simple backend server. The server will store the API key securely and act as a proxy. Your frontend will make requests to your backend, and your backend will then make the secure requests to the Gemini API.

## Technology Stack

We will use a simple and popular stack that's easy for JavaScript developers to understand:

*   **Node.js:** A JavaScript runtime to run our server.
*   **Express.js:** A minimal and flexible Node.js web application framework.
*   **`@google/genai`:** The same Gemini SDK we use on the frontend.
*   **`axios`:** To fetch the content of web pages.
*   **`cheerio`:** To parse HTML and extract data, much like jQuery.
*   **`cors`:** To allow our frontend application to make requests to our backend.
*   **`dotenv`:** To manage environment variables like our API key.

## Step-by-Step Setup

### 1. Create the Backend Directory

In the root of your project, create a new folder named `backend`.

```bash
mkdir backend
cd backend
```

### 2. Initialize a Node.js Project

Inside the `backend` directory, run the following command to create a `package.json` file.

```bash
npm init -y
```

### 3. Install Dependencies

Now, let's install the necessary packages.

```bash
npm install express @google/genai cors dotenv axios cheerio
```

### 4. Create Server File and Environment Variables

1.  Create a file named `server.js` in the `backend` directory. This will be our main server file.
2.  Create a file named `.env` in the `backend` directory. This is where we'll store our secret API key.
3.  Create a file named `.gitignore` and add `.env` and `node_modules/` to it.

Your `backend` directory should now look like this:

```
backend/
├── .env
├── .gitignore
├── server.js
├── package.json
└── node_modules/
```

### 5. Configure Environment Variables

Open the `.env` file and add your Gemini API key.

**.env**
```
API_KEY=YOUR_GEMINI_API_KEY_HERE
PORT=3001
```

### 6. Write the Server Code

Open `server.js` and paste the following code. This code sets up an Express server with one endpoint: `/api/analyze-url`. This improved version includes robust validation and error handling to ensure URLs are both well-formed and reachable before analysis.

**server.js**
```javascript
// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenAI, Type } = require("@google/genai");

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY is not defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Middleware ---
app.use(cors()); // Allow requests from our frontend
app.use(express.json()); // Allow the server to parse JSON request bodies

// --- Helper Functions ---
const toAbsoluteUrl = (baseUrl, relativeUrl) => {
    if (!relativeUrl || relativeUrl.startsWith('http') || relativeUrl.startsWith('//')) {
        return relativeUrl.startsWith('//') ? `https:${relativeUrl}` : relativeUrl;
    }
    try {
        return new URL(relativeUrl, baseUrl).href;
    } catch (e) {
        return null; // Ignore invalid URLs
    }
};

// --- API Routes ---
app.post('/api/analyze-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Server-side URL format validation
    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ error: 'The provided URL format is invalid.' });
    }

    console.log(`Analyzing URL: ${url}`);

    try {
        // 1. Fetch the webpage and its headers
        const axiosResponse = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
            timeout: 10000,
        });
        const html = axiosResponse.data;
        const headers = axiosResponse.headers;

        // 2. Check security headers to determine if it can be iframed
        let openInIframe = true;
        const xFrameOptions = headers['x-frame-options']?.toUpperCase() || '';
        const csp = headers['content-security-policy'] || '';
        
        if (xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN') {
            openInIframe = false;
        }

        if (csp.includes("frame-ancestors 'none'") || csp.includes("frame-ancestors 'self'")) {
            openInIframe = false;
        }

        // 3. Extract and clean content
        const $ = cheerio.load(html);
        $('script, style, nav, footer, header, noscript, svg, aside, form, button, input').remove();
        const contentContainer = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
        let bodyText = '';
        contentContainer.find('h1, h2, h3, h4, p, li, pre, code').each((i, el) => {
            bodyText += $(el).text().trim() + '\n\n';
        });
        if (!bodyText.trim()) bodyText = contentContainer.text();
        bodyText = bodyText.replace(/\s\s+/g, ' ').trim();
        const MAX_TEXT_LENGTH = 8000;
        const truncatedText = bodyText.substring(0, MAX_TEXT_LENGTH);

        // 4. Extract potential image URLs
        const imageUrls = new Set();
        const addUrl = (u) => {
            const absolute = toAbsoluteUrl(url, u);
            if (absolute) imageUrls.add(absolute);
        };
        addUrl($('meta[property="og:image"]').attr('content'));
        addUrl($('meta[name="twitter:image"]').attr('content'));
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.startsWith('data:')) addUrl(src);
        });
        const uniqueImageUrls = [...imageUrls].filter(Boolean).slice(0, 20);

        // 5. Construct the prompt for Gemini
        const prompt = `
            Analyze the following text content from the webpage at ${url}.
            Also, consider the list of image URLs found on the page.
            Webpage Text (truncated):
            ---
            ${truncatedText || 'No text content could be extracted.'}
            ---
            Image URLs found on the page (in order of probable relevance):
            ---
            ${uniqueImageUrls.length > 0 ? uniqueImageUrls.join('\n') : 'No images found.'}
            ---
            Based on the provided text and image URLs, generate a single JSON object with:
            1. "title": A concise and accurate title.
            2. "description": A detailed, one-paragraph summary.
            3. "tags": An array of 4-5 relevant keywords, all in lowercase.
            4. "imageUrl": The single best URL from the list that represents the page. If none are suitable, return an empty string.
        `;

        // 6. Define the expected JSON schema
        const schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['title', 'description', 'imageUrl', 'tags']
        };

        // 7. Call the Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });

        // 8. Safely parse and send the final response
        let parsed;
        try {
            parsed = JSON.parse(response.text);
        } catch(e) {
            console.error("Failed to parse Gemini JSON response:", response.text);
            throw new Error("Received invalid JSON from AI model.");
        }
        
        const result = {
            url,
            title: parsed.title,
            description: parsed.description,
            imageUrl: parsed.imageUrl || (uniqueImageUrls.length > 0 ? uniqueImageUrls[0] : `https://picsum.photos/seed/${encodeURIComponent(url)}/600/400`),
            tags: parsed.tags,
            openInIframe,
        };
        
        res.json(result);

    } catch (error) {
        console.error(`Error analyzing URL: ${url}`, error.message);
        
        let errorMessage = "An unknown error occurred while analyzing the URL.";
        let statusCode = 500; // Internal Server Error by default

        if (error.response) {
            // The request was made, but the server responded with an error (e.g., 404, 403)
            statusCode = 400;
            errorMessage = `Could not access this URL. The server responded with status: ${error.response.status}. The page may be private or no longer exist.`;
        } else if (error.request) {
            // The request was made, but no response was received (e.g., invalid domain, network error)
            statusCode = 400;
            errorMessage = `This URL could not be reached. Please check if the domain is correct and the site is online.`;
        } else if (error.message.includes("Received invalid JSON from AI model")) {
            // Specific error from our own logic
            statusCode = 500;
            errorMessage = "The AI model returned an unexpected response. Please try again."
        }
        
        console.log(`Responding with status ${statusCode} and message: ${errorMessage}`);
        res.status(statusCode).json({ error: errorMessage });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
```

### 7. Run the Backend Server

From inside the `backend` directory, run the following command:

```bash
node server.js
```

You should see the message: `Server is running on http://localhost:3001`. Your backend is now ready!

## Frontend Integration

The `services/geminiService.ts` file in your frontend is already configured to communicate with this backend server. As long as your backend is running, the app will now use this new, more powerful analysis engine to provide significantly more accurate bookmark details.
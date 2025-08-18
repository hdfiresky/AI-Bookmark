# Backend Setup Guide for AI Bookmark Manager

## Why You Need a Backend

The current frontend application calls the Gemini API directly. This requires placing your `API_KEY` in the frontend code's environment variables. While this works for development, it is **highly insecure for a production application**. Anyone who inspects your web app's code can find your API key and use it, potentially leading to unexpected charges and abuse of your account.

To secure your API key, we will create a simple backend server. The server will store the API key securely and act as a proxy. Your frontend will make requests to your backend, and your backend will then make the secure requests to the Gemini API.

## Technology Stack

We will use a simple and popular stack that's easy for JavaScript developers to understand:

*   **Node.js:** A JavaScript runtime to run our server.
*   **Express.js:** A minimal and flexible Node.js web application framework.
*   **`@google/genai`:** The same Gemini SDK we use on the frontend.
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
npm install express @google/genai cors dotenv
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

Open `server.js` and paste the following code. This code sets up an Express server with one endpoint: `/api/analyze-url`.

**server.js**
```javascript
// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require("@google/genai");

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

// --- API Routes ---
app.post('/api/analyze-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Analyzing URL: ${url}`);

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

        const textResponse = response.text.trim();
        const jsonString = textResponse.replace(/^```(json)?\s*/, '').replace(/```\s*$/, '');
        
        const parsed = JSON.parse(jsonString);

        if (!parsed.title || !parsed.description || !parsed.tags) {
            throw new Error("Invalid data structure from API");
        }
        
        const result = {
            url,
            title: parsed.title,
            description: parsed.description,
            imageUrl: parsed.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(url)}/600/400`,
            tags: parsed.tags,
        };
        
        res.json(result);

    } catch (error) {
        console.error("Error analyzing URL with Gemini API:", error);
        res.status(500).json({
            error: "Failed to analyze URL.",
            details: error.message
        });
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

The `services/geminiService.ts` file in your frontend has been updated with comments and a new block of code. To switch to using this new backend:

1.  Find the section marked for backend integration.
2.  **Comment out** the entire original `analyzeUrl` function that calls the Gemini API directly from the frontend.
3.  **Uncomment** the new `analyzeUrl` function that uses `fetch` to call your backend at `http://localhost:3001/api/analyze-url`.

Your frontend will now securely communicate with your backend, and your API key will be safe.

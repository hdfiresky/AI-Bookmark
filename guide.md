# Backend Setup Guide for AI Bookmark Manager

This guide covers setting up the secure, multi-user backend for the AI Bookmark Manager.

## Why You Need a Backend

The original frontend application, while functional for a single user, was insecure because it exposed the Gemini API key in the browser. This major update transitions the app to a secure, multi-user platform by introducing a backend server.

This backend provides:
*   **API Key Security:** Your Gemini API key is stored securely on the server and never exposed to users.
*   **User Authentication:** A full login/registration system allows multiple users to have their own private bookmark collections.
*   **Persistent Storage:** Bookmarks are stored in a database, so your data is safe and permanent.
*   **Smart, Hybrid URL Analysis:** The server uses an efficient hybrid approach. It performs a multi-step scrape of the webpage:
    1.  It prioritizes official metadata (like Open Graph `og:title` and `og:description`).
    2.  If the meta description is missing or too short, it intelligently falls back to scraping the first few paragraphs from the page's main content (`<article>` or `<main>` sections).
    3.  This pre-processed, high-quality information is then passed to the Gemini API for final refinement and tag generation. This method is faster, cheaper, and yields more accurate results.

## Frontend Architecture & Development Mode

The frontend is now split into two main components to provide a clean separation between development and production modes:

*   **`components/LocalApp.tsx`**: A self-contained version of the app that uses your browser's **Local Storage** to save bookmarks. It does **not** require the backend to be running. This is perfect for UI development or offline use.
*   **`components/BackendApp.tsx`**: The full-featured, secure version of the app. It handles user login/registration and communicates with the backend server for all operations. This is the version you should use for production.

### How to Switch Modes

You can easily switch between these two modes in `App.tsx`:

```typescript
// Open src/App.tsx

// Set to 'local' for frontend development (no backend needed).
// Set to 'backend' for production or full-stack testing.
const APP_MODE: 'backend' | 'local' = 'local'; 
```

**It is critical to set `APP_MODE` to `'backend'` before deploying your application.**

---

## Backend Technology Stack

*   **Node.js & Express.js:** To run our server and handle API requests.
*   **SQLite:** A simple, file-based database that requires no separate installation, making setup incredibly easy.
*   **`@google/genai`:** The official Gemini SDK.
*   **Authentication:**
    *   **`jsonwebtoken`:** To create and verify JSON Web Tokens (JWT) for managing user sessions.
    *   **`bcrypt`:** To securely hash user passwords before storing them.
    *   **`express-rate-limit`:** To protect the login endpoint from brute-force attacks.
*   **Web Scraping & Other:** `axios` (HTTP requests), `cheerio` (HTML parsing), `cors`, `dotenv`.

## Step-by-Step Setup

### 1. Create/Navigate to the Backend Directory

If you haven't already, create a `backend` folder in your project root.

```bash
mkdir backend
cd backend
```

### 2. Initialize a Node.js Project

If you don't have a `package.json` file yet, create one.

```bash
npm init -y
```

### 3. Install ALL Dependencies

This command installs Express, the Gemini SDK, database drivers, authentication libraries, and other utilities.

```bash
npm install express @google/genai cors dotenv axios cheerio sqlite3 jsonwebtoken bcrypt express-rate-limit
```

### 4. Create Server Files and Environment Variables

1.  Create `server.js`, `.env`, and `.gitignore` files in the `backend` directory.
2.  Create a `db` folder inside `backend` and a file inside it called `initialize.js`.

Your `backend` directory should now look like this:
```
backend/
├── db/
│   └── initialize.js
├── .env
├── .gitignore
├── server.js
├── package.json
└── node_modules/
```
Add `.env`, `node_modules/`, and `database.sqlite` to your `.gitignore` file.

### 5. Configure Environment Variables

Open the `.env` file. You need to add your Gemini API key, a port, and a **secret key for signing JWTs**. This secret can be any long, random string.

**.env**
```
API_KEY=YOUR_GEMINI_API_KEY_HERE
PORT=3001
JWT_SECRET=YOUR_SUPER_SECRET_RANDOM_STRING_FOR_SIGNING_TOKENS
```

### 6. Create the Database Initialization Script

Paste the following code into `backend/db/initialize.js`. This script sets up the `users` and `bookmarks` tables in your SQLite database.

**db/initialize.js**
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    console.log('Initializing database...');

    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Users table created or already exists.');
        }
    });

    // Create bookmarks table
    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            userId INTEGER NOT NULL,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            imageUrl TEXT,
            tags TEXT,
            notes TEXT,
            createdAt TEXT NOT NULL,
            openInIframe BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        )
    `, (err) => {
         if (err) {
            console.error('Error creating bookmarks table:', err.message);
        } else {
            console.log('Bookmarks table created or already exists.');
        }
    });

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
});
```

### 7. Run the Initialization Script

From inside the `backend` directory, run the script **once** to create your database file and tables.

```bash
node db/initialize.js
```
You will now see a `database.sqlite` file in your `backend` directory.

### 8. Write the Server Code

Open `server.js` and paste the following complete backend code.

**server.js**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI, Type } = require("@google/genai");

// --- Configuration & Initialization ---
const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!API_KEY || !JWT_SECRET) {
    throw new Error("API_KEY and JWT_SECRET must be defined in the .env file");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('DB Connection Error:', err.message);
    else console.log('Connected to the SQLite database.');
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 login requests per window
	message: { error: 'Too many login attempts, please try again after 15 minutes.' },
	standardHeaders: true,
	legacyHeaders: false,
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
};


// --- Authentication Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        stmt.run(username, hashedPassword, function (err) {
            if (err) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            res.status(201).json({ success: true, message: 'User registered successfully' });
        });
        stmt.finalize();
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token: accessToken });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});


// --- Bookmark Routes (Protected) ---

// GET all bookmarks for a user
app.get('/api/bookmarks', authenticateToken, (req, res) => {
    db.all("SELECT * FROM bookmarks WHERE userId = ? ORDER BY createdAt DESC", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Deserialize tags from JSON string to array
        const bookmarks = rows.map(b => ({...b, tags: JSON.parse(b.tags || '[]')}));
        res.json(bookmarks);
    });
});

// POST a new bookmark (analyze and save)
app.post('/api/bookmarks', authenticateToken, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        // --- Step 1: Scrape the page for high-quality metadata ---
        const axiosResponse = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } 
        });
        const html = axiosResponse.data;
        const $ = cheerio.load(html);

        // Prioritized extraction
        const extractedTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text();
        
        // Advanced description extraction with fallback
        let extractedDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
        
        // If meta description is too short or missing, fall back to scraping page content
        const wordCount = extractedDescription.trim().split(/\s+/).length;
        if (wordCount < 10) {
            let contentText = '';
            const mainContentEl = $('article').first().length ? $('article').first() : $('main').first();
            if (mainContentEl.length) {
                mainContentEl.find('p').each((i, el) => {
                    if (contentText.length < 350) { // Gather a reasonable amount of text
                        contentText += $(el).text().trim() + ' ';
                    }
                });
            }
            if (contentText.trim()) {
                extractedDescription = contentText.trim();
            }
        }

        const imageUrl = $('meta[property="og:image"]').attr('content') || `https://picsum.photos/seed/${encodeURIComponent(url)}/600/400`;
        
        // Check iframe compatibility
        const headers = axiosResponse.headers;
        let openInIframe = true;
        if (headers['x-frame-options']?.toUpperCase().includes('DENY') || headers['x-frame-options']?.toUpperCase().includes('SAMEORIGIN')) {
            openInIframe = false;
        }
        if (headers['content-security-policy']?.includes("frame-ancestors 'none'") || headers['content-security-policy']?.includes("frame-ancestors 'self'")) {
            openInIframe = false;
        }

        // --- Step 2: Create a minimal, targeted prompt for Gemini ---
        const prompt = `
            You are an expert bookmarking assistant. I have extracted the following information from a webpage.
            - URL: "${url}"
            - Extracted Title: "${extractedTitle}"
            - Extracted Content/Description: "${extractedDescription.substring(0, 500)}"

            Based ONLY on this information, perform the following tasks:
            1.  **Validate/Refine Title:** Use the "Extracted Title". If it seems incomplete, generic, or missing, create a concise, compelling title.
            2.  **Create a Summary:** Based on the "Extracted Content/Description", write a new, neutral, one-paragraph summary.
            3.  **Generate Tags:** Generate an array of 4-5 relevant, lowercase tags based on the content.

            Return the result as a single, minified JSON object with the keys "title", "description", and "tags".
        `;

        const schema = { 
            type: Type.OBJECT, 
            properties: { 
                title: { type: Type.STRING }, 
                description: { type: Type.STRING }, 
                tags: { type: Type.ARRAY, items: { type: Type.STRING } } 
            }, 
            required: ['title', 'description', 'tags'] 
        };
        
        const geminiResponse = await ai.models.generateContent({ 
            model: "gemini-2.5-flash", 
            contents: prompt, 
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const analysis = JSON.parse(geminiResponse.text);

        // --- Step 3: Save the final bookmark to the database ---
        const newBookmark = {
            id: new Date().toISOString() + Math.random(),
            userId: req.user.id,
            url,
            title: analysis.title,
            description: analysis.description,
            imageUrl,
            tags: JSON.stringify(analysis.tags),
            notes: '',
            createdAt: new Date().toISOString(),
            openInIframe,
        };
        
        const stmt = db.prepare("INSERT INTO bookmarks (id, userId, url, title, description, imageUrl, tags, notes, createdAt, openInIframe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(Object.values(newBookmark), function (err) {
            if (err) return res.status(500).json({ error: 'Failed to save bookmark' });
            res.status(201).json({...newBookmark, tags: analysis.tags});
        });
        stmt.finalize();

    } catch (error) {
        console.error(`Error processing URL ${url}:`, error.message);
        res.status(500).json({ error: `Failed to analyze URL. The site may be unreachable or block automated access.` });
    }
});

// PUT (update) a bookmark's notes and tags
app.put('/api/bookmarks/:id', authenticateToken, (req, res) => {
    const { notes, tags } = req.body;
    const { id } = req.params;

    const stmt = db.prepare("UPDATE bookmarks SET notes = ?, tags = ? WHERE id = ? AND userId = ?");
    stmt.run(notes, JSON.stringify(tags), id, req.user.id, function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update bookmark' });
        if (this.changes === 0) return res.status(404).json({ error: 'Bookmark not found or permission denied' });
        
        db.get("SELECT * FROM bookmarks WHERE id = ?", [id], (err, row) => {
            if (err || !row) return res.status(404).json({ error: 'Bookmark not found' });
            res.json({...row, tags: JSON.parse(row.tags || '[]')});
        });
    });
    stmt.finalize();
});

// DELETE a bookmark
app.delete('/api/bookmarks/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM bookmarks WHERE id = ? AND userId = ?");
    stmt.run(id, req.user.id, function (err) {
        if (err) return res.status(500).json({ error: 'Failed to delete bookmark' });
        if (this.changes === 0) return res.status(404).json({ error: 'Bookmark not found or permission denied' });
        res.json({ success: true });
    });
    stmt.finalize();
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
```

### 9. Run the Backend Server

From inside the `backend` directory, start the server.

```bash
node server.js
```

You should see: `Connected to the SQLite database.` followed by `Server is running on http://localhost:3001`. Your secure, database-powered backend is now ready! Your frontend application will automatically use it for a vastly improved experience.
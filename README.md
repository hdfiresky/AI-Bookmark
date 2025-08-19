# AI Bookmark Manager

An intelligent bookmark manager that uses the Google Gemini API to automatically analyze URLs, fetch metadata, and suggest tags. It features full CRUD functionality, advanced search, infinite scrolling, and a sleek, dark-themed interface. The application can run in two modes: a simple, standalone **local mode** using browser storage, or a secure, multi-user **backend mode** with a Node.js server and SQLite database.

---
## ✨ Features

-   **AI-Powered Analysis:** Automatically generates a title, description, and relevant tags for each URL using the Gemini API.
-   **Dual Operation Modes:**
    -   **Local Mode:** Perfect for single-user, offline-first use. All data is stored in your browser's Local Storage. No backend required.
    -   **Backend Mode:** A full-stack solution with user authentication, secure API key management, and a persistent SQLite database for multi-user support.
-   **Smart & Efficient Backend:** The server uses a hybrid approach, first scraping a webpage for key metadata and then passing a refined prompt to the Gemini API, resulting in faster, cheaper, and more accurate analysis.
-   **Full CRUD Functionality:** Create, read, update, and delete your bookmarks with ease.
-   **Responsive & Modern UI:** A sleek, dark-themed interface built with React and Tailwind CSS.
-   **Advanced Search & Filtering:** Quickly find bookmarks by searching across titles, descriptions, URLs, tags, and personal notes.
-   **Customizable Layout:** Switch between a detailed 'Card' view and a compact 'Icon' view. Adjust the number of columns to fit your screen.
-   **Infinite Scrolling:** Effortlessly browse through your entire collection.
-   **In-App Browser:** (Mobile) Open links within the app for a seamless experience.

---
## 💻 Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS, `@google/genai`
-   **Backend:** Node.js, Express.js
-   **Database:** SQLite
-   **Authentication:** JSON Web Tokens (JWT), bcrypt
-   **Web Scraping:** Axios, Cheerio

---
## 🚀 Getting Started

This project can be run in two distinct modes. Choose the one that best fits your needs.

### Option 1: Local Mode (Frontend Only)

This is the quickest way to get the app running. It's ideal for UI development, testing, or simple personal use. It uses your browser's Local Storage to save bookmarks.

**⚠️ Security Warning:** In this mode, your Gemini API key is used directly in the browser. **Do not deploy this version publicly**, as it will expose your API key.

**Prerequisites:**
- A modern web browser.
- A Google Gemini API Key.

**Setup:**

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Configure API Key:**
    - Create a `.env` file in the project's root directory.
    - Add your Gemini API key to it:
      ```
      API_KEY=YOUR_GEMINI_API_KEY_HERE
      ```
    - *Note: If you run the app without an API key, it will operate in a mock mode with placeholder data.*

3.  **Set App Mode:**
    - Open `src/App.tsx`.
    - Ensure the `APP_MODE` constant is set to `'local'`:
      ```typescript
      const APP_MODE: 'backend' | 'local' = 'local';
      ```

4.  **Run the application:**
    - You need a simple local server to serve the `index.html` file. You can use an extension like "Live Server" in VS Code, or a simple command line server.
    - For example, using Python:
      ```bash
      python -m http.server
      ```
    - Open your browser and navigate to the provided local address (e.g., `http://localhost:8000`).

---
### Option 2: Backend Mode (Full Stack & Secure)

This mode provides a complete, secure, and persistent solution with user accounts. The backend handles all Gemini API calls, so your key is never exposed to the client.

**Prerequisites:**
- [Node.js](https://nodejs.org/) (v16 or later)
- A Google Gemini API Key.

**Setup Steps:**

#### 1. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    - Create a `.env` file inside the `backend` directory.
    - Add your API key, a port, and a secret for signing authentication tokens. The `JWT_SECRET` can be any long, random string.
      ```.env
      API_KEY=YOUR_GEMINI_API_KEY_HERE
      PORT=3001
      JWT_SECRET=YOUR_SUPER_SECRET_RANDOM_STRING_FOR_SIGNING_TOKENS
      ```

4.  **Initialize the Database:**
    - Run the initialization script **once** to create the `database.sqlite` file and set up the necessary tables.
      ```bash
      node db/initialize.js
      ```

5.  **Start the Backend Server:**
    ```bash
    node server.js
    ```
    - The server should now be running at `http://localhost:3001`.

#### 2. Frontend Setup

1.  **Set App Mode:**
    - Open `src/App.tsx` in the root directory.
    - Change the `APP_MODE` constant to `'backend'`:
      ```typescript
      const APP_MODE: 'backend' | 'local' = 'backend';
      ```

2.  **Run the Frontend:**
    - From the project's root directory, serve the `index.html` file using a local server (as described in the Local Mode setup).
    - Open your browser to the local address. The app will automatically connect to your running backend. You can now register an account and start saving bookmarks.

---
## 🏛️ Architecture

The application is designed with a clear separation between its two operational modes, controlled by the `APP_MODE` flag in `src/App.tsx`.

-   **`components/LocalApp.tsx`**: A self-contained version of the app that uses local storage and a frontend-only `geminiService`. It's great for development and demonstrates the core UI components.
-   **`components/BackendApp.tsx`**: The production-ready version that handles user authentication (`AuthPage.tsx`) and communicates with the backend server for all data operations via the `services/api.ts` module.

The backend server features a **smart analysis pipeline**:
1.  It first scrapes the target URL to extract high-quality metadata (like Open Graph tags and main page content).
2.  This pre-processed information is then used to construct a minimal, highly-targeted prompt for the Gemini API.
3.  This hybrid approach is faster, reduces API costs, and often yields more accurate and relevant results than simply passing a URL to the AI.

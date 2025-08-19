
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Bookmark, SearchFilters } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import Header from './components/Header';
import AddBookmarkForm from './components/AddBookmarkForm';
import BookmarkCard from './components/BookmarkCard';
import BookmarkModal from './components/BookmarkModal';
import ConfirmationModal from './components/ConfirmationModal';
import InAppBrowser from './components/InAppBrowser';
import AuthPage from './components/AuthPage';
import * as api from './services/api';
import { analyzeUrl } from './services/geminiService'; // Required for 'local' mode

// --- App Mode Configuration ---
// Set to 'backend' to use the full authentication and persistent database features.
// Set to 'local' to use the app in a single-user mode with data stored in the browser's local storage.
// This allows the app to be fully functional without running the backend server.
const APP_MODE: 'backend' | 'local' = 'local';

const ITEMS_PER_PAGE = 12;

export default function App(): React.ReactNode {
  // --- State for local mode (uses browser's local storage) ---
  const [localBookmarks, setLocalBookmarks] = useLocalStorage<Bookmark[]>('bookmarks', []);

  // --- State for backend mode ---
  const [serverBookmarks, setServerBookmarks] = useState<Bookmark[]>([]);
  const [token, setToken] = useLocalStorage<string | null>('authToken', null);
  
  // --- Shared State ---
  const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>(APP_MODE === 'backend' ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    title: true,
    description: true,
    url: true,
    tags: true,
    notes: true,
  });

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<Bookmark | null>(null);
  const [browsingUrl, setBrowsingUrl] = useState<string | null>(null);
  
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const observer = useRef<IntersectionObserver | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- Data Source ---
  const bookmarks = APP_MODE === 'local' ? localBookmarks : serverBookmarks;

  // --- Backend-specific logic for fetching initial data ---
  const fetchBookmarks = useCallback(async () => {
    if (!token) return;
    setAppState('loading');
    try {
      const fetchedBookmarks = await api.getBookmarks(token);
      setServerBookmarks(fetchedBookmarks);
      setAppState('ready');
    } catch (err: any) {
      console.error("Failed to fetch bookmarks:", err);
      setError(err.message || "Could not load your bookmarks.");
      setAppState('error');
    }
  }, [token]);

  useEffect(() => {
    if (APP_MODE === 'backend') {
      if (token) {
        fetchBookmarks();
      } else {
        setAppState('ready'); // Ready to show login page
      }
    }
  }, [token, fetchBookmarks]);

  // --- Effect to lock body scroll when any modal is open ---
  useEffect(() => {
    if (browsingUrl || editingBookmark || deletingBookmark) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [browsingUrl, editingBookmark, deletingBookmark]);

  // --- Filtering and Infinite Scroll Logic (common for both modes) ---
  const filteredBookmarks = useMemo(() => {
    if (!debouncedSearchTerm) return bookmarks;
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    
    return bookmarks.filter((bookmark) => {
      const inTitle = searchFilters.title && bookmark.title.toLowerCase().includes(lowercasedTerm);
      const inDescription = searchFilters.description && bookmark.description.toLowerCase().includes(lowercasedTerm);
      const inUrl = searchFilters.url && bookmark.url.toLowerCase().includes(lowercasedTerm);
      const inTags = searchFilters.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm));
      const inNotes = searchFilters.notes && bookmark.notes?.toLowerCase().includes(lowercasedTerm);
      
      return inTitle || inDescription || inUrl || inTags || inNotes;
    });
  }, [bookmarks, debouncedSearchTerm, searchFilters]);

  const visibleBookmarks = useMemo(() => {
    return filteredBookmarks.slice(0, visibleCount);
  }, [filteredBookmarks, visibleCount]);

  const lastBookmarkElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredBookmarks.length) {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
      }
    });
    if (node) observer.current.observe(node);
  }, [filteredBookmarks.length, visibleCount]);

  // --- Mode-dependent CRUD Operations ---
  const addBookmark = useCallback(async (url: string) => {
    if (APP_MODE === 'backend') {
      if (!token) throw new Error("Authentication required.");
      const newBookmark = await api.createBookmark(url, token);
      setServerBookmarks(prev => [newBookmark, ...prev]);
    } else {
      const analysis = await analyzeUrl(url);
      const newBookmark: Bookmark = {
        ...analysis,
        id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
        notes: '',
        createdAt: new Date().toISOString(),
      };
      setLocalBookmarks(prev => [newBookmark, ...prev]);
    }
  }, [token, setServerBookmarks, setLocalBookmarks]);

  const updateBookmark = useCallback(async (updatedBookmark: Bookmark) => {
    if (APP_MODE === 'backend') {
      if (!token) throw new Error("Authentication required.");
      const savedBookmark = await api.updateBookmark(updatedBookmark, token);
      setServerBookmarks(prev => prev.map(b => b.id === savedBookmark.id ? savedBookmark : b));
    } else {
      setLocalBookmarks(prev => prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b));
    }
    setEditingBookmark(null);
  }, [token, setServerBookmarks, setLocalBookmarks]);

  const deleteBookmark = useCallback(async (id: string) => {
    if (APP_MODE === 'backend') {
      if (!token) throw new Error("Authentication required.");
      await api.deleteBookmark(id, token);
      setServerBookmarks(prev => prev.filter(b => b.id !== id));
    } else {
      setLocalBookmarks(prev => prev.filter(b => b.id !== id));
    }
    setDeletingBookmark(null);
  }, [token, setServerBookmarks, setLocalBookmarks]);
  
  const handleOpenBookmark = useCallback((bookmark: Bookmark) => {
    if (bookmark.openInIframe === false) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    } else {
      setBrowsingUrl(bookmark.url);
    }
  }, []);

  // --- Auth Handlers (backend mode only) ---
  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setServerBookmarks([]); // Clear server bookmarks on logout
  };

  // --- Render Logic ---
  if (APP_MODE === 'backend') {
    if (appState === 'loading' && !serverBookmarks.length) {
      return (
          <div className="min-h-screen bg-gray-950 flex justify-center items-center">
              <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin-slow border-cyan-500"></div>
          </div>
      );
    }

    if (!token) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} />;
    }
  }

  // --- Main App UI (for local mode, or for backend mode after login) ---
  return (
    <div className="min-h-screen bg-gray-950 font-sans">
      <main className="container mx-auto px-4 py-8">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
          onLogout={APP_MODE === 'backend' ? handleLogout : undefined}
        />
        
        <AddBookmarkForm onAddBookmark={addBookmark} />

        {appState === 'error' && <div className="text-center mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}

        {visibleBookmarks.length > 0 ? (
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 mt-8">
            {visibleBookmarks.map((bookmark, index) => (
              <div 
                ref={index === visibleBookmarks.length - 1 ? lastBookmarkElementRef : null} 
                key={bookmark.id}
                className="break-inside-avoid mb-6"
              >
                <BookmarkCard 
                  bookmark={bookmark}
                  onEdit={() => setEditingBookmark(bookmark)}
                  onDelete={() => setDeletingBookmark(bookmark)}
                  onOpen={() => handleOpenBookmark(bookmark)}
                />
              </div>
            ))}
          </div>
        ) : (
          appState === 'ready' && debouncedSearchTerm.length === 0 && (
             <div className="text-center mt-20 text-gray-400">
                <p className="text-2xl font-semibold">Your library is empty.</p>
                <p>Add your first bookmark using the form above!</p>
            </div>
          )
        )}
        
        {appState === 'ready' && filteredBookmarks.length === 0 && debouncedSearchTerm.length > 0 && (
            <div className="text-center mt-20 text-gray-400">
                <p className="text-xl">No bookmarks found.</p>
                <p>Try adjusting your search terms.</p>
            </div>
        )}

        {visibleCount < filteredBookmarks.length && (
            <div className="flex justify-center mt-8">
                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
            </div>
        )}

        {editingBookmark && (
          <BookmarkModal 
            bookmark={editingBookmark}
            onClose={() => setEditingBookmark(null)}
            onSave={updateBookmark}
            onDelete={() => {
              setDeletingBookmark(editingBookmark);
              setEditingBookmark(null);
            }}
            onOpen={() => handleOpenBookmark(editingBookmark)}
          />
        )}

        {deletingBookmark && (
          <ConfirmationModal
            title="Delete Bookmark"
            message={`Are you sure you want to delete "${deletingBookmark.title}"? This action cannot be undone.`}
            onConfirm={() => deleteBookmark(deletingBookmark.id)}
            onCancel={() => setDeletingBookmark(null)}
          />
        )}

        {browsingUrl && (
            <InAppBrowser url={browsingUrl} onClose={() => setBrowsingUrl(null)} />
        )}
      </main>
    </div>
  );
}

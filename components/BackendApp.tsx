
import React, { useState, useCallback, useEffect } from 'react';
import { Bookmark } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useBookmarkGrid } from '../hooks/useBookmarkGrid';
import * as api from '../services/api';
import AuthPage from './AuthPage';
import Header from './Header';
import AddBookmarkForm from './AddBookmarkForm';
import BookmarkCard from './BookmarkCard';
import BookmarkModal from './BookmarkModal';
import ConfirmationModal from './ConfirmationModal';
import InAppBrowser from './InAppBrowser';

/**
 * BackendApp is the full-featured version of the application that
 * connects to the backend server for authentication and data persistence.
 */
export default function BackendApp(): React.ReactNode {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [token, setToken] = useLocalStorage<string | null>('authToken', null);
  const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const {
    searchTerm,
    setSearchTerm,
    searchFilters,
    setSearchFilters,
    visibleBookmarks,
    filteredBookmarks,
    lastBookmarkElementRef,
    visibleCount,
    debouncedSearchTerm
  } = useBookmarkGrid(bookmarks);

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<Bookmark | null>(null);
  const [browsingUrl, setBrowsingUrl] = useState<string | null>(null);
  
  // Fetch initial data when the token is available
  const fetchBookmarks = useCallback(async () => {
    if (!token) return;
    setAppState('loading');
    try {
      const fetchedBookmarks = await api.getBookmarks(token);
      setBookmarks(fetchedBookmarks);
      setAppState('ready');
    } catch (err: any) {
      console.error("Failed to fetch bookmarks:", err);
      setError(err.message || "Could not load your bookmarks.");
      setAppState('error');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchBookmarks();
    } else {
      setAppState('ready'); // Ready to show login page
    }
  }, [token, fetchBookmarks]);
  
  // Effect to lock body scroll when any modal is open
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

  // --- API-driven CRUD Operations ---
  const addBookmark = useCallback(async (url: string) => {
    if (!token) throw new Error("Authentication required.");
    const newBookmark = await api.createBookmark(url, token);
    setBookmarks(prev => [newBookmark, ...prev]);
  }, [token]);

  const updateBookmark = useCallback(async (updatedBookmark: Bookmark) => {
    if (!token) throw new Error("Authentication required.");
    const savedBookmark = await api.updateBookmark(updatedBookmark, token);
    setBookmarks(prev => prev.map(b => b.id === savedBookmark.id ? savedBookmark : b));
    setEditingBookmark(null);
  }, [token]);

  const deleteBookmark = useCallback(async (id: string) => {
    if (!token) throw new Error("Authentication required.");
    await api.deleteBookmark(id, token);
    setBookmarks(prev => prev.filter(b => b.id !== id));
    setDeletingBookmark(null);
  }, [token]);
  
  const handleOpenBookmark = useCallback((bookmark: Bookmark) => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // On non-mobile devices, always open links in a new tab for a better desktop experience.
    if (!isMobile) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // On mobile devices, use the in-app browser if the site allows it.
    if (bookmark.openInIframe === false) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    } else {
      setBrowsingUrl(bookmark.url);
    }
  }, []);

  // --- Auth Handlers ---
  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setBookmarks([]); // Clear bookmarks on logout
  };

  // --- Render Logic ---
  if (appState === 'loading' && !bookmarks.length) {
    return (
        <div className="min-h-screen bg-gray-950 flex justify-center items-center">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin-slow border-cyan-500"></div>
        </div>
    );
  }

  if (!token) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans">
      <main className="container mx-auto px-4 py-8">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
          onLogout={handleLogout}
        />
        
        <AddBookmarkForm onAddBookmark={addBookmark} />

        {appState === 'error' && <div className="text-center mt-8 text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>}

        {visibleBookmarks.length > 0 ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-6 mt-8">
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
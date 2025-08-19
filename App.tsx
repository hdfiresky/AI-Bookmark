
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

const ITEMS_PER_PAGE = 12;

export default function App(): React.ReactNode {
  const [token, setToken] = useLocalStorage<string | null>('authToken', null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>('loading');
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
      setAppState('ready');
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
    if (bookmark.openInIframe === false) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    } else {
      setBrowsingUrl(bookmark.url);
    }
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setBookmarks([]);
  };

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

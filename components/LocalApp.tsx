import React, { useState, useCallback, useEffect } from 'react';
import { Bookmark, LayoutSettings } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useBookmarkGrid } from '../hooks/useBookmarkGrid';
import { analyzeUrl } from '../services/geminiService';
import Header from './Header';
import AddBookmarkForm from './AddBookmarkForm';
import BookmarkCard from './BookmarkCard';
import BookmarkIcon from './BookmarkIcon';
import BookmarkModal from './BookmarkModal';
import ConfirmationModal from './ConfirmationModal';
import InAppBrowser from './InAppBrowser';

/**
 * Provides initial layout settings based on screen width.
 * Defaults to 1 column for mobile and 4 for desktop.
 */
const getInitialLayoutSettings = (): LayoutSettings => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return {
        columns: isMobile ? 1 : 4,
        viewMode: 'card',
    };
};

/**
 * LocalApp is a self-contained version of the bookmark manager that
 * uses the browser's local storage for persistence. It does not require a backend.
 */
export default function LocalApp(): React.ReactNode {
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>('bookmarks', []);
  const [layoutSettings, setLayoutSettings] = useLocalStorage<LayoutSettings>('layoutSettings', getInitialLayoutSettings());
  
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
  } = useBookmarkGrid(bookmarks, layoutSettings.viewMode);

  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<Bookmark | null>(null);
  const [browsingUrl, setBrowsingUrl] = useState<string | null>(null);
  
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

  const addBookmark = useCallback(async (url: string) => {
    const pendingId = `pending-${Date.now()}`;
    const pendingBookmark: Bookmark = {
        id: pendingId,
        url: url,
        title: "Analyzing URL...",
        description: "The AI is summarizing this page. This card will update automatically.",
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(url)}/600/400`,
        tags: [],
        createdAt: new Date().toISOString(),
        status: 'pending',
    };

    setBookmarks(prev => [pendingBookmark, ...prev]);

    try {
        const analysis = await analyzeUrl(url);
        const newBookmark: Bookmark = {
          ...analysis,
          id: new Date().toISOString() + Math.random().toString(36).substr(2, 9),
          notes: '',
          createdAt: new Date().toISOString(),
        };
        setBookmarks(prev => prev.map(b => (b.id === pendingId ? newBookmark : b)));
    } catch (error) {
        console.error("Failed to add bookmark:", error);
        // Remove the pending bookmark on failure
        setBookmarks(prev => prev.filter(b => b.id !== pendingId));
        // Re-throw the error so the form can display it
        throw error;
    }
  }, [setBookmarks]);

  const updateBookmark = useCallback(async (updatedBookmark: Bookmark) => {
    setBookmarks(prev => prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b));
    setEditingBookmark(null);
  }, [setBookmarks]);

  const deleteBookmark = useCallback(async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    setDeletingBookmark(null);
  }, [setBookmarks]);
  
  const handleOpenBookmark = useCallback((bookmark: Bookmark) => {
    if (bookmark.status === 'pending') return;
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isMobile) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      return;
    }
    
    if (bookmark.openInIframe === false) { 
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    } else {
      setBrowsingUrl(bookmark.url);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 font-sans">
      <main className="container mx-auto px-4 py-8">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchFilters={searchFilters}
          setSearchFilters={setSearchFilters}
          layoutSettings={layoutSettings}
          setLayoutSettings={setLayoutSettings}
        />
        
        <AddBookmarkForm onAddBookmark={addBookmark} />

        {visibleBookmarks.length > 0 ? (
          <div 
             className="gap-6 mt-8"
             style={{
                columnCount: layoutSettings.columns,
                columnGap: '1.5rem',
             }}
          >
            {visibleBookmarks.map((bookmark, index) => (
              <div 
                ref={index === visibleBookmarks.length - 1 ? lastBookmarkElementRef : null} 
                key={bookmark.id}
                className="break-inside-avoid mb-6"
              >
                {layoutSettings.viewMode === 'card' ? (
                    <BookmarkCard 
                      bookmark={bookmark}
                      onEdit={() => setEditingBookmark(bookmark)}
                      onDelete={() => setDeletingBookmark(bookmark)}
                      onOpen={() => handleOpenBookmark(bookmark)}
                    />
                ) : (
                    <BookmarkIcon
                      bookmark={bookmark}
                      onEdit={() => setEditingBookmark(bookmark)}
                      onDelete={() => setDeletingBookmark(bookmark)}
                      onOpen={() => handleOpenBookmark(bookmark)}
                    />
                )}
              </div>
            ))}
          </div>
        ) : (
          debouncedSearchTerm.length === 0 && (
             <div className="text-center mt-20 text-gray-400">
                <p className="text-2xl font-semibold">Your library is empty.</p>
                <p>Add your first bookmark using the form above!</p>
            </div>
          )
        )}
        
        {filteredBookmarks.length === 0 && debouncedSearchTerm.length > 0 && (
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
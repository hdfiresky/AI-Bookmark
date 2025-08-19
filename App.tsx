import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Bookmark, SearchFilters } from './types';
import { SAMPLE_BOOKMARKS } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import Header from './components/Header';
import AddBookmarkForm from './components/AddBookmarkForm';
import BookmarkCard from './components/BookmarkCard';
import BookmarkModal from './components/BookmarkModal';
import ConfirmationModal from './components/ConfirmationModal';
import InAppBrowser from './components/InAppBrowser';

const ITEMS_PER_PAGE = 12;

export default function App(): React.ReactNode {
  const [bookmarks, setBookmarks] = useLocalStorage<Bookmark[]>('bookmarks', SAMPLE_BOOKMARKS);
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

  // Effect to lock body scroll when any modal is open
  useEffect(() => {
    if (browsingUrl || editingBookmark || deletingBookmark) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup on unmount
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

  const addBookmark = useCallback((newBookmark: Bookmark) => {
    setBookmarks(prev => [newBookmark, ...prev]);
  }, [setBookmarks]);

  const updateBookmark = useCallback((updatedBookmark: Bookmark) => {
    setBookmarks(prev => prev.map(b => b.id === updatedBookmark.id ? updatedBookmark : b));
    setEditingBookmark(null);
  }, [setBookmarks]);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    setDeletingBookmark(null);
  }, [setBookmarks]);
  
  const handleOpenBookmark = useCallback((bookmark: Bookmark) => {
    // If the backend determines the site can't be iframed, open in a new tab.
    // Defaults to iframe for existing bookmarks or if the flag is not present.
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
        />
        
        <AddBookmarkForm onAddBookmark={addBookmark} />

        {visibleBookmarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            {visibleBookmarks.map((bookmark, index) => (
              <div ref={index === visibleBookmarks.length - 1 ? lastBookmarkElementRef : null} key={bookmark.id}>
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
          <div className="text-center mt-20 text-gray-400">
            <p className="text-xl">No bookmarks found.</p>
            <p>Try adjusting your search or adding a new bookmark.</p>
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
import { useState, useMemo, useCallback, useRef } from 'react';
import { Bookmark, SearchFilters, ViewMode } from '../types';
import { useDebounce } from './useDebounce';

const getItemsPerPage = (viewMode: ViewMode) => viewMode === 'icon' ? 30 : 12;

export function useBookmarkGrid(bookmarks: Bookmark[], viewMode: ViewMode) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    title: true,
    description: true,
    url: true,
    tags: true,
    notes: true,
  });

  const itemsPerPage = getItemsPerPage(viewMode);
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);
  const observer = useRef<IntersectionObserver | null>(null);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredBookmarks = useMemo(() => {
    // Reset visible count when search term or view mode changes
    setVisibleCount(itemsPerPage);

    if (!debouncedSearchTerm) {
        return bookmarks;
    };
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();

    return bookmarks.filter((bookmark) => {
      const inTitle = searchFilters.title && bookmark.title.toLowerCase().includes(lowercasedTerm);
      const inDescription = searchFilters.description && bookmark.description.toLowerCase().includes(lowercasedTerm);
      const inUrl = searchFilters.url && bookmark.url.toLowerCase().includes(lowercasedTerm);
      const inTags = searchFilters.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm));
      const inNotes = searchFilters.notes && bookmark.notes?.toLowerCase().includes(lowercasedTerm);
      
      return inTitle || inDescription || inUrl || inTags || inNotes;
    });
  }, [bookmarks, debouncedSearchTerm, searchFilters, itemsPerPage]);

  const visibleBookmarks = useMemo(() => {
    return filteredBookmarks.slice(0, visibleCount);
  }, [filteredBookmarks, visibleCount]);

  const lastBookmarkElementRef = useCallback((node: HTMLDivElement) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredBookmarks.length) {
        setVisibleCount(prev => prev + itemsPerPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [filteredBookmarks.length, visibleCount, itemsPerPage]);

  return {
    searchTerm,
    setSearchTerm,
    searchFilters,
    setSearchFilters,
    visibleBookmarks,
    filteredBookmarks,
    lastBookmarkElementRef,
    visibleCount,
    debouncedSearchTerm
  };
}
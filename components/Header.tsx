import React, { useState, useRef, useEffect } from 'react';
import { SearchFilters } from '../types';
import Icon from './Icon';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchFilters: SearchFilters;
  setSearchFilters: (filters: SearchFilters) => void;
}

const FilterCheckbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-700 cursor-pointer rounded-md transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-600 focus:ring-offset-gray-900"
      />
      <span className="text-sm text-gray-300 capitalize">{label}</span>
    </label>
);

const Header: React.FC<HeaderProps> = ({ searchTerm, setSearchTerm, searchFilters, setSearchFilters }) => {
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterChange = (filter: keyof SearchFilters, value: boolean) => {
        setSearchFilters({ ...searchFilters, [filter]: value });
    };

    return (
        <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 mb-6">
                AI Bookmark Manager
            </h1>
            <div className="flex items-center w-full bg-gray-800 border border-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500 transition-colors">
                <div className="pl-3 text-gray-400">
                    <Icon name="search" className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    placeholder="Search bookmarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow min-w-0 px-3 py-2 bg-transparent outline-none text-gray-100 placeholder-gray-400"
                />
                <div className="relative flex items-center" ref={filterRef}>
                    <div className="h-6 w-px bg-gray-700"></div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        aria-label="Toggle search filters"
                        aria-haspopup="true"
                        aria-expanded={isFilterOpen}
                    >
                        <Icon name="filter" className="w-5 h-5" />
                        <span className="font-medium text-sm hidden sm:inline">Filter</span>
                    </button>
                    {isFilterOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-850 border border-gray-700 rounded-lg shadow-lg z-10 p-2 animate-fade-in">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase px-3 pt-1 pb-2">Search In:</h3>
                            <FilterCheckbox label="Title" checked={searchFilters.title} onChange={(c) => handleFilterChange('title', c)} />
                            <FilterCheckbox label="Description" checked={searchFilters.description} onChange={(c) => handleFilterChange('description', c)} />
                            <FilterCheckbox label="URL" checked={searchFilters.url} onChange={(c) => handleFilterChange('url', c)} />
                            <FilterCheckbox label="Tags" checked={searchFilters.tags} onChange={(c) => handleFilterChange('tags', c)} />
                            <FilterCheckbox label="Notes" checked={searchFilters.notes} onChange={(c) => handleFilterChange('notes', c)} />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default React.memo(Header);
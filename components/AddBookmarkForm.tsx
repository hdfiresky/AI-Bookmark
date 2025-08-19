
import React, { useState, useRef } from 'react';
import { Bookmark } from '../types';
import { analyzeUrl } from '../services/geminiService';
import Icon from './Icon';

interface AddBookmarkFormProps {
  onAddBookmark: (bookmark: Bookmark) => void;
}

const AddBookmarkForm: React.FC<AddBookmarkFormProps> = ({ onAddBookmark }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleFocus = async () => {
    if (url.trim()) return;

    try {
        const text = await navigator.clipboard.readText();
        if (text.startsWith('http') || (text.includes('.') && !text.includes(' '))) {
            setUrl(text);
            setTimeout(() => {
                urlInputRef.current?.select();
            }, 0);
        }
    } catch (err) {
        console.warn('Failed to read clipboard contents: ', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // 1. Frontend URL validation for instant feedback
    // This regex is permissive but ensures a basic structure like "domain.com"
    const urlPattern = /^(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
    const trimmedUrl = url.trim();

    if (!urlPattern.test(trimmedUrl)) {
        setError("Please enter a valid URL (e.g., google.com).");
        return;
    }

    let validUrl = trimmedUrl;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = `https://${validUrl}`;
    }

    setIsLoading(true);
    setError(null);
    try {
      const analysis = await analyzeUrl(validUrl);
      const newBookmark: Bookmark = {
        ...analysis,
        url: validUrl, // Explicitly set the normalized URL to ensure data consistency
        id: new Date().toISOString() + Math.random(),
        createdAt: new Date().toISOString(),
      };
      onAddBookmark(newBookmark);
      setUrl('');
    } catch (err: any) {
      // The error message from the backend will now be more specific
      setError(err.message || 'Failed to analyze URL. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-850 p-6 rounded-lg shadow-lg">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-grow w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="link" className="w-5 h-5 text-gray-400" />
            </div>
            <input
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null); // Clear error on new input
                }}
                onFocus={handleFocus}
                placeholder="Enter or paste a URL to add bookmark..."
                className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg focus:ring-2 outline-none transition-colors ${
                    error 
                        ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' 
                        : 'border-gray-700 focus:ring-cyan-500 focus:border-cyan-500'
                }`}
                disabled={isLoading}
                aria-invalid={!!error}
                aria-describedby={error ? 'url-error' : undefined}
            />
        </div>
        <button
          type="submit"
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || !url}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Icon name="add" className="w-5 h-5"/>
              <span>Add Bookmark</span>
            </>
          )}
        </button>
      </form>
      {error && <p id="url-error" className="text-red-400 mt-2 text-center md:text-left">{error}</p>}
    </div>
  );
};

export default AddBookmarkForm;

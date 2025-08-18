
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
    // If there's already text in the input, do nothing on focus.
    if (url.trim()) return;

    try {
        const text = await navigator.clipboard.readText();
        // Basic check to see if clipboard content is a URL-like string
        // This avoids pasting large blocks of text. A simple check is sufficient.
        if (text.startsWith('http') || (text.includes('.') && !text.includes(' '))) {
            setUrl(text);
            // Select the text to allow easy replacement by typing
            setTimeout(() => {
                urlInputRef.current?.select();
            }, 0);
        }
    } catch (err) {
        // This is a progressive enhancement, so we don't need to show an error.
        console.warn('Failed to read clipboard contents: ', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        validUrl = `https://${url}`;
    }

    setIsLoading(true);
    setError(null);
    try {
      const analysis = await analyzeUrl(validUrl);
      const newBookmark: Bookmark = {
        ...analysis,
        id: new Date().toISOString() + Math.random(),
        createdAt: new Date().toISOString(),
      };
      onAddBookmark(newBookmark);
      setUrl('');
    } catch (err) {
      setError('Failed to analyze URL. Please try again.');
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
                onChange={(e) => setUrl(e.target.value)}
                onFocus={handleFocus}
                placeholder="Enter or paste a URL to add bookmark..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
                disabled={isLoading}
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
      {error && <p className="text-red-400 mt-2 text-center md:text-left">{error}</p>}
    </div>
  );
};

export default AddBookmarkForm;
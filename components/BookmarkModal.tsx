import React, { useState, useEffect } from 'react';
import { Bookmark } from '../types';
import Icon from './Icon';

interface BookmarkModalProps {
  bookmark: Bookmark;
  onClose: () => void;
  onSave: (bookmark: Bookmark) => void;
  onDelete: () => void;
  onOpenUrl: (url: string) => void;
}

const BookmarkModal: React.FC<BookmarkModalProps> = ({ bookmark, onClose, onSave, onDelete, onOpenUrl }) => {
  const [notes, setNotes] = useState(bookmark.notes || '');
  const [tags, setTags] = useState(bookmark.tags.join(', '));
  const [currentTag, setCurrentTag] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    const updatedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    onSave({ ...bookmark, notes, tags: updatedTags });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-850 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-gray-100 truncate">{bookmark.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <button onClick={() => onOpenUrl(bookmark.url)} className="flex items-center gap-2 text-cyan-400 hover:underline break-all text-left">
              <Icon name="link" className="w-5 h-5 flex-shrink-0" />
              <span>{bookmark.url}</span>
            </button>
          </div>
          
          <p className="text-gray-300 mb-6">{bookmark.description}</p>
          
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-200 mb-2">
                <Icon name="note" className="w-5 h-5"/>
                Personal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal notes here..."
              className="w-full h-28 p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-200 mb-2">
                <Icon name="tag" className="w-5 h-5"/>
                Tags
            </label>
            <p className="text-sm text-gray-400 mb-2">Separate tags with a comma.</p>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 outline-none transition-colors"
            />
          </div>
        </div>
        
        <footer className="flex items-center justify-between p-4 border-t border-gray-700 mt-auto">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-400 font-semibold rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Icon name="delete" className="w-5 h-5" />
            Delete
          </button>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BookmarkModal;
import React from 'react';
import { Bookmark } from '../types';
import Icon from './Icon';

interface BookmarkIconProps {
  bookmark: Bookmark;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

const BookmarkIcon: React.FC<BookmarkIconProps> = ({ bookmark, onEdit, onDelete, onOpen }) => {
  const { title, imageUrl, status } = bookmark;

  return (
    <div className="group relative aspect-square bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-cyan-500/20">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover"
        onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/fallback/300/300')}
        loading="lazy"
      />
      {status === 'pending' ? (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
        </div>
      ) : (
        <div 
          onClick={onOpen}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 cursor-pointer"
        >
          <h3 className="text-sm font-bold text-white line-clamp-3">{title}</h3>
          <div className="flex items-center justify-end gap-1">
            <button 
               onClick={(e) => { e.stopPropagation(); onEdit(); }} 
               className="p-2 rounded-full bg-black/40 text-white hover:bg-cyan-500 transition-colors" aria-label="Edit bookmark">
              <Icon name="edit" className="w-4 h-4" />
            </button>
            <button 
               onClick={(e) => { e.stopPropagation(); onDelete(); }}
               className="p-2 rounded-full bg-black/40 text-white hover:bg-red-500 transition-colors" aria-label="Delete bookmark">
              <Icon name="delete" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(BookmarkIcon);
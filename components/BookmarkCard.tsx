import React from 'react';
import { Bookmark } from '../types';
import Icon from './Icon';
import Tag from './Tag';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onEdit, onDelete, onOpen }) => {
  const { url, title, description, imageUrl, tags, createdAt } = bookmark;
  
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-gray-850 rounded-lg shadow-lg overflow-hidden flex flex-col transition-transform transform hover:-translate-y-1 hover:shadow-cyan-500/20">
      <div onClick={onOpen} className="block cursor-pointer">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-auto" 
          onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/fallback/600/400')}
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div onClick={onOpen} className="hover:text-cyan-400 transition-colors cursor-pointer">
          <h3 className="text-lg font-bold mb-2 line-clamp-2">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.slice(0, 4).map(tag => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      </div>
       <div className="px-4 pb-4 mt-auto flex justify-between items-center text-gray-500">
          <span className="text-xs">{formattedDate}</span>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 rounded-full hover:bg-gray-700 hover:text-cyan-400 transition-colors" aria-label="Edit bookmark">
              <Icon name="edit" className="w-5 h-5" />
            </button>
            <button onClick={onDelete} className="p-2 rounded-full hover:bg-gray-700 hover:text-red-500 transition-colors" aria-label="Delete bookmark">
              <Icon name="delete" className="w-5 h-5" />
            </button>
          </div>
        </div>
    </div>
  );
};

export default React.memo(BookmarkCard);
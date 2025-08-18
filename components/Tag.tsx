
import React from 'react';

interface TagProps {
  label: string;
}

const Tag: React.FC<TagProps> = ({ label }) => (
  <span className="bg-gray-700 text-cyan-300 text-xs font-medium px-2.5 py-1 rounded-full">
    {label}
  </span>
);

export default Tag;

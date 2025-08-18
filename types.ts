
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  notes?: string;
  createdAt: string;
}

export interface SearchFilters {
  title: boolean;
  description: boolean;
  url: boolean;
  tags: boolean;
  notes: boolean;
}

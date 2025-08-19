export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  openInIframe?: boolean;
  status?: 'pending';
}

export interface SearchFilters {
  title: boolean;
  description: boolean;
  url: boolean;
  tags: boolean;
  notes: boolean;
}

export type ViewMode = 'card' | 'icon';

export interface LayoutSettings {
  columns: number;
  viewMode: ViewMode;
}
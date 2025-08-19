import { Bookmark } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

const handleResponse = async (response: Response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'An API error occurred');
    }
    return data;
};

// --- Auth ---

export const login = async (username: string, password: string): Promise<{ token: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
};

export const register = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
};


// --- Bookmarks ---

export const getBookmarks = async (token: string): Promise<Bookmark[]> => {
    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

export const createBookmark = async (url: string, token: string): Promise<Bookmark> => {
    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
    });
    return handleResponse(response);
};

export const updateBookmark = async (bookmark: Bookmark, token: string): Promise<Bookmark> => {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${bookmark.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            notes: bookmark.notes,
            tags: bookmark.tags,
        }),
    });
    return handleResponse(response);
};

export const deleteBookmark = async (id: string, token: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(response);
};

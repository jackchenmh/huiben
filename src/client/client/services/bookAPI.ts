import { Book, BookFilters, Pagination } from '../types';

const API_BASE = '/api';

class BookAPI {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Network error');
    }

    return response.json();
  }

  async getAllBooks(filters?: BookFilters) {
    const params = new URLSearchParams();

    if (filters?.ageGroup) params.append('ageGroup', filters.ageGroup);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/books${queryString ? `?${queryString}` : ''}`;

    return this.request<{ books: Book[]; pagination: Pagination }>(url);
  }

  async getBookById(id: number) {
    return this.request<{ book: Book }>(`/books/${id}`);
  }

  async getBookStats(id: number) {
    return this.request<{ stats: { totalCheckins: number; participants: number; avgReadingTime: number } }>(`/books/${id}/stats`);
  }

  async createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.request<{ book: Book; message: string }>('/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    });
  }

  async updateBook(id: number, updates: Partial<Book>) {
    return this.request<{ book: Book; message: string }>(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBook(id: number) {
    return this.request<{ message: string }>(`/books/${id}`, {
      method: 'DELETE',
    });
  }

  async getPopularBooks(limit = 10) {
    return this.request<{ books: Book[] }>(`/books/popular?limit=${limit}`);
  }

  async getRecommendedBooks(limit = 5) {
    return this.request<{ books: Book[] }>(`/books/recommended?limit=${limit}`);
  }

  async searchBooks(query: string, limit = 20) {
    return this.request<{ books: Book[] }>(`/books/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getBooksByAgeGroup(ageGroup: string) {
    return this.request<{ books: Book[] }>(`/books/age-group/${encodeURIComponent(ageGroup)}`);
  }
}

export const bookAPI = new BookAPI();

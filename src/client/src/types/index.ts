export interface User {
  id: number;
  username: string;
  email: string;
  role: 'child' | 'parent' | 'teacher';
  displayName: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  cover?: string;
  description?: string;
  ageGroup: string;
  difficulty: number;
  pages: number;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: number;
  userId: number;
  bookId: number;
  checkinDate: string;
  readingTime: number;
  notes?: string;
  images?: string;
  parentComment?: string;
  teacherComment?: string;
  createdAt: string;
  updatedAt: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: string;
}

export interface UserStats {
  id: number;
  userId: number;
  totalBooks: number;
  totalReadingTime: number;
  consecutiveDays: number;
  longestStreak: number;
  totalPoints: number;
  level: number;
  updatedAt: string;
  rank?: number;
  badgeCount?: number;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition: string;
  points: number;
  createdAt: string;
  earnedAt?: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface Point {
  id: number;
  userId: number;
  points: number;
  reason: string;
  relatedId?: number;
  relatedType?: 'checkin' | 'badge' | 'streak';
  createdAt: string;
}

export interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  data?: T;
  [key: string]: any;
}

export interface Pagination {
  current: number;
  total: number;
  count: number;
  limit: number;
}

export interface BookFilters {
  ageGroup?: string;
  difficulty?: number;
  search?: string;
  page?: number;
  limit?: number;
}
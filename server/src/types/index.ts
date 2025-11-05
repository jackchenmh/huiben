export interface User {
  id: number;
  username: string;
  password: string;
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
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition: string;
  points: number;
  createdAt: string;
}

export interface UserBadge {
  id: number;
  userId: number;
  badgeId: number;
  earnedAt: string;
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
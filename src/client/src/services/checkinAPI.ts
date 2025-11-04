import { CheckIn, ApiResponse, Pagination } from '../types';

const API_BASE = '/api';

export interface CheckInFilters {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateCheckInData {
  bookId: number;
  readingTime: number;
  notes?: string;
  images?: string;
}

export interface UpdateCheckInData {
  readingTime?: number;
  notes?: string;
  images?: string;
  parentComment?: string;
  teacherComment?: string;
}

export interface CheckInResponse extends ApiResponse {
  checkIn: CheckIn;
}

export interface CheckInsResponse extends ApiResponse {
  checkins: CheckIn[];
  pagination: Pagination;
}

export interface TodayCheckInResponse extends ApiResponse {
  checkins: CheckIn[];
}

export interface StreakResponse extends ApiResponse {
  streak: number;
}

export interface CalendarResponse extends ApiResponse {
  calendar: Array<{
    date: string;
    checkInCount: number;
    totalReadingTime: number;
  }>;
}

class CheckInAPI {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // 创建打卡记录
  async createCheckIn(data: CreateCheckInData): Promise<CheckInResponse> {
    return this.request<CheckInResponse>('/checkins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 获取用户打卡记录列表
  async getUserCheckIns(filters: CheckInFilters = {}): Promise<CheckInsResponse> {
    const params = new URLSearchParams();

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const query = params.toString();
    return this.request<CheckInsResponse>(`/checkins${query ? `?${query}` : ''}`);
  }

  // 获取今日打卡记录
  async getTodayCheckIn(): Promise<TodayCheckInResponse> {
    return this.request<TodayCheckInResponse>('/checkins/today');
  }

  // 获取连续打卡天数
  async getCheckInStreak(): Promise<StreakResponse> {
    return this.request<StreakResponse>('/checkins/streak');
  }

  // 获取阅读日历
  async getReadingCalendar(year: number, month: number): Promise<CalendarResponse> {
    return this.request<CalendarResponse>(`/checkins/calendar/${year}/${month}`);
  }

  // 更新打卡记录
  async updateCheckIn(id: number, data: UpdateCheckInData): Promise<CheckInResponse> {
    return this.request<CheckInResponse>(`/checkins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 删除打卡记录
  async deleteCheckIn(id: number): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/checkins/${id}`, {
      method: 'DELETE',
    });
  }

  // 添加评论
  async addComment(id: number, comment: string): Promise<CheckInResponse> {
    return this.request<CheckInResponse>(`/checkins/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }
}

export const checkinAPI = new CheckInAPI();
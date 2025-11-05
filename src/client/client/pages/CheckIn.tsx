import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
// Use type-only import and alias CheckIn to avoid name clash with component name
import type { Book, CheckIn as CheckInRecord, Pagination } from '@/types';
import { bookAPI } from '@/services/bookAPI';
import { checkinAPI } from '@/services/checkinAPI';
import { formatDate, formatTime } from '@/lib/utils';
import { BookOpen, CheckSquare, Trash2, ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CheckIn() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // form state
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | ''>('');
  const [readingTime, setReadingTime] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // today state
  const [todayCheckins, setTodayCheckins] = useState<CheckInRecord[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [calendar, setCalendar] = useState<Record<string, { count: number; totalTime: number }>>({});

  // history state
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);
  const [startDate, setStartDate] = useState<string>(defaultStart.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(now.toISOString().slice(0, 10));
  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current: 1, total: 1, count: 0, limit: 10 });
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [commentTextById, setCommentTextById] = useState<Record<number, string>>({});

  // preselect book from query
  useEffect(() => {
    const bookIdParam = searchParams.get('bookId');
    if (bookIdParam) {
      const idNum = parseInt(bookIdParam, 10);
      if (!Number.isNaN(idNum)) {
        setSelectedBookId(idNum);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // parallel load: books, today checkins, streak
    const load = async () => {
      setLoading(true);
      try {
        const [booksRes, todayRes, streakRes] = await Promise.all([
          bookAPI.getAllBooks({ page: 1, limit: 100 }),
          checkinAPI.getTodayCheckIn(),
          checkinAPI.getCheckInStreak(),
        ]);
        setBooks(booksRes.books || []);
        setTodayCheckins(todayRes.checkins || []);
        setStreak(streakRes.streak || 0);
      } catch (err) {
        console.error(err);
        toast.error('加载打卡数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // load calendar of current month
    const loadCalendar = async () => {
      try {
        const res = await checkinAPI.getReadingCalendar(calYear, calMonth);
        setCalendar(res.calendar || {});
      } catch (err) {
        console.error(err);
        toast.error('加载阅读日历失败');
      }
    };
    loadCalendar();
  }, [calYear, calMonth]);

  useEffect(() => {
    // load history when filters or page change
    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await checkinAPI.getUserCheckIns({ startDate, endDate, page: pagination.current, limit: pagination.limit });
        setHistory(res.checkins || []);
        setPagination(res.pagination || { current: 1, total: 1, count: 0, limit: 10 });
      } catch (err) {
        console.error(err);
        toast.error('加载历史记录失败');
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [startDate, endDate, pagination.current, pagination.limit]);

  const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId), [books, selectedBookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId) {
      toast.error('请选择要打卡的绘本');
      return;
    }
    if (readingTime < 0) {
      toast.error('阅读时长不能为负数');
      return;
    }

    try {
      setSubmitting(true);
      await checkinAPI.createCheckIn({
        bookId: Number(selectedBookId),
        readingTime: Number(readingTime),
        notes: notes?.trim() ? notes.trim() : undefined,
      });

      toast.success('打卡成功');

      // refresh today list and streak
      const [todayRes, streakRes] = await Promise.all([
        checkinAPI.getTodayCheckIn(),
        checkinAPI.getCheckInStreak(),
      ]);
      setTodayCheckins(todayRes.checkins || []);
      setStreak(streakRes.streak || 0);

      // reset note, keep selected book, suggest default 15 minutes
      setNotes('');
      setReadingTime(15);
    } catch (error: any) {
      const msg = error?.message || '打卡失败';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这条打卡记录吗？')) return;
    try {
      await checkinAPI.deleteCheckIn(id);
      toast.success('已删除');
      // refresh
      const [todayRes, streakRes] = await Promise.all([
        checkinAPI.getTodayCheckIn(),
        checkinAPI.getCheckInStreak(),
      ]);
      setTodayCheckins(todayRes.checkins || []);
      setStreak(streakRes.streak || 0);
      // 同步刷新历史记录
      setPagination(p => ({ ...p }));
    } catch (err) {
      console.error(err);
      toast.error('删除失败');
    }
  };

  // helpers for calendar
  const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const firstDayOfWeek = (year: number, month: number) => new Date(year, month - 1, 1).getDay(); // 0 Sun
  const prevMonth = () => {
    const d = new Date(calYear, calMonth - 2, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
  };
  const nextMonth = () => {
    const d = new Date(calYear, calMonth, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth() + 1);
  };

  const intensityClass = (dateStr: string) => {
    const data = calendar[dateStr];
    if (!data) return 'bg-gray-100';
    const t = data.totalTime || 0; // minutes
    if (t >= 120) return 'bg-green-600 text-white';
    if (t >= 60) return 'bg-green-500 text-white';
    if (t >= 30) return 'bg-green-300';
    if (t > 0) return 'bg-green-200';
    return 'bg-gray-100';
  };

  const handleHistoryPage = (dir: 'prev' | 'next') => {
    setPagination(p => ({ ...p, current: Math.min(Math.max(1, p.current + (dir === 'prev' ? -1 : 1)), p.total) }));
  };

  const canComment = user?.role === 'parent' || user?.role === 'teacher';
  const onCommentChange = (id: number, text: string) => setCommentTextById(prev => ({ ...prev, [id]: text }));
  const submitComment = async (id: number) => {
    const text = (commentTextById[id] || '').trim();
    if (!text) {
      toast.error('请输入评论内容');
      return;
    }
    try {
      await checkinAPI.addComment(id, text);
      toast.success('评论已添加');
      setCommentTextById(prev => ({ ...prev, [id]: '' }));
      // refresh history list
      setPagination(p => ({ ...p }));
    } catch (err) {
      console.error(err);
      toast.error('添加评论失败');
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">今日打卡</h1>
      <p className="text-gray-600 mb-8">已连续打卡 {streak} 天，加油！</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 打卡表单 */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckSquare className="w-5 h-5 mr-2 text-primary-600" />
              新建打卡
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择绘本</label>
                <select
                  className="w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">请选择要打卡的绘本</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阅读时长（分钟）</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  value={readingTime}
                  onChange={(e) => setReadingTime(Number(e.target.value))}
                  placeholder="如：15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阅读心得（可选）</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={selectedBook ? `今天读了《${selectedBook.title}》...` : '写点读后感吧～'}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-400">{notes.length}/500</div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary disabled:opacity-60"
                >
                  {submitting ? '提交中...' : '提交打卡'}
                </button>
              </div>
            </form>
          </div>
          {/* 阅读日历 */}
          <div className="card p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">阅读日历</h2>
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded hover:bg-gray-100" onClick={prevMonth} aria-label="上个月">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">{calYear} 年 {calMonth} 月</span>
                <button className="p-2 rounded hover:bg-gray-100" onClick={nextMonth} aria-label="下个月">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
              {['日','一','二','三','四','五','六'].map(d => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDayOfWeek(calYear, calMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth(calYear, calMonth) }, (_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const data = calendar[dateStr];
                return (
                  <div key={day} className={`rounded-md p-2 h-16 flex flex-col items-center justify-center ${intensityClass(dateStr)}`}>
                    <div className="text-xs font-medium">{day}</div>
                    <div className="text-[10px] opacity-80">{data ? `${Math.round((data.totalTime||0))}分` : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 今日打卡 */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">今日记录</h2>
            </div>

            {todayCheckins.length > 0 ? (
              <div className="space-y-3">
                {todayCheckins.map((c) => (
                  <div key={c.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                      <BookOpen className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.bookTitle || '未命名绘本'}</p>
                      <p className="text-xs text-gray-500">{formatTime(c.readingTime)}</p>
                    </div>
                    <button
                      className="ml-3 text-red-600 hover:text-red-700 p-2"
                      title="删除"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">今天还没有打卡记录</p>
                <p className="text-sm text-gray-400 mt-1">坚持每天记录你的阅读时光吧！</p>
              </div>
            )}
          </div>
          {/* 历史记录 */}
          <div className="card p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">历史记录</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                <input type="date" className="w-full rounded-md border-gray-300" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPagination(p => ({ ...p, current: 1 })); }} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                <input type="date" className="w-full rounded-md border-gray-300" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPagination(p => ({ ...p, current: 1 })); }} />
              </div>
            </div>
            {historyLoading ? (
              <div className="text-center py-6 text-gray-500">加载中...</div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((c) => (
                  <div key={`h-${c.id}`} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                        <BookOpen className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.bookTitle || '未命名绘本'}</p>
                          <span className="text-xs text-gray-500 ml-2">{formatDate(c.checkinDate)}</span>
                        </div>
                        <p className="text-xs text-gray-500">{formatTime(c.readingTime)}</p>
                        {c.notes && <p className="text-xs text-gray-600 mt-1">心得：{c.notes}</p>}
                        {(c.parentComment || c.teacherComment) && (
                          <div className="mt-1 text-xs text-gray-700">
                            {c.parentComment && <div>家长评：{c.parentComment}</div>}
                            {c.teacherComment && <div>老师评：{c.teacherComment}</div>}
                          </div>
                        )}
                        {canComment && (
                          <div className="mt-2">
                            <div className="flex items-center">
                              <input
                                value={commentTextById[c.id] || ''}
                                onChange={(e) => onCommentChange(c.id, e.target.value)}
                                placeholder="添加评论..."
                                className="flex-1 rounded-md border-gray-300 text-sm"
                              />
                              <button
                                className="ml-2 btn-outline text-sm px-3 py-1 flex items-center"
                                onClick={() => submitComment(c.id)}
                                title="添加评论"
                              >
                                <MessageSquarePlus className="w-4 h-4 mr-1" />提交
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <button className="btn-outline text-sm" disabled={pagination.current <= 1} onClick={() => handleHistoryPage('prev')}>上一页</button>
                  <div className="text-xs text-gray-500">第 {pagination.current} / {pagination.total} 页，共 {pagination.count} 条</div>
                  <button className="btn-outline text-sm" disabled={pagination.current >= pagination.total} onClick={() => handleHistoryPage('next')}>下一页</button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">无历史记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Star, Users, Calendar, Edit, Trash2, Plus } from 'lucide-react';
import { Book } from '../types';
import { formatTime } from '@/lib/utils';
import { bookAPI } from '../services/bookAPI';
import BookFormModal from '../components/BookFormModal';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState<{ totalCheckins: number; participants: number; avgReadingTime: number } | null>(null);

  // 模拟用户角色 - 实际使用时从认证上下文获取
  const [user] = useState({ role: 'teacher' });
  const isTeacher = user.role === 'teacher';

  useEffect(() => {
    if (id) {
      const bookId = parseInt(id);
      loadBook(bookId);
      loadStats(bookId);
    }
  }, [id]);

  const loadBook = async (bookId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookAPI.getBookById(bookId);
      setBook(response.book);
    } catch (error) {
      setError('绘本加载失败');
      console.error('Failed to load book:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // 打开编辑模态框
    setShowEditModal(true);
  };

  const loadStats = async (bookId: number) => {
    try {
      const res = await bookAPI.getBookStats(bookId);
      setStats(res.stats);
    } catch (e) {
      // 静默失败，不影响主体内容
      console.warn('加载绘本统计失败', e);
    }
  };

  const handleDelete = async () => {
    if (!book) return;

    if (window.confirm(`确定要删除《${book.title}》吗？`)) {
      try {
        await bookAPI.deleteBook(book.id);
        navigate('/books'); // 删除后返回列表页
      } catch (error) {
        console.error('Failed to delete book:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleStartReading = () => {
    if (!book) return;
    // 跳转到打卡页面并预选当前绘本
    navigate(`/checkin?bookId=${book.id}`);
  };

  const handleBookSaved = (savedBook: Book) => {
    // 更新当前显示的绘本数据
    setBook(savedBook);
    setShowEditModal(false);
  };

  const getDifficultyLabel = (difficulty: number) => {
    const labels = {
      1: '入门',
      2: '初级',
      3: '中级',
      4: '进阶',
      5: '高级',
    };
    return labels[difficulty as keyof typeof labels] || '未知';
  };

  const getDifficultyColor = (difficulty: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800',
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

  if (error || !book) {
    return (
      <div className="container py-8">
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">绘本不存在</h3>
          <p className="mt-1 text-sm text-gray-500">{error || '未找到指定的绘本'}</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/books')}
              className="btn-primary"
            >
              返回绘本库
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/books')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回绘本库
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 绘本封面和基本信息 */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            {/* 封面图片 */}
            <div className="aspect-[3/4] mb-6">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <span className="text-gray-500 text-sm">暂无封面</span>
                  </div>
                </div>
              )}
            </div>

            {/* 基本信息 */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">基本信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">年龄分组：</span>
                    <span className="badge badge-secondary">{book.ageGroup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">难度等级：</span>
                    <span className={`badge ${getDifficultyColor(book.difficulty)}`}>
                      <Star className="w-3 h-3 mr-1" />
                      {getDifficultyLabel(book.difficulty)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">页数：</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-gray-400" />
                      {book.pages} 页
                    </span>
                  </div>
                  {book.isbn && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">ISBN：</span>
                      <span className="text-gray-900">{book.isbn}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">添加时间：</span>
                    <span className="text-gray-900">
                      {new Date(book.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <button
                    onClick={handleStartReading}
                    className="btn-primary w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    开始阅读打卡
                  </button>

                  {isTeacher && (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleEdit}
                        className="btn-outline flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        编辑
                      </button>
                      <button
                        onClick={handleDelete}
                        className="btn-outline border-red-300 text-red-600 hover:bg-red-50 flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* 标题和作者 */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
              <p className="text-lg text-gray-600">作者：{book.author}</p>
            </div>

            {/* 描述 */}
            {book.description && (
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">内容简介</h3>
                <div className="prose prose-gray max-w-none">
                  {book.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 阅读统计 */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">阅读统计</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">{stats?.totalCheckins ?? 0}</div>
                  <div className="text-sm text-gray-500">总打卡次数</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.participants ?? 0}</div>
                  <div className="text-sm text-gray-500">参与用户</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatTime(stats?.avgReadingTime ?? 0)}</div>
                  <div className="text-sm text-gray-500">平均阅读时长</div>
                </div>
              </div>
            </div>

            {/* 推荐理由 */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">为什么推荐这本书</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">1</span>
                  </div>
                  <p className="text-gray-700">适合 {book.ageGroup} 儿童阅读，内容生动有趣</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">2</span>
                  </div>
                  <p className="text-gray-700">
                    {getDifficultyLabel(book.difficulty)}级别，有助于循序渐进提升阅读能力
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">3</span>
                  </div>
                  <p className="text-gray-700">约 {book.pages} 页内容，阅读时长适中</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 绘本编辑模态框 */}
      <BookFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleBookSaved}
        book={book}
      />
    </div>
  );
}

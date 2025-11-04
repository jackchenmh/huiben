import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, TrendingUp, Sparkles } from 'lucide-react';
import { Book, BookFilters as BookFiltersType, Pagination as PaginationType } from '../types';
import { bookAPI } from '../services/bookAPI';
import BookCard from '../components/BookCard';
import BookFiltersComponent from '../components/BookFilters';
import Pagination from '../components/Pagination';
import BookFormModal from '../components/BookFormModal';

export default function Books() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationType>({
    current: 1,
    total: 1,
    count: 0,
    limit: 20
  });
  const [filters, setFilters] = useState<BookFiltersType>({
    page: 1,
    limit: 20
  });
  const [activeTab, setActiveTab] = useState<'all' | 'popular' | 'recommended'>('all');
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // 模拟用户角色 - 实际使用时从认证上下文获取
  const [user] = useState({ role: 'teacher' });
  const isTeacher = user.role === 'teacher';

  useEffect(() => {
    loadBooks();
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'popular') {
      loadPopularBooks();
    } else if (activeTab === 'recommended') {
      loadRecommendedBooks();
    }
  }, [activeTab]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await bookAPI.getAllBooks(filters);
      setBooks(response.books);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load books:', error);
      // 可以添加错误提示
    } finally {
      setLoading(false);
    }
  };

  const loadPopularBooks = async () => {
    try {
      const response = await bookAPI.getPopularBooks(20);
      setPopularBooks(response.books);
    } catch (error) {
      console.error('Failed to load popular books:', error);
    }
  };

  const loadRecommendedBooks = async () => {
    try {
      const response = await bookAPI.getRecommendedBooks(20);
      setRecommendedBooks(response.books);
    } catch (error) {
      console.error('Failed to load recommended books:', error);
    }
  };

  const handleFiltersChange = (newFilters: BookFiltersType) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ page: 1, limit: 20 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleViewBook = (book: Book) => {
    // 跳转到绘本详情页面
    navigate(`/books/${book.id}`);
  };

  const handleEditBook = (book: Book) => {
    // 打开编辑模态框
    setEditingBook(book);
    setShowBookModal(true);
  };

  const handleDeleteBook = async (book: Book) => {
    if (window.confirm(`确定要删除《${book.title}》吗？`)) {
      try {
        await bookAPI.deleteBook(book.id);
        loadBooks(); // 重新加载列表
      } catch (error) {
        console.error('Failed to delete book:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleAddBook = () => {
    // 打开添加绘本模态框
    setEditingBook(null);
    setShowBookModal(true);
  };

  const handleBookSaved = (savedBook: Book) => {
    // 绘本保存成功后的回调
    if (activeTab === 'all') {
      loadBooks(); // 重新加载列表
    }
  };

  const handleCloseModal = () => {
    setShowBookModal(false);
    setEditingBook(null);
  };

  const getCurrentBooks = () => {
    switch (activeTab) {
      case 'popular':
        return popularBooks;
      case 'recommended':
        return recommendedBooks;
      default:
        return books;
    }
  };

  const renderTabContent = () => {
    const currentBooks = getCurrentBooks();

    if (loading && activeTab === 'all') {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      );
    }

    if (currentBooks.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无绘本</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'all' ? '还没有添加任何绘本' :
             activeTab === 'popular' ? '还没有热门绘本' : '暂无推荐绘本'}
          </p>
          {isTeacher && activeTab === 'all' && (
            <div className="mt-6">
              <button onClick={handleAddBook} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                添加绘本
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {currentBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onView={handleViewBook}
            onEdit={handleEditBook}
            onDelete={handleDeleteBook}
            showActions={true}
            isTeacher={isTeacher}
          />
        ))}

        {/* 分页 - 只在全部绘本标签页显示 */}
        {activeTab === 'all' && pagination.total > 1 && (
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    );
  };

  return (
    <div className="container py-8">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">绘本库</h1>
          <p className="mt-2 text-gray-600">发现和管理精彩的儿童绘本</p>
        </div>

        {isTeacher && (
          <div className="mt-4 sm:mt-0">
            <button onClick={handleAddBook} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              添加绘本
            </button>
          </div>
        )}
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            全部绘本
          </button>

          <button
            onClick={() => setActiveTab('popular')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'popular'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            热门绘本
          </button>

          <button
            onClick={() => setActiveTab('recommended')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'recommended'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            推荐绘本
          </button>
        </nav>
      </div>

      {/* 筛选器 - 只在全部绘本标签页显示 */}
      {activeTab === 'all' && (
        <BookFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* 绘本列表 */}
      {renderTabContent()}

      {/* 绘本添加/编辑模态框 */}
      <BookFormModal
        isOpen={showBookModal}
        onClose={handleCloseModal}
        onSave={handleBookSaved}
        book={editingBook}
      />
    </div>
  );
}
import React from 'react';
import { Book } from '../types';
import { Clock, Star, Users, Eye, Edit, Trash2 } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onView?: (book: Book) => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  showActions?: boolean;
  isTeacher?: boolean;
}

const difficultyColors = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800',
};

const difficultyLabels = {
  1: '入门',
  2: '初级',
  3: '中级',
  4: '进阶',
  5: '高级',
};

export default function BookCard({
  book,
  onView,
  onEdit,
  onDelete,
  showActions = true,
  isTeacher = false
}: BookCardProps) {
  const handleView = () => {
    onView?.(book);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(book);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(book);
  };

  return (
    <div
      className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleView}
    >
      <div className="flex items-start space-x-4">
        {/* 封面图片 */}
        <div className="flex-shrink-0">
          {book.cover ? (
            <img
              src={book.cover}
              alt={book.title}
              className="w-16 h-20 object-cover rounded-md"
            />
          ) : (
            <div className="w-16 h-20 bg-gray-200 rounded-md flex items-center justify-center">
              <span className="text-gray-400 text-xs">暂无封面</span>
            </div>
          )}
        </div>

        {/* 书籍信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{book.title}</h3>
              <p className="text-sm text-gray-600 mt-1">作者：{book.author}</p>

              {book.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  {book.description}
                </p>
              )}
            </div>

            {/* 操作按钮 */}
            {showActions && (
              <div className="flex space-x-1 ml-4">
                <button
                  onClick={handleView}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="查看详情"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {isTeacher && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleDelete}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 标签信息 */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="badge badge-secondary">
              {book.ageGroup}
            </span>

            <span className={`badge ${difficultyColors[book.difficulty as keyof typeof difficultyColors]}`}>
              <Star className="w-3 h-3 mr-1" />
              {difficultyLabels[book.difficulty as keyof typeof difficultyLabels]}
            </span>

            <span className="text-xs text-gray-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {book.pages} 页
            </span>

            {book.isbn && (
              <span className="text-xs text-gray-500">
                ISBN: {book.isbn}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
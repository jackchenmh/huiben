import React, { useState, useEffect } from 'react';
import { X, Upload, Save, Loader } from 'lucide-react';
import { Book } from '../types';
import { bookAPI } from '../services/bookAPI';

interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (book: Book) => void;
  book?: Book | null; // null for create, Book for edit
}

const ageGroups = [
  '0-3岁',
  '3-6岁',
  '4-7岁',
  '6-10岁',
  '8-12岁',
  '10岁以上'
];

const difficulties = [
  { value: 1, label: '入门' },
  { value: 2, label: '初级' },
  { value: 3, label: '中级' },
  { value: 4, label: '进阶' },
  { value: 5, label: '高级' },
];

export default function BookFormModal({ isOpen, onClose, onSave, book }: BookFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    cover: '',
    description: '',
    ageGroup: '',
    difficulty: 1,
    pages: 1
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!book;

  useEffect(() => {
    if (isOpen) {
      if (book) {
        // 编辑模式：填充现有数据
        setFormData({
          title: book.title,
          author: book.author,
          isbn: book.isbn || '',
          cover: book.cover || '',
          description: book.description || '',
          ageGroup: book.ageGroup,
          difficulty: book.difficulty,
          pages: book.pages
        });
      } else {
        // 添加模式：重置表单
        setFormData({
          title: '',
          author: '',
          isbn: '',
          cover: '',
          description: '',
          ageGroup: '',
          difficulty: 1,
          pages: 1
        });
      }
      setErrors({});
    }
  }, [isOpen, book]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));

    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入绘本标题';
    }

    if (!formData.author.trim()) {
      newErrors.author = '请输入作者姓名';
    }

    if (!formData.ageGroup) {
      newErrors.ageGroup = '请选择年龄分组';
    }

    if (formData.pages < 1) {
      newErrors.pages = '页数必须大于0';
    }

    if (formData.difficulty < 1 || formData.difficulty > 5) {
      newErrors.difficulty = '难度等级必须在1-5之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isEditing) {
        result = await bookAPI.updateBook(book!.id, formData);
      } else {
        result = await bookAPI.createBook(formData);
      }

      onSave(result.book);
      onClose();
    } catch (error) {
      console.error('Failed to save book:', error);
      // 可以显示错误提示
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? '编辑绘本' : '添加绘本'}
          </h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 标题 */}
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                绘本标题 *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`input w-full ${errors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入绘本标题"
                disabled={loading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* 作者 */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                作者 *
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className={`input w-full ${errors.author ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入作者姓名"
                disabled={loading}
              />
              {errors.author && (
                <p className="mt-1 text-sm text-red-600">{errors.author}</p>
              )}
            </div>

            {/* ISBN */}
            <div>
              <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-1">
                ISBN
              </label>
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={formData.isbn}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="请输入ISBN（可选）"
                disabled={loading}
              />
            </div>

            {/* 年龄分组 */}
            <div>
              <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 mb-1">
                年龄分组 *
              </label>
              <select
                id="ageGroup"
                name="ageGroup"
                value={formData.ageGroup}
                onChange={handleInputChange}
                className={`input w-full ${errors.ageGroup ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              >
                <option value="">请选择年龄分组</option>
                {ageGroups.map(group => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              {errors.ageGroup && (
                <p className="mt-1 text-sm text-red-600">{errors.ageGroup}</p>
              )}
            </div>

            {/* 难度等级 */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                难度等级 *
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className={`input w-full ${errors.difficulty ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                disabled={loading}
              >
                {difficulties.map(diff => (
                  <option key={diff.value} value={diff.value}>
                    {diff.label}
                  </option>
                ))}
              </select>
              {errors.difficulty && (
                <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>
              )}
            </div>

            {/* 页数 */}
            <div>
              <label htmlFor="pages" className="block text-sm font-medium text-gray-700 mb-1">
                页数 *
              </label>
              <input
                type="number"
                id="pages"
                name="pages"
                value={formData.pages}
                onChange={handleInputChange}
                min="1"
                className={`input w-full ${errors.pages ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="请输入页数"
                disabled={loading}
              />
              {errors.pages && (
                <p className="mt-1 text-sm text-red-600">{errors.pages}</p>
              )}
            </div>
          </div>

          {/* 封面图片 */}
          <div>
            <label htmlFor="cover" className="block text-sm font-medium text-gray-700 mb-1">
              封面图片
            </label>
            <input
              type="url"
              id="cover"
              name="cover"
              value={formData.cover}
              onChange={handleInputChange}
              className="input w-full"
              placeholder="请输入封面图片URL（可选）"
              disabled={loading}
            />
            {formData.cover && (
              <div className="mt-3">
                <img
                  src={formData.cover}
                  alt="封面预览"
                  className="w-20 h-24 object-cover rounded-md border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              内容简介
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="input w-full resize-none"
              placeholder="请输入绘本内容简介（可选）"
              disabled={loading}
            />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-outline"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? '更新' : '添加'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
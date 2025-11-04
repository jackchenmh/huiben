import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { BookFilters } from '../types';

interface BookFiltersProps {
  filters: BookFilters;
  onFiltersChange: (filters: BookFilters) => void;
  onClearFilters: () => void;
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

export default function BookFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters
}: BookFiltersProps) {
  const hasActiveFilters = filters.ageGroup || filters.difficulty || filters.search;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value || undefined,
      page: 1 // 重置页码
    });
  };

  const handleAgeGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      ageGroup: e.target.value || undefined,
      page: 1
    });
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      difficulty: e.target.value ? parseInt(e.target.value) : undefined,
      page: 1
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜索绘本标题、作者或描述..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="input pl-10 w-full"
          />
        </div>

        {/* 年龄分组筛选 */}
        <div className="lg:w-48">
          <select
            value={filters.ageGroup || ''}
            onChange={handleAgeGroupChange}
            className="input w-full"
          >
            <option value="">全部年龄</option>
            {ageGroups.map(group => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        {/* 难度筛选 */}
        <div className="lg:w-32">
          <select
            value={filters.difficulty || ''}
            onChange={handleDifficultyChange}
            className="input w-full"
          >
            <option value="">全部难度</option>
            {difficulties.map(diff => (
              <option key={diff.value} value={diff.value}>
                {diff.label}
              </option>
            ))}
          </select>
        </div>

        {/* 清除筛选按钮 */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="btn-outline px-3 py-2 text-sm flex items-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>清除筛选</span>
          </button>
        )}
      </div>

      {/* 活跃筛选标签 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">当前筛选：</span>

          {filters.ageGroup && (
            <span className="badge badge-primary">
              年龄：{filters.ageGroup}
            </span>
          )}

          {filters.difficulty && (
            <span className="badge badge-primary">
              难度：{difficulties.find(d => d.value === filters.difficulty)?.label}
            </span>
          )}

          {filters.search && (
            <span className="badge badge-primary">
              搜索：{filters.search}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
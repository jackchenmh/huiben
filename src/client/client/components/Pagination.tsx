import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination } from '../types';

interface PaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export default function PaginationComponent({ pagination, onPageChange }: PaginationProps) {
  const { current, total, count, limit } = pagination;

  if (total <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (current - 1) * limit + 1;
  const endItem = Math.min(current * limit, count);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-2 sm:space-y-0">
      {/* 结果统计 */}
      <div className="text-sm text-gray-700">
        显示 <span className="font-medium">{startItem}</span> 到{' '}
        <span className="font-medium">{endItem}</span> 条，
        共 <span className="font-medium">{count}</span> 条结果
      </div>

      {/* 分页控件 */}
      <div className="flex items-center space-x-1">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(current - 1)}
          disabled={current === 1}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 页码 */}
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-2 text-gray-500">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  current === page
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(current + 1)}
          disabled={current === total}
          className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
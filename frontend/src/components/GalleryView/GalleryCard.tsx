import React, { useCallback } from 'react';
import classnames from 'classnames';
import type { RowData, GalleryTemplate } from '../../types';

interface GalleryCardProps {
  item: RowData;
  template: GalleryTemplate;
  onClick: (item: RowData) => void;
}

export function GalleryCard({ item, template, onClick }: GalleryCardProps) {
  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const coverUrl = useMemo(() => {
    if (!template.coverField) return null;
    const value = item[template.coverField];
    if (typeof value === 'string' && value.startsWith('data:')) {
      return value;
    }
    return null;
  }, [item, template.coverField]);

  const title = String(item[template.titleField] ?? 'Untitled');
  const subtitle = String(item[template.subtitleField] ?? '');

  return (
    <div
      className={classnames(
        'bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md',
        'hover:shadow-lg transition-shadow cursor-pointer',
        'flex flex-col h-full'
      )}
      onClick={handleClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${title} - ${subtitle}`}
    >
      {/* Cover Image */}
      {coverUrl ? (
        <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 relative">
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
          <span className="text-4xl text-gray-400 dark:text-gray-500">📁</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

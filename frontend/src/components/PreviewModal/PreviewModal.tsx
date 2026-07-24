import { useState, useEffect } from 'react';
import classNames from 'classnames';
import type { GalleryTemplate, TableRow, Attachment } from '../../types';

export interface PreviewModalProps {
  row: TableRow | null;
  columns: string[];
  template: GalleryTemplate;
  onClose: () => void;
  onAttachmentClick?: (attachment: Attachment) => void;
  previewAttachment?: {
    id: number;
    filename: string;
    mimeType: string;
  } | null;
}

export function PreviewModal({
  row,
  columns,
  template,
  onClose,
  onAttachmentClick,
  previewAttachment,
}: PreviewModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const getFieldValue = (field: string): string => {
    if (!row) return '';
    const value = row[field];
    return value !== undefined && value !== null ? String(value) : '';
  };

  const renderContent = () => {
    if (previewAttachment) {
      // Direct attachment preview mode
      return (
        <div className="flex-1 overflow-auto p-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {previewAttachment.filename}
            </h2>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-[60vh] flex items-center justify-center">
            <span className="text-gray-500">
              附件预览：{previewAttachment.mimeType}
            </span>
            {/* NativePreview would be rendered here with actual blob data */}
          </div>
        </div>
      );
    }

    if (!row) return null;

    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {getFieldValue(template.titleField)}
        </h2>

        {/* Subtitle */}
        {template.subtitleField && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {getFieldValue(template.subtitleField)}
          </p>
        )}

        {/* Detail Fields */}
        <dl className="space-y-4">
          {template.detailFields.map((field) => {
            const value = getFieldValue(field);
            if (!value) return null;

            // Check if this field might contain attachments
            const attachments = row.attachments?.filter(
              (a) => a.col_name === field
            );

            return (
              <div key={field} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {field}
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                  {value}
                </dd>
                {attachments && attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => onAttachmentClick?.(att)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900 
                                   text-blue-800 dark:text-blue-200 rounded-md text-sm
                                   hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors
                                   min-h-[44px] min-w-[44px]"
                        aria-label={`预览附件 ${att.filename}`}
                      >
                        {getAttachmentIcon(att.mime_type)}
                        <span className="ml-2">{att.filename}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </dl>

        {/* Additional attachments not tied to specific fields */}
        {row.attachments && row.attachments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              附件
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {row.attachments.map((att) => (
                <button
                  key={att.id}
                  onClick={() => onAttachmentClick?.(att)}
                  className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 
                             rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                             min-h-[44px]"
                  aria-label={`预览附件 ${att.filename}`}
                >
                  <span className="text-2xl mb-1">{getAttachmentIcon(att.mime_type)}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-full text-center">
                    {att.filename}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const panelClasses = classNames(
    'fixed bg-white dark:bg-gray-900 shadow-xl flex flex-col',
    'transition-transform duration-300 ease-in-out',
    isMobile
      ? 'inset-0 z-50'
      : 'right-0 top-0 bottom-0 z-40 w-full sm:w-[40vw] max-w-[600px]'
  );

  return (
    <div
      className={classNames(
        'fixed inset-0 z-30',
        isMobile ? 'bg-black/50' : 'bg-black/30'
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div
        className={panelClasses}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: isMobile ? 'translateX(0)' : 'translateX(0)',
        }}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h1 id="preview-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {previewAttachment ? '附件预览' : '详情'}
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 
                       transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="关闭预览"
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}

function getAttachmentIcon(mimeType?: string): string {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('epub')) return '📖';
  if (mimeType.includes('markdown') || mimeType.includes('text')) return '📝';
  return '📎';
}

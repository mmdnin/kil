import { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GalleryTemplate, TableRow, Attachment } from '../../types';
import { TemplateSelector } from './TemplateSelector';
import { GalleryCard } from './GalleryCard';
import { PreviewModal } from '../PreviewModal/PreviewModal';
import { TEMPLATES as presetTemplates } from '../../templates';

export interface GalleryViewProps {
  rows: TableRow[];
  columns: string[];
}

export function GalleryView({ rows, columns }: GalleryViewProps) {
  const [currentTemplateId, setCurrentTemplateId] = useState<string>('book');
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    id: number;
    filename: string;
    mimeType: string;
  } | null>(null);

  const currentTemplate = presetTemplates.find((t) => t.id === currentTemplateId) || presetTemplates[0];

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320,
    overscan: 5,
  });

  const handleCardClick = useCallback((row: TableRow) => {
    setSelectedRow(row);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedRow(null);
    setPreviewAttachment(null);
  }, []);

  const handleAttachmentClick = useCallback((attachment: Attachment) => {
    setPreviewAttachment({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mime_type,
    });
  }, []);

  // Get field values based on template
  const getFieldValue = (row: TableRow, fieldName: string): string | Attachment[] => {
    if (fieldName === '_attachments') {
      return row.attachments || [];
    }
    return row[fieldName] ?? '';
  };

  return (
    <div className="h-full flex flex-col">
      <TemplateSelector
        templates={presetTemplates}
        currentTemplate={currentTemplateId}
        onSelect={setCurrentTemplateId}
      />

      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        role="region"
        aria-label="画廊视图"
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const coverField = currentTemplate.coverField;
            const titleField = currentTemplate.titleField;
            const subtitleField = currentTemplate.subtitleField;

            const coverValue = getFieldValue(row, coverField);
            const titleValue = getFieldValue(row, titleField);
            const subtitleValue = getFieldValue(row, subtitleField);

            // Handle cover - could be text URL or attachment reference
            let coverUrl: string | null = null;
            if (typeof coverValue === 'string' && coverValue.startsWith('http')) {
              coverUrl = coverValue;
            } else if (coverValue === '_attachments' && Array.isArray(row.attachments)) {
              const imgAttachment = row.attachments.find(
                (a) => a.mime_type?.startsWith('image/')
              );
              if (imgAttachment) {
                // In real implementation, get blob URL from WASM
                coverUrl = `/api/attachment/${imgAttachment.id}`;
              }
            }

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
              >
                <GalleryCard
                  coverUrl={coverUrl}
                  title={String(titleValue)}
                  subtitle={String(subtitleValue)}
                  onClick={() => handleCardClick(row)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {selectedRow && (
        <PreviewModal
          row={selectedRow}
          columns={columns}
          template={currentTemplate}
          onClose={handleClosePreview}
          onAttachmentClick={handleAttachmentClick}
        />
      )}

      {previewAttachment && (
        <PreviewModal
          row={null}
          columns={[]}
          template={currentTemplate}
          onClose={() => setPreviewAttachment(null)}
          previewAttachment={previewAttachment}
        />
      )}
    </div>
  );
}

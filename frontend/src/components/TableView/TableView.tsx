import React, { useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useZenStore } from '../../store/useZenStore';
import { Cell } from './Cell';
import { ColumnHeader } from './ColumnHeader';
import type { RowData } from '../../types';

interface TableViewProps {
  onPreview: (item: RowData) => void;
}

export function TableView({ onPreview }: TableViewProps) {
  const { rows, columns, updateRow, renameColumn } = useZenStore();

  // Virtual scroll setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  const handleRenameColumn = useCallback(async (oldName: string, newName: string) => {
    await renameColumn(oldName, newName);
  }, [renameColumn]);

  const handleUpdateRow = useCallback((rowId: number, column: string, value: unknown) => {
    updateRow(rowId, { [column]: value });
  }, [updateRow]);

  const handlePreview = useCallback((value: unknown, column: string) => {
    const row = rows.find(r => String(r[column]) === String(value));
    if (row) {
      onPreview(row);
    }
  }, [rows, onPreview]);

  return (
    <div className="flex-1 overflow-auto" ref={parentRef}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((col) => (
              <ColumnHeader
                key={col}
                columnName={col}
                onRename={handleRenameColumn}
              />
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr 
                key={row._row_id} 
                style={{ transform: `translateY(${virtualRow.start}px)` }}
                className="absolute left-0 right-0"
              >
                {columns.map((col) => (
                  <Cell
                    key={`${row._row_id}-${col}`}
                    value={row[col]}
                    column={col}
                    rowId={row._row_id}
                    onUpdate={handleUpdateRow}
                    onPreview={handlePreview}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Spacer for virtual scroll */}
      <div style={{ height: `${virtualizer.getTotalSize()}px` }} />
    </div>
  );
}

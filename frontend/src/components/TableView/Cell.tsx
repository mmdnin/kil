import React, { useCallback } from 'react';
import classnames from 'classnames';
import type { RowData } from '../../types';

interface CellProps {
  value: unknown;
  column: string;
  rowId: number;
  onUpdate: (rowId: number, column: string, value: unknown) => void;
  onPreview: (value: unknown, column: string, mimeType?: string) => void;
}

export function Cell({ value, column, rowId, onUpdate, onPreview }: CellProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(String(value ?? ''));

  const handleClick = useCallback(() => {
    if (column.startsWith('_')) return;
    
    // Check if it's a blob/attachment
    if (typeof value === 'string' && value.length > 1000) {
      // Likely base64 encoded blob
      onPreview(value, column);
      return;
    }
    
    setIsEditing(true);
  }, [column, value, onPreview]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue !== String(value)) {
      onUpdate(rowId, column, editValue);
    }
  }, [editValue, value, rowId, column, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(String(value ?? ''));
      setIsEditing(false);
    }
  }, [handleBlur, value]);

  const getCellContent = () => {
    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full h-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded focus:outline-none"
        />
      );
    }

    // Render based on value type
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }

    const strValue = String(value);
    
    // Check for file type indicators
    if (strValue.includes('data:') || strValue.startsWith('JVBERi')) {
      // PDF or data URL
      const icon = strValue.includes('pdf') || strValue.startsWith('JVBERi') ? '📄' :
                   strValue.includes('image') ? '🖼️' :
                   strValue.includes('audio') ? '🎵' :
                   strValue.includes('video') ? '🎬' :
                   strValue.includes('epub') ? '📖' : '📎';
      return (
        <button 
          onClick={() => onPreview(value, column)}
          className="flex items-center justify-center w-full h-full text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={`Preview ${column}`}
        >
          {icon}
        </button>
      );
    }

    return (
      <span 
        className="block w-full h-full p-2 text-sm truncate"
        title={strValue}
      >
        {strValue}
      </span>
    );
  };

  return (
    <td
      className={classnames(
        'border border-gray-200 dark:border-gray-700 p-0',
        'min-w-[48px] h-[56px]',
        !column.startsWith('_') && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
      onClick={handleClick}
      role="gridcell"
      aria-label={`${column}: ${value}`}
    >
      <div className="w-full h-full flex items-center justify-center rounded-lg">
        {getCellContent()}
      </div>
    </td>
  );
}

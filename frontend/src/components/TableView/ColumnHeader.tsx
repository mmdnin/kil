import React, { useState, useCallback } from 'react';
import classnames from 'classnames';

interface ColumnHeaderProps {
  columnName: string;
  onRename: (oldName: string, newName: string) => void;
  onDelete?: () => void;
}

export function ColumnHeader({ columnName, onRename, onDelete }: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(columnName);

  const handleDoubleClick = useCallback(() => {
    if (!columnName.startsWith('_')) {
      setIsEditing(true);
    }
  }, [columnName]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue !== columnName && editValue.trim()) {
      onRename(columnName, editValue.trim());
    } else {
      setEditValue(columnName);
    }
  }, [editValue, columnName, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(columnName);
      setIsEditing(false);
    }
  }, [handleBlur, columnName]);

  return (
    <th
      className={classnames(
        'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
        !columnName.startsWith('_') && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
      )}
      onDoubleClick={handleDoubleClick}
      role="columnheader"
      aria-label={columnName}
    >
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-blue-500 rounded focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="truncate block">
          {columnName}
        </span>
      )}
    </th>
  );
}

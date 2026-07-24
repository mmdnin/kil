import { useVirtualizer } from '@tanstack/react-virtual';
import type { GalleryTemplate, TableRow } from '../../types';

interface TemplateSelectorProps {
  templates: GalleryTemplate[];
  currentTemplate: string;
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({ templates, currentTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="mb-4">
      <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-2">
        视图模板
      </label>
      <select
        id="template-select"
        value={currentTemplate}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]
                   dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        aria-label="选择画廊视图模板"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}

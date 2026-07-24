import { useCallback } from 'react';
import { useZenStore } from '../../store/useZenStore';

export function ExportButton() {
  const { saveZlFile } = useZenStore();

  const handleExport = useCallback(async () => {
    try {
      await saveZlFile();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    }
  }, [saveZlFile]);

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 
                 hover:bg-green-700 text-white rounded-lg transition-colors
                 focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                 min-h-[44px] shadow-sm"
      aria-label="导出 .zl 文件"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
      <span className="hidden sm:inline">导出 .zl</span>
    </button>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { useZenStore } from './store/useZenStore';
import { useZenDb } from './hooks/useZenDb';
import { FileDropZone } from './components/FileDropZone';
import { TableView } from './components/TableView/TableView';
import { GalleryView } from './components/GalleryView/GalleryView';
import { ExportButton } from './components/ExportButton';

type ViewMode = 'table' | 'gallery';

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { isInitialized, isLoading, error, rows, columns } = useZenStore();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        // Trigger export - would need to use ref or context
      }
      // Ctrl/Cmd + T: Toggle view
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'table' ? 'gallery' : 'table'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  if (!isInitialized && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">初始化 ZenLib...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            初始化失败
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                       transition-colors min-h-[44px]"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                ZenLib
              </h1>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2" role="tablist" aria-label="视图切换">
              <button
                role="tab"
                aria-selected={viewMode === 'table'}
                onClick={() => handleViewChange('table')}
                className={`px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">表格</span>
                </span>
              </button>
              <button
                role="tab"
                aria-selected={viewMode === 'gallery'}
                onClick={() => handleViewChange('gallery')}
                className={`px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
                  viewMode === 'gallery'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">画廊</span>
                </span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <ExportButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isInitialized ? (
          <FileDropZone />
        ) : (
          <>
            {viewMode === 'table' ? (
              <TableView rows={rows} columns={columns} />
            ) : (
              <GalleryView rows={rows} columns={columns} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            ZenLib v0.1.0 • 本地优先的知识库管理工具
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

import { useEffect, useRef, useState } from 'react';

export interface EpubPreviewProps {
  attachment: {
    id: number;
    filename: string;
    mimeType: string;
    data?: ArrayBuffer;
  };
}

export function EpubPreview({ attachment }: EpubPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadEpub = async () => {
      if (!containerRef.current) return;

      try {
        // Dynamically import epubjs for lazy loading
        const ePub = (await import('epubjs')).default;

        // In real implementation, fetch blob from WASM and convert to ArrayBuffer
        // For now, we'll show a placeholder
        setIsLoading(false);

        // Example of how epubjs would be used:
        // const book = ePub(arrayBuffer);
        // const rendition = book.renderTo(containerRef.current, {
        //   width: '100%',
        //   height: '100%',
        //   flow: 'paginated',
        //   spread: 'auto',
        // });
        // await rendition.display();

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load EPUB');
          setIsLoading(false);
        }
      }
    };

    loadEpub();

    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">
          加载 EPUB 阅读器...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* EPUB Reader Container */}
      <div
        ref={containerRef}
        className="flex-1 bg-white"
        aria-label={`EPUB 阅读器：${attachment.filename}`}
      />

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                     min-h-[44px] min-w-[44px]"
          aria-label="上一页"
          disabled
        >
          ← 上一页
        </button>
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {attachment.filename}
        </span>
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg
                     hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                     min-h-[44px] min-w-[44px]"
          aria-label="下一页"
          disabled
        >
          下一页 →
        </button>
      </div>

      {/* Font Size Controls */}
      <div className="flex items-center justify-center gap-2 p-2 border-t border-gray-100 dark:border-gray-800">
        <button
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded
                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                     min-h-[44px]"
          aria-label="减小字体"
          disabled
        >
          A−
        </button>
        <button
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded
                     hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                     min-h-[44px]"
          aria-label="增大字体"
          disabled
        >
          A+
        </button>
      </div>
    </div>
  );
}

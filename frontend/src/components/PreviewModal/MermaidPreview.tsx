import { useEffect, useRef, useState, useCallback } from 'react';

interface MermaidPreviewProps {
  code: string;
}

export function MermaidPreview({ code }: MermaidPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker on first render
  useEffect(() => {
    let cancelled = false;

    const initWorker = async () => {
      try {
        // Dynamically import and create worker for lazy loading
        const workerUrl = new URL('../../workers/mermaid.worker.ts', import.meta.url);
        const worker = new Worker(workerUrl, { type: 'module' });
        
        worker.onmessage = (e: MessageEvent) => {
          if (cancelled) return;
          
          const { id, svg: resultSvg, error: workerError } = e.data;
          
          if (workerError) {
            setError(workerError);
            setIsLoading(false);
          } else {
            setSvg(resultSvg);
            setIsLoading(false);
          }
        };

        worker.onerror = (err) => {
          if (!cancelled) {
            setError(`Worker error: ${err.message}`);
            setIsLoading(false);
          }
        };

        workerRef.current = worker;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Mermaid worker');
          setIsLoading(false);
        }
      }
    };

    initWorker();

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
    };
  }, []);

  // Send code to worker when it changes
  useEffect(() => {
    if (!workerRef.current || !code) return;

    setIsLoading(true);
    setError(null);

    const messageId = Date.now();
    workerRef.current.postMessage({ id: messageId, code });
  }, [code]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">
          渲染 Mermaid 图表...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400 text-center px-4">
          <p className="font-semibold mb-2">Mermaid 渲染失败</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto p-4 flex items-center justify-center bg-white dark:bg-gray-900"
      aria-label="Mermaid 图表预览"
      dangerouslySetInnerHTML={{ __html: svg || '' }}
    />
  );
}

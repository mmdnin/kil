import { useState, useRef } from 'react';

export interface NativePreviewProps {
  attachment: {
    id: number;
    filename: string;
    mime_type?: string;
    mimeType?: string;
    data?: ArrayBuffer;
  };
}

export function NativePreview({ attachment }: NativePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getMimeType = () => attachment.mime_type || 'application/octet-stream';

  const isImage = () => getMimeType().startsWith('image/');
  const isAudio = () => getMimeType().startsWith('audio/');
  const isVideo = () => getMimeType().startsWith('video/');
  const isPdf = () => getMimeType().includes('pdf');
  const isHtml = () => getMimeType().includes('html') || getMimeType().includes('htm');
  const isText = () =>
    getMimeType().startsWith('text/') ||
    getMimeType().includes('markdown') ||
    getMimeType().includes('json') ||
    getMimeType().includes('xml');

  // In real implementation, this would fetch blob from WASM and create object URL
  const getObjectUrl = (): string => {
    // Placeholder - in real app: URL.createObjectURL(blobFromWasm)
    return '';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400 text-center">
          <p className="font-semibold mb-2">加载失败</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Image preview
  if (isImage()) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800">
        <img
          src={getObjectUrl() || '/placeholder-image.png'}
          alt={attachment.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
          loading="lazy"
          onError={() => setError('无法加载图片')}
        />
      </div>
    );
  }

  // Audio preview
  if (isAudio()) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <span className="text-4xl">🎵</span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              {attachment.filename}
            </h3>
          </div>
          <audio
            controls
            className="w-full"
            src={getObjectUrl()}
            onError={() => setError('无法加载音频')}
          >
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>
    );
  }

  // Video preview
  if (isVideo()) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-black">
        <video
          controls
          className="max-w-full max-h-[80vh] rounded-lg"
          src={getObjectUrl()}
          onError={() => setError('无法加载视频')}
        >
          您的浏览器不支持视频播放
        </video>
      </div>
    );
  }

  // PDF preview
  if (isPdf()) {
    return (
      <div className="flex-1 flex flex-col">
        <iframe
          ref={iframeRef}
          src={getObjectUrl() || ''}
          className="flex-1 w-full border-0"
          title={attachment.filename}
          sandbox="allow-scripts allow-same-origin"
          onError={() => setError('无法加载 PDF')}
        />
        <div className="p-2 bg-gray-100 dark:bg-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
          提示：如果 PDF 无法显示，请尝试下载后使用本地阅读器打开
        </div>
      </div>
    );
  }

  // HTML preview (sandboxed)
  if (isHtml()) {
    return (
      <div className="flex-1 flex flex-col">
        <iframe
          ref={iframeRef}
          src={getObjectUrl() || ''}
          className="flex-1 w-full border-0 bg-white"
          title={attachment.filename}
          sandbox="allow-scripts"
          onError={() => setError('无法加载 HTML')}
        />
      </div>
    );
  }

  // Text/Code preview with syntax highlighting hint
  if (isText()) {
    return (
      <div className="flex-1 overflow-auto p-4 bg-gray-900 text-gray-100">
        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
          {/* In real implementation, fetch text content from WASM */}
          <code>{`// ${attachment.filename}\n// 文本内容预览需要加载文件数据...\n// MIME: ${getMimeType()}`}</code>
        </pre>
      </div>
    );
  }

  // Unknown file type - show info and download option
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <span className="text-6xl mb-6">📎</span>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {attachment.filename}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {getMimeType()}
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
        文件大小：{formatFileSize(attachment.size)}
      </p>
      <button
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                   transition-colors min-h-[44px] min-w-[44px] flex items-center gap-2"
        onClick={() => {
          // Trigger download
          const link = document.createElement('a');
          link.href = getObjectUrl();
          link.download = attachment.filename;
          link.click();
        }}
        aria-label={`下载文件 ${attachment.filename}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        下载文件
      </button>
    </div>
  );
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

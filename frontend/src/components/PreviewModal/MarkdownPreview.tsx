import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={contentRef}
      className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert 
                 max-w-none px-4 py-2
                 prose-headings:font-semibold
                 prose-a:text-blue-600 dark:prose-a:text-blue-400
                 prose-code:bg-gray-100 dark:prose-code:bg-gray-800
                 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                 prose-pre:bg-gray-900 prose-pre:text-gray-100
                 prose-blockquote:border-l-4 prose-blockquote:border-gray-300
                 prose-table:border-collapse
                 prose-th:border prose-th:border-gray-300 prose-th:p-2
                 prose-td:border prose-td:border-gray-300 prose-td:p-2"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom rendering for specific elements if needed
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="max-w-full h-auto rounded-lg"
              loading="lazy"
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className="min-w-full border border-gray-300" />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

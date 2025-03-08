import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Components } from 'react-markdown';

// Custom components for ReactMarkdown to make content more compact (terminal-like)
export const markdownComponents: Components = {
  p: ({ children }) => <p className="my-0 leading-tight">{children}</p>,
  h1: ({ children }) => <h1 className="text-xl font-bold mt-1 mb-0 leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mt-1 mb-0 leading-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mt-1 mb-0 leading-tight">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-bold mt-1 mb-0 leading-tight">{children}</h4>,
  h5: ({ children }) => <h5 className="text-xs font-bold mt-1 mb-0 leading-tight">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs font-bold mt-1 mb-0 leading-tight">{children}</h6>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-0 space-y-0">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-0 space-y-0">{children}</ol>,
  li: ({ children }) => <li className="my-0 leading-tight">{children}</li>,
  blockquote: ({ children }) => <blockquote className="border-l-2 pl-2 my-0 italic leading-tight">{children}</blockquote>,
  pre: ({ children }) => <pre className="my-0 overflow-auto">{children}</pre>,
  table: ({ children }) => <table className="border-collapse my-0 text-sm">{children}</table>,
  tr: ({ children }) => <tr className="border-b border-gray-300 dark:border-gray-700">{children}</tr>,
  th: ({ children }) => <th className="py-0 px-2 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="py-0 px-2">{children}</td>,
  hr: () => <hr className="my-1" />,
};

interface CompactMarkdownProps {
  content: string;
  className?: string;
}

export const CompactMarkdown: React.FC<CompactMarkdownProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-sm overflow-hidden max-w-full leading-tight ${className}`}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default CompactMarkdown;

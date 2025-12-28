import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Components } from 'react-markdown';

// LinkWithTooltip component for showing link preview on hover
const LinkWithTooltip: React.FC<{ href?: string; children: React.ReactNode }> = ({ href, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  const title = typeof children === 'string' ? children :
    Array.isArray(children) ? children.join('') : 'Link';

  return (
    <span className="relative inline-block">
      <a
        href={href}
        className="text-sm text-gray-800 hover:text-gray-900 dark:text-gray-100 dark:hover:text-white bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-2.5 py-1 rounded-full transition-colors duration-150"
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </a>
      {showTooltip && href && (
        <div className="absolute z-50 left-0 top-full mt-1 w-80 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-left">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2 mb-2">
            {title}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 rounded-lg">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate">{href}</span>
          </div>
        </div>
      )}
    </span>
  );
};

// ThinkingBlock component for toggling thinking content
const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 border-l-4 border-gray-300 dark:border-gray-700">
      <div
        className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-tr-md"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg
          className={`w-4 h-4 mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">Thinking</span>
      </div>
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-b-md">
          {content}
        </div>
      )}
    </div>
  );
};

// Preprocess markdown to fix tables that are on a single line
const preprocessMarkdown = (content: string): string => {
  // Fix tables where rows are on a single line (e.g., "| a | b | | c | d |" -> "| a | b |\n| c | d |")
  // Pattern: end of cell followed by start of new row "| |" -> "|\n|"
  return content.replace(/\|\s+\|/g, '|\n|');
};

// Process the content to extract thinking blocks
const processThinkingBlocks = (content: string): React.ReactNode[] => {
  const thinkingPattern = /<thinking>([\s\S]*?)<\/thinking>/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = thinkingPattern.exec(content)) !== null) {
    // Add text before the thinking block
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Add the thinking block component
    parts.push(<ThinkingBlock key={match.index} content={match[1]} />);

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last thinking block
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts;
};

// Custom components for ReactMarkdown to make content more compact (terminal-like)
export const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mt-1">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold mt-1">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm font-semibold mt-1">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs font-semibold mt-1">{children}</h6>,
	ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
  a: ({ href, children }) => <LinkWithTooltip href={href}>{children}</LinkWithTooltip>,
  // Table components
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-gray-300 dark:border-gray-600">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold border border-gray-300 dark:border-gray-600">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 border border-gray-300 dark:border-gray-600">{children}</td>,
  // Add custom code component to handle empty code blocks
  code: ({ className, children, ...props }: any) => {
    // Check if code block is empty
    const content = children?.toString().trim() || '';
    if (content.length > 0) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    // If it's an empty code block, don't render anything
    return null;
  }
};

interface MarkdownByReactMarkdownProps {
  content: string;
  className?: string;
}

export const MarkdownByReactMarkdown: React.FC<MarkdownByReactMarkdownProps> = ({ content, className = '' }) => {
  // Check if content contains thinking tags
  const hasThinkingBlocks = content.includes('<thinking>');

  if (hasThinkingBlocks) {
    const processedContent = processThinkingBlocks(content);
    return (
      <div className={`${className}`}>
        {processedContent.map((part, index) => {
          if (typeof part === 'string') {
            return (
              <ReactMarkdown
                key={index}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {preprocessMarkdown(part)}
              </ReactMarkdown>
            );
          }
          return part;
        })}
      </div>
    );
  }

  // If no thinking blocks, render as normal
  return (
    <div className={`prose prose-sm overflow-hidden max-w-full sm:leading-relaxed tracking-tight sm:tracking-wide ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {preprocessMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownByReactMarkdown;

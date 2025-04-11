import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Components } from 'react-markdown';

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
  h1: ({ children }) => <h1 className="text-xl font-bold mt-1"># {children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mt-1">## {children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mt-1">### {children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-bold mt-1">#### {children}</h4>,
  h5: ({ children }) => <h5 className="text-xs font-bold mt-1">##### {children}</h5>,
  h6: ({ children }) => <h6 className="text-xs font-bold mt-1">###### {children}</h6>,
	ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
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
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {part}
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
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownByReactMarkdown;

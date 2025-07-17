import { ReactNode } from 'react';
import { CodeBlock } from './code-block';

interface MarkdownRendererProps {
  content: string;
  isDark?: boolean;
}

export function MarkdownRenderer({ content, isDark = false }: MarkdownRendererProps) {
  // Parse content and handle code blocks
  const parseContent = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex to match code blocks (both with and without language specification)
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    let match;
    const matches: Array<{ start: number; end: number; type: 'block' | 'inline'; language?: string; code: string }> = [];
    
    // Find all code blocks
    while ((match = codeBlockRegex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'block',
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    // Find inline code (but not inside code blocks)
    codeBlockRegex.lastIndex = 0; // Reset regex
    let tempText = text;
    
    // Remove code blocks temporarily to find inline code
    matches.forEach(m => {
      if (m.type === 'block') {
        tempText = tempText.slice(0, m.start) + '*'.repeat(m.end - m.start) + tempText.slice(m.end);
      }
    });
    
    let inlineMatch;
    while ((inlineMatch = inlineCodeRegex.exec(tempText)) !== null) {
      // Check if this inline code is not inside a code block
      const isInsideBlock = matches.some(m => 
        m.type === 'block' && inlineMatch.index >= m.start && inlineMatch.index < m.end
      );
      
      if (!isInsideBlock) {
        matches.push({
          start: inlineMatch.index,
          end: inlineMatch.index + inlineMatch[0].length,
          type: 'inline',
          code: inlineMatch[1]
        });
      }
    }
    
    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);
    
    // Build the result
    matches.forEach((match, index) => {
      // Add text before this match
      if (match.start > lastIndex) {
        const beforeText = text.slice(lastIndex, match.start);
        if (beforeText.trim()) {
          parts.push(formatText(beforeText, index * 2));
        }
      }
      
      // Add the code element
      if (match.type === 'block') {
        parts.push(
          <CodeBlock
            key={index * 2 + 1}
            code={match.code}
            language={match.language}
            isDark={isDark}
          />
        );
      } else {
        parts.push(
          <code
            key={index * 2 + 1}
            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded text-sm font-mono border border-gray-200 dark:border-gray-700"
          >
            {match.code}
          </code>
        );
      }
      
      lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push(formatText(remainingText, matches.length * 2));
      }
    }
    
    // If no matches found, return the original text formatted
    if (matches.length === 0) {
      parts.push(formatText(text, 0));
    }
    
    return parts;
  };
  
  const formatText = (text: string, key: number): ReactNode => {
    // Handle bold, italic, and other markdown formatting
    const lines = text.split('\n');
    
    return (
      <div key={key} className="whitespace-pre-wrap">
        {lines.map((line, lineIndex) => {
          // Handle headers
          if (line.startsWith('# ')) {
            return <h1 key={lineIndex} className="text-2xl font-bold mb-2 mt-4">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={lineIndex} className="text-xl font-bold mb-2 mt-3">{line.slice(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={lineIndex} className="text-lg font-bold mb-2 mt-2">{line.slice(4)}</h3>;
          }
          
          // Handle lists
          if (line.match(/^[\s]*[-*+]\s/)) {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            const content = line.replace(/^[\s]*[-*+]\s/, '');
            return (
              <div key={lineIndex} className="flex items-start gap-2 mb-1" style={{ marginLeft: `${indent * 1.5}rem` }}>
                <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 shrink-0"></span>
                <span>{formatInlineElements(content)}</span>
              </div>
            );
          }
          
          // Handle numbered lists
          if (line.match(/^[\s]*\d+\.\s/)) {
            const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
            const content = line.replace(/^[\s]*\d+\.\s/, '');
            const number = line.match(/\d+/)?.[0];
            return (
              <div key={lineIndex} className="flex items-start gap-2 mb-1" style={{ marginLeft: `${indent * 1.5}rem` }}>
                <span className="text-gray-600 dark:text-gray-400 shrink-0 w-6">{number}.</span>
                <span>{formatInlineElements(content)}</span>
              </div>
            );
          }
          
          // Regular paragraphs
          if (line.trim()) {
            return <p key={lineIndex} className="mb-2 leading-relaxed">{formatInlineElements(line)}</p>;
          }
          
          // Empty lines
          return <br key={lineIndex} />;
        })}
      </div>
    );
  };
  
  const formatInlineElements = (text: string): ReactNode => {
    // Handle bold **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Handle italic *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };
  
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      {parseContent(content)}
    </div>
  );
}
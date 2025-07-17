import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { Button } from './button';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps {
  code: string;
  language?: string;
  isDark?: boolean;
}

export function CodeBlock({ code, language = 'text', isDark = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "คัดลอกแล้ว",
        description: "โค้ดถูกคัดลอกไปยังคลิปบอร์ดแล้ว",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกได้",
        variant: "destructive"
      });
    }
  };

  // Clean up the code and detect language
  const cleanCode = code.replace(/^```(\w+)?\n?/, '').replace(/```$/, '').trim();
  const detectedLanguage = language === 'text' && code.startsWith('```') 
    ? code.match(/^```(\w+)/)?.[1] || 'text'
    : language;

  return (
    <div className="relative group rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 my-4">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase">
          {detectedLanguage}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="opacity-70 hover:opacity-100 transition-opacity h-8 px-2"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={detectedLanguage}
          style={isDark ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
          showLineNumbers={cleanCode.split('\n').length > 1}
          lineNumberStyle={{
            minWidth: '2.5rem',
            paddingRight: '1rem',
            color: isDark ? '#6b7280' : '#9ca3af',
            userSelect: 'none',
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {cleanCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
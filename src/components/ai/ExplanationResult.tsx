
import React from 'react';
import GlassCard from '@/components/ui-custom/GlassCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ExplanationResultProps {
  content: string;
  isLoading: boolean;
}

const ExplanationResult: React.FC<ExplanationResultProps> = ({ content, isLoading }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="p-6 min-h-[200px] flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 rounded-full border-t-2 border-primary animate-spin-slow"></div>
        <p className="text-muted-foreground animate-pulse-light">Generating explanation...</p>
      </GlassCard>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-primary/5 border-b border-border">
        <h3 className="text-lg font-medium">AI Explanation</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={copyToClipboard}
        >
          <Copy size={16} />
          <span>Copy</span>
        </Button>
      </div>
      <div className="p-6 overflow-auto max-h-[600px]">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="my-3 leading-relaxed" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-3" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-3" {...props} />,
            li: ({ node, ...props }) => <li className="my-1" {...props} />,
            a: ({ node, ...props }) => (
              <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4" {...props} />
            ),
            hr: ({ node, ...props }) => <Separator className="my-4" {...props} />,
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              return !className ? (
                <code
                  className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <SyntaxHighlighter
                  style={oneLight}
                  language={match ? match[1] : ''}
                  PreTag="div"
                  className="rounded-md my-4"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </GlassCard>
  );
};

export default ExplanationResult;

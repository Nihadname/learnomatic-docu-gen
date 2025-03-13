import React, { useState, useEffect, useRef } from 'react';
import GlassCard from '@/components/ui-custom/GlassCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, Download, ExpandIcon, ChevronDown, ChevronUp, CheckCircle2, Book, Brain, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ExplanationResultProps {
  content: string;
  isLoading: boolean;
}

interface Section {
  title: string;
  icon: React.ReactNode;
  id: string;
}

const ExplanationResult: React.FC<ExplanationResultProps> = ({ content, isLoading }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("full");
  const contentRef = useRef<HTMLDivElement>(null);

  // Sections for easy navigation
  const sections: Section[] = [
    { title: "Quick Summary", icon: <Brain size={16} />, id: "quick-summary" },
    { title: "Introduction", icon: <Book size={16} />, id: "introduction" },
    { title: "Real-World Analogy", icon: <Lightbulb size={16} />, id: "real-world-analogy" },
    { title: "Core Concepts", icon: <Brain size={16} />, id: "core-concepts" },
    { title: "How It Works", icon: <Brain size={16} />, id: "how-it-works" },
    { title: "Case Study", icon: <Book size={16} />, id: "case-study" },
    { title: "Practical Applications", icon: <Lightbulb size={16} />, id: "practical-applications" },
    { title: "Interactive Quiz", icon: <CheckCircle2 size={16} />, id: "interactive-quiz" },
  ];

  useEffect(() => {
    // Process HTML content to handle quiz interactions and collapsible sections
    if (contentRef.current && content) {
      // Find all details elements and make them interactive
      const details = contentRef.current.querySelectorAll('details');
      details.forEach((detail) => {
        const summary = detail.querySelector('summary');
        if (summary) {
          summary.addEventListener('click', (e) => {
            e.preventDefault();
            detail.toggleAttribute('open');
          });
        }
      });
    }
  }, [content]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleCodeCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const downloadAsPDF = () => {
    toast.info('Preparing PDF download...');
    // In a real implementation, you would generate a PDF here
    // For example using a library like jsPDF or html2pdf
    setTimeout(() => {
      toast.success('PDF download feature coming soon!');
    }, 1000);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      
      // Expand section if collapsed
      setCollapsedSections(prev => ({
        ...prev,
        [sectionId]: false
      }));
    }
  };

  const handleQuizAnswer = (questionId: string, selectedAnswer: string, correctAnswer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selectedAnswer
    }));
    
    setQuizResults(prev => ({
      ...prev,
      [questionId]: selectedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    }));
    
    if (selectedAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      toast.success('Correct answer!');
    } else {
      toast.error('Not quite right. Try again!');
    }
  };

  if (isLoading) {
    return (
      <GlassCard className="p-6 min-h-[200px] flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 rounded-full border-t-2 border-primary animate-spin-slow"></div>
        <p className="text-muted-foreground animate-pulse-light">Generating explanation...</p>
        <p className="text-xs text-muted-foreground">This may take a moment as we craft a detailed explanation</p>
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
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={copyToClipboard}
          >
            <Copy size={16} />
            <span>Copy</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={downloadAsPDF}
          >
            <Download size={16} />
            <span>Download</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="full" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-2 bg-primary/5 border-b border-border">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="full">Full Explanation</TabsTrigger>
            <TabsTrigger value="sections">Jump to Section</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sections" className="p-4 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sections.map((section) => (
              <Button 
                key={section.id}
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-left"
                onClick={() => scrollToSection(section.id)}
              >
                {section.icon}
                <span className="truncate">{section.title}</span>
              </Button>
            ))}
          </div>
        </TabsContent>

        <div className="p-6 overflow-auto max-h-[600px]" ref={contentRef}>
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => {
                const text = (props.children as any).toString();
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const isCollapsed = collapsedSections[id];
                
                return (
                  <div className="mb-4 group" id={id}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(id)}>
                      <h1 className="text-2xl font-bold mt-6" {...props} />
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </Button>
                    </div>
                    {isCollapsed && <div className="text-muted-foreground italic">Collapsed - click to expand</div>}
                  </div>
                )
              },
              h2: ({ node, ...props }) => {
                const text = (props.children as any).toString();
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const isCollapsed = collapsedSections[id];
                
                return (
                  <div className="mb-3 group" id={id}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection(id)}>
                      <h2 className="text-xl font-bold mt-5" {...props} />
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </Button>
                    </div>
                    {isCollapsed && <div className="text-muted-foreground italic">Collapsed - click to expand</div>}
                  </div>
                )
              },
              h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
              p: ({ node, children, ...props }) => {
                // Check if this paragraph is inside a collapsed section
                const parentSection = (node as any).parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                return <p className="my-3 leading-relaxed" {...props}>{children}</p>
              },
              ul: ({ node, children, ...props }) => {
                // Check if this list is inside a collapsed section
                const parentSection = (node as any).parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                return <ul className="list-disc pl-6 my-3" {...props}>{children}</ul>
              },
              ol: ({ node, children, ...props }) => {
                // Check if this list is inside a collapsed section
                const parentSection = (node as any).parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                return <ol className="list-decimal pl-6 my-3" {...props}>{children}</ol>
              },
              li: ({ node, ...props }) => <li className="my-1" {...props} />,
              a: ({ node, ...props }) => (
                <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
              ),
              blockquote: ({ node, children, ...props }) => {
                const parentSection = (node as any).parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                return (
                  <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 bg-primary/5 p-3 rounded-r-md" {...props}>
                    {children}
                  </blockquote>
                )
              },
              hr: ({ node, ...props }) => <Separator className="my-4" {...props} />,
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                const parentSection = (props as any).node?.parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                
                const code = String(children).replace(/\n$/, '');
                
                return !className ? (
                  <code
                    className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCodeCopy(code)}
                    >
                      <Copy size={14} />
                    </Button>
                    <SyntaxHighlighter
                      style={oneLight}
                      language={match ? match[1] : ''}
                      PreTag="div"
                      className="rounded-md my-4 !bg-secondary/50"
                      customStyle={{ padding: '1rem' }}
                      {...props}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                );
              },
              table: ({ node, children, ...props }) => {
                const parentSection = (node as any).parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                return (
                  <div className="overflow-x-auto my-4 border rounded-md">
                    <table className="min-w-full divide-y divide-border" {...props}>
                      {children}
                    </table>
                  </div>
                )
              },
              thead: (props) => <thead className="bg-primary/5" {...props} />,
              tbody: (props) => <tbody className="divide-y divide-border" {...props} />,
              tr: (props) => <tr className="even:bg-primary/[0.02]" {...props} />,
              th: (props) => <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" {...props} />,
              td: (props) => <td className="px-3 py-2 text-sm" {...props} />,
              
              // Handle details/summary elements for quiz answers
              details: ({ node, children, ...props }) => {
                const parentSection = (node as any).parentElement?.closest('div[id]')?.id;
                if (parentSection && collapsedSections[parentSection]) {
                  return null;
                }
                return (
                  <details className="my-2 border rounded-md p-2 bg-primary/5" {...props}>
                    {children}
                  </details>
                )
              },
              summary: (props) => (
                <summary className="cursor-pointer font-medium text-primary hover:text-primary/80" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </Tabs>
    </GlassCard>
  );
};

export default ExplanationResult;

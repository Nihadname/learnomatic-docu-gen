import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Copy, Play, Code, Loader2, Terminal, Sparkles, Info, Upload, Image as ImageIcon, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import openAIService from '@/utils/openai';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism.css';

// Define interfaces for our component
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeSnippets?: CodeSnippet[];
  image?: string;
}

interface CodeSnippet {
  code: string;
  language: string;
}

const ChatAssistant = () => {
  // State management
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [activeCodeTab, setActiveCodeTab] = useState<string>('preview');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const [codeTheme, setCodeTheme] = useState<string>('dark');
  const [textInput, setTextInput] = useState<string>('');
  const [showExplainPanel, setShowExplainPanel] = useState<boolean>(false);
  const [currentExplainCode, setCurrentExplainCode] = useState<string>('');
  const [codeExecutionResult, setCodeExecutionResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Refs
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  
  // Auth
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to access this feature');
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  // Setup keyboard events for image viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingImage && e.key === 'Escape') {
        closeImageViewer();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewingImage]);
  
  // Setup clipboard paste event listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        // Check if clipboardData contains an image
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            // Get image from clipboard
            const blob = items[i].getAsFile();
            if (blob) {
              // Convert to base64
              const reader = new FileReader();
              reader.onloadend = () => {
                setSelectedImage(blob);
                setImagePreview(reader.result as string);
                toast.success('Image pasted from clipboard');
              };
              reader.onerror = () => {
                toast.error('Failed to read pasted image');
              };
              reader.readAsDataURL(blob);
              // Prevent default paste behavior
              e.preventDefault();
              break;
            }
          }
        }
      }
    };

    // Add paste event listener to the document
    document.addEventListener('paste', handlePaste);
    
    // Clean up the event listener on unmount
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);
  
  // Scroll to bottom of conversation when new messages are added
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);
  
  // Handle code execution simulation
  const executeCode = (code: string, language: string) => {
    setIsExecuting(true);
    
    // This is a simulation since actual code execution would require a backend
    setTimeout(() => {
      let result = '';
      
      // Simple simulation of code execution results based on language
      if (language === 'javascript' || language === 'typescript') {
        if (code.includes('console.log')) {
          result = '> ' + code.match(/console\.log\(['"](.+)['"]\)/)?.[1] || 'Hello, world!';
        } else if (code.includes('function')) {
          result = '> Function defined successfully\n> Ready to use';
        } else if (code.includes('class')) {
          result = '> Class defined successfully\n> Ready to instantiate';
        } else {
          result = '> Code executed successfully';
        }
      } else if (language === 'python') {
        if (code.includes('print')) {
          result = '>>> ' + code.match(/print\(['"](.+)['"]\)/)?.[1] || 'Hello, world!';
        } else if (code.includes('def ')) {
          result = '>>> Function defined successfully\n>>> Ready to call';
        } else if (code.includes('class ')) {
          result = '>>> Class defined successfully\n>>> Ready to instantiate';
        } else {
          result = '>>> Code executed successfully';
        }
      } else {
        result = '> Code execution simulated for ' + language;
      }
      
      setCodeExecutionResult(result);
      setIsExecuting(false);
    }, 1000);
  };
  
  // Open code explanation panel
  const explainCode = (code: string) => {
    setCurrentExplainCode(code);
    setShowExplainPanel(true);
  };
  
  // Handle image selection
  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processImageFile(file);
    }
  };
  
  // Process image file (used by both drag-drop and file input)
  const processImageFile = (file: File) => {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported');
      return;
    }
    
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.onerror = () => {
      toast.error('Failed to read the image file');
      setSelectedImage(null);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isProcessing) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };
  
  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle user input
  const handleUserInput = async (input: string) => {
    if (!input.trim() && !selectedImage) return;
    
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      image: imagePreview || undefined
    };
    
    setConversation(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Create a system message to restrict to programming topics
      const systemMessage = `You are an expert programming assistant. Respond only to programming-related queries. 
      If the user asks about non-programming topics, politely redirect them to ask about programming instead.
      When providing code examples, make them clear, concise and practical.
      Format any code as markdown code blocks with the appropriate language tag.
      For example: \`\`\`javascript\nconsole.log("Hello world");\n\`\`\`
      Keep responses focused, educational and practical for developers.
      Include multiple code examples when appropriate.
      Focus on providing comprehensive, executable code blocks.
      If the user uploads an image (screenshot of code, error, or diagram), analyze the content and provide relevant assistance.
      For code screenshots, try to recreate the code if possible, fix errors, and explain solutions.
      For diagrams or mockups, provide implementation guidance with appropriate code examples.`;
      
      // Get API key
      await openAIService.ensureApiKey();
      
      // Prepare messages for the API
      const messages = [
        {
          role: 'system',
          content: systemMessage
        },
        ...conversation.map(msg => {
          const content = [];
          
          // Add text content
          if (msg.content) {
            content.push({
              type: 'text',
              text: msg.content
            });
          }
          
          // Add image content if present
          if (msg.image) {
            content.push({
              type: 'image_url',
              image_url: {
                url: msg.image
              }
            });
          }
          
          return {
            role: msg.role,
            content: content.length === 1 && content[0].type === 'text' 
              ? content[0].text 
              : content
          };
        }),
        {
          role: 'user',
          content: imagePreview 
            ? [
                { type: 'text', text: input || 'Please analyze this code/image and provide assistance.' },
                { type: 'image_url', image_url: { url: imagePreview } }
              ]
            : input
        }
      ];
      
      // Make API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIService.getApiKey()}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const statusText = response.statusText;
        const errorMessage = errorData?.error?.message || `API error: ${response.status} ${statusText}`;
        
        if (response.status === 413) {
          throw new Error('The image is too large. Please use a smaller image or compress the current one.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        } else {
          throw new Error(errorMessage);
        }
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Extract code snippets
      const codeSnippets = extractCodeSnippets(aiResponse);
      
      // Create assistant message
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        codeSnippets: codeSnippets.length > 0 ? codeSnippets : undefined
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      
      // Clean up the image after sending
      removeSelectedImage();
      
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Error processing your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Extract code snippets from markdown response
  const extractCodeSnippets = (text: string): CodeSnippet[] => {
    const codeBlockRegex = /```([a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
    const snippets: CodeSnippet[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      snippets.push({
        language: match[1]?.toLowerCase() || 'plaintext',
        code: match[2].trim()
      });
    }
    
    return snippets;
  };
  
  // Get language highlighter for code editor
  const getLanguageHighlighter = (lang: string) => {
    switch (lang) {
      case 'javascript': return languages.javascript;
      case 'typescript': return languages.typescript;
      case 'python': return languages.python;
      case 'java': return languages.java;
      case 'csharp': return languages.csharp;
      case 'go': return languages.go;
      case 'rust': return languages.rust;
      default: return languages.javascript;
    }
  };
  
  // Handle submit for text input
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!textInput.trim() && !selectedImage) return;
    
    handleUserInput(textInput);
    setTextInput('');
  };
  
  // Copy code to clipboard
  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => toast.success('Code copied to clipboard'))
      .catch(() => toast.error('Failed to copy code'));
  };
  
  // Handle image click for full-screen view
  const handleImageClick = (imageUrl: string) => {
    setViewingImage(imageUrl);
  };
  
  // Close image viewer
  const closeImageViewer = () => {
    setViewingImage(null);
  };
  
  // If loading or user not authenticated
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-t-transparent border-primary animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Sparkles className="text-primary h-8 w-8" />
            Code Chat Assistant
            <Sparkles className="text-primary h-8 w-8" />
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your AI programming assistant. Chat to get coding help and interactive code examples with explanations.
          </p>
        </AnimatedContainer>
        
        <div className="grid lg:grid-cols-6 gap-8 max-w-6xl mx-auto">
          {/* Left Panel - Controls and Info */}
          <div className="lg:col-span-2">
            <AnimatedContainer animation="fade" delay={100}>
              <GlassCard className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  <span>Chat Settings</span>
                </h3>
                
                <div className="flex flex-col gap-4">
                  {/* Code Settings */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium block">Code Theme</label>
                      </div>
                      <select 
                        className="w-full px-3 py-2 bg-background border border-input rounded-md"
                        value={codeTheme}
                        onChange={(e) => setCodeTheme(e.target.value)}
                      >
                        <option value="dark">Dark (Default)</option>
                        <option value="light">Light</option>
                        <option value="synthwave">Synthwave</option>
                        <option value="dracula">Dracula</option>
                        <option value="github">GitHub</option>
                      </select>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConversation([])}
                        className="text-xs"
                      >
                        Clear Conversation
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCodeExecutionResult(null)}
                        className="text-xs"
                        disabled={!codeExecutionResult}
                      >
                        Clear Results
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  <span>How to Use</span>
                </h3>
                
                <div className="space-y-4 text-sm">
                  <div className="pb-2 border-b border-border">
                    <h4 className="font-medium mb-1">Example Questions:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>"Explain async/await in JavaScript"</li>
                      <li>"How do I implement a binary search tree in Python?"</li>
                      <li>"Generate a React component for a login form"</li>
                      <li>"Debug this code: [describe your problem]"</li>
                      <li>"What's the difference between == and === in JavaScript?"</li>
                    </ul>
                  </div>
                  
                  <div className="pb-2 border-b border-border">
                    <h4 className="font-medium mb-1">Code Features:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Click "Run Code" to see a simulation</li>
                      <li>Use "Explain" to get code breakdowns</li>
                      <li>Copy code with one click</li>
                      <li>Multiple examples available for complex topics</li>
                      <li>Change theme to customize code appearance</li>
                      <li>Upload screenshots of code or errors for analysis</li>
                      <li>Share diagrams or mockups for implementation help</li>
                    </ul>
                  </div>
                  
                  <div className="pb-2 border-b border-border">
                    <h4 className="font-medium mb-1">Image Features:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Upload screenshots of code for debugging</li>
                      <li>Share error messages for quick troubleshooting</li>
                      <li>Send UI/UX designs for implementation advice</li>
                      <li>Submit diagrams for architecture feedback</li>
                      <li>View images in full-screen with a single click</li>
                    </ul>
                  </div>
                  
                  <div className="pb-2 border-b border-border">
                    <h4 className="font-medium mb-1">Image Upload Methods:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li><span className="font-medium">Paste:</span> Ctrl+V or Cmd+V to paste screenshots</li>
                      <li><span className="font-medium">Drag & Drop:</span> Drag image files into the chat</li>
                      <li><span className="font-medium">Upload:</span> Click the Image button to select a file</li>
                    </ul>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Max image size: 10MB</span>
                      <Badge variant="outline" className="bg-primary/10">
                        <span className="animate-pulse mr-1">•</span> Image support active
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Language Focus:</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">JavaScript</Badge>
                      <Badge variant="outline">Python</Badge>
                      <Badge variant="outline">Java</Badge>
                      <Badge variant="outline">C#</Badge>
                      <Badge variant="outline">TypeScript</Badge>
                      <Badge variant="outline">Go</Badge>
                      <Badge variant="outline">Ruby</Badge>
                    </div>
                  </div>
                </div>
              </GlassCard>
              
              {/* Code Execution Results */}
              {codeExecutionResult && (
                <AnimatedContainer animation="scale" className="mt-6">
                  <GlassCard className="p-6 border-2 border-green-500/30">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-500">
                      <Play className="h-5 w-5" />
                      <span>Execution Results</span>
                    </h3>
                    <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md">
                      {codeExecutionResult.split('\n').map((line, i) => (
                        <div key={i} className="flex">
                          <span className="opacity-50 mr-2">{i + 1}</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </AnimatedContainer>
              )}
            </AnimatedContainer>
          </div>
          
          {/* Right Panel - Conversation and Code */}
          <div className="lg:col-span-4">
            <AnimatedContainer animation="fade" delay={200}>
              <GlassCard className="mb-6 overflow-hidden">
                <div className="conversation-container bg-card/50 h-[400px] overflow-y-auto p-6">
                  {conversation.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Terminal className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No conversation yet</h3>
                      <p className="text-muted-foreground max-w-md">
                        Type a message to ask a programming question
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {conversation.map((message, index) => (
                        <div 
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[95%] sm:max-w-[80%] rounded-lg p-4 ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">
                                {message.role === 'user' ? 'You' : 'AI Assistant'}
                              </span>
                              <span className="text-xs opacity-70">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <div className="formatted-message break-words">
                              {message.role === 'assistant' ? (
                                <div>
                                  {message.content.split("```").map((part, i) => {
                                    if (i % 2 === 0) {
                                      return (
                                        <div key={i} className="mb-2">
                                          {/* Replace markdown formatting with HTML */}
                                          {part.split('\n').map((line, j) => (
                                            <p key={j} className="break-words">{line}</p>
                                          ))}
                                        </div>
                                      );
                                    } else {
                                      // Skip the code blocks as they'll be shown in the tabs
                                      return null;
                                    }
                                  })}
                                </div>
                              ) : (
                                <div>
                                  <p className="break-words">{message.content}</p>
                                  {/* Display user uploaded image if present */}
                                  {message.image && (
                                    <div className="mt-2 rounded-md overflow-hidden border border-border">
                                      <img 
                                        src={message.image} 
                                        alt="Uploaded content" 
                                        className="max-w-full object-contain max-h-64"
                                        onClick={() => handleImageClick(message.image)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={conversationEndRef} />
                    </div>
                  )}
                </div>
                
                {/* Text Input Form */}
                <form 
                  onSubmit={handleTextSubmit} 
                  className={`flex flex-col gap-2 p-3 bg-background border-t border-border relative ${isDragging ? 'ring-2 ring-primary/50' : ''}`}
                  onDragEnter={handleDragEnter} 
                  onDragLeave={handleDragLeave} 
                  onDragOver={handleDragOver} 
                  onDrop={handleDrop}
                >
                  {/* Drag overlay */}
                  {isDragging && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-md flex items-center justify-center z-10">
                      <div className="text-center p-4 rounded-lg bg-background/80">
                        <ImageIcon className="mx-auto h-8 w-8 text-primary mb-2" />
                        <p className="text-sm font-medium">Drop image here</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Image preview area */}
                  {imagePreview && (
                    <div className="relative w-full mb-2 rounded-md overflow-hidden border border-input bg-black/5">
                      <div className="flex flex-col sm:flex-row items-center">
                        <div className="aspect-video h-32 sm:h-48 relative flex-shrink-0">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="h-full object-contain"
                          />
                        </div>
                        <div className="p-2 sm:p-3 w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">Image ready to send</span>
                            <button
                              type="button"
                              onClick={removeSelectedImage}
                              className="bg-background/80 p-1 rounded-full hover:bg-background flex-shrink-0"
                              aria-label="Remove image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {selectedImage && (
                            <p className="text-xs text-muted-foreground">
                              {selectedImage.name.length > 25 
                                ? selectedImage.name.substring(0, 25) + '...' 
                                : selectedImage.name} • {(selectedImage.size / 1024).toFixed(0)} KB
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-md hover:bg-primary/20 hover:text-primary transition-colors border border-input flex items-center gap-1 relative"
                      title="Upload image"
                      disabled={isProcessing}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-xs hidden sm:inline">Image</span>
                      {selectedImage && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full">
                          1
                        </span>
                      )}
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Type your programming question here... (Ctrl+V to paste image)"
                        className="w-full bg-background px-3 py-2 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        ref={textInputRef}
                        disabled={isProcessing}
                      />
                      {imagePreview ? null : (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground hidden md:block">
                          Ctrl+V to paste image
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={isProcessing || (!textInput.trim() && !selectedImage)}
                      className="px-4"
                    >
                      Send
                    </Button>
                    
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelection}
                      disabled={isProcessing}
                    />
                  </div>
                </form>
              </GlassCard>
              
              {/* Code Display Area */}
              {conversation.length > 0 && 
               conversation[conversation.length - 1].role === 'assistant' && 
               conversation[conversation.length - 1].codeSnippets && 
               conversation[conversation.length - 1].codeSnippets.length > 0 && (
                <GlassCard className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      <span>Interactive Code Examples</span>
                    </h3>
                    
                    {conversation[conversation.length - 1].codeSnippets.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {conversation[conversation.length - 1].codeSnippets.map((snippet, index) => (
                          <Button 
                            key={index}
                            size="sm"
                            variant={activeCodeTab === `snippet-${index}` ? 'default' : 'outline'}
                            onClick={() => setActiveCodeTab(`snippet-${index}`)}
                          >
                            Example {index + 1}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="code-container">
                    {conversation[conversation.length - 1].codeSnippets.map((snippet, index) => (
                      <div 
                        key={index} 
                        className={activeCodeTab === `snippet-${index}` || (index === 0 && activeCodeTab === 'preview') ? 'block' : 'hidden'}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                          <Badge variant="outline" className="capitalize self-start">
                            {snippet.language}
                          </Badge>
                          <div className="flex flex-wrap items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => executeCode(snippet.code, snippet.language)}
                                    disabled={isExecuting}
                                  >
                                    {isExecuting ? 
                                      <Loader2 className="h-4 w-4 animate-spin" /> : 
                                      <Play className="h-4 w-4" />
                                    }
                                    <span className="ml-1">Run Code</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Execute code simulation</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => explainCode(snippet.code)}
                                  >
                                    <Info className="h-4 w-4" />
                                    <span className="ml-1">Explain</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Get line-by-line explanation</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => copyCodeToClipboard(snippet.code)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy code</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        
                        <div className={`border border-input rounded-md overflow-hidden ${
                          codeTheme === 'dark' ? 'bg-black' : 
                          codeTheme === 'light' ? 'bg-white' :
                          codeTheme === 'synthwave' ? 'bg-[#2b213a]' :
                          codeTheme === 'dracula' ? 'bg-[#282a36]' :
                          'bg-[#f6f8fa]' // GitHub theme
                        }`}>
                          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <Editor
                              value={snippet.code}
                              onValueChange={() => {}}
                              highlight={code => highlight(code, getLanguageHighlighter(snippet.language), snippet.language)}
                              padding={16}
                              style={{
                                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                                fontSize: '14px',
                                backgroundColor: 'transparent',
                                color: codeTheme === 'light' || codeTheme === 'github' ? '#000000' : '#ffffff',
                                minHeight: '200px',
                                borderRadius: '0.375rem',
                              }}
                              className={`min-h-[200px] w-full ${codeTheme}-theme`}
                              readOnly={true}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
              
              {/* Code Explanation Panel */}
              {showExplainPanel && (
                <GlassCard className="p-4 sm:p-6 mt-6 border-t-4 border-primary">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      <span>Code Explanation</span>
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowExplainPanel(false)}
                    >
                      Close
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/10 p-4 rounded-md overflow-x-auto">
                      <h4 className="text-sm font-semibold mb-2">Original Code</h4>
                      <pre className="text-xs whitespace-pre-wrap break-all">
                        {currentExplainCode.split('\n').map((line, i) => (
                          <div key={i} className="flex">
                            <span className="text-muted-foreground w-6 text-right pr-2 shrink-0">{i + 1}</span>
                            <span className="break-words overflow-wrap-anywhere">{line}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                    
                    <div className="bg-black/10 p-4 rounded-md overflow-y-auto">
                      <h4 className="text-sm font-semibold mb-2">Explanation</h4>
                      <div className="text-xs space-y-2">
                        {currentExplainCode.split('\n').map((line, i) => (
                          <div key={i} className="pb-2 border-b border-border">
                            <p className="font-semibold text-primary">{`Line ${i + 1}:`}</p>
                            <p className="break-words">{line.trim() ? explainCodeLine(line, i) : "(Empty line)"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}
              
              {/* Loading state */}
              {isProcessing && (
                <GlassCard className="p-6 flex items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
                    <span className="font-medium">Processing your request...</span>
                  </div>
                </GlassCard>
              )}
            </AnimatedContainer>
          </div>
        </div>
      </main>
      
      <footer className="bg-background border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} LearnOmatic | AI-Powered Learning & Documentation Assistant</p>
        </div>
      </footer>
      
      {/* Full-screen image viewer */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={closeImageViewer}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
                onClick={closeImageViewer}
                aria-label="Close image viewer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex items-center justify-center h-full">
              <img 
                src={viewingImage} 
                alt="Fullscreen view" 
                className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-full px-4 py-2 text-white text-sm">
              Press ESC or click outside to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple function to generate explanations for code lines
const explainCodeLine = (line: string, lineNumber: number): string => {
  if (line.trim() === '') return "This is an empty line used for spacing and readability.";
  
  if (line.includes('import ') || line.includes('from ')) 
    return "This line imports necessary modules or components needed for the code to work.";
    
  if (line.includes('function ') || line.includes('const ') || line.includes('let ') || line.includes('var ')) 
    return "This declares a variable or function that will be used in the program.";
    
  if (line.includes('class ')) 
    return "This defines a class, which is a blueprint for creating objects with specific properties and methods.";
    
  if (line.includes('if ') || line.includes('else ')) 
    return "This is a conditional statement that controls the flow of execution based on certain conditions.";
    
  if (line.includes('for ') || line.includes('while ')) 
    return "This is a loop that repeats a block of code multiple times.";
    
  if (line.includes('return ')) 
    return "This returns a value from a function back to where it was called.";
    
  if (line.includes('try ') || line.includes('catch ') || line.includes('finally ')) 
    return "This is error handling code that gracefully manages exceptions that might occur.";
    
  if (line.trim().startsWith('//') || line.trim().startsWith('#')) 
    return "This is a comment that explains the code but doesn't affect execution.";
    
  if (line.includes('=')) 
    return "This assigns a value to a variable or property.";
    
  if (line.includes('.')) 
    return "This accesses a property or method of an object.";
    
  if (line.includes('(') && line.includes(')')) 
    return "This is calling a function or method with the given parameters.";
    
  // Default explanation
  return "This is code that contributes to the program's functionality.";
};

export default ChatAssistant; 
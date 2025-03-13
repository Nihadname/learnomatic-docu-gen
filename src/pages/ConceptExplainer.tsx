import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Brain, ChevronRight, Code, BookOpen, Bookmark, History, BookmarkPlus, ChevronDown, CheckCircle2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import ExplanationResult from '@/components/ai/ExplanationResult';
import openAIService from '@/utils/openai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FormData {
  topic: string;
  includeCode: boolean;
  programmingLanguage: string;
}

interface SavedExplanation {
  id: string;
  topic: string;
  content: string;
  date: string;
}

const ConceptExplainer = () => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKeyLoading, setApiKeyLoading] = useState<boolean>(false);
  const [savedExplanations, setSavedExplanations] = useState<SavedExplanation[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to access this feature');
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Load saved explanations from localStorage on initial load
  useEffect(() => {
    const savedItems = localStorage.getItem('savedExplanations');
    if (savedItems) {
      try {
        setSavedExplanations(JSON.parse(savedItems));
      } catch (e) {
        console.error('Failed to parse saved explanations', e);
      }
    }
  }, []);

  const saveExplanation = (topic: string, content: string) => {
    const newExplanation: SavedExplanation = {
      id: Date.now().toString(),
      topic,
      content,
      date: new Date().toLocaleString()
    };
    
    const updatedExplanations = [...savedExplanations, newExplanation];
    setSavedExplanations(updatedExplanations);
    
    // Save to localStorage
    localStorage.setItem('savedExplanations', JSON.stringify(updatedExplanations));
    
    toast.success('Explanation saved to your library');
  };

  const deleteSavedExplanation = (id: string) => {
    const updatedExplanations = savedExplanations.filter(item => item.id !== id);
    setSavedExplanations(updatedExplanations);
    localStorage.setItem('savedExplanations', JSON.stringify(updatedExplanations));
    toast.success('Explanation removed from your library');
  };

  const loadSavedExplanation = (saved: SavedExplanation) => {
    setExplanation(saved.content);
    setValue('topic', saved.topic);
    setShowHistory(false);
    toast.info('Loaded: ' + saved.topic);
  };

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      topic: '',
      includeCode: true,
      programmingLanguage: 'javascript'
    }
  });

  const includeCode = watch('includeCode');
  const currentTopic = watch('topic');

  const onSubmit = async (data: FormData) => {
    if (!data.topic.trim()) {
      toast.error('Please enter a topic to explain');
      return;
    }
    
    try {
      setIsLoading(true);
      setApiKeyLoading(true);
      
      // Toast notification that we're getting ready
      toast.info('Preparing to generate explanation...');
      
      // Ensure API key is available
      await openAIService.ensureApiKey();
      setApiKeyLoading(false);
      
      // Show a progress message
      toast.loading('AI is crafting your interactive explanation...', {
        id: 'explanation-progress',
        duration: 9000,
      });
      
      const result = await openAIService.generateExplanation(
        data.topic, 
        data.includeCode, 
        data.includeCode ? data.programmingLanguage : ''
      );
      
      setExplanation(result);
      toast.dismiss('explanation-progress');
      toast.success('Explanation generated successfully');
    } catch (error) {
      setApiKeyLoading(false);
      toast.dismiss('explanation-progress');
      let errorMessage = 'Failed to generate explanation';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const interactiveExamples = [
    {
      category: "Web Development",
      topics: [
        "React useEffect hook best practices",
        "CSS Grid vs Flexbox comparison",
        "JavaScript promises and async/await",
        "Redux state management patterns",
      ]
    },
    {
      category: "Computer Science",
      topics: [
        "Time complexity analysis for algorithms",
        "Recursion and memoization techniques",
        "Linked List data structure explained",
        "Binary search tree implementation",
      ]
    },
    {
      category: "Software Architecture",
      topics: [
        "CQRS pattern in software architecture",
        "Microservices vs Monolith architecture",
        "Event-driven architecture examples",
        "Domain-Driven Design principles",
      ]
    },
    {
      category: "DevOps & Infrastructure",
      topics: [
        "Docker containerization basics",
        "CI/CD pipeline best practices",
        "Kubernetes pod networking",
        "Infrastructure as Code with Terraform",
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Interactive AI Concept Explainer
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enter any technical concept and get an interactive, visual explanation with real-world examples and quizzes
          </p>
        </AnimatedContainer>

        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2">
            <AnimatedContainer animation="fade" delay={100}>
              <Tabs defaultValue="explore">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="explore" className="flex items-center gap-2">
                    <BookOpen size={16} />
                    <span>Explore</span>
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="flex items-center gap-2">
                    <Bookmark size={16} />
                    <span>Saved Concepts</span>
                    {savedExplanations.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{savedExplanations.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="explore">
                  <GlassCard className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="topic" className="text-base font-medium">
                          What would you like explained?
                        </Label>
                        <Input
                          id="topic"
                          placeholder="e.g., CQRS pattern, React hooks, Docker containers"
                          {...register('topic', { required: 'Please enter a topic' })}
                          className="mt-1"
                        />
                        {errors.topic && (
                          <p className="text-destructive text-sm mt-1">{errors.topic.message}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includeCode"
                          checked={includeCode}
                          onCheckedChange={(checked) => setValue('includeCode', !!checked)}
                        />
                        <Label htmlFor="includeCode" className="cursor-pointer">
                          Include code examples
                        </Label>
                      </div>
                      
                      {includeCode && (
                        <div>
                          <Label htmlFor="language">Programming Language</Label>
                          <Select
                            defaultValue="javascript"
                            onValueChange={(value) => setValue('programmingLanguage', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="javascript">JavaScript</SelectItem>
                              <SelectItem value="typescript">TypeScript</SelectItem>
                              <SelectItem value="python">Python</SelectItem>
                              <SelectItem value="java">Java</SelectItem>
                              <SelectItem value="csharp">C#</SelectItem>
                              <SelectItem value="go">Go</SelectItem>
                              <SelectItem value="rust">Rust</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full gap-2"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary-foreground animate-spin"></div>
                            <span>{apiKeyLoading ? 'Preparing API Key...' : 'Crafting Interactive Explanation...'}</span>
                          </>
                        ) : (
                          <>
                            <Brain size={16} />
                            <span>Generate Interactive Explanation</span>
                            <ChevronRight size={16} />
                          </>
                        )}
                      </Button>
                      
                      {explanation && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2 mt-2"
                          onClick={() => saveExplanation(currentTopic, explanation)}
                        >
                          <BookmarkPlus size={16} />
                          <span>Save This Explanation</span>
                        </Button>
                      )}
                    </form>
                  </GlassCard>
                
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Code size={18} />
                        <span>Popular Topic Categories</span>
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {interactiveExamples.map((category, idx) => (
                        <GlassCard key={idx} className="p-4 border border-border/60">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className="w-full flex items-center justify-between px-2 py-1 h-auto">
                                <span className="font-medium">{category.category}</span>
                                <ChevronDown size={16} />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <div className="py-1">
                                {category.topics.map((topic, topicIdx) => (
                                  <Button
                                    key={topicIdx}
                                    variant="ghost"
                                    className="w-full justify-start px-3 py-2 h-auto rounded-none text-left"
                                    onClick={() => setValue('topic', topic)}
                                  >
                                    {topic}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="saved">
                  <GlassCard className="p-6">
                    <h3 className="font-medium mb-4">Your Saved Explanations</h3>
                    
                    {savedExplanations.length === 0 ? (
                      <div className="text-center py-8">
                        <Bookmark size={48} className="mx-auto text-muted-foreground opacity-30 mb-2" />
                        <p className="text-muted-foreground">You haven't saved any explanations yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Generate an explanation and click "Save This Explanation" to add it to your library
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {savedExplanations.map((saved) => (
                          <div 
                            key={saved.id} 
                            className="p-3 border rounded-md hover:bg-primary/5 transition-colors flex justify-between"
                          >
                            <div className="flex-1 overflow-hidden">
                              <h4 className="font-medium truncate">
                                {saved.topic}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Saved on {saved.date}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8"
                                onClick={() => loadSavedExplanation(saved)}
                              >
                                Load
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 text-destructive hover:text-destructive/80"
                                onClick={() => deleteSavedExplanation(saved.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </TabsContent>
              </Tabs>
            </AnimatedContainer>
          </div>
          
          <div className="lg:col-span-3">
            <AnimatedContainer animation="fade" delay={300}>
              <ExplanationResult content={explanation} isLoading={isLoading} />
              
              {!explanation && !isLoading && (
                <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <Brain size={48} className="text-muted-foreground mb-6 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">Interactive Learning Experience</h3>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Select a topic from our categories or enter your own to generate an interactive explanation with visual elements, real-world examples, and knowledge checks.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="p-3 border rounded-md text-center bg-primary/5">
                      <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 mb-2">
                        <BookOpen size={20} className="text-primary" />
                      </div>
                      <h4 className="font-medium mb-1">Visual Learning</h4>
                      <p className="text-xs text-muted-foreground">Rich examples and diagrams</p>
                    </div>
                    <div className="p-3 border rounded-md text-center bg-primary/5">
                      <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 mb-2">
                        <Code size={20} className="text-primary" />
                      </div>
                      <h4 className="font-medium mb-1">Code Examples</h4>
                      <p className="text-xs text-muted-foreground">Practical implementations</p>
                    </div>
                    <div className="p-3 border rounded-md text-center bg-primary/5">
                      <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 mb-2">
                        <Brain size={20} className="text-primary" />
                      </div>
                      <h4 className="font-medium mb-1">Real-World Cases</h4>
                      <p className="text-xs text-muted-foreground">Industry applications</p>
                    </div>
                    <div className="p-3 border rounded-md text-center bg-primary/5">
                      <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 mb-2">
                        <CheckCircle2 size={20} className="text-primary" />
                      </div>
                      <h4 className="font-medium mb-1">Knowledge Checks</h4>
                      <p className="text-xs text-muted-foreground">Interactive quizzes</p>
                    </div>
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
    </div>
  );
};

export default ConceptExplainer;

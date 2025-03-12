import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Brain, ChevronRight, Code } from 'lucide-react';
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

interface FormData {
  topic: string;
  includeCode: boolean;
  programmingLanguage: string;
}

const ConceptExplainer = () => {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKeyLoading, setApiKeyLoading] = useState<boolean>(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to access this feature');
      navigate('/login');
    }
  }, [user, loading, navigate]);

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

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setApiKeyLoading(true);
      
      // Toast notification that we're getting ready
      toast.info('Preparing to generate explanation...');
      
      // Ensure API key is available
      await openAIService.ensureApiKey();
      setApiKeyLoading(false);
      
      const result = await openAIService.generateExplanation(
        data.topic, 
        data.includeCode, 
        data.includeCode ? data.programmingLanguage : ''
      );
      
      setExplanation(result);
      toast.success('Explanation generated successfully');
    } catch (error) {
      setApiKeyLoading(false);
      let errorMessage = 'Failed to generate explanation';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Concept Explainer
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Enter any technical concept and get a clear, concise explanation with examples
          </p>
        </AnimatedContainer>

        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2">
            <AnimatedContainer animation="fade" delay={100}>
              <GlassCard className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="topic">
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
                        <span>{apiKeyLoading ? 'Preparing API Key...' : 'Generating...'}</span>
                      </>
                    ) : (
                      <>
                        <Brain size={16} />
                        <span>Generate Explanation</span>
                        <ChevronRight size={16} />
                      </>
                    )}
                  </Button>
                </form>
              </GlassCard>
            </AnimatedContainer>
            
            <AnimatedContainer animation="fade" delay={200} className="mt-8">
              <GlassCard className="p-6">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Code size={18} />
                  <span>Example Topics</span>
                </h3>
                <ul className="space-y-2">
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => setValue('topic', 'CQRS pattern in software architecture')}>
                    CQRS pattern in software architecture
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => setValue('topic', 'OAuth 2.0 flow explained')}>
                    OAuth 2.0 flow explained
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => setValue('topic', 'React useEffect hook best practices')}>
                    React useEffect hook best practices
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => setValue('topic', 'Docker containerization basics')}>
                    Docker containerization basics
                  </li>
                </ul>
              </GlassCard>
            </AnimatedContainer>
          </div>
          
          <div className="lg:col-span-3">
            <AnimatedContainer animation="fade" delay={300}>
              <ExplanationResult content={explanation} isLoading={isLoading} />
              
              {!explanation && !isLoading && (
                <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <Brain size={48} className="text-muted-foreground mb-6 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">No explanation generated yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Enter a topic in the form and click "Generate Explanation" to see results here
                  </p>
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

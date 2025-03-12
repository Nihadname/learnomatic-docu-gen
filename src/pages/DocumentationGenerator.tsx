import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FileText, Info, ChevronRight, Code } from 'lucide-react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import ExplanationResult from '@/components/ai/ExplanationResult';
import openAIService from '@/utils/openai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FormData {
  codeSnippet: string;
  language: string;
  docType: 'function' | 'class' | 'readme';
}

const DocumentationGenerator = () => {
  const [documentation, setDocumentation] = useState<string>('');
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
      codeSnippet: '',
      language: 'javascript',
      docType: 'function'
    }
  });

  const docType = watch('docType');

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setApiKeyLoading(true);
      
      // Toast notification that we're getting ready
      toast.info('Preparing to generate documentation...');
      
      // Ensure API key is available
      await openAIService.ensureApiKey();
      setApiKeyLoading(false);
      
      const result = await openAIService.generateDocumentation(
        data.codeSnippet,
        data.language,
        data.docType
      );
      
      setDocumentation(result);
      toast.success('Documentation generated successfully');
    } catch (error) {
      setApiKeyLoading(false);
      let errorMessage = 'Failed to generate documentation';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (example: string) => {
    switch (example) {
      case 'functionJs':
        setValue('codeSnippet', `function calculateTotalPrice(items, discount = 0, taxRate = 0.1) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * discount;
  const taxAmount = (subtotal - discountAmount) * taxRate;
  
  return {
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total: subtotal - discountAmount + taxAmount
  };
}`);
        setValue('language', 'javascript');
        setValue('docType', 'function');
        break;
      case 'classJava':
        setValue('codeSnippet', `public class UserManager {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserManager(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User createUser(String username, String email, String password) throws InvalidUserDataException {
        if (username == null || username.length() < 3) {
            throw new InvalidUserDataException("Username must be at least 3 characters");
        }
        
        if (email == null || !isValidEmail(email)) {
            throw new InvalidUserDataException("Invalid email format");
        }
        
        if (password == null || password.length() < 8) {
            throw new InvalidUserDataException("Password must be at least 8 characters");
        }
        
        if (userRepository.findByUsername(username).isPresent()) {
            throw new InvalidUserDataException("Username already taken");
        }
        
        if (userRepository.findByEmail(email).isPresent()) {
            throw new InvalidUserDataException("Email already registered");
        }
        
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setCreatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
    
    private boolean isValidEmail(String email) {
        return email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }
}`);
        setValue('language', 'java');
        setValue('docType', 'class');
        break;
      case 'readme':
        setValue('codeSnippet', `Project: LearnOmatic - AI-Powered Learning and Documentation Assistant

This web application helps users understand complex technical concepts and generate documentation for their code. It integrates with OpenAI's API to provide AI-powered explanations and documentation generation.

Features:
- AI Concept Explainer: Explains technical topics with examples
- Documentation Generator: Creates documentation for code
- Authentication system
- Responsive design for all devices`);
        setValue('language', '');
        setValue('docType', 'readme');
        break;
    }
  };

  const placeholderText = docType === 'readme' 
    ? 'Enter a project description or overview here...' 
    : 'Paste your code here...';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Documentation Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate professional documentation for functions, classes, or entire projects instantly
          </p>
        </AnimatedContainer>

        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2">
            <AnimatedContainer animation="fade" delay={100}>
              <GlassCard className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Documentation Type</Label>
                    <RadioGroup 
                      defaultValue="function" 
                      className="grid grid-cols-3 gap-4 mt-1"
                      onValueChange={(value) => setValue('docType', value as 'function' | 'class' | 'readme')}
                    >
                      <div>
                        <RadioGroupItem value="function" id="function" className="peer sr-only" />
                        <Label
                          htmlFor="function"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Code className="mb-2 h-5 w-5" />
                          <span>Function</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="class" id="class" className="peer sr-only" />
                        <Label
                          htmlFor="class"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <FileText className="mb-2 h-5 w-5" />
                          <span>Class</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="readme" id="readme" className="peer sr-only" />
                        <Label
                          htmlFor="readme"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <FileText className="mb-2 h-5 w-5" />
                          <span>README</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {docType !== 'readme' && (
                    <div>
                      <Label htmlFor="language">Programming Language</Label>
                      <Select
                        defaultValue="javascript"
                        onValueChange={(value) => setValue('language', value)}
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
                  
                  <div>
                    <Label htmlFor="codeSnippet">
                      {docType === 'readme' ? 'Project Description' : 'Code Snippet'}
                    </Label>
                    <Textarea
                      id="codeSnippet"
                      placeholder={placeholderText}
                      className="mt-1 min-h-32 font-mono text-sm"
                      {...register('codeSnippet', { required: 'This field is required' })}
                    />
                    {errors.codeSnippet && (
                      <p className="text-destructive text-sm mt-1">{errors.codeSnippet.message}</p>
                    )}
                  </div>
                  
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
                        <FileText size={16} />
                        <span>Generate Documentation</span>
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
                  <span>Example Snippets</span>
                </h3>
                <ul className="space-y-2">
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('functionJs')}>
                    JavaScript Function Example
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('classJava')}>
                    Java Class Example
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('readme')}>
                    README Project Example
                  </li>
                </ul>
              </GlassCard>
            </AnimatedContainer>
          </div>
          
          <div className="lg:col-span-3">
            <AnimatedContainer animation="fade" delay={300}>
              <ExplanationResult content={documentation} isLoading={isLoading} />
              
              {!documentation && !isLoading && (
                <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <FileText size={48} className="text-muted-foreground mb-6 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">No documentation generated yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Enter your code or project description and click "Generate Documentation" to see results here
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

export default DocumentationGenerator;

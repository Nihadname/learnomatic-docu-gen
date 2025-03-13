import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import Header from '@/components/layout/Header';
import { Brain, FileText, ChevronRight, UserCircle, Mic } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();
  
  console.log('Auth state in Index:', { user, loading }); // Debug log
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-20">
          <AnimatedContainer animation="fade" className="mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              <span className="animate-pulse-light mr-2">●</span> 
              AI-Powered Learning & Documentation
            </div>
          </AnimatedContainer>
          
          <AnimatedContainer animation="fade" delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-3xl leading-tight">
              Simplify Learning & Documentation with 
              <span className="text-gradient"> AI</span>
            </h1>
          </AnimatedContainer>
          
          <AnimatedContainer animation="fade" delay={200}>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Your personal AI assistant for understanding complex technical concepts 
              and generating documentation effortlessly.
            </p>
          </AnimatedContainer>
          
          <AnimatedContainer animation="fade" delay={300} className="flex flex-col sm:flex-row gap-4">
            <Link to="/concept-explainer">
              <Button size="lg" className="gap-2 h-12 px-6">
                <Brain size={18} />
                <span>Try AI Explainer</span>
                <ChevronRight size={16} />
              </Button>
            </Link>
            <Link to="/documentation-generator">
              <Button variant="outline" size="lg" className="gap-2 h-12 px-6">
                <FileText size={18} />
                <span>Generate Documentation</span>
              </Button>
            </Link>
          </AnimatedContainer>
        </section>

        {/* Features Section */}
        <section className="mb-20">
          <AnimatedContainer animation="fade" delay={400} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful AI Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore what LearnOmatic can do for you
            </p>
          </AnimatedContainer>
          
          <div className="grid md:grid-cols-2 gap-8">
            <AnimatedContainer animation="fade" delay={500}>
              <GlassCard variant="elevated" className="p-8 h-full">
                <div className="bg-primary/10 text-primary w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                  <Brain size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">AI Concept Explainer</h3>
                <p className="text-muted-foreground mb-6">
                  Confused by a technical concept? Our AI will explain it in simple terms with examples,
                  helping you grasp even the most complex topics quickly.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Clear, concise explanations</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Code examples in multiple languages</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Visual markdown formatting</span>
                  </li>
                </ul>
                <Link to="/concept-explainer">
                  <Button variant="outline" className="w-full">Try AI Explainer</Button>
                </Link>
              </GlassCard>
            </AnimatedContainer>

            <AnimatedContainer animation="fade" delay={500}>
              <GlassCard variant="elevated" className="p-8 h-full">
                <div className="bg-primary/10 text-primary w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                  <Mic size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Voice Code Assistant</h3>
                <p className="text-muted-foreground mb-6">
                  Interact with AI hands-free! Ask programming questions with your voice and receive spoken explanations with code examples.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Speech recognition & synthesis</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Beautifully formatted code examples</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Hands-free coding help</span>
                  </li>
                </ul>
                <Link to="/voice-assistant">
                  <Button variant="outline" className="w-full">Try Voice Assistant</Button>
                </Link>
              </GlassCard>
            </AnimatedContainer>

            <AnimatedContainer animation="fade" delay={600}>
              <GlassCard variant="elevated" className="p-8 h-full">
                <div className="bg-primary/10 text-primary w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                  <FileText size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3">Documentation Generator</h3>
                <p className="text-muted-foreground mb-6">
                  Save hours of writing documentation. Our AI will generate professional documentation
                  for your code, functions, or entire projects instantly.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Function & class documentation</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Automatic README generation</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-primary mr-2">✓</span>
                    <span>Support for multiple languages</span>
                  </li>
                </ul>
                <Link to="/documentation-generator">
                  <Button variant="outline" className="w-full">Generate Documentation</Button>
                </Link>
              </GlassCard>
            </AnimatedContainer>
          </div>
        </section>

        {/* CTA Section */}
        <AnimatedContainer animation="scale" delay={700}>
          <GlassCard variant="elevated" className="p-12 text-center max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Enhance Your Learning?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get started with LearnOmatic today and transform how you learn and document technical concepts.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {loading ? (
                <div className="h-10 w-10 rounded-full border-4 border-t-transparent border-primary mx-auto animate-spin"></div>
              ) : user ? (
                <Link to="/profile">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    <UserCircle size={18} />
                    <span>My Profile</span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto">Create Free Account</Button>
                  </Link>
                  <Link to="/concept-explainer">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">Try Without Account</Button>
                  </Link>
                </>
              )}
            </div>
          </GlassCard>
        </AnimatedContainer>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-xl font-bold flex items-center text-primary">
                <span className="bg-primary text-white p-1 rounded mr-2 text-sm">
                  Learn
                </span>
                <span className="text-gradient">Omatic</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                © {new Date().getFullYear()} LearnOmatic. All rights reserved.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <h4 className="font-medium mb-2">Product</h4>
                <ul className="space-y-1">
                  <li><Link to="/concept-explainer" className="text-sm text-muted-foreground hover:text-primary">AI Explainer</Link></li>
                  <li><Link to="/documentation-generator" className="text-sm text-muted-foreground hover:text-primary">Doc Generator</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Account</h4>
                <ul className="space-y-1">
                  {loading ? (
                    <li className="text-sm text-muted-foreground">Loading...</li>
                  ) : user ? (
                    <li><Link to="/profile" className="text-sm text-muted-foreground hover:text-primary">My Profile</Link></li>
                  ) : (
                    <>
                      <li><Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Log In</Link></li>
                      <li><Link to="/register" className="text-sm text-muted-foreground hover:text-primary">Sign Up</Link></li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

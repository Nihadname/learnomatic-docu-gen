import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Folder, Upload, Code, Zap, Shield, FileCode, RefreshCw, Download, Check, X, ChevronRight, ChevronDown, FileUp } from 'lucide-react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import openAIService from '@/utils/openai';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AnalysisResult {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  codeSnippet?: string;
  filePath?: string;
  lineNumber?: number;
  recommendation?: string;
  category: 'code' | 'performance' | 'security' | 'architecture';
  id: string;
}

interface ProjectStats {
  totalFiles: number;
  totalLines: number;
  languages: {[key: string]: number};
  complexity: number;
  securityScore: number;
  performanceScore: number;
  maintainabilityScore: number;
}

const ProjectAnalyzer = () => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<AnalysisResult[]>([]);
  const [activeFilters, setActiveFilters] = useState<{
    categories: string[];
    severities: string[];
    searchTerm: string;
  }>({
    categories: ['code', 'performance', 'security', 'architecture'],
    severities: ['critical', 'high', 'medium', 'low', 'info'],
    searchTerm: '',
  });
  const [projectName, setProjectName] = useState<string>('');
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [projectDescription, setProjectDescription] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please log in to access this feature');
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  // Filter results based on active filters
  useEffect(() => {
    if (analysisResults.length > 0) {
      const filtered = analysisResults.filter(result => {
        const matchesCategory = activeFilters.categories.includes(result.category);
        const matchesSeverity = activeFilters.severities.includes(result.severity);
        const matchesSearch = result.title.toLowerCase().includes(activeFilters.searchTerm.toLowerCase()) || 
                             (result.filePath && result.filePath.toLowerCase().includes(activeFilters.searchTerm.toLowerCase()));
        return matchesCategory && matchesSeverity && matchesSearch;
      });
      setFilteredResults(filtered);
    }
  }, [analysisResults, activeFilters]);

  // Function to handle file selection
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
      // Extract project name from the first file path
      const firstFile = e.target.files[0];
      const pathParts = firstFile.webkitRelativePath.split('/');
      setProjectName(pathParts[0]);
    }
  };

  // Function to handle project folder upload and analysis
  const handleProjectUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select a project folder to upload');
      return;
    }

    try {
      setIsUploading(true);
      setCurrentStep(1);
      
      // Simulate file upload progress
      let progress = 0;
      const uploadInterval = setInterval(() => {
        progress += 5;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(uploadInterval);
          startAnalysis();
        }
      }, 200);
      
    } catch (error) {
      setIsUploading(false);
      setCurrentStep(0);
      toast.error('Failed to upload project files');
      console.error('Project upload error:', error);
    }
  };
  
  // Function to start the analysis process
  const startAnalysis = async () => {
    setIsUploading(false);
    setIsAnalyzing(true);
    setCurrentStep(2);
    
    try {
      // Ensure API key is available
      await openAIService.ensureApiKey();
      
      // Simulate analysis progress
      let progress = 0;
      const analysisInterval = setInterval(() => {
        progress += 2;
        setAnalysisProgress(progress);
        
        // Generate incremental analysis results
        if (progress % 20 === 0) {
          generateMockResults(progress);
        }
        
        if (progress >= 100) {
          clearInterval(analysisInterval);
          completeMockAnalysis();
          setCurrentStep(3);
          setIsAnalyzing(false);
          
          // Scroll to results
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 500);
        }
      }, 200);
      
    } catch (error) {
      setIsAnalyzing(false);
      setCurrentStep(0);
      toast.error('Failed to analyze project');
      console.error('Project analysis error:', error);
    }
  };
  
  // Function to generate mock results for demonstration
  const generateMockResults = (progress: number) => {
    const mockCategories = ['code', 'performance', 'security', 'architecture'];
    const mockSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    
    // Generate a new mock result
    const newResult: AnalysisResult = {
      id: `result-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: mockResultTitles[Math.floor(Math.random() * mockResultTitles.length)],
      description: 'Detailed description of the issue and its potential impact on the project.',
      severity: mockSeverities[Math.floor(Math.random() * mockSeverities.length)] as any,
      category: mockCategories[Math.floor(Math.random() * mockCategories.length)] as any,
      filePath: mockFilePaths[Math.floor(Math.random() * mockFilePaths.length)],
      lineNumber: Math.floor(Math.random() * 200) + 1,
      codeSnippet: mockCodeSnippets[Math.floor(Math.random() * mockCodeSnippets.length)],
      recommendation: 'Specific recommendation to address the identified issue with example implementation.'
    };
    
    setAnalysisResults(prev => [...prev, newResult]);
  };
  
  // Mock completion of analysis
  const completeMockAnalysis = () => {
    // Set project stats
    setProjectStats({
      totalFiles: Math.floor(Math.random() * 100) + 50,
      totalLines: Math.floor(Math.random() * 10000) + 5000,
      languages: {
        "JavaScript": 45,
        "TypeScript": 30,
        "CSS": 15,
        "HTML": 10
      },
      complexity: Math.floor(Math.random() * 100),
      securityScore: Math.floor(Math.random() * 100),
      performanceScore: Math.floor(Math.random() * 100),
      maintainabilityScore: Math.floor(Math.random() * 100)
    });
    
    toast.success('Project analysis complete!');
  };
  
  // Reset the analysis
  const resetAnalysis = () => {
    setIsUploading(false);
    setIsAnalyzing(false);
    setCurrentStep(0);
    setUploadProgress(0);
    setAnalysisProgress(0);
    setAnalysisResults([]);
    setFilteredResults([]);
    setProjectStats(null);
    setSelectedFiles(null);
    setProjectName('');
    setProjectDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Toggle a filter category
  const toggleCategory = (category: string) => {
    setActiveFilters(prev => {
      const categories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
  };
  
  // Toggle a severity filter
  const toggleSeverity = (severity: string) => {
    setActiveFilters(prev => {
      const severities = prev.severities.includes(severity)
        ? prev.severities.filter(s => s !== severity)
        : [...prev.severities, severity];
      return { ...prev, severities };
    });
  };
  
  // Update search term
  const updateSearchTerm = (term: string) => {
    setActiveFilters(prev => ({ ...prev, searchTerm: term }));
  };
  
  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      case 'info': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'code': return <Code className="h-4 w-4" />;
      case 'performance': return <Zap className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'architecture': return <FileCode className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-t-transparent border-primary animate-spin"></div>
      </div>
    );
  }
  
  // Not authenticated
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Project Analyzer
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your project folder for advanced AI analysis of code quality, performance, security, and architecture
          </p>
        </AnimatedContainer>
        
        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-2">
            <AnimatedContainer animation="fade" delay={100}>
              <GlassCard className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  <span>Project Upload</span>
                </h3>
                
                {currentStep === 0 ? (
                  <>
                    <div 
                      className={`border-2 border-dashed rounded-md p-8 mb-4 text-center cursor-pointer hover:bg-muted/20 transition-colors ${selectedFiles ? 'border-primary' : 'border-muted-foreground/30'}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center">
                        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                        {selectedFiles ? (
                          <>
                            <p className="text-lg font-medium">{projectName}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedFiles.length} files selected
                            </p>
                            <Badge variant="outline" className="mt-2 px-2 py-0.5">
                              Project Folder
                            </Badge>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Upload Project Folder</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Drag & drop or click to browse
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileSelection}
                      {...{ webkitdirectory: "", directory: "", multiple: true } as any}
                    />
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="projectDescription">Project Description (Optional)</Label>
                        <Textarea 
                          id="projectDescription"
                          placeholder="Briefly describe your project to help the AI understand its purpose and goals..."
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Analysis Options</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              <Label htmlFor="codeAnalysis" className="text-sm cursor-pointer">Code Refactoring</Label>
                            </div>
                            <Switch id="codeAnalysis" defaultChecked />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              <Label htmlFor="performanceAnalysis" className="text-sm cursor-pointer">Performance Optimization</Label>
                            </div>
                            <Switch id="performanceAnalysis" defaultChecked />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <Label htmlFor="securityAnalysis" className="text-sm cursor-pointer">Security Vulnerabilities</Label>
                            </div>
                            <Switch id="securityAnalysis" defaultChecked />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCode className="h-4 w-4" />
                              <Label htmlFor="architectureAnalysis" className="text-sm cursor-pointer">Architecture Design</Label>
                            </div>
                            <Switch id="architectureAnalysis" defaultChecked />
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleProjectUpload} 
                        className="w-full"
                        disabled={!selectedFiles || selectedFiles.length === 0}
                      >
                        Start Analysis
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium">
                          {currentStep === 1 ? 'Uploading Project...' : 
                           currentStep === 2 ? 'Analyzing Project...' : 
                           'Analysis Complete!'}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {currentStep === 1 ? `${uploadProgress}%` : 
                           currentStep === 2 ? `${analysisProgress}%` : 
                           '100%'}
                        </span>
                      </div>
                      <Progress 
                        value={currentStep === 1 ? uploadProgress : 
                               currentStep === 2 ? analysisProgress : 
                               100} 
                        className="h-2"
                      />
                    </div>
                    
                    {currentStep === 1 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
                          <span>Uploading {selectedFiles?.length} files...</span>
                        </div>
                      </div>
                    )}
                    
                    {currentStep === 2 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
                          <span>
                            {analysisProgress < 20 ? 'Initializing analysis...' : 
                             analysisProgress < 40 ? 'Scanning for code issues...' :
                             analysisProgress < 60 ? 'Analyzing performance...' :
                             analysisProgress < 80 ? 'Checking security vulnerabilities...' :
                             'Evaluating architecture...'}
                          </span>
                        </div>
                        {analysisResults.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Found {analysisResults.length} issues so far...
                          </p>
                        )}
                      </div>
                    )}
                    
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <Alert className="bg-muted">
                          <Check className="h-4 w-4 text-green-500" />
                          <AlertTitle>Analysis Complete</AlertTitle>
                          <AlertDescription>
                            We've analyzed {projectStats?.totalFiles} files with {projectStats?.totalLines.toLocaleString()} lines of code and found {analysisResults.length} issues.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={resetAnalysis}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            New Analysis
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export Report
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
              
              {projectStats && (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Project Stats</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/30 rounded-md">
                        <div className="text-sm text-muted-foreground">Files</div>
                        <div className="text-2xl font-bold">{projectStats.totalFiles}</div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-md">
                        <div className="text-sm text-muted-foreground">Lines</div>
                        <div className="text-2xl font-bold">{projectStats.totalLines.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Security</span>
                          <span className="font-medium">{projectStats.securityScore}/100</span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${projectStats.securityScore > 70 ? 'bg-green-500' : projectStats.securityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${projectStats.securityScore}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Performance</span>
                          <span className="font-medium">{projectStats.performanceScore}/100</span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${projectStats.performanceScore > 70 ? 'bg-green-500' : projectStats.performanceScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${projectStats.performanceScore}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Maintainability</span>
                          <span className="font-medium">{projectStats.maintainabilityScore}/100</span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${projectStats.maintainabilityScore > 70 ? 'bg-green-500' : projectStats.maintainabilityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${projectStats.maintainabilityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Languages</h4>
                      <div className="space-y-2">
                        {Object.entries(projectStats.languages).map(([language, percentage]) => (
                          <div key={language} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{language}</span>
                              <span>{percentage}%</span>
                            </div>
                            <div className="w-full bg-muted/30 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}
            </AnimatedContainer>
          </div>
          
          {/* Right Panel - Results */}
          <div className="lg:col-span-3" ref={resultsRef}>
            <AnimatedContainer animation="fade" delay={200}>
              {analysisResults.length > 0 ? (
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span>Analysis Results</span>
                    <Badge variant="outline" className="ml-2">
                      {filteredResults.length} Issues
                    </Badge>
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Search issues or files..."
                      className="flex-1 px-3 py-1 text-sm rounded-md border border-input bg-transparent"
                      onChange={(e) => updateSearchTerm(e.target.value)}
                    />
                    
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={activeFilters.categories.includes('code') ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => toggleCategory('code')}
                      >
                        <Code className="h-3 w-3" />
                        Code
                      </Button>
                      <Button
                        variant={activeFilters.categories.includes('performance') ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => toggleCategory('performance')}
                      >
                        <Zap className="h-3 w-3" />
                        Performance
                      </Button>
                      <Button
                        variant={activeFilters.categories.includes('security') ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => toggleCategory('security')}
                      >
                        <Shield className="h-3 w-3" />
                        Security
                      </Button>
                      <Button
                        variant={activeFilters.categories.includes('architecture') ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => toggleCategory('architecture')}
                      >
                        <FileCode className="h-3 w-3" />
                        Architecture
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {filteredResults.length > 0 ? (
                      filteredResults.map((result) => (
                        <Collapsible key={result.id} className="border border-border rounded-md">
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left">
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(result.severity)}>
                                {result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                {getCategoryIcon(result.category)}
                                {result.category.charAt(0).toUpperCase() + result.category.slice(1)}
                              </Badge>
                              <span className="text-sm font-medium">{result.title}</span>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="p-3 pt-0 border-t border-border mt-3">
                            <div className="space-y-3">
                              {result.filePath && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <FileCode className="h-3 w-3" />
                                  <span>{result.filePath}{result.lineNumber ? `:${result.lineNumber}` : ''}</span>
                                </div>
                              )}
                              
                              <p className="text-sm text-muted-foreground">
                                {result.description}
                              </p>
                              
                              {result.codeSnippet && (
                                <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                                  <code>{result.codeSnippet}</code>
                                </pre>
                              )}
                              
                              {result.recommendation && (
                                <div className="mt-3">
                                  <h4 className="text-xs font-medium mb-1">Recommendation:</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {result.recommendation}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  Fix Issue
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  Ignore
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <FileUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="mt-3 text-sm font-medium">No Results Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Try changing your search or filters to find what you're looking for.
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ) : currentStep > 0 && currentStep < 3 ? (
                <GlassCard className="p-6 min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-10 rounded-full border-4 border-t-transparent border-primary animate-spin mb-4"></div>
                    <h3 className="text-lg font-medium mb-1">Analyzing Your Project</h3>
                    <p className="text-sm text-muted-foreground">
                      Please wait while we scan your project and identify issues...
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-6 min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <Folder className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No Project Analyzed Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a project folder to get started with AI-powered code analysis
                    </p>
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

// Mock data for demonstration
const mockResultTitles = [
  "Unused variable detected",
  "Memory leak in event handler",
  "SQL injection vulnerability",
  "Inefficient array iteration",
  "Hardcoded API credentials",
  "Unoptimized database query",
  "Cross-site scripting (XSS) vulnerability",
  "Callback hell detected",
  "Race condition in async code",
  "Excessive component re-rendering",
  "Missing input validation",
  "Complex function needs refactoring",
  "Insecure cookie settings",
  "Resource leak in file operations",
  "Deprecated API usage",
  "Circular dependency detected",
  "Inefficient CSS selectors",
  "Missing error handling",
  "Local storage security issue",
  "Duplicate code across modules"
];

const mockFilePaths = [
  "src/components/Header.jsx",
  "src/utils/helpers.js",
  "src/context/AuthContext.tsx",
  "src/hooks/useForm.js",
  "src/pages/Dashboard.tsx",
  "src/services/api.js",
  "src/redux/slices/userSlice.js",
  "src/styles/global.css",
  "server/controllers/user.controller.js",
  "server/models/user.model.js"
];

const mockCodeSnippets = [
  `function fetchData() {
  const data = [];
  // This is an inefficient way to process large arrays
  for (let i = 0; i < largeArray.length; i++) {
    data.push(largeArray[i].value * 2);
  }
  return data;
}`,
  `// Insecure direct object reference vulnerability
router.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  // No authorization check performed
  db.query('SELECT * FROM users WHERE id = ' + userId, (err, result) => {
    res.json(result);
  });
});`,
  `class Component extends React.Component {
  state = { count: 0 };
  
  componentDidMount() {
    // This event listener is never removed
    window.addEventListener('resize', this.handleResize);
  }
  
  handleResize = () => {
    this.setState({ width: window.innerWidth });
  }
}`,
  `// SQL Injection vulnerability
function getUserData(username) {
  const query = \`SELECT * FROM users WHERE username = '\${username}'\`;
  return db.query(query);
}`
];

export default ProjectAnalyzer; 
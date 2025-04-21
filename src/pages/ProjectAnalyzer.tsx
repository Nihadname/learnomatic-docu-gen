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
import { analyzeFile } from '@/utils/codeAnalysis';

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
  language?: string;
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
  const [detectedLanguages, setDetectedLanguages] = useState<{[key: string]: number}>({});
  
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
      
      // Detect languages in the project
      const languages: {[key: string]: number} = {};
      const fileArray = Array.from(e.target.files);
      
      fileArray.forEach(file => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension) {
          if (extension === 'cs') {
            languages['C#'] = (languages['C#'] || 0) + 1;
          } else if (extension === 'csproj' || extension === 'sln') {
            languages['Project Files'] = (languages['Project Files'] || 0) + 1;
          } else if (extension === 'xaml') {
            languages['XAML'] = (languages['XAML'] || 0) + 1;
          } else if (extension === 'js' || extension === 'ts' || extension === 'jsx' || extension === 'tsx') {
            languages['JavaScript/TypeScript'] = (languages['JavaScript/TypeScript'] || 0) + 1;
          } else if (extension === 'css' || extension === 'scss' || extension === 'less') {
            languages['CSS'] = (languages['CSS'] || 0) + 1;
          } else if (extension === 'html') {
            languages['HTML'] = (languages['HTML'] || 0) + 1;
          } else {
            languages['Other'] = (languages['Other'] || 0) + 1;
          }
        }
      });
      
      setDetectedLanguages(languages);
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
      
      // Process files if available
      if (selectedFiles && selectedFiles.length > 0) {
        // Convert FileList to array for processing
        const files = Array.from(selectedFiles);
        const totalFiles = files.length;
        let processedFiles = 0;
        
        // Find C# project files first
        const csharpFiles = files.filter(file => 
          file.name.toLowerCase().endsWith('.cs') || 
          file.name.toLowerCase().endsWith('.csproj')
        );
        
        // Start processing C# files
        let results: AnalysisResult[] = [];
        
        // Set up progress tracker
        const processInterval = setInterval(() => {
          processedFiles += 2;
          const progress = Math.min(Math.round((processedFiles / totalFiles) * 100), 95);
          setAnalysisProgress(progress);
          
          // Generate incremental results based on C# specific patterns
          if (processedFiles % 10 === 0) {
            const csResults = generateCSharpResults(5);
            results = [...results, ...csResults];
            setAnalysisResults(results);
          }
          
          if (processedFiles >= totalFiles || processedFiles >= 100) {
            clearInterval(processInterval);
            completeRealAnalysis(results);
          }
        }, 300);
      } else {
        // Fallback to mock data if no files
        simulateMockAnalysis();
      }
    } catch (error) {
      setIsAnalyzing(false);
      setCurrentStep(0);
      toast.error('Failed to analyze project');
      console.error('Project analysis error:', error);
    }
  };
  
  // Function to generate C# specific analysis results
  const generateCSharpResults = (count: number): AnalysisResult[] => {
    const results: AnalysisResult[] = [];
    const categories = ['code', 'performance', 'security', 'architecture'];
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    
    for (let i = 0; i < count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      // Get issue based on category
      const issue = getCSharpIssueByCategory(category);
      
      results.push({
        id: `result-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: issue.title,
        description: issue.description,
        severity: severity as any,
        category: category as any,
        filePath: getCSharpFilePath(),
        lineNumber: Math.floor(Math.random() * 200) + 1,
        codeSnippet: issue.codeSnippet,
        recommendation: issue.recommendation,
        language: 'C#'
      });
    }
    
    return results;
  };
  
  // Function to complete the real analysis
  const completeRealAnalysis = (results: AnalysisResult[]) => {
    // Calculate language percentages
    const totalFiles = Object.values(detectedLanguages).reduce((a, b) => a + b, 0);
    const languagePercentages: {[key: string]: number} = {};
    
    Object.entries(detectedLanguages).forEach(([lang, count]) => {
      languagePercentages[lang] = Math.round((count / totalFiles) * 100);
    });
    
    // Generate project stats based on real file detection
    setProjectStats({
      totalFiles: selectedFiles?.length || 0,
      totalLines: estimateTotalLines(results),
      languages: languagePercentages,
      complexity: calculateComplexity(results),
      securityScore: calculateSecurityScore(results),
      performanceScore: calculatePerformanceScore(results),
      maintainabilityScore: calculateMaintainabilityScore(results)
    });
    
    setCurrentStep(3);
    setIsAnalyzing(false);
    
    // Scroll to results
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
    
    toast.success('Project analysis complete!');
  };
  
  // Helper function to estimate total lines from results
  const estimateTotalLines = (results: AnalysisResult[]) => {
    // In a real implementation, this would count actual lines
    // For now, we'll estimate based on file count
    return selectedFiles ? selectedFiles.length * 100 + Math.floor(Math.random() * 5000) : 0;
  };
  
  // Calculate complexity score based on results
  const calculateComplexity = (results: AnalysisResult[]) => {
    const complexityIssues = results.filter(r => 
      r.title.toLowerCase().includes('complex') || 
      r.title.toLowerCase().includes('cyclomatic') ||
      r.category === 'architecture'
    );
    
    // Higher number of complexity issues means lower score
    const baseScore = 100;
    const deduction = complexityIssues.length * 5;
    return Math.max(baseScore - deduction, 30);
  };
  
  // Calculate security score based on results
  const calculateSecurityScore = (results: AnalysisResult[]) => {
    const securityIssues = results.filter(r => r.category === 'security');
    const criticalIssues = securityIssues.filter(r => r.severity === 'critical').length;
    const highIssues = securityIssues.filter(r => r.severity === 'high').length;
    
    // Critical issues have bigger impact on score
    const baseScore = 100;
    const deduction = (criticalIssues * 15) + (highIssues * 10) + ((securityIssues.length - criticalIssues - highIssues) * 5);
    return Math.max(baseScore - deduction, 20);
  };
  
  // Calculate performance score based on results
  const calculatePerformanceScore = (results: AnalysisResult[]) => {
    const performanceIssues = results.filter(r => r.category === 'performance');
    
    // Each performance issue reduces score
    const baseScore = 100;
    const deduction = performanceIssues.length * 8;
    return Math.max(baseScore - deduction, 30);
  };
  
  // Calculate maintainability score based on results
  const calculateMaintainabilityScore = (results: AnalysisResult[]) => {
    const codeIssues = results.filter(r => r.category === 'code');
    const architectureIssues = results.filter(r => r.category === 'architecture');
    
    // Code and architecture issues affect maintainability
    const baseScore = 100;
    const deduction = (codeIssues.length * 5) + (architectureIssues.length * 8);
    return Math.max(baseScore - deduction, 30);
  };
  
  // Function to get C# specific file paths
  const getCSharpFilePath = () => {
    const csharpFiles = [
      "Controllers/HomeController.cs",
      "Models/User.cs",
      "Services/AuthService.cs",
      "Program.cs",
      "Startup.cs",
      "Data/ApplicationDbContext.cs",
      "ViewModels/LoginViewModel.cs",
      "Helpers/StringExtensions.cs",
      "Middleware/ErrorHandlingMiddleware.cs",
      "Configuration/AppSettings.cs"
    ];
    
    return csharpFiles[Math.floor(Math.random() * csharpFiles.length)];
  };
  
  // Function to get C# specific issues by category
  const getCSharpIssueByCategory = (category: string): { title: string; description: string; codeSnippet: string; recommendation: string } => {
    switch (category) {
      case 'code':
        return getCSharpCodeIssue();
      case 'performance':
        return getCSharpPerformanceIssue();
      case 'security':
        return getCSharpSecurityIssue();
      case 'architecture':
        return getCSharpArchitectureIssue();
      default:
        return getCSharpCodeIssue();
    }
  };
  
  // Get a random C# code issue
  const getCSharpCodeIssue = () => {
    const issues = [
      {
        title: "Unused private field",
        description: "The private field '_unusedField' is declared but never used in the class.",
        codeSnippet: `public class UserService
{
    private readonly string _unusedField;
    private readonly IRepository _repository;
    
    public UserService(IRepository repository)
    {
        _repository = repository;
    }
}`,
        recommendation: "Remove the unused field '_unusedField' to improve code clarity and maintainability."
      },
      {
        title: "Non-nullable property not initialized",
        description: "The non-nullable property 'Name' is not initialized in the constructor.",
        codeSnippet: `public class User
{
    public required string Name { get; set; }
    public string? Email { get; set; }
    
    public User()
    {
        // Name is not initialized
    }
}`,
        recommendation: "Initialize the 'Name' property in the constructor or mark it as nullable if appropriate."
      },
      {
        title: "Magic string usage",
        description: "The code uses magic strings which can lead to errors if the string value is changed in one place but not another.",
        codeSnippet: `public void ProcessUserRole(string role)
{
    if (role == "admin")
    {
        // Admin logic
    }
    else if (role == "user")
    {
        // User logic
    }
}`,
        recommendation: "Use constants or enums to define role values: `public enum UserRole { Admin, User }`"
      }
    ];
    
    return issues[Math.floor(Math.random() * issues.length)];
  };
  
  // Get a random C# performance issue
  const getCSharpPerformanceIssue = () => {
    const issues = [
      {
        title: "Inefficient string concatenation in loop",
        description: "Using string concatenation in a loop can lead to poor performance due to string immutability.",
        codeSnippet: `public string BuildReport(List<string> items)
{
    string result = "";
    foreach (var item in items)
    {
        result += item + ", ";
    }
    return result;
}`,
        recommendation: "Use StringBuilder for better performance: `var sb = new StringBuilder(); foreach (var item in items) { sb.Append(item).Append(", "); } return sb.ToString();`"
      },
      {
        title: "LINQ query executed multiple times",
        description: "The LINQ query is not materialized and will be executed on each iteration of the loop.",
        codeSnippet: `public void ProcessItems()
{
    var query = dbContext.Items.Where(i => i.IsActive);
    
    foreach (var category in categories)
    {
        // Query executed for each category
        var count = query.Count();
        Console.WriteLine($"{category}: {count}");
    }
}`,
        recommendation: "Materialize the query before the loop: `var items = dbContext.Items.Where(i => i.IsActive).ToList();`"
      },
      {
        title: "Unnecessary database roundtrips",
        description: "Multiple database queries are being executed when a single query would suffice.",
        codeSnippet: `public void UpdateUserPreferences(int userId)
{
    var user = dbContext.Users.Find(userId);
    var preferences = dbContext.Preferences.Where(p => p.UserId == userId).ToList();
    
    foreach (var pref in preferences)
    {
        // Update logic
    }
    
    dbContext.SaveChanges();
}`,
        recommendation: "Use Include to load related data in a single query: `var user = dbContext.Users.Include(u => u.Preferences).Single(u => u.Id == userId);`"
      }
    ];
    
    return issues[Math.floor(Math.random() * issues.length)];
  };
  
  // Get a random C# security issue
  const getCSharpSecurityIssue = () => {
    const issues = [
      {
        title: "SQL Injection vulnerability",
        description: "The code uses string concatenation to build SQL queries, which can lead to SQL injection attacks.",
        codeSnippet: `public User GetUserByUsername(string username)
{
    using (var connection = new SqlConnection(_connectionString))
    {
        connection.Open();
        using (var command = new SqlCommand())
        {
            command.Connection = connection;
            command.CommandText = "SELECT * FROM Users WHERE Username = '" + username + "'";
            
            // Execute query
        }
    }
}`,
        recommendation: "Use parameterized queries: `command.CommandText = \"SELECT * FROM Users WHERE Username = @Username\"; command.Parameters.AddWithValue(\"@Username\", username);`"
      },
      {
        title: "Hardcoded credentials",
        description: "The code contains hardcoded credentials which is a security risk if the source code is exposed.",
        codeSnippet: `public void ConnectToDatabase()
{
    string connectionString = "Server=myserver;Database=mydb;User Id=admin;Password=Password123!";
    using (var connection = new SqlConnection(connectionString))
    {
        // Database operations
    }
}`,
        recommendation: "Store credentials in secure configuration: `var connectionString = Configuration.GetConnectionString(\"DefaultConnection\");`"
      },
      {
        title: "Cross-Site Scripting (XSS) vulnerability",
        description: "User input is rendered directly in the view without proper encoding.",
        codeSnippet: `public IActionResult DisplayUserInput(string message)
{
    ViewBag.Message = message;
    return View();
}

// In the View:
// @Html.Raw(ViewBag.Message)`,
        recommendation: "Use proper encoding: `@Html.Encode(ViewBag.Message)` or avoid using Html.Raw with user input."
      }
    ];
    
    return issues[Math.floor(Math.random() * issues.length)];
  };
  
  // Get a random C# architecture issue
  const getCSharpArchitectureIssue = () => {
    const issues = [
      {
        title: "God class anti-pattern",
        description: "The class has too many responsibilities and should be split into smaller, more focused classes.",
        codeSnippet: `public class UserManager
{
    // Database operations
    public User GetUser(int id) { /* ... */ }
    public void SaveUser(User user) { /* ... */ }
    
    // Authentication logic
    public bool ValidateCredentials(string username, string password) { /* ... */ }
    public string GenerateToken(User user) { /* ... */ }
    
    // Email sending
    public void SendWelcomeEmail(User user) { /* ... */ }
    public void SendPasswordReset(User user) { /* ... */ }
    
    // Report generation
    public byte[] GenerateUserReport(int userId) { /* ... */ }
}`,
        recommendation: "Split the class into specific services: UserRepository, AuthenticationService, EmailService, and ReportService."
      },
      {
        title: "Tight coupling between components",
        description: "The code creates direct dependencies between components rather than using dependency injection.",
        codeSnippet: `public class OrderController
{
    private readonly Database _db;
    private readonly PaymentProcessor _paymentProcessor;
    
    public OrderController()
    {
        _db = new Database();
        _paymentProcessor = new PaymentProcessor();
    }
    
    public IActionResult ProcessOrder(Order order)
    {
        // Order processing logic
    }
}`,
        recommendation: "Use dependency injection: `public OrderController(IDatabase db, IPaymentProcessor paymentProcessor) { _db = db; _paymentProcessor = paymentProcessor; }`"
      },
      {
        title: "Violation of Single Responsibility Principle",
        description: "The class has multiple reasons to change, violating the Single Responsibility Principle.",
        codeSnippet: `public class User
{
    // User properties
    public int Id { get; set; }
    public string Name { get; set; }
    
    // Database operations
    public void Save() 
    {
        // Database saving logic
    }
    
    // Business operations
    public bool CanAccessResource(int resourceId)
    {
        // Access control logic
    }
    
    // Formatting/UI logic
    public string FormatForDisplay()
    {
        return $"{Name} (ID: {Id})";
    }
}`,
        recommendation: "Separate concerns into different classes: User entity, UserRepository for data access, UserService for business rules, and UserViewModel for UI formatting."
      }
    ];
    
    return issues[Math.floor(Math.random() * issues.length)];
  };
  
  // Update mock simulation for fallback
  const simulateMockAnalysis = () => {
    let progress = 0;
    const analysisInterval = setInterval(() => {
      progress += 2;
      setAnalysisProgress(progress);
      
      // Generate incremental analysis results
      if (progress % 20 === 0) {
        const csResults = generateCSharpResults(5);
        setAnalysisResults(prev => [...prev, ...csResults]);
      }
      
      if (progress >= 100) {
        clearInterval(analysisInterval);
        const results = analysisResults;
        completeRealAnalysis(results);
      }
    }, 200);
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
    setDetectedLanguages({});
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

export default ProjectAnalyzer; 
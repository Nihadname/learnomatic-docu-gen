import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FileText, Info, ChevronRight, Code, Copy, Check, AlertCircle, CheckCircle, AlertTriangle, GitFork, Database, LayoutTemplate, Share2, Download } from 'lucide-react';
import Header from '@/components/layout/Header';
import GlassCard from '@/components/ui-custom/GlassCard';
import AnimatedContainer from '@/components/ui-custom/AnimatedContainer';
import openAIService from '@/utils/openai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism.css';
import mermaid from 'mermaid';
import { DiagramResult } from '@/utils/openai';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  logLevel: 'error',
  securityLevel: 'loose',
  flowchart: { curve: 'basis' },
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#3b82f6',
    lineColor: '#64748b',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#f8fafc',
  }
});

interface FormData {
  codeSnippet: string;
  language: string;
  reviewType: 'bugs' | 'performance' | 'style' | 'comprehensive';
  includeVisualization: boolean;
  diagramType?: 'flowchart' | 'class' | 'er' | 'sequence';
  errorDescription?: string;
}

interface CodeIssue {
  type: 'error' | 'warning' | 'suggestion';
  line: number;
  message: string;
  fix?: string;
}

interface ReviewResult {
  summary: string;
  issues: CodeIssue[];
  improvements: string[];
  score?: number;
  fixedCode?: string;
}

const CodeReviewer = () => {
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [diagramResult, setDiagramResult] = useState<DiagramResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKeyLoading, setApiKeyLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [editorValue, setEditorValue] = useState<string>('');
  const [activeIssue, setActiveIssue] = useState<number | null>(null);
  const [diagramLoading, setDiagramLoading] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const editorRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Custom styling for syntax highlighting in the fixed code section
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    // Define vibrant syntax highlighting colors
    styleEl.innerHTML = `
      .vibrant-code-editor .token.comment { color: #6a9955; }
      .vibrant-code-editor .token.string { color: #ce9178; }
      .vibrant-code-editor .token.number { color: #b5cea8; }
      .vibrant-code-editor .token.boolean { color: #569cd6; }
      .vibrant-code-editor .token.keyword { color: #c586c0; font-weight: bold; }
      .vibrant-code-editor .token.function { color: #dcdcaa; }
      .vibrant-code-editor .token.operator { color: #d4d4d4; }
      .vibrant-code-editor .token.variable { color: #9cdcfe; }
      .vibrant-code-editor .token.class-name { color: #4ec9b0; }
      .vibrant-code-editor .token.property { color: #9cdcfe; }
      .vibrant-code-editor .token.punctuation { color: #d4d4d4; }
      .vibrant-code-editor .token.tag { color: #569cd6; }
      .vibrant-code-editor .token.attr-name { color: #9cdcfe; }
      .vibrant-code-editor .token.attr-value { color: #ce9178; }
      .vibrant-code-editor .token.regex { color: #d16969; }
      
      /* Fixed code editor styling */
      .fixed-code-container {
        position: relative;
        width: 100%;
        z-index: 1;
      }
      
      .code-editor-container {
        scrollbar-width: thin;
        scrollbar-color: rgba(155, 155, 155, 0.7) rgba(0, 0, 0, 0.3);
      }
      
      .code-editor-container::-webkit-scrollbar {
        height: 10px;
        width: 10px;
      }
      
      .code-editor-container::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
      }
      
      .code-editor-container::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.7);
        border-radius: 10px;
        border: 2px solid rgba(0, 0, 0, 0.3);
      }

      #fixed-code-textarea {
        overflow-y: auto !important;
        height: auto !important;
        min-height: 300px !important;
      }
      
      /* Mobile styles */
      @media (max-width: 768px) {
        .fixed-code-container {
          max-width: 100% !important;
          margin-left: 0 !important;
        }
      }
    `;
    // Append the style element to the document head
    document.head.appendChild(styleEl);
    
    // Cleanup on component unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

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
  
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      codeSnippet: '',
      language: 'javascript',
      reviewType: 'comprehensive',
      includeVisualization: false,
      diagramType: 'flowchart'
    }
  });

  // Sync the form value with our local state
  useEffect(() => {
    setEditorValue(getValues('codeSnippet'));
  }, [getValues]);

  const language = watch('language');
  const reviewType = watch('reviewType');
  const includeVisualization = watch('includeVisualization');
  const diagramType = watch('diagramType');

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

  const copyToClipboard = () => {
    const code = editorValue;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied to clipboard');
    });
  };

  const handlePasteCode = () => {
    navigator.clipboard.readText().then(text => {
      setValue('codeSnippet', text);
      setEditorValue(text);
    }).catch(err => {
      console.error('Failed to read clipboard contents: ', err);
      toast.error('Unable to paste from clipboard. Please try copying your code again.');
    });
  };

  const handleCodeChange = (code: string) => {
    setValue('codeSnippet', code);
    setEditorValue(code);
  };

  // Create a useEffect to handle diagram rendering
  useEffect(() => {
    if (diagramResult && diagramRef.current) {
      try {
        // Clear the diagram container
        diagramRef.current.innerHTML = '';
        // Create a div for mermaid
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = diagramResult.mermaidCode;
        diagramRef.current.appendChild(mermaidDiv);
        // Render the diagram
        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
      } catch (error) {
        console.error('Error rendering diagram:', error);
        toast.error('Failed to render diagram. Please check the diagram syntax.');
        
        // Display the raw code if rendering fails
        if (diagramRef.current) {
          diagramRef.current.innerHTML = `
            <div class="p-4 bg-red-50 text-red-800 rounded-md mb-4">
              Error rendering diagram. Displaying raw code:
            </div>
            <pre class="bg-gray-100 p-4 rounded-md overflow-x-auto">${diagramResult.mermaidCode}</pre>
          `;
        }
      }
    }
  }, [diagramResult]);

  const downloadSVG = () => {
    if (diagramRef.current) {
      const svgElement = diagramRef.current.querySelector('svg');
      if (svgElement) {
        // Create a Blob from the SVG
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${diagramResult?.title || 'diagram'}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(url);
        toast.success('SVG diagram downloaded successfully');
      } else {
        toast.error('No SVG diagram found to download');
      }
    }
  };
  
  const copyDiagramCode = () => {
    if (diagramResult) {
      navigator.clipboard.writeText(diagramResult.mermaidCode).then(() => {
        toast.success('Diagram code copied to clipboard');
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setApiKeyLoading(true);
      setReviewResult(null);
      setDiagramResult(null);
      
      // Toast notification that we're getting ready
      toast.info('Preparing to review your code...');
      
      // Ensure API key is available
      await openAIService.ensureApiKey();
      setApiKeyLoading(false);
      
      // Call the code review service using our OpenAI service
      const result = await openAIService.reviewCode(
        data.codeSnippet, 
        data.language, 
        data.reviewType,
        true,
        data.errorDescription
      );
      
      setReviewResult(result);
      toast.success('Code review completed successfully');
      
      // Generate diagram if requested
      if (data.includeVisualization && data.diagramType) {
        setDiagramLoading(true);
        toast.info('Generating visualization diagram...');
        
        try {
          const diagramResult = await openAIService.generateDiagram(
            data.codeSnippet,
            data.diagramType,
            data.language
          );
          
          setDiagramResult(diagramResult);
          toast.success('Diagram generated successfully');
        } catch (error) {
          let errorMessage = 'Failed to generate diagram';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          toast.error(errorMessage);
        } finally {
          setDiagramLoading(false);
        }
      }
      
    } catch (error) {
      setApiKeyLoading(false);
      let errorMessage = 'Failed to review code';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (example: string) => {
    let codeContent = '';
    
    switch (example) {
      case 'buggyJs':
        codeContent = `// This function has several bugs and issues
function calculateTotal(items) {
  let total = 0;
  
  // Bug 1: No null/undefined check
  for (let i = 0; i < items.length; i++) {
    // Bug 2: No property existence check
    total += items[i].price * items[i].quantity;
  }
  
  // Bug 3: No validation of discount
  const discount = getDiscount();
  total = total - (total * discount);
  
  // Bug 4: No handling of negative numbers
  return total;
}

// Bug 5: Undefined function
function getDiscount() {
  // Bug 6: Math operation on potentially non-numeric input
  return localStorage.getItem('discount') * 0.01;
}

// Bug 7: Potential memory leak in event listener
document.getElementById('checkout').addEventListener('click', function() {
  const items = document.querySelectorAll('.cart-item');
  const itemsArray = [];
  
  // Bug 8: Inefficient loop
  for (let i = 0; i < items.length; i++) {
    const item = {
      // Bug 9: Unsafe DOM property access
      id: items[i].getAttribute('data-id'),
      name: items[i].querySelector('.item-name').innerText,
      price: parseFloat(items[i].querySelector('.item-price').innerText),
      // Bug 10: Possible NaN result
      quantity: parseInt(items[i].querySelector('.item-quantity').value)
    };
    itemsArray.push(item);
  }
  
  const total = calculateTotal(itemsArray);
  // Bug 11: No error handling
  updateUI(total);
});

function updateUI(total) {
  document.getElementById('total').innerText = '$' + total;
}`;
        setValue('language', 'javascript');
        setValue('reviewType', 'bugs');
        break;
      case 'performanceJs':
        codeContent = `// This code has performance issues
function findDuplicates(array) {
  const duplicates = [];
  
  // Performance issue: O(n²) complexity
  for (let i = 0; i < array.length; i++) {
    for (let j = i + 1; j < array.length; j++) {
      if (array[i] === array[j] && !duplicates.includes(array[i])) {
        duplicates.push(array[i]);
      }
    }
  }
  
  return duplicates;
}

function processLargeData(data) {
  // Performance issue: Multiple array traversals
  const filtered = data.filter(item => item.value > 10);
  const mapped = filtered.map(item => item.value * 2);
  const sum = mapped.reduce((total, value) => total + value, 0);
  
  // Performance issue: Inefficient DOM manipulation in a loop
  const container = document.getElementById('results');
  for (let i = 0; i < mapped.length; i++) {
    const div = document.createElement('div');
    div.innerText = mapped[i].toString();
    container.appendChild(div);
  }
  
  // Performance issue: Unnecessary object creation
  return {
    original: [...data],
    filtered: filtered,
    mapped: mapped,
    sum: sum
  };
}

// Performance issue: Slow string concatenation
function createHtmlReport(items) {
  let html = '';
  for (let i = 0; i < items.length; i++) {
    html += '<div class="item">';
    html += '<h2>' + items[i].name + '</h2>';
    html += '<p>Price: $' + items[i].price + '</p>';
    html += '<p>Quantity: ' + items[i].quantity + '</p>';
    html += '<p>Subtotal: $' + (items[i].price * items[i].quantity) + '</p>';
    html += '</div>';
  }
  return html;
}

// Performance issue: Inefficient data structure
function searchItems(items, term) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].name.includes(term) || items[i].description.includes(term)) {
      results.push(items[i]);
    }
  }
  return results;
}

// Performance issue: Redundant calculations
function calculateStatistics(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  
  const mean = sum / numbers.length;
  
  let sumSquaredDiffs = 0;
  for (let i = 0; i < numbers.length; i++) {
    sumSquaredDiffs += (numbers[i] - mean) ** 2;
  }
  
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    mean: mean,
    variance: sumSquaredDiffs / numbers.length,
    standardDeviation: Math.sqrt(sumSquaredDiffs / numbers.length)
  };
}`;
        setValue('language', 'javascript');
        setValue('reviewType', 'performance');
        break;
      case 'stylePython':
        codeContent = `# This Python code has style issues
import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import re
import json
import random
from datetime import datetime

class data_processor:
  def __init__(self,input_file,output_dir="./output",debug_mode=False):
    self.file = input_file
    self.out = output_dir
    self.Debug = debug_mode
    self.df = None
    if not os.path.exists(self.out):
      os.makedirs(self.out)
  
  def Load(self):
    try:
      self.df = pd.read_csv(self.file)
      if self.Debug == True:
        print("Data loaded successfully with", len(self.df), "rows")
      return True
    except:
      if self.Debug:
        print("ERROR: Failed to load data from", self.file)
      return False
  
  def clean_data(self, columns_to_drop=[], fill_na=True):
    if self.df is None:
      return False
    
    # Remove specified columns
    if len(columns_to_drop) > 0:
      self.df = self.df.drop(columns=columns_to_drop)
    
    # Handle missing values
    if fill_na:
      for col in self.df.columns:
        if self.df[col].dtype == np.float64 or self.df[col].dtype == np.int64:
          self.df[col] = self.df[col].fillna(self.df[col].mean())
        else:
          self.df[col] = self.df[col].fillna("")
    
    # Remove duplicates
    old_len = len(self.df)
    self.df = self.df.drop_duplicates()
    if self.Debug == True:
      print(f"Removed {old_len - len(self.df)} duplicate rows")
    
    return True
  
  def Transform(self, categorize_columns=[], normalize_columns=[]):
    """transform data for analysis"""
    if self.df is None: return False
    
    # Categorize columns
    for c in categorize_columns:
      self.df[c+"_cat"] = self.df[c].astype("category").cat.codes
    
    # Normalize columns
    for c in normalize_columns:
      self.df[c] = (self.df[c] - self.df[c].min()) / (self.df[c].max() - self.df[c].min())
    
    return True
  
  def SaveResults(self, file_name=None):
    """save processed data to csv"""
    if self.df is None:
      if self.Debug: print("No data to save")
      return False
    
    if file_name is None:
      file_name = "processed_data_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".csv"
    
    full_path = os.path.join(self.out, file_name)
    self.df.to_csv(full_path, index=False)
    
    if self.Debug == True:
      print(f"Data saved to {full_path}")
    
    return True
  
  def generate_report(self):
    if self.df is None: return False
    
    report = {
      "shape": self.df.shape,
      "columns": list(self.df.columns),
      "data_types": {col: str(self.df[col].dtype) for col in self.df.columns},
      "missing_values": self.df.isnull().sum().to_dict(),
      "summary": {}
    }
    
    # Add summary statistics for numeric columns
    for col in self.df.columns:
      if np.issubdtype(self.df[col].dtype, np.number):
        report["summary"][col] = {
          "min": float(self.df[col].min()),
          "max": float(self.df[col].max()),
          "mean": float(self.df[col].mean()),
          "median": float(self.df[col].median()),
          "std_dev": float(self.df[col].std())
        }
    
    # Save report
    report_path = os.path.join(self.out, "data_report.json")
    with open(report_path, "w") as f:
      json.dump(report, f, indent=2)
    
    if self.Debug:
      print("Report generated at", report_path)
    
    return True

def quickProcess(file, drop_cols=[]):
  proc = data_processor(file, debug_mode=True)
  proc.Load()
  proc.clean_data(columns_to_drop=drop_cols)
  proc.Transform()
  proc.SaveResults()
  proc.generate_report()
  return proc.df`;
        setValue('language', 'python');
        setValue('reviewType', 'style');
        break;
    }
    
    // Set the editor value after setting form values
    setValue('codeSnippet', codeContent);
    setEditorValue(codeContent);
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="text-destructive h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500 h-5 w-5" />;
      case 'suggestion':
        return <Info className="text-blue-500 h-5 w-5" />;
      default:
        return <Info className="text-muted-foreground h-5 w-5" />;
    }
  };

  const getDiagramTypeIcon = (type: 'flowchart' | 'class' | 'er' | 'sequence') => {
    switch (type) {
      case 'flowchart': return <GitFork className="h-5 w-5" />;
      case 'class': return <LayoutTemplate className="h-5 w-5" />;
      case 'er': return <Database className="h-5 w-5" />;
      case 'sequence': return <Share2 className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-20">
        <AnimatedContainer animation="fade" className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            AI Code Reviewer
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get intelligent feedback and suggestions to improve your code quality
          </p>
        </AnimatedContainer>

        <div className="grid lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2">
            <AnimatedContainer animation="fade" delay={100}>
              <GlassCard className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Review Focus</Label>
                    <RadioGroup 
                      defaultValue="comprehensive" 
                      className="grid grid-cols-2 gap-4 mt-1"
                      onValueChange={(value) => setValue('reviewType', value as 'bugs' | 'performance' | 'style' | 'comprehensive')}
                    >
                      <div>
                        <RadioGroupItem value="bugs" id="bugs" className="peer sr-only" />
                        <Label
                          htmlFor="bugs"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <AlertCircle className="mb-2 h-5 w-5" />
                          <span>Find Bugs</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="performance" id="performance" className="peer sr-only" />
                        <Label
                          htmlFor="performance"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <FileText className="mb-2 h-5 w-5" />
                          <span>Performance</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="style" id="style" className="peer sr-only" />
                        <Label
                          htmlFor="style"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <Code className="mb-2 h-5 w-5" />
                          <span>Style & Best Practices</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="comprehensive" id="comprehensive" className="peer sr-only" />
                        <Label
                          htmlFor="comprehensive"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <CheckCircle className="mb-2 h-5 w-5" />
                          <span>Comprehensive</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="includeVisualization"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      {...register('includeVisualization')}
                    />
                    <Label htmlFor="includeVisualization" className="text-sm font-medium cursor-pointer">
                      Include AI-Generated Diagram
                    </Label>
                  </div>
                  
                  {includeVisualization && (
                    <div className="pl-6 border-l-2 border-primary/20">
                      <Label>Diagram Type</Label>
                      <RadioGroup 
                        defaultValue="flowchart" 
                        className="grid grid-cols-2 gap-4 mt-1"
                        onValueChange={(value) => setValue('diagramType', value as 'flowchart' | 'class' | 'er' | 'sequence')}
                      >
                        <div>
                          <RadioGroupItem value="flowchart" id="flowchart" className="peer sr-only" />
                          <Label
                            htmlFor="flowchart"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <GitFork className="mb-2 h-5 w-5" />
                            <span>Flowchart</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="class" id="class-diagram" className="peer sr-only" />
                          <Label
                            htmlFor="class-diagram"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <LayoutTemplate className="mb-2 h-5 w-5" />
                            <span>Class Diagram</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="er" id="er" className="peer sr-only" />
                          <Label
                            htmlFor="er"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <Database className="mb-2 h-5 w-5" />
                            <span>ER Diagram</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value="sequence" id="sequence" className="peer sr-only" />
                          <Label
                            htmlFor="sequence"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            <Share2 className="mb-2 h-5 w-5" />
                            <span>Sequence</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                  
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
                  
                  <div>
                    <Label htmlFor="errorDescription" className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-yellow-500" />
                      <span>Error Description (Optional)</span>
                    </Label>
                    <Textarea
                      id="errorDescription"
                      placeholder="Describe any errors or issues your code is experiencing (e.g., 'TypeError: Cannot read property of undefined', 'Performance lag when processing large arrays', etc.)"
                      className="mt-1 min-h-[80px]"
                      {...register('errorDescription')}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Providing context about specific errors will help the AI deliver more accurate fixes.
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="codeSnippet">
                        Code to Review
                      </Label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 gap-1.5 text-xs"
                        onClick={copyToClipboard}
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="code-editor-container border border-input overflow-hidden bg-[#eaedf2] dark:bg-[#2d3545]">
                      <div className="code-editor" ref={editorRef} style={{ color: 'black' }}>
                        <input type="hidden" {...register('codeSnippet', { required: 'This field is required' })} />
                        <div className="ensure-text-visible overflow-x-auto" style={{ backgroundColor: '#eaedf2', color: 'black', WebkitOverflowScrolling: 'touch' }}>
                          <Editor
                            value={editorValue}
                            onValueChange={handleCodeChange}
                            highlight={code => highlight(code, getLanguageHighlighter(language), language)}
                            padding={16}
                            style={{
                              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                              fontSize: '14px',
                              minHeight: '250px',
                              backgroundColor: '#eaedf2',
                              color: '#000000',
                              borderRadius: '0.375rem',
                              fontWeight: 800,
                            }}
                            textareaClassName="editor-textarea-element"
                            className="min-h-[350px] w-full focus:outline-none"
                            onPaste={e => {
                              const text = e.clipboardData.getData('text/plain');
                              handleCodeChange(text);
                            }}
                            textareaId="code-reviewer-textarea"
                          />
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Button 
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs"
                            onClick={handlePasteCode}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-paste"><path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10"/><path d="m17 10 4 4-4 4"/></svg>
                            <span>Paste</span>
                          </Button>
                          <Button 
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => {
                              setValue('codeSnippet', '');
                              setEditorValue('');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            <span>Clear</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    {errors.codeSnippet && (
                      <p className="text-destructive text-sm mt-1">{errors.codeSnippet.message}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full gap-2"
                    disabled={isLoading || diagramLoading}
                  >
                    {isLoading || diagramLoading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary-foreground animate-spin"></div>
                        <span>
                          {apiKeyLoading ? 'Preparing API Key...' : 
                           diagramLoading ? 'Generating Diagram...' : 
                           'Analyzing...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Code size={16} />
                        <span>Review My Code</span>
                        {includeVisualization && (
                          <>
                            {' + '}
                            {getDiagramTypeIcon(diagramType || 'flowchart')}
                          </>
                        )}
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
                  <span>Example Code Samples</span>
                </h3>
                <ul className="space-y-2">
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('buggyJs')}>
                    JavaScript with Bugs
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('performanceJs')}>
                    JavaScript with Performance Issues
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('stylePython')}>
                    Python with Style Issues
                  </li>
                </ul>
              </GlassCard>
            </AnimatedContainer>
          </div>
          
          <div className="lg:col-span-3 relative overflow-visible">
            <AnimatedContainer animation="fade" delay={300}>
              {isLoading ? (
                <GlassCard className="p-8">
                  <div className="flex flex-col items-center justify-center mb-8">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-primary/30 mb-4"></div>
                      <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-t-primary border-l-primary border-r-transparent border-b-transparent animate-spin"></div>
                      <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-b-primary border-r-primary animate-spin animation-delay-500" style={{ animationDuration: '2s' }}></div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-lg font-medium">Analyzing Your Code</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {apiKeyLoading ? 'Preparing API Key...' : 
                        'AI is reviewing your code and preparing suggestions...'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Summary Section */}
                    <div className="space-y-2">
                      <div className="h-8 bg-primary/10 rounded-md animate-pulse w-2/3"></div>
                      <div className="h-4 bg-muted/30 rounded-md animate-pulse w-full mt-4"></div>
                      <div className="h-4 bg-muted/30 rounded-md animate-pulse w-11/12"></div>
                      <div className="h-4 bg-muted/30 rounded-md animate-pulse w-3/4"></div>
                    </div>
                    
                    {/* Issues Section */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="space-y-3">
                        <div className="h-6 bg-primary/10 rounded-md animate-pulse w-1/3"></div>
                        <div className="space-y-2">
                          <div className="h-20 bg-red-50 border border-red-200 rounded-md animate-pulse"></div>
                          <div className="h-20 bg-yellow-50 border border-yellow-200 rounded-md animate-pulse"></div>
                          <div className="h-20 bg-blue-50 border border-blue-200 rounded-md animate-pulse"></div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="h-6 bg-primary/10 rounded-md animate-pulse w-1/3"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted/30 rounded-md animate-pulse w-full"></div>
                          <div className="h-4 bg-muted/30 rounded-md animate-pulse w-11/12"></div>
                          <div className="h-4 bg-muted/30 rounded-md animate-pulse w-full"></div>
                          <div className="h-4 bg-muted/30 rounded-md animate-pulse w-10/12"></div>
                          <div className="h-4 bg-muted/30 rounded-md animate-pulse w-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fixed Code Section */}
                    <div className="space-y-3">
                      <div className="h-6 bg-primary/10 rounded-md animate-pulse w-1/4"></div>
                      <div className="p-4 border border-muted/30 rounded-md space-y-2">
                        <div className="h-4 bg-muted/20 rounded-md animate-pulse w-full"></div>
                        <div className="h-4 bg-muted/20 rounded-md animate-pulse w-11/12"></div>
                        <div className="ml-4 h-4 bg-muted/20 rounded-md animate-pulse w-10/12"></div>
                        <div className="ml-4 h-4 bg-muted/20 rounded-md animate-pulse w-11/12"></div>
                        <div className="ml-8 h-4 bg-muted/20 rounded-md animate-pulse w-9/12"></div>
                        <div className="h-4 bg-muted/20 rounded-md animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ) : reviewResult ? (
                <div className="space-y-6">
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium">Review Summary</h3>
                      {reviewResult.score && (
                        <div className={`px-3 py-1.5 rounded-full font-medium ${
                          reviewResult.score >= 80 ? 'bg-green-100 text-green-800' :
                          reviewResult.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Score: {reviewResult.score}/100
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground break-words overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>{reviewResult.summary}</p>
                  </GlassCard>
                  
                  {diagramResult && (
                    <GlassCard className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-medium flex items-center gap-2">
                          {getDiagramTypeIcon(diagramType || 'flowchart')}
                          <span>{diagramResult.title}</span>
                        </h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={copyDiagramCode}
                          >
                            <Copy size={14} />
                            <span>Copy Code</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={downloadSVG}
                          >
                            <Download size={14} />
                            <span>Download SVG</span>
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">{diagramResult.explanation}</p>
                      <div ref={diagramRef} className="bg-white p-4 rounded-md overflow-x-auto">
                        {/* Mermaid diagram will be rendered here */}
                      </div>
                    </GlassCard>
                  )}
                  
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span>Issues Found ({reviewResult.issues.length})</span>
                      </h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {reviewResult.issues.map((issue, index) => (
                          <div 
                            key={index} 
                            className={`p-3 rounded-md border ${
                              issue.type === 'error' ? 'border-red-200 bg-red-50' :
                              issue.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                              'border-blue-200 bg-blue-50'
                            } cursor-pointer transition-colors hover:bg-opacity-80 ${
                              activeIssue === index ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => setActiveIssue(index)}
                          >
                            <div className="flex items-start gap-3">
                              {getIssueIcon(issue.type)}
                              <div className="flex-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <div className="flex justify-between">
                                  <p className="font-medium">Line {issue.line}</p>
                                  <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-white">
                                    {issue.type}
                                  </span>
                                </div>
                                <p className="text-sm mt-1 break-words">{issue.message}</p>
                                {issue.fix && (
                                  <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono overflow-x-auto break-words">
                                    {issue.fix}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                    
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <CheckCircle size={18} />
                        <span>Improvements Suggested</span>
                      </h3>
                      <ul className="space-y-2 list-disc pl-5 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {reviewResult.improvements.map((improvement, index) => (
                          <li key={index} className="text-muted-foreground break-words">
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </div>
                  
                  {reviewResult.fixedCode && (
                    <GlassCard className="p-6 fixed-code-container">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-medium flex items-center gap-2">
                          <CheckCircle size={20} className="text-green-500" />
                          <span>Fixed Code</span>
                        </h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => {
                              navigator.clipboard.writeText(reviewResult.fixedCode || '');
                              toast.success('Fixed code copied to clipboard');
                            }}
                          >
                            <Copy size={14} />
                            <span>Copy Code</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1"
                            onClick={() => {
                              setValue('codeSnippet', reviewResult.fixedCode || '');
                              setEditorValue(reviewResult.fixedCode || '');
                              toast.success('Fixed code applied to editor');
                            }}
                          >
                            <FileText size={14} />
                            <span>Apply Changes</span>
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        Here's the optimized version of your code with all suggested fixes applied:
                      </p>
                      <div className="border border-input rounded-md overflow-hidden bg-black dark:bg-black w-full">
                        <div className="overflow-x-auto overflow-y-auto max-h-[400px] code-editor-container" style={{ 
                          WebkitOverflowScrolling: 'touch', 
                          backgroundColor: 'black',
                          overflowY: 'scroll',
                          display: 'block'
                        }}>
                          <pre className="p-5 text-sm leading-relaxed overflow-visible" style={{ 
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            color: '#ffffff',
                            backgroundColor: 'black',
                            overflowX: 'auto',
                            whiteSpace: 'pre',
                            margin: 0
                          }}>
                            <code className="vibrant-code-editor" 
                              dangerouslySetInnerHTML={{ 
                                __html: highlight(
                                  reviewResult.fixedCode || '', 
                                  getLanguageHighlighter(language), 
                                  language
                                )
                              }}
                            />
                          </pre>
                        </div>
                      </div>
                    </GlassCard>
                  )}
                </div>
              ) : diagramLoading ? (
                <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="h-12 w-12 rounded-full border-4 border-t-transparent border-primary animate-spin mb-6"></div>
                  <h3 className="text-xl font-medium mb-2">Generating Visual Diagram</h3>
                  <p className="text-muted-foreground max-w-md">
                    Our AI is analyzing your code structure and creating a visual representation
                  </p>
                </GlassCard>
              ) : (
                <GlassCard className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <Code size={48} className="text-muted-foreground mb-6 opacity-50" />
                  <h3 className="text-xl font-medium mb-2">No code review yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Paste your code and click "Review My Code" to get AI-powered feedback and suggestions
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

export default CodeReviewer; 
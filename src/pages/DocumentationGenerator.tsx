import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FileText, Info, ChevronRight, Code, Copy, Check, Download, FileDown } from 'lucide-react';
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
import 'prismjs/themes/prism-tomorrow.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface FormData {
  codeSnippet: string;
  language: string;
  docType: DocType;
  githubUrl?: string;
  apiEndpoints?: ApiEndpoint[];
}

type DocType = 'function' | 'class' | 'readme' | 'github' | 'api';

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestParams?: ApiParam[];
  responseFields?: ApiParam[];
}

interface ApiParam {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
}

const DocumentationGenerator = () => {
  const [documentation, setDocumentation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKeyLoading, setApiKeyLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [editorValue, setEditorValue] = useState<string>('');
  const [exportLoading, setExportLoading] = useState<{pdf: boolean, markdown: boolean}>({
    pdf: false,
    markdown: false
  });
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [currentApiEndpoint, setCurrentApiEndpoint] = useState<ApiEndpoint | null>(null);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState<boolean>(false);
  const [repoStructure, setRepoStructure] = useState<any>(null);
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const documentationRef = useRef<HTMLDivElement>(null);
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
  
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      codeSnippet: '',
      language: 'javascript',
      docType: 'function',
      githubUrl: '',
      apiEndpoints: []
    }
  });

  // Sync the form value with our local state
  useEffect(() => {
    setEditorValue(getValues('codeSnippet'));
  }, [getValues]);

  const docType = watch('docType');
  const language = watch('language');
  const githubUrl = watch('githubUrl');

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

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setApiKeyLoading(true);
      
      // Toast notification that we're getting ready
      toast.info('Preparing to generate documentation...');
      
      // Ensure API key is available
      await openAIService.ensureApiKey();
      setApiKeyLoading(false);
      
      let result = '';
      
      if (data.docType === 'github') {
        // Handle GitHub repository documentation
        if (!data.githubUrl || !validateGithubUrl(data.githubUrl)) {
          throw new Error('Please enter a valid GitHub repository URL');
        }
        
        // Create a structured description of the repository to send to the API
        const repoDescription = `GitHub Repository: ${data.githubUrl}\n\n` +
                               `Files found: ${repoFiles.join(', ')}\n\n` +
                               `${data.codeSnippet || 'Please generate comprehensive documentation for this repository.'}`;
        
        // Use the standard generateDocumentation method but with repo data
        result = await openAIService.generateDocumentation(
          repoDescription,
          'markdown',
          'readme'
        );
      } else if (data.docType === 'api') {
        // Handle API documentation
        if (!data.apiEndpoints || data.apiEndpoints.length === 0) {
          throw new Error('Please add at least one API endpoint');
        }
        
        // Format API endpoints into structured text
        const apiDescription = data.apiEndpoints.map(endpoint => {
          return `Endpoint: ${endpoint.method} ${endpoint.path}
Description: ${endpoint.description || 'No description provided'}
${endpoint.requestParams?.length ? 'Request Parameters:\n' + endpoint.requestParams.map(p => `- ${p.name} (${p.type})${p.required ? ' [Required]' : ''}: ${p.description}`).join('\n') : ''}
${endpoint.responseFields?.length ? 'Response Fields:\n' + endpoint.responseFields.map(p => `- ${p.name} (${p.type}): ${p.description}`).join('\n') : ''}
---`;
        }).join('\n\n');
        
        const fullApiDescription = `API Documentation Request\n\n${apiDescription}\n\nAdditional Notes: ${data.codeSnippet || 'No additional notes provided.'}`;
        
        // Use the standard generateDocumentation method
        result = await openAIService.generateDocumentation(
          fullApiDescription,
          'markdown',
          'readme'
        );
      } else {
        // Handle regular code documentation (function, class, readme)
        result = await openAIService.generateDocumentation(
        data.codeSnippet,
        data.language,
          data.docType as 'function' | 'class' | 'readme'
      );
      }
      
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

  const exportToMarkdown = () => {
    setExportLoading(prev => ({ ...prev, markdown: true }));
    try {
      // Create a blob with the markdown content
      const blob = new Blob([documentation], { type: 'text/markdown' });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename based on docType and language
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `documentation_${docType}_${language || 'readme'}_${timestamp}.md`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Documentation exported as Markdown');
    } catch (error) {
      console.error('Failed to export markdown', error);
      toast.error('Failed to export as Markdown');
    } finally {
      setExportLoading(prev => ({ ...prev, markdown: false }));
    }
  };

  const exportToPDF = async () => {
    if (!documentationRef.current) return;
    
    setExportLoading(prev => ({ ...prev, pdf: true }));
    try {
      toast.info('Preparing PDF export...');
      
      // Generate filename based on docType and language
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `documentation_${docType}_${language || 'readme'}_${timestamp}.pdf`;
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Get the content element
      const element = documentationRef.current;
      
      // Use html2canvas to capture the element
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      // Calculate dimensions to fit on PDF
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add new pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      pdf.save(fileName);
      
      toast.success('Documentation exported as PDF');
    } catch (error) {
      console.error('Failed to export PDF', error);
      toast.error('Failed to export as PDF');
    } finally {
      setExportLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const loadExample = (example: string) => {
    let codeContent = '';
    
    switch (example) {
      case 'functionJs':
        codeContent = `/**
 * Calculates the total price for a shopping cart, applying discount and tax.
 * 
 * @param {Array<{id: string, name: string, price: number, quantity: number}>} items - Array of cart items
 * @param {number} [discount=0] - Discount rate as a decimal (e.g., 0.1 for 10% discount)
 * @param {number} [taxRate=0.1] - Tax rate as a decimal (e.g., 0.1 for 10% tax)
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.applyDiscountToTax=false] - Whether to calculate tax before or after discount
 * @param {string} [options.currency='USD'] - Currency for the calculation 
 * @returns {Object} Calculation result with subtotal, discount, tax and total
 * @throws {Error} If items parameter is not an array
 * @throws {Error} If any item is missing required properties
 */
function calculateTotalPrice(items, discount = 0, taxRate = 0.1, options = {}) {
  // Default options
  const { 
    applyDiscountToTax = false, 
    currency = 'USD',
    roundToCent = true
  } = options;

  // Input validation
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  // Validate each item has required properties
  items.forEach((item, index) => {
    if (!item.price || typeof item.price !== 'number') {
      throw new Error(\`Item at index \${index} has invalid price\`);
    }
    if (!item.quantity || typeof item.quantity !== 'number') {
      throw new Error(\`Item at index \${index} has invalid quantity\`);
    }
  });
  
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Apply discount
  const discountAmount = subtotal * discount;
  
  // Calculate tax based on configuration
  const taxableAmount = applyDiscountToTax ? subtotal - discountAmount : subtotal;
  const taxAmount = taxableAmount * taxRate;
  
  // Calculate total
  const total = subtotal - discountAmount + taxAmount;
  
  // Helper function to format currency amounts
  const formatAmount = (amount) => {
    return roundToCent ? Math.round(amount * 100) / 100 : amount;
  };
  
  // Return calculation results
  return {
    subtotal: formatAmount(subtotal),
    discount: formatAmount(discountAmount),
    tax: formatAmount(taxAmount),
    total: formatAmount(total),
    currency,
    items: items.length,
    breakdown: items.map(item => ({
      id: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      lineTotal: formatAmount(item.price * item.quantity)
    }))
  };
}`;
        setValue('language', 'javascript');
        setValue('docType', 'function');
        break;
      case 'classJava':
        codeContent = `package com.learnomatic.user;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Manages user operations including creation, validation, and authentication.
 * This class serves as the primary entry point for all user-related operations
 * and implements necessary security measures.
 *
 * @author LearnOmatic Team
 * @version 1.0.3
 * @since 1.0.0
 */
public class UserManager {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");
    private static final int MIN_USERNAME_LENGTH = 3;
    private static final int MIN_PASSWORD_LENGTH = 8;
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserAuditLogger auditLogger;
    
    /**
     * Creates a new UserManager with required dependencies.
     * 
     * @param userRepository Repository for user data access
     * @param passwordEncoder Service to securely hash and verify passwords
     * @param auditLogger Service to log security-relevant user actions
     */
    public UserManager(UserRepository userRepository, 
                       PasswordEncoder passwordEncoder,
                       UserAuditLogger auditLogger) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogger = auditLogger;
    }

    /**
     * Creates a new user account with the provided credentials.
     * Performs validation on all inputs and checks for existing users
     * with the same username or email.
     * 
     * @param username User's chosen username (minimum 3 characters)
     * @param email User's email address (must be valid format and unique)
     * @param password User's password (minimum 8 characters)
     * @param userType Type of user account (defaults to STANDARD if null)
     * @return The newly created User object
     * @throws InvalidUserDataException If any validation fails
     * @throws DuplicateUserException If username or email already exists
     */
    public User createUser(String username, 
                          String email, 
                          String password, 
                          UserType userType) throws InvalidUserDataException, DuplicateUserException {
        // Validate inputs
        validateUsername(username);
        validateEmail(email);
        validatePassword(password);
        
        // Check for existing users
        checkUsernameAvailability(username);
        checkEmailAvailability(email);
        
        // Create and save the user
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setCreatedAt(LocalDateTime.now());
        user.setUserType(userType != null ? userType : UserType.STANDARD);
        user.setActive(true);
        
        User savedUser = userRepository.save(user);
        
        // Audit the creation
        auditLogger.logUserCreation(savedUser.getId(), userType);
        
        return savedUser;
    }
    
    /**
     * Authenticates a user with the provided credentials.
     * 
     * @param username Username or email to authenticate
     * @param password Password to verify
     * @return AuthResult containing authentication status and user if successful
     */
    public AuthResult authenticate(String username, String password) {
        Optional<User> user = findUserByUsernameOrEmail(username);
        
        if (user.isEmpty()) {
            auditLogger.logFailedAuthentication(username, "User not found");
            return AuthResult.failure("Invalid credentials");
        }
        
        User foundUser = user.get();
        
        if (!foundUser.isActive()) {
            auditLogger.logFailedAuthentication(username, "Account inactive");
            return AuthResult.failure("Account is inactive");
        }
        
        boolean passwordMatches = passwordEncoder.matches(
            password, foundUser.getPasswordHash()
        );
        
        if (!passwordMatches) {
            auditLogger.logFailedAuthentication(username, "Invalid password");
            return AuthResult.failure("Invalid credentials");
        }
        
        // Update last login time
        foundUser.setLastLoginAt(LocalDateTime.now());
        userRepository.save(foundUser);
        
        auditLogger.logSuccessfulAuthentication(foundUser.getId());
        return AuthResult.success(foundUser);
    }
    
    /**
     * Searches for users by name pattern.
     * 
     * @param namePattern Pattern to search for in usernames (case insensitive)
     * @param limit Maximum number of results to return
     * @return List of matching users
     */
    public List<User> searchUsersByName(String namePattern, int limit) {
        return userRepository.findByUsernameContainingIgnoreCase(namePattern, limit);
    }
    
    /**
     * Updates a user's password.
     * 
     * @param userId ID of the user to update
     * @param currentPassword Current password for verification
     * @param newPassword New password to set
     * @return true if password was updated successfully
     * @throws SecurityException If current password is invalid
     * @throws InvalidUserDataException If new password fails validation
     * @throws EntityNotFoundException If user not found
     */
    public boolean updatePassword(Long userId, String currentPassword, String newPassword) 
            throws SecurityException, InvalidUserDataException, EntityNotFoundException {
        // Implementation details...
        return true;
    }
    
    /**
     * Deactivates a user account.
     * 
     * @param userId ID of the user to deactivate
     * @param reason Reason for deactivation
     * @throws EntityNotFoundException If user not found
     */
    public void deactivateUser(Long userId, String reason) throws EntityNotFoundException {
        // Implementation details...
    }
    
    // Private helper methods
    
    private void validateUsername(String username) throws InvalidUserDataException {
        if (username == null || username.length() < MIN_USERNAME_LENGTH) {
            throw new InvalidUserDataException("Username must be at least " + 
                                             MIN_USERNAME_LENGTH + " characters");
        }
    }
    
    private void validateEmail(String email) throws InvalidUserDataException {
        if (email == null || !isValidEmail(email)) {
            throw new InvalidUserDataException("Invalid email format");
        }
    }
    
    private void validatePassword(String password) throws InvalidUserDataException {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new InvalidUserDataException("Password must be at least " + 
                                             MIN_PASSWORD_LENGTH + " characters");
        }
    }
    
    private void checkUsernameAvailability(String username) throws DuplicateUserException {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new DuplicateUserException("Username already taken");
        }
        }
        
    private void checkEmailAvailability(String email) throws DuplicateUserException {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new DuplicateUserException("Email already registered");
        }
    }
    
    private Optional<User> findUserByUsernameOrEmail(String usernameOrEmail) {
        return isValidEmail(usernameOrEmail) 
            ? userRepository.findByEmail(usernameOrEmail)
            : userRepository.findByUsername(usernameOrEmail);
    }
    
    private boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }
}`;
        setValue('language', 'java');
        setValue('docType', 'class');
        break;
      case 'classPython':
        codeContent = `from typing import List, Dict, Optional, Union, Any
import logging
import json
from datetime import datetime, timedelta
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class DataProcessingError(Exception):
    """Base exception for data processing errors."""
    pass

class InvalidDataFormatError(DataProcessingError):
    """Raised when data format is invalid for processing."""
    pass

class DataSourceConnectionError(DataProcessingError):
    """Raised when connection to a data source fails."""
    pass

class DataProcessor(ABC):
    """
    Abstract base class for all data processors in the application.
    
    This class defines the interface that all concrete data processor
    implementations must follow. It handles data validation, transformation,
    and export capabilities with proper error handling and logging.
    
    Attributes:
        name (str): The name of the data processor
        config (Dict): Configuration parameters for the processor
        last_processed (Optional[datetime]): When the processor last ran successfully
    """
    
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize a new data processor.
        
        Args:
            name: A human-readable name for this processor instance
            config: Configuration dictionary for this processor
                   (default: empty dict if None provided)
        """
        self.name = name
        self.config = config or {}
        self.last_processed = None
        self._cached_data = None
        self._error_count = 0
        self._success_count = 0
        
        logger.info(f"Initialized {self.__class__.__name__} processor: {name}")
    
    @abstractmethod
    def _extract_data(self, source: Any) -> List[Dict[str, Any]]:
        """
        Extract raw data from the source.
        
        Args:
            source: The data source to extract from
            
        Returns:
            List of dictionaries containing the extracted data
            
        Raises:
            DataSourceConnectionError: If connection to source fails
        """
        pass
    
    @abstractmethod
    def _transform_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform the extracted data into the desired format.
        
        Args:
            data: The raw data extracted from the source
            
        Returns:
            List of dictionaries containing the transformed data
            
        Raises:
            InvalidDataFormatError: If data cannot be transformed
        """
        pass
    
    def process(self, source: Any, cache_results: bool = False) -> List[Dict[str, Any]]:
        """
        Process data from the source through extraction and transformation.
        
        This is the main public method that orchestrates the ETL process
        and handles errors appropriately.
        
        Args:
            source: The data source to process
            cache_results: Whether to cache the results for later retrieval
        
        Returns:
            The processed and transformed data
            
        Raises:
            DataProcessingError: If processing fails at any stage
        """
        start_time = datetime.now()
        logger.info(f"Starting data processing with {self.name}")
        
        try:
            # Extract stage
            raw_data = self._extract_data(source)
            logger.debug(f"Extracted {len(raw_data)} records from source")
            
            # Run validation on raw data
            self._validate_data(raw_data)
            
            # Transform stage
            processed_data = self._transform_data(raw_data)
            logger.debug(f"Transformed data into {len(processed_data)} records")
            
            # Update metadata
            self.last_processed = datetime.now()
            self._success_count += 1
            
            # Cache if requested
            if cache_results:
                self._cached_data = processed_data
                
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Completed processing in {processing_time:.2f} seconds")
            
            return processed_data
            
        except Exception as e:
            self._error_count += 1
            logger.error(f"Error during data processing: {str(e)}", exc_info=True)
            
            # Wrap unknown exceptions in our custom exception
            if not isinstance(e, DataProcessingError):
                raise DataProcessingError(f"Unexpected error: {str(e)}") from e
            raise
    
    def _validate_data(self, data: List[Dict[str, Any]]) -> None:
        """
        Validate the extracted data before transformation.
        
        Args:
            data: The data to validate
            
        Raises:
            InvalidDataFormatError: If validation fails
        """
        if not isinstance(data, list):
            raise InvalidDataFormatError("Data must be a list of dictionaries")
        
        if not data:
            logger.warning("Empty dataset received for processing")
            return
            
        # Check that all items are dictionaries
        if not all(isinstance(item, dict) for item in data):
            raise InvalidDataFormatError("All data items must be dictionaries")
    
    def export_to_json(self, data: List[Dict[str, Any]], file_path: str) -> None:
        """
        Export the processed data to a JSON file.
        
        Args:
            data: The data to export
            file_path: The path to save the JSON file
            
        Raises:
            IOError: If file cannot be written
        """
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            logger.info(f"Data exported to {file_path}")
        except IOError as e:
            logger.error(f"Failed to export data to {file_path}: {str(e)}")
            raise
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """
        Get statistics about this processor's operations.
        
        Returns:
            Dictionary containing processor statistics
        """
        return {
            "name": self.name,
            "type": self.__class__.__name__,
            "success_count": self._success_count,
            "error_count": self._error_count,
            "last_processed": self.last_processed,
            "uptime": self._calculate_uptime(),
            "config": {k: v for k, v in self.config.items() if not k.startswith('_')}
        }
    
    def _calculate_uptime(self) -> Optional[float]:
        """Calculate uptime in hours since initialization."""
        if not hasattr(self, '_init_time'):
            self._init_time = datetime.now()
        
        return round((datetime.now() - self._init_time).total_seconds() / 3600, 2)
    
    def __str__(self) -> str:
        """String representation of the processor."""
        return f"{self.__class__.__name__}(name='{self.name}', last_processed={self.last_processed})"


class CSVDataProcessor(DataProcessor):
    """
    Processor implementation for CSV data sources.
    
    This processor handles extraction and transformation of data from
    CSV files or CSV-formatted strings.
    
    Attributes:
        delimiter (str): The CSV delimiter character
        has_header (bool): Whether the CSV contains a header row
    """
    
    def __init__(self, name: str, delimiter: str = ',', has_header: bool = True, 
                config: Optional[Dict[str, Any]] = None):
        """
        Initialize a CSV data processor.
        
        Args:
            name: Processor name
            delimiter: CSV delimiter character (default: comma)
            has_header: Whether CSV has header row (default: True)
            config: Additional configuration parameters
        """
        super().__init__(name, config)
        self.delimiter = delimiter
        self.has_header = has_header
        
    def _extract_data(self, source: Union[str, List[str]]) -> List[Dict[str, Any]]:
        """
        Extract data from a CSV source.
        
        The source can be a file path, a CSV string, or a list of CSV lines.
        
        Args:
            source: CSV file path, CSV content string, or list of CSV lines
            
        Returns:
            List of dictionaries representing the CSV rows
            
        Raises:
            DataSourceConnectionError: If source cannot be read
            InvalidDataFormatError: If CSV format is invalid
        """
        import csv
        from io import StringIO
        
        try:
            csv_data = []
            
            # Handle different source types
            if isinstance(source, str):
                if source.endswith('.csv') or '/' in source or '\\' in source:
                    # This looks like a file path
                    with open(source, 'r', encoding='utf-8') as f:
                        csv_reader = csv.reader(f, delimiter=self.delimiter)
                        csv_data = list(csv_reader)
                else:
                    # Treat as CSV content string
                    csv_reader = csv.reader(StringIO(source), delimiter=self.delimiter)
                    csv_data = list(csv_reader)
            elif isinstance(source, list):
                # List of CSV lines
                csv_reader = csv.reader(source, delimiter=self.delimiter)
                csv_data = list(csv_reader)
            else:
                raise InvalidDataFormatError(f"Unsupported source type: {type(source)}")
                
            if not csv_data:
                return []
                
            # Process based on whether there's a header
            if self.has_header:
                header = csv_data[0]
                rows = csv_data[1:]
                return [dict(zip(header, row)) for row in rows]
            else:
                # Create numeric field names if no header
                field_count = len(csv_data[0])
                header = [f"field{i}" for i in range(field_count)]
                return [dict(zip(header, row)) for row in csv_data]
                
        except Exception as e:
            logger.error(f"CSV extraction error: {str(e)}")
            if isinstance(e, FileNotFoundError):
                raise DataSourceConnectionError(f"CSV file not found: {source}")
            elif isinstance(e, (csv.Error, UnicodeDecodeError)):
                raise InvalidDataFormatError(f"Invalid CSV format: {str(e)}")
            else:
                raise DataSourceConnectionError(f"Failed to extract CSV data: {str(e)}")
    
    def _transform_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform CSV data by applying configured transformations.
        
        Default implementation performs type conversion based on config.
        
        Args:
            data: List of dictionaries representing CSV rows
            
        Returns:
            Transformed data with proper types
        """
        transformed_data = []
        
        # Get type conversion config
        type_conversions = self.config.get('type_conversions', {})
        
        for row in data:
            transformed_row = {}
            
            for key, value in row.items():
                # Apply type conversions if configured
                if key in type_conversions:
                    conversion_type = type_conversions[key]
                    try:
                        if conversion_type == 'int':
                            transformed_row[key] = int(value) if value else 0
                        elif conversion_type == 'float':
                            transformed_row[key] = float(value) if value else 0.0
                        elif conversion_type == 'bool':
                            transformed_row[key] = value.lower() in ('true', 'yes', '1', 'y')
                        elif conversion_type == 'date':
                            date_format = self.config.get('date_format', '%Y-%m-%d')
                            transformed_row[key] = datetime.strptime(value, date_format)
                        else:
                            # Default is string
                            transformed_row[key] = value
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Type conversion failed for {key}: {str(e)}")
                        transformed_row[key] = value
                else:
                    # No conversion specified
                    transformed_row[key] = value
            
            transformed_data.append(transformed_row)
        
        return transformed_data`;
        setValue('language', 'python');
        setValue('docType', 'class');
        break;
      case 'classCsharp':
        codeContent = `using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using System.Net.Http;

namespace LearnOmatic.Security
{
    /// <summary>
    /// Provides cryptographic services for secure data handling in the application.
    /// Implements industry-standard encryption, hashing, and secure random number generation.
    /// </summary>
    /// <remarks>
    /// This class serves as the central security provider for all cryptographic operations.
    /// It follows best practices for modern security implementations, including secure
    /// key management and algorithm selection.
    /// </remarks>
    public class SecurityProvider : ISecurityProvider, IDisposable
    {
        private readonly ILogger<SecurityProvider> _logger;
        private readonly SecurityOptions _options;
        private readonly HttpClient _httpClient;
        private readonly RandomNumberGenerator _rng;
        private bool _disposed = false;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="SecurityProvider"/> class.
        /// </summary>
        /// <param name="logger">Logger for security operations</param>
        /// <param name="options">Configuration options for security operations</param>
        /// <param name="httpClient">HTTP client for external security services</param>
        /// <exception cref="ArgumentNullException">Thrown if required dependencies are null</exception>
        public SecurityProvider(
            ILogger<SecurityProvider> logger,
            SecurityOptions options,
            HttpClient httpClient)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _rng = RandomNumberGenerator.Create();
            
            ValidateOptions();
            _logger.LogInformation("SecurityProvider initialized with key rotation interval of {Days} days", 
                _options.KeyRotationIntervalDays);
        }
        
        /// <summary>
        /// Encrypts the specified plaintext using AES encryption.
        /// </summary>
        /// <param name="plaintext">The data to encrypt</param>
        /// <param name="additionalAuthenticatedData">Optional additional authenticated data for AEAD ciphers</param>
        /// <returns>Encrypted data container with IV, ciphertext, and authentication tag</returns>
        /// <exception cref="ArgumentException">Thrown if plaintext is null or empty</exception>
        /// <exception cref="SecurityException">Thrown if encryption fails</exception>
        public async Task<EncryptedData> EncryptAsync(string plaintext, string additionalAuthenticatedData = null)
        {
            if (string.IsNullOrEmpty(plaintext))
            {
                throw new ArgumentException("Plaintext cannot be null or empty", nameof(plaintext));
            }
            
            try
            {
                // Create a new encryption key if needed or use cached one
                var encryptionKey = await GetOrCreateCurrentEncryptionKeyAsync();
                
                // Generate a random IV for each encryption operation
                byte[] iv = new byte[16];
                _rng.GetBytes(iv);
                
                byte[] plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
                byte[] encryptedBytes;
                byte[] authTag = null;
                
                // Use AES-GCM for authenticated encryption when possible
                if (_options.UseAuthenticatedEncryption)
                {
                    var result = EncryptWithAesGcm(plaintextBytes, iv, encryptionKey.KeyData, 
                        string.IsNullOrEmpty(additionalAuthenticatedData) 
                            ? null 
                            : Encoding.UTF8.GetBytes(additionalAuthenticatedData));
                            
                    encryptedBytes = result.CipherText;
                    authTag = result.AuthTag;
                }
                else
                {
                    // Fall back to AES-CBC if authenticated encryption not available/enabled
                    using var aes = Aes.Create();
                    aes.Key = encryptionKey.KeyData;
                    aes.IV = iv;
                    aes.Mode = CipherMode.CBC;
                    aes.Padding = PaddingMode.PKCS7;
                    
                    using var encryptor = aes.CreateEncryptor();
                    encryptedBytes = encryptor.TransformFinalBlock(plaintextBytes, 0, plaintextBytes.Length);
                }
                
                _logger.LogDebug("Data encrypted successfully using key with ID: {KeyId}", encryptionKey.KeyId);
                
                return new EncryptedData
                {
                    KeyId = encryptionKey.KeyId,
                    IV = Convert.ToBase64String(iv),
                    CipherText = Convert.ToBase64String(encryptedBytes),
                    AuthTag = authTag != null ? Convert.ToBase64String(authTag) : null,
                    EncryptionMethod = _options.UseAuthenticatedEncryption ? "AES-GCM" : "AES-CBC",
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex) when (
                ex is CryptographicException ||
                ex is ObjectDisposedException ||
                ex is IOException)
            {
                _logger.LogError(ex, "Encryption failed");
                throw new SecurityException("Failed to encrypt data", ex);
            }
        }
        
        /// <summary>
        /// Decrypts the specified encrypted data.
        /// </summary>
        /// <param name="encryptedData">The encrypted data container to decrypt</param>
        /// <param name="additionalAuthenticatedData">Optional additional authenticated data for AEAD ciphers</param>
        /// <returns>The original plaintext</returns>
        /// <exception cref="ArgumentNullException">Thrown if encryptedData is null</exception>
        /// <exception cref="SecurityException">Thrown if decryption fails</exception>
        public async Task<string> DecryptAsync(EncryptedData encryptedData, string additionalAuthenticatedData = null)
        {
            if (encryptedData == null)
            {
                throw new ArgumentNullException(nameof(encryptedData));
            }
            
            try
            {
                // Retrieve the key used for this encryption
                var key = await GetEncryptionKeyByIdAsync(encryptedData.KeyId);
                if (key == null)
                {
                    throw new SecurityException($"Encryption key with ID {encryptedData.KeyId} not found");
                }
                
                byte[] iv = Convert.FromBase64String(encryptedData.IV);
                byte[] cipherText = Convert.FromBase64String(encryptedData.CipherText);
                
                byte[] decryptedBytes;
                
                // Use the same encryption method that was used to encrypt
                if (encryptedData.EncryptionMethod == "AES-GCM")
                {
                    if (string.IsNullOrEmpty(encryptedData.AuthTag))
                    {
                        throw new SecurityException("Authentication tag is missing for AES-GCM decryption");
                    }
                    
                    byte[] authTag = Convert.FromBase64String(encryptedData.AuthTag);
                    
                    decryptedBytes = DecryptWithAesGcm(cipherText, iv, key.KeyData, authTag,
                        string.IsNullOrEmpty(additionalAuthenticatedData) 
                            ? null 
                            : Encoding.UTF8.GetBytes(additionalAuthenticatedData));
                }
                else
                {
                    // Default to AES-CBC
                    using var aes = Aes.Create();
                    aes.Key = key.KeyData;
                    aes.IV = iv;
                    aes.Mode = CipherMode.CBC;
                    aes.Padding = PaddingMode.PKCS7;
                    
                    using var decryptor = aes.CreateDecryptor();
                    decryptedBytes = decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
                }
                
                _logger.LogDebug("Data decrypted successfully using key with ID: {KeyId}", key.KeyId);
                
                return Encoding.UTF8.GetString(decryptedBytes);
            }
            catch (Exception ex) when (
                ex is CryptographicException ||
                ex is FormatException ||
                ex is ObjectDisposedException ||
                ex is IOException)
            {
                _logger.LogError(ex, "Decryption failed");
                throw new SecurityException("Failed to decrypt data", ex);
            }
        }
        
        /// <summary>
        /// Generates a secure random password of the specified length.
        /// </summary>
        /// <param name="length">The length of the password to generate</param>
        /// <param name="includeSpecialChars">Whether to include special characters</param>
        /// <returns>A randomly generated password</returns>
        /// <exception cref="ArgumentOutOfRangeException">Thrown if length is less than 8</exception>
        public string GenerateSecurePassword(int length = 16, bool includeSpecialChars = true)
        {
            if (length < 8)
            {
                throw new ArgumentOutOfRangeException(nameof(length), "Password length must be at least 8 characters");
            }
            
            const string uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            const string lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
            const string digitChars = "0123456789";
            const string specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?";
            
            var charGroups = new List<string> { uppercaseChars, lowercaseChars, digitChars };
            if (includeSpecialChars)
            {
                charGroups.Add(specialChars);
            }
            
            // Ensure at least one character from each group
            var password = new char[length];
            
            for (int i = 0; i < charGroups.Count && i < length; i++)
            {
                password[i] = GetRandomCharFromString(charGroups[i]);
            }
            
            // Fill the rest of the password with random chars from all groups
            string allChars = string.Join("", charGroups);
            for (int i = charGroups.Count; i < length; i++)
            {
                password[i] = GetRandomCharFromString(allChars);
            }
            
            // Shuffle the password characters
            ShuffleArray(password);
            
            return new string(password);
        }
        
        // Private helper methods
        
        private void ValidateOptions()
        {
            if (_options.KeyRotationIntervalDays <= 0)
            {
                throw new ArgumentException("Key rotation interval must be positive", nameof(_options.KeyRotationIntervalDays));
            }
            
            if (_options.KeySizeInBits != 128 && _options.KeySizeInBits != 192 && _options.KeySizeInBits != 256)
            {
                throw new ArgumentException("Key size must be 128, 192, or 256 bits", nameof(_options.KeySizeInBits));
            }
        }
        
        private async Task<EncryptionKey> GetOrCreateCurrentEncryptionKeyAsync()
        {
            // Implementation details...
            return new EncryptionKey 
            { 
                KeyId = Guid.NewGuid().ToString(), 
                KeyData = new byte[32] 
            };
        }
        
        private async Task<EncryptionKey> GetEncryptionKeyByIdAsync(string keyId)
        {
            // Implementation details...
            return new EncryptionKey 
            { 
                KeyId = keyId, 
                KeyData = new byte[32] 
            };
        }
        
        private char GetRandomCharFromString(string str)
        {
            byte[] randomByte = new byte[1];
            _rng.GetBytes(randomByte);
            int index = randomByte[0] % str.Length;
            return str[index];
        }
        
        private void ShuffleArray<T>(T[] array)
        {
            int n = array.Length;
            while (n > 1)
            {
                byte[] randomBytes = new byte[1];
                _rng.GetBytes(randomBytes);
                int k = randomBytes[0] % n;
                n--;
                T temp = array[n];
                array[n] = array[k];
                array[k] = temp;
            }
        }
        
        protected virtual void Dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    _rng.Dispose();
                }
                
                _disposed = true;
            }
        }
        
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }
    }
}`;
        setValue('language', 'csharp');
        setValue('docType', 'class');
        break;
      case 'readme':
        codeContent = `Project: LearnOmatic - AI-Powered Learning and Documentation Assistant

This web application helps users understand complex technical concepts and generate documentation for their code. It integrates with OpenAI's API to provide AI-powered explanations and documentation generation.

Features:
- AI Concept Explainer: Explains technical topics with examples
- Documentation Generator: Creates documentation for code
- Authentication system
- Responsive design for all devices`;
        setValue('language', '');
        setValue('docType', 'readme');
        break;
    }
    
    // Set the editor value after setting form values
    setValue('codeSnippet', codeContent);
    setEditorValue(codeContent);
  };

  const placeholderText = docType === 'readme' 
    ? 'Enter a project description or overview here...' 
    : 'Paste your code here...';

  // Helper to validate GitHub URL
  const validateGithubUrl = (url: string): boolean => {
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubRegex.test(url);
  };

  // Function to analyze GitHub repository
  const analyzeGitHubRepo = async (url: string) => {
    if (!validateGithubUrl(url)) {
      toast.error('Please enter a valid GitHub repository URL');
      return;
    }

    setIsAnalyzingRepo(true);
    try {
      // Extract owner and repo from URL
      const urlParts = url.replace(/\/$/, '').split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      
      toast.info(`Analyzing repository: ${owner}/${repo}...`);
      
      // Fetch repository structure (in real implementation, you would call your backend API)
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
      if (!response.ok) {
        throw new Error('Failed to fetch repository contents');
      }
      
      const data = await response.json();
      setRepoStructure(data);
      
      // Extract file list - prioritize key files like README, package.json, etc.
      const keyFiles = data
        .filter((item: any) => !item.name.startsWith('.') && item.type === 'file')
        .map((item: any) => item.name);
      
      setRepoFiles(keyFiles);
      
      // Update the form with the repository structure summary
      setValue('codeSnippet', 
        `GitHub Repository: ${owner}/${repo}\n\n` +
        `Key files found: ${keyFiles.join(', ')}\n\n` +
        `This repository will be analyzed for documentation generation.`
      );
      setEditorValue(getValues('codeSnippet'));
      
      toast.success('Repository structure analyzed successfully');
    } catch (error) {
      console.error('Error analyzing repository:', error);
      toast.error('Failed to analyze GitHub repository');
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

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
                          onValueChange={(value) => setValue('docType', value as DocType)}
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
                          <div>
                        <RadioGroupItem value="github" id="github" className="peer sr-only" />
                            <Label
                              htmlFor="github"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="mb-2 h-5 w-5" 
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                              </svg>
                          <span>GitHub</span>
                            </Label>
                          </div>
                          <div>
                        <RadioGroupItem value="api" id="api" className="peer sr-only" />
                            <Label
                              htmlFor="api"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="mb-2 h-5 w-5" 
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                              </svg>
                          <span>API</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      {docType !== 'readme' && docType !== 'github' && docType !== 'api' && (
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
                      
                      {docType === 'github' && (
                      <div>
                          <Label htmlFor="githubUrl">GitHub Repository URL</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              id="githubUrl"
                              placeholder="https://github.com/username/repository"
                              className="flex-1 bg-background px-3 py-2 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                              {...register('githubUrl', { 
                                required: 'GitHub URL is required',
                                pattern: {
                                  value: /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/,
                                  message: 'Please enter a valid GitHub repository URL'
                                }
                              })}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => analyzeGitHubRepo(githubUrl)}
                              disabled={isAnalyzingRepo || !githubUrl}
                              className="whitespace-nowrap"
                            >
                              {isAnalyzingRepo ? (
                                <>
                                  <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin mr-2"></div>
                                  Analyzing...
                                </>
                              ) : 'Analyze Repo'}
                            </Button>
                          </div>
                          {errors.githubUrl && (
                            <p className="text-destructive text-sm mt-1">{errors.githubUrl.message}</p>
                          )}
                          
                          <Alert className="mt-3 bg-muted/30">
                            <AlertDescription className="text-xs">
                              Enter a GitHub repository URL and click "Analyze Repo" to fetch project structure.
                              The AI will analyze the repository files to create comprehensive documentation.
                            </AlertDescription>
                          </Alert>
                          
                          {repoFiles.length > 0 && (
                            <div className="mt-3 p-3 bg-muted/20 rounded-md">
                              <p className="text-sm font-medium mb-1">Repository Files:</p>
                              <div className="flex flex-wrap gap-1">
                                {repoFiles.map((file, index) => (
                                  <span key={index} className="px-2 py-1 bg-primary/10 text-xs rounded-md">
                                    {file}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                These files will be included in the documentation generation. 
                                Add any specific details or focus areas in the "Repository Overview" field below.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {docType === 'api' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>API Endpoints</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newEndpoint: ApiEndpoint = {
                                  id: `endpoint-${Date.now()}`,
                                  method: 'GET',
                                  path: '',
                                  description: '',
                                  requestParams: [],
                                  responseFields: []
                                };
                                setApiEndpoints([...apiEndpoints, newEndpoint]);
                                setValue('apiEndpoints', [...apiEndpoints, newEndpoint]);
                                setCurrentApiEndpoint(newEndpoint);
                              }}
                              className="gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                              Add Endpoint
                            </Button>
                          </div>
                          
                          {apiEndpoints.length === 0 ? (
                            <div className="p-6 border border-dashed border-muted rounded-md flex flex-col items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              <p className="text-sm text-muted-foreground">Click "Add Endpoint" to start building your API documentation</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {apiEndpoints.map((endpoint) => (
                                  <button
                                    key={endpoint.id}
                                    type="button"
                                    className={`px-3 py-1 rounded-md text-xs ${
                                      currentApiEndpoint?.id === endpoint.id 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted hover:bg-muted/80'
                                    }`}
                                    onClick={() => setCurrentApiEndpoint(endpoint)}
                                  >
                                    <span className={endpoint.method === 'GET' ? 'text-green-500' : 
                                            endpoint.method === 'POST' ? 'text-blue-500' :
                                            endpoint.method === 'PUT' ? 'text-yellow-500' :
                                            endpoint.method === 'DELETE' ? 'text-red-500' : 'text-purple-500'}>
                                      {endpoint.method}
                                    </span>
                                    {' '}
                                    {endpoint.path || '/path'}
                                  </button>
                                ))}
                              </div>
                              
                              {currentApiEndpoint && (
                                <div className="p-4 border border-input rounded-md">
                                  <h4 className="text-sm font-medium mb-3">Edit Endpoint</h4>
                                  <div className="grid grid-cols-4 gap-3">
                                    <div>
                                      <Label htmlFor="method" className="text-xs">Method</Label>
                                      <Select
                                        value={currentApiEndpoint.method}
                                        onValueChange={(value) => {
                                          const updated = apiEndpoints.map(ep => 
                                            ep.id === currentApiEndpoint.id ? {...ep, method: value as any} : ep
                                          );
                                          setApiEndpoints(updated);
                                          setValue('apiEndpoints', updated);
                                          setCurrentApiEndpoint({...currentApiEndpoint, method: value as any});
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="GET">GET</SelectItem>
                                          <SelectItem value="POST">POST</SelectItem>
                                          <SelectItem value="PUT">PUT</SelectItem>
                                          <SelectItem value="DELETE">DELETE</SelectItem>
                                          <SelectItem value="PATCH">PATCH</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-3">
                                      <Label htmlFor="path" className="text-xs">Path</Label>
                                      <input
                                        type="text"
                                        id="path"
                                        placeholder="/api/resource/{id}"
                                        value={currentApiEndpoint.path}
                                        onChange={(e) => {
                                          const updated = apiEndpoints.map(ep => 
                                            ep.id === currentApiEndpoint.id ? {...ep, path: e.target.value} : ep
                                          );
                                          setApiEndpoints(updated);
                                          setValue('apiEndpoints', updated);
                                          setCurrentApiEndpoint({...currentApiEndpoint, path: e.target.value});
                                        }}
                                        className="w-full px-3 py-1 h-8 text-xs rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                    </div>
                                    <div className="col-span-4">
                                      <Label htmlFor="description" className="text-xs">Description</Label>
                                      <Textarea
                                        id="description"
                                        placeholder="Describe what this endpoint does..."
                                        value={currentApiEndpoint.description}
                                        onChange={(e) => {
                                          const updated = apiEndpoints.map(ep => 
                                            ep.id === currentApiEndpoint.id ? {...ep, description: e.target.value} : ep
                                          );
                                          setApiEndpoints(updated);
                                          setValue('apiEndpoints', updated);
                                          setCurrentApiEndpoint({...currentApiEndpoint, description: e.target.value});
                                        }}
                                        className="resize-none h-16 text-xs"
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Parameters section */}
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <Label className="text-xs">Request Parameters</Label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => {
                                          const newParam = {
                                            id: `param-${Date.now()}`,
                                            name: '',
                                            type: 'string',
                                            description: '',
                                            required: false
                                          };
                                          const updatedParams = [
                                            ...(currentApiEndpoint.requestParams || []),
                                            newParam
                                          ];
                                          const updated = apiEndpoints.map(ep => 
                                            ep.id === currentApiEndpoint.id 
                                              ? {...ep, requestParams: updatedParams} 
                                              : ep
                                          );
                                          setApiEndpoints(updated);
                                          setValue('apiEndpoints', updated);
                                          setCurrentApiEndpoint({
                                            ...currentApiEndpoint, 
                                            requestParams: updatedParams
                                          });
                                        }}
                                      >
                                        + Add Parameter
                                      </Button>
                                    </div>
                                    
                                    {(!currentApiEndpoint.requestParams || currentApiEndpoint.requestParams.length === 0) && (
                                      <p className="text-xs text-muted-foreground italic">No parameters defined</p>
                                    )}
                                    
                                    <div className="space-y-2">
                                      {currentApiEndpoint.requestParams?.map((param, index) => (
                                        <div key={param.id} className="grid grid-cols-12 gap-2 items-center text-xs p-2 bg-muted/30 rounded-md">
                                          <div className="col-span-3">
                                            <input
                                              type="text"
                                              placeholder="Name"
                                              value={param.name}
                                              onChange={(e) => {
                                                const updatedParams = [...(currentApiEndpoint.requestParams || [])];
                                                updatedParams[index] = {...param, name: e.target.value};
                                                
                                                const updated = apiEndpoints.map(ep => 
                                                  ep.id === currentApiEndpoint.id 
                                                    ? {...ep, requestParams: updatedParams} 
                                                    : ep
                                                );
                                                setApiEndpoints(updated);
                                                setValue('apiEndpoints', updated);
                                                setCurrentApiEndpoint({
                                                  ...currentApiEndpoint, 
                                                  requestParams: updatedParams
                                                });
                                              }}
                                              className="w-full px-2 py-1 h-6 text-xs rounded-sm border border-input bg-transparent"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <select
                                              value={param.type}
                                              onChange={(e) => {
                                                const updatedParams = [...(currentApiEndpoint.requestParams || [])];
                                                updatedParams[index] = {...param, type: e.target.value};
                                                
                                                const updated = apiEndpoints.map(ep => 
                                                  ep.id === currentApiEndpoint.id 
                                                    ? {...ep, requestParams: updatedParams} 
                                                    : ep
                                                );
                                                setApiEndpoints(updated);
                                                setValue('apiEndpoints', updated);
                                                setCurrentApiEndpoint({
                                                  ...currentApiEndpoint, 
                                                  requestParams: updatedParams
                                                });
                                              }}
                                              className="w-full px-1 py-0 h-6 text-xs rounded-sm border border-input bg-transparent"
                                            >
                                              <option value="string">string</option>
                                              <option value="number">number</option>
                                              <option value="boolean">boolean</option>
                                              <option value="object">object</option>
                                              <option value="array">array</option>
                                            </select>
                                          </div>
                                          <div className="col-span-5">
                                            <input
                                              type="text"
                                              placeholder="Description"
                                              value={param.description}
                                              onChange={(e) => {
                                                const updatedParams = [...(currentApiEndpoint.requestParams || [])];
                                                updatedParams[index] = {...param, description: e.target.value};
                                                
                                                const updated = apiEndpoints.map(ep => 
                                                  ep.id === currentApiEndpoint.id 
                                                    ? {...ep, requestParams: updatedParams} 
                                                    : ep
                                                );
                                                setApiEndpoints(updated);
                                                setValue('apiEndpoints', updated);
                                                setCurrentApiEndpoint({
                                                  ...currentApiEndpoint, 
                                                  requestParams: updatedParams
                                                });
                                              }}
                                              className="w-full px-2 py-1 h-6 text-xs rounded-sm border border-input bg-transparent"
                                            />
                                          </div>
                                          <div className="col-span-1 flex items-center">
                                            <input
                                              type="checkbox"
                                              checked={param.required}
                                              onChange={(e) => {
                                                const updatedParams = [...(currentApiEndpoint.requestParams || [])];
                                                updatedParams[index] = {...param, required: e.target.checked};
                                                
                                                const updated = apiEndpoints.map(ep => 
                                                  ep.id === currentApiEndpoint.id 
                                                    ? {...ep, requestParams: updatedParams} 
                                                    : ep
                                                );
                                                setApiEndpoints(updated);
                                                setValue('apiEndpoints', updated);
                                                setCurrentApiEndpoint({
                                                  ...currentApiEndpoint, 
                                                  requestParams: updatedParams
                                                });
                                              }}
                                              className="h-3 w-3"
                                            />
                                            <span className="ml-1">Req</span>
                                          </div>
                                          <div className="col-span-1 text-right">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedParams = (currentApiEndpoint.requestParams || [])
                                                  .filter(p => p.id !== param.id);
                                                  
                                                const updated = apiEndpoints.map(ep => 
                                                  ep.id === currentApiEndpoint.id 
                                                    ? {...ep, requestParams: updatedParams} 
                                                    : ep
                                                );
                                                setApiEndpoints(updated);
                                                setValue('apiEndpoints', updated);
                                                setCurrentApiEndpoint({
                                                  ...currentApiEndpoint, 
                                                  requestParams: updatedParams
                                                });
                                              }}
                                              className="text-destructive hover:text-destructive/80"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label htmlFor="codeSnippet">
                          {docType === 'readme' ? 'Project Description' : 
                           docType === 'github' ? 'Repository Overview' :
                           docType === 'api' ? 'Additional Notes' : 'Code Snippet'}
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
                    <div className={`code-editor-container border border-input overflow-hidden ${docType === 'readme' ? '' : 'bg-[#1e1e1e]'}`}>
                      {docType === 'readme' ? (
                        <Textarea
                          id="codeSnippet"
                          placeholder={placeholderText}
                          className="min-h-32 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-transparent resize-y"
                          {...register('codeSnippet', { required: 'This field is required' })}
                        />
                      ) : (
                        <div className="code-editor" ref={editorRef}>
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
                              placeholder={placeholderText}
                              textareaClassName="editor-textarea-element"
                              className="min-h-[250px] w-full focus:outline-none"
                              onPaste={e => {
                                const text = e.clipboardData.getData('text/plain');
                                handleCodeChange(text);
                              }}
                              textareaId="documentation-editor-textarea"
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
                      )}
                    </div>
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
                      onClick={() => loadExample('classPython')}>
                    Python Class Example
                  </li>
                  <li className="p-2 bg-primary/5 rounded-md hover:bg-primary/10 cursor-pointer transition-colors"
                      onClick={() => loadExample('classCsharp')}>
                    C# Class Example
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
              {documentation && (
                <div>
                  <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm mb-4 p-4 flex gap-3 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={exportToMarkdown}
                      disabled={exportLoading.markdown || !documentation}
                    >
                      {exportLoading.markdown ? (
                        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin mr-1"></div>
                      ) : (
                        <FileDown size={16} />
                      )}
                      <span>Export as Markdown</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={exportToPDF}
                      disabled={exportLoading.pdf || !documentation}
                    >
                      {exportLoading.pdf ? (
                        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin mr-1"></div>
                      ) : (
                        <Download size={16} />
                      )}
                      <span>Export as PDF</span>
                    </Button>
                  </div>
                  <div ref={documentationRef}>
              <ExplanationResult content={documentation} isLoading={isLoading} />
                  </div>
                </div>
              )}
              
              {isLoading && (
                <GlassCard className="p-8">
                  <div className="flex flex-col items-center justify-center mb-8">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full border-4 border-primary/30 mb-4"></div>
                      <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-t-primary border-l-primary border-r-transparent border-b-transparent animate-spin"></div>
                      <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-b-primary border-r-primary animate-spin animation-delay-500" style={{ animationDuration: '2s' }}></div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-lg font-medium">Generating Comprehensive Documentation</h3>
                      <p className="text-sm text-muted-foreground mt-1">AI is analyzing your code and creating detailed documentation...</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Documentation Header */}
                    <div className="space-y-2">
                      <div className="h-8 bg-primary/10 rounded-md animate-pulse w-2/3 mx-auto"></div>
                      <div className="flex justify-center gap-3 my-3">
                        <div className="h-5 w-24 bg-muted/30 rounded-full animate-pulse"></div>
                        <div className="h-5 w-24 bg-muted/30 rounded-full animate-pulse"></div>
                      </div>
                      <div className="h-px bg-border w-full my-4"></div>
                    </div>
                    
                    {/* Overview Section */}
                    <div className="space-y-3">
                      <div className="h-6 bg-primary/10 rounded-md animate-pulse w-1/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted/30 rounded-md animate-pulse w-full"></div>
                        <div className="h-4 bg-muted/30 rounded-md animate-pulse w-11/12"></div>
                        <div className="h-4 bg-muted/30 rounded-md animate-pulse w-3/4"></div>
                      </div>
                    </div>
                    
                    {/* Parameters Section */}
                    <div className="space-y-3">
                      <div className="h-6 bg-primary/10 rounded-md animate-pulse w-1/4"></div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-5 w-1/4 bg-muted/40 rounded-md animate-pulse"></div>
                          <div className="h-5 w-2/3 bg-muted/30 rounded-md animate-pulse"></div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-5 w-1/4 bg-muted/40 rounded-md animate-pulse"></div>
                          <div className="h-5 w-1/2 bg-muted/30 rounded-md animate-pulse"></div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-5 w-1/4 bg-muted/40 rounded-md animate-pulse"></div>
                          <div className="h-5 w-3/5 bg-muted/30 rounded-md animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Code Example */}
                    <div className="p-4 border border-muted rounded-md bg-muted/5">
                      <div className="h-5 w-1/3 bg-primary/10 rounded-md animate-pulse mb-3"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted/20 rounded-md animate-pulse w-full"></div>
                        <div className="h-4 bg-muted/20 rounded-md animate-pulse w-11/12"></div>
                        <div className="ml-4 h-4 bg-muted/20 rounded-md animate-pulse w-10/12"></div>
                        <div className="ml-4 h-4 bg-muted/20 rounded-md animate-pulse w-11/12"></div>
                        <div className="ml-8 h-4 bg-muted/20 rounded-md animate-pulse w-9/12"></div>
                        <div className="h-4 bg-muted/20 rounded-md animate-pulse w-1/2"></div>
                      </div>
                    </div>
                    
                    {/* Returns Section */}
                    <div className="space-y-3">
                      <div className="h-6 bg-primary/10 rounded-md animate-pulse w-1/5"></div>
                      <div className="h-4 bg-muted/30 rounded-md animate-pulse w-full"></div>
                      <div className="h-4 bg-muted/30 rounded-md animate-pulse w-10/12"></div>
                    </div>
                  </div>
                </GlassCard>
              )}
              
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

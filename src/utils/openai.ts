// IMPORTANT: This API key should be stored in a secure environment variable on the server
// Using a key directly in the client side is for demonstration purposes only
// In a production application, you should use a backend service to make API calls

import { supabase } from '@/integrations/supabase/client';

interface OpenAIRequestOptions {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
}

export interface AIExplanationResponse {
  content: string;
  loading: boolean;
  error: string | null;
}

class OpenAIService {
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    // Save to session storage to persist during the session
    // Note: This is still not secure for production
    sessionStorage.setItem('openai_key', key);
  }

  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = sessionStorage.getItem('openai_key');
    }
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    sessionStorage.removeItem('openai_key');
  }

  async fetchApiKeyFromSupabase(): Promise<string | null> {
    try {
      // Fetch the first API key from the 'keys' table
      // Using 'any' type to bypass type checking as we know our table structure
      const { data, error } = await (supabase as any)
        .from('keys')
        .select('key_value')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching API key from Supabase:', error);
        return null;
      }

      if (data && data.key_value) {
        // Save the fetched key
        this.setApiKey(data.key_value);
        return data.key_value;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch API key:', error);
      return null;
    }
  }

  async ensureApiKey(): Promise<string | null> {
    // Check if we already have a key
    let key = this.getApiKey();
    
    // If not, try to fetch from Supabase
    if (!key) {
      key = await this.fetchApiKeyFromSupabase();
    }
    
    return key;
  }

  async generateExplanation(
    topic: string, 
    includeCode: boolean = false, 
    programmingLanguage: string = ''
  ): Promise<string> {
    // Try to ensure we have an API key
    const apiKey = await this.ensureApiKey();
    
    if (!apiKey) {
      throw new Error('API key not found in database. Please contact your administrator.');
    }

    let systemPrompt = `You are an expert teacher who explains technical concepts clearly, comprehensively, and with visual appeal. 
    Create an in-depth, well-structured explanation that would help someone truly understand the topic from the ground up.
    
    Structure your response with these elements:
    1. Begin with a 📌 **Quick Summary**: A concise overview of the concept (1-2 sentences)
    2. 📚 **Introduction**: Provide context and the importance of the concept
    3. 🧩 **Core Concepts**: Break down the fundamental components
    4. 🔄 **How It Works**: Explain the underlying mechanisms or processes
    5. 💡 **Key Principles**: List important guiding principles or rules
    6. ⚙️ **Practical Applications**: Real-world examples and use cases
    7. 🚀 **Best Practices**: Include tips and recommendations
    8. 🔗 **Related Concepts**: Briefly mention closely related topics
    9. 📝 **Summary**: Wrap up with key takeaways
    
    Use rich markdown formatting to make your explanation visually engaging:
    - Use emoji icons (like 📊, 🔍, 📈, 🛠️, etc.) to highlight sections
    - Create H2 and H3 headings for clear organization
    - Use bulleted and numbered lists where appropriate
    - Include **bold** and *italic* text for emphasis
    - Use > blockquotes for important notes or quotes
    - Add horizontal rules (---) to separate major sections
    - Format tables using markdown when presenting comparative information
    - Use inline formatting to highlight terms`;
    
    if (includeCode) {
      systemPrompt += `\n\nInclude multiple practical code examples in ${programmingLanguage || 'a relevant programming language'} 
      to demonstrate the concept in action. Format all code with properly syntax-highlighted markdown code blocks.
      Show both simple, foundational examples and more complex, real-world applications.
      Add comments in the code to explain what each section does.`;
    }

    const options: OpenAIRequestOptions = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Explain this technical concept in detail: ${topic}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate explanation');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error generating explanation: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }

  async generateDocumentation(
    codeSnippet: string,
    language: string,
    docType: 'function' | 'class' | 'readme' = 'function'
  ): Promise<string> {
    // Try to ensure we have an API key
    const apiKey = await this.ensureApiKey();
    
    if (!apiKey) {
      throw new Error('API key not found in database. Please contact your administrator.');
    }

    let systemPrompt = `You are an expert documentation writer who creates comprehensive, visually appealing, and highly professional documentation.`;
    
    if (docType === 'readme') {
      systemPrompt += `
      Generate a detailed README.md file for the provided project with exceptional formatting and organization.
      
      Structure your README with:
      
      # 📚 Project Name
      
      ## 📋 Overview
      Provide a compelling and clear description of the project.
      
      ## ✨ Features
      Create a comprehensive list of features with emoji icons for each major feature.
      
      ## 🚀 Installation
      List detailed installation steps with code blocks for all commands.
      
      ## 🔧 Configuration
      Explain any configuration options with examples.
      
      ## 📊 Usage Examples
      Provide multiple usage examples with code blocks and explanations.
      
      ## 📘 API Reference
      For libraries/frameworks, include a detailed API reference with parameters, return values, and examples.
      
      ## 🧩 Architecture
      Include a section on architecture with a text-based diagram if relevant.
      
      ## 🔒 Security Considerations
      Note any security best practices or considerations.
      
      ## 🧪 Testing
      Explain how to run tests with examples.
      
      ## 🤝 Contributing
      Guidelines for contributors.
      
      ## 📝 License
      License information.
      
      Use rich markdown formatting throughout, including:
      - Emojis for section headers and list items
      - Tables for comparing options or features
      - Code blocks with language-specific syntax highlighting
      - Blockquotes for important notes
      - Bold and italic text for emphasis
      - Horizontal rules to separate major sections
      `;
    } else if (docType === 'class') {
      systemPrompt += `
      Generate exceptional class documentation for the provided ${language} code with a professional structure and visual appeal.
      
      Structure your documentation with:
      
      # 📦 ClassName
      
      ## 📋 Overview
      A clear, comprehensive description of the class purpose and responsibility.
      
      ## 🔍 Class Diagram
      Create a text-based representation of the class structure.
      
      ## 🏗️ Constructor(s)
      Document each constructor with:
      - Parameters (types, default values, and descriptions)
      - Examples of instantiation
      
      ## 🔧 Properties
      For each property:
      - Type information
      - Default value
      - Description
      - Access modifier (public, private, protected)
      - Usage examples
      
      ## ⚙️ Methods
      For each method:
      - Signature with parameter types and return type
      - Detailed description
      - Parameter descriptions
      - Return value explanation
      - Example usage
      - Edge cases and error handling
      - Performance considerations if applicable
      
      ## 🔄 Lifecycle Methods
      Document any lifecycle methods and when they're called.
      
      ## 💡 Usage Examples
      Multiple real-world usage examples with code blocks and explanations.
      
      ## ⚠️ Exceptions
      Document possible exceptions and how to handle them.
      
      ## 🔗 Related Classes
      Mention related classes and their relationships.
      
      Use rich markdown formatting throughout including emojis, tables, code blocks with syntax highlighting, blockquotes for notes, and appropriate text formatting.
      `;
    } else { // function documentation
      systemPrompt += `
      Generate exceptional function documentation for the provided ${language} code with a professional structure and visual appeal.
      
      Structure your documentation with:
      
      # 🔧 functionName()
      
      ## 📋 Purpose
      A clear, comprehensive description of what the function does and why it exists.
      
      ## 📝 Syntax
      Show the complete function signature with parameter types and return type.
      
      ## 📥 Parameters
      For each parameter:
      - Type information
      - Description
      - Default values
      - Validation rules
      - Required vs. optional status
      
      ## 📤 Return Value
      Detailed explanation of the return value(s) including:
      - Type information
      - Structure (for objects/arrays)
      - Possible values
      - Examples
      
      ## 🔄 Behavior
      Explain the step-by-step behavior of the function and any algorithms used.
      
      ## 💡 Examples
      Multiple usage examples with code blocks and explanations covering:
      - Basic usage
      - Edge cases
      - Error handling
      
      ## ⚠️ Exceptions
      Document any errors that might be thrown and how to handle them.
      
      ## 🔍 Edge Cases
      Document behavior for edge cases like empty inputs, large inputs, etc.
      
      ## ⚡ Performance
      Note any performance considerations or optimizations.
      
      ## 🔗 Related Functions
      List related functions that are commonly used with this one.
      
      Use rich markdown formatting throughout including emojis, tables, code blocks with syntax highlighting, blockquotes for notes, and appropriate text formatting.
      `;
    }

    const options: OpenAIRequestOptions = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: docType === 'readme' 
            ? `Create a comprehensive README.md file for my project with this description: ${codeSnippet}`
            : `Generate professional documentation for this ${language} ${docType}: ${codeSnippet}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate documentation');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error generating documentation: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }
}

// Create a singleton instance
const openAIService = new OpenAIService();
export default openAIService;

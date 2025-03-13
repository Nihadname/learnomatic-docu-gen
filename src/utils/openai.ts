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
  response_format?: {
    type: 'json_object' | 'text';
  };
}

export interface AIExplanationResponse {
  content: string;
  loading: boolean;
  error: string | null;
}

export interface DiagramResult {
  mermaidCode: string;
  explanation: string;
  title: string;
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
    
    Structure your response with these interactive and visually appealing elements:
    1. Begin with a 📌 **Quick Summary**: A concise overview of the concept (1-2 sentences)
    2. 📚 **Introduction**: Provide context and the importance of the concept
    3. 🔍 **Real-World Analogy**: Create a compelling, relatable analogy that helps visualize the concept
    4. 🧩 **Core Concepts**: Break down the fundamental components with visual descriptions
    5. 🔄 **How It Works**: Explain the underlying mechanisms as a step-by-step process
    6. 💡 **Key Principles**: List important guiding principles or rules
    7. 🌟 **Case Study**: Provide a detailed, real-world example of the concept in action
    8. ⚙️ **Practical Applications**: Include 3-5 concrete, industry-specific applications with examples
    9. 🚀 **Best Practices**: Include tips and recommendations
    10. ❓ **Common Questions**: Address 3-5 frequently asked questions about the topic
    11. 🔗 **Related Concepts**: Create a mind map of related topics
    12. 📝 **Interactive Quiz**: Include 3 quiz questions to test understanding (provide answers in a spoiler section)
    13. 📈 **Summary**: Wrap up with key takeaways
    
    Use rich visual markdown formatting to make your explanation engaging:
    - Use emoji icons (like 📊, 🔍, 📈, 🛠️, etc.) to highlight sections and important points
    - Create H2 and H3 headings for clear organization
    - Create ASCII diagrams or flowcharts where helpful to visualize processes
    - Use bulleted and numbered lists for clarity
    - Include **bold** and *italic* text for emphasis
    - Use > blockquotes for important notes, quotes, or callouts
    - Add horizontal rules (---) to separate major sections
    - Format tables using markdown when presenting comparative information
    - Use inline formatting to highlight key terms
    - Add "spoiler" sections for quiz answers using HTML details/summary tags
    
    IMPORTANT: Your explanation should feel interactive and engaging, making complex concepts accessible through visual elements, stories, and real-world examples that people can relate to.`;
    
    if (includeCode) {
      systemPrompt += `\n\nInclude multiple practical code examples in ${programmingLanguage || 'a relevant programming language'} 
      to demonstrate the concept in action. Format all code with properly syntax-highlighted markdown code blocks.
      Show a progression of examples:
      1. A simple, foundational example for beginners
      2. An intermediate example that builds on the basic concepts
      3. A complex, real-world application that demonstrates professional usage
      
      Add detailed comments in the code to explain what each section does.
      
      For each code example:
      - Explain what problem it solves
      - Highlight key patterns or techniques used
      - Mention potential pitfalls or edge cases
      - Where appropriate, suggest how the code could be extended or improved`;
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
          content: `Explain this technical concept in detail with vivid real-world examples and interactive elements: ${topic}`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
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

  async reviewCode(
    codeSnippet: string,
    language: string,
    reviewType: 'bugs' | 'performance' | 'style' | 'comprehensive',
    generateFixedCode: boolean = false
  ): Promise<any> {
    // Try to ensure we have an API key
    const apiKey = await this.ensureApiKey();
    
    if (!apiKey) {
      throw new Error('API key not found in database. Please contact your administrator.');
    }

    let systemPrompt = `You are an expert code reviewer who specializes in identifying issues, suggesting improvements, and evaluating code quality.
    Your task is to review the provided code snippet and provide a detailed analysis with a focus on ${reviewType === 'comprehensive' ? 'all aspects' : reviewType}.
    
    Analyze the code for:
    ${reviewType === 'bugs' || reviewType === 'comprehensive' ? 
      '- Bugs and potential runtime errors\n- Edge cases that are not handled\n- Logical errors and incorrect behavior\n- Security vulnerabilities\n- Null reference exceptions and type errors' : ''}
    ${reviewType === 'performance' || reviewType === 'comprehensive' ? 
      '- Performance bottlenecks\n- Inefficient algorithms or data structures\n- Unnecessary computations or operations\n- Memory leaks or excessive memory usage\n- Resource management issues' : ''}
    ${reviewType === 'style' || reviewType === 'comprehensive' ? 
      '- Code style and formatting issues\n- Naming conventions and readability\n- Documentation and comments\n- Code organization and structure\n- Adherence to best practices for the language' : ''}
    
    Provide your response in a structured JSON format with these fields:
    {
      "summary": "A concise summary of the overall code quality and main issues",
      "issues": [
        {
          "type": "error" | "warning" | "suggestion",
          "line": <line number>,
          "message": "Description of the issue",
          "fix": "Suggested fix or code snippet to resolve the issue"
        }
      ],
      "improvements": ["List of general improvement suggestions"],
      "score": <numerical score from 0-100>${generateFixedCode ? ',\n      "fixedCode": "The complete fixed code with all issues resolved"' : ''}
    }
    
    Make sure every identified issue has an accurate line number reference and a specific, actionable suggestion for fixing it.
    Keep explanations clear and educational so the developer can learn from your feedback.${generateFixedCode ? '\n\nImportantly, since you are asked to provide the complete fixed code, make sure to apply all the suggested fixes and improvements to create a cleaned up, optimized version of the original code in the "fixedCode" field.' : ''}`;

    const options: OpenAIRequestOptions = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Review this ${language} code with a focus on ${reviewType}:\n\n${codeSnippet}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" }
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
        throw new Error(errorData.error?.message || 'Failed to review code');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      try {
        const reviewResult = JSON.parse(content);
        return reviewResult;
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Failed to parse code review results');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error reviewing code: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }

  async generateDiagram(
    codeOrDescription: string,
    diagramType: 'flowchart' | 'class' | 'er' | 'sequence',
    language: string = ''
  ): Promise<DiagramResult> {
    // Try to ensure we have an API key
    const apiKey = await this.ensureApiKey();
    
    if (!apiKey) {
      throw new Error('API key not found in database. Please contact your administrator.');
    }

    let systemPrompt = `You are an expert software architect who excels at creating visual diagrams from code or textual descriptions.
    Your task is to analyze the provided code or description and generate a ${diagramType} diagram using Mermaid syntax.
    
    Based on the input, create a detailed, well-structured diagram that accurately represents the ${diagramType === 'flowchart' ? 'process flow' : 
      diagramType === 'class' ? 'classes and their relationships' :
      diagramType === 'er' ? 'entities and their relationships' : 'sequence of interactions'}.
    
    Follow these guidelines:
    - Use proper Mermaid syntax for ${diagramType} diagrams
    - Create a clear, organized visual layout
    - Include all relevant ${diagramType === 'flowchart' ? 'steps and decision points' : 
      diagramType === 'class' ? 'classes, methods, properties, and relationships' :
      diagramType === 'er' ? 'entities, attributes, and relationships' : 'actors, actions, and messages'}
    - Add appropriate labels and annotations
    - Use styling to improve readability (colors, shapes, etc.)
    - Keep the diagram focused and avoid excessive complexity
    
    Your response should be in JSON format with the following structure:
    {
      "title": "A descriptive title for the diagram",
      "mermaidCode": "The complete Mermaid syntax for the diagram",
      "explanation": "A brief explanation of the diagram and key elements"
    }
    
    The mermaidCode should be complete and valid Mermaid syntax that can be rendered directly.`;

    const options: OpenAIRequestOptions = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate a ${diagramType} diagram for this ${language} ${diagramType === 'flowchart' ? 'process' : 
            diagramType === 'class' ? 'class structure' :
            diagramType === 'er' ? 'data model' : 'interaction sequence'}:\n\n${codeOrDescription}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" }
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
        throw new Error(errorData.error?.message || 'Failed to generate diagram');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      try {
        const diagramResult: DiagramResult = JSON.parse(content);
        return diagramResult;
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Failed to parse diagram results');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error generating diagram: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }
}

// Create a singleton instance
const openAIService = new OpenAIService();
export default openAIService;

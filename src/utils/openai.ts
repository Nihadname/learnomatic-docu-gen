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

    let systemPrompt = `You are an expert teacher who explains technical concepts clearly and concisely. 
    Explain the concept in a way that's easy to understand but technically accurate. 
    Use markdown formatting to organize your response with headings, lists, and emphasis.`;
    
    if (includeCode) {
      systemPrompt += ` Include practical code examples in ${programmingLanguage || 'a relevant programming language'} 
      to demonstrate the concept. Make sure to format the code examples properly with markdown code blocks.`;
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
          content: `Explain this technical concept: ${topic}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
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

    let systemPrompt = `You are an expert documentation writer who creates clear, concise, and helpful documentation.`;
    
    if (docType === 'readme') {
      systemPrompt += ` Generate a comprehensive README.md file for the provided project, including sections for installation, usage, API reference, and examples. Use proper markdown formatting.`;
    } else {
      systemPrompt += ` Generate professional documentation for the provided ${docType} in ${language}. Include parameter descriptions, return values, examples, and any important notes. Use proper markdown formatting.`;
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
            ? `Create a README.md file for my project with this description: ${codeSnippet}`
            : `Generate documentation for this ${language} ${docType}: ${codeSnippet}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1500
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

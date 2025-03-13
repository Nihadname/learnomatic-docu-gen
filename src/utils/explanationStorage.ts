import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface SavedExplanation {
  id: string;
  user_id?: string;
  topic: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
}

/**
 * Database type definitions for our saved_explanations table
 * This is a workaround for TypeScript errors until proper Supabase types are generated
 */
type Database = {
  public: {
    Tables: {
      saved_explanations: {
        Row: SavedExplanation;
        Insert: Omit<SavedExplanation, 'id' | 'created_at' | 'updated_at'> & { 
          user_id: string;
        };
        Update: Partial<SavedExplanation>;
      };
    };
  };
};

/**
 * Fetches all saved explanations for the current user
 */
export async function fetchSavedExplanations(user: User | null): Promise<SavedExplanation[]> {
  if (!user) {
    // If not logged in, return empty array
    return [];
  }

  try {
    // Use type assertion to work with our custom table
    const { data, error } = await (supabase as any)
      .from('saved_explanations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved explanations:', error);
      throw error;
    }

    return data as SavedExplanation[] || [];
  } catch (error) {
    console.error('Failed to fetch saved explanations:', error);
    return [];
  }
}

/**
 * Saves a new explanation to Supabase
 */
export async function saveExplanationToSupabase(
  user: User | null, 
  topic: string, 
  content: string,
  tags: string[] = []
): Promise<SavedExplanation | null> {
  if (!user) {
    throw new Error('User must be logged in to save explanations');
  }

  try {
    const newExplanation = {
      user_id: user.id,
      topic,
      content,
      tags
    };

    // Use type assertion to work with our custom table
    const { data, error } = await (supabase as any)
      .from('saved_explanations')
      .insert(newExplanation)
      .select()
      .single();

    if (error) {
      console.error('Error saving explanation:', error);
      throw error;
    }

    return data as SavedExplanation;
  } catch (error) {
    console.error('Failed to save explanation:', error);
    return null;
  }
}

/**
 * Deletes a saved explanation
 */
export async function deleteSavedExplanation(explanationId: string): Promise<boolean> {
  try {
    // Use type assertion to work with our custom table
    const { error } = await (supabase as any)
      .from('saved_explanations')
      .delete()
      .eq('id', explanationId);

    if (error) {
      console.error('Error deleting explanation:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete explanation:', error);
    return false;
  }
}

/**
 * Updates an existing explanation
 */
export async function updateSavedExplanation(
  explanationId: string,
  updates: Partial<SavedExplanation>
): Promise<SavedExplanation | null> {
  try {
    // Use type assertion to work with our custom table
    const { data, error } = await (supabase as any)
      .from('saved_explanations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', explanationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating explanation:', error);
      throw error;
    }

    return data as SavedExplanation;
  } catch (error) {
    console.error('Failed to update explanation:', error);
    return null;
  }
}

/**
 * Searches saved explanations by topic or content
 */
export async function searchSavedExplanations(
  user: User | null,
  searchTerm: string
): Promise<SavedExplanation[]> {
  if (!user) {
    return [];
  }

  try {
    // Use type assertion to work with our custom table
    const { data, error } = await (supabase as any)
      .from('saved_explanations')
      .select('*')
      .eq('user_id', user.id)
      .or(`topic.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching explanations:', error);
      throw error;
    }

    return data as SavedExplanation[] || [];
  } catch (error) {
    console.error('Failed to search explanations:', error);
    return [];
  }
}

/**
 * Fallback to localStorage if user is not logged in
 */
export function getLocalSavedExplanations(): SavedExplanation[] {
  try {
    const savedItems = localStorage.getItem('savedExplanations');
    if (savedItems) {
      return JSON.parse(savedItems);
    }
    return [];
  } catch (e) {
    console.error('Failed to parse saved explanations from localStorage', e);
    return [];
  }
}

/**
 * Save to localStorage as fallback
 */
export function saveExplanationToLocalStorage(
  topic: string,
  content: string
): SavedExplanation {
  const newExplanation: SavedExplanation = {
    id: Date.now().toString(),
    topic,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    const savedExplanations = getLocalSavedExplanations();
    const updatedExplanations = [newExplanation, ...savedExplanations];
    localStorage.setItem('savedExplanations', JSON.stringify(updatedExplanations));
    return newExplanation;
  } catch (e) {
    console.error('Failed to save explanation to localStorage', e);
    return newExplanation;
  }
} 
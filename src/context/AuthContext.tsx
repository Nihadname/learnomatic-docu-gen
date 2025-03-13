import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, userData?: { name: string }) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any | null, directBrowserRedirect?: boolean }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        navigate('/');
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData?: { name: string }) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData?.name
          }
        }
      });
      
      if (!error) {
        // In a real app we might want to navigate to a verification required page
        // or show a message about checking email
        toast.success('Please check your email to verify your account');
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const signInWithGoogle = async () => {
    try {
      const redirectTo = window.location.origin;
      
      // Check if user is on iOS (iPhone, iPad, iPod) or using problematic browsers
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Check if likely in a WebView or embedded browser (including Telegram)
      const isWebView = 
        // iOS WebView detection
        /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) ||
        // Android WebView detection
        /wv|WebView/.test(navigator.userAgent) ||
        // Specific apps detection (including Telegram)
        /Telegram|TelegramBot|Twitter|FB|facebook|Instagram|Linktree|Instagram|Line|KAKAOTALK|NAVER/i.test(navigator.userAgent) || 
        document.referrer.includes('t.co') || 
        document.referrer.includes('instagram') ||
        document.referrer.includes('linktree') ||
        document.referrer.includes('telegram');
      
      // For problematic browsers, try to open in the device's native browser
      if (isIOS || isWebView) {
        // Generate URL but tell the user to open in external browser
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true, // Don't auto-redirect, get URL instead
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        
        if (data?.url) {
          // Try to open in native browser using _system target
          window.open(data.url, '_system');
          return { error: null, directBrowserRedirect: true };
        } else {
          return { error: new Error('Failed to generate authentication URL') };
        }
      } else {
        // For desktop and normal mobile browsers, use our new tab approach
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true, // Don't auto-redirect
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        
        // If we got the URL, open it in a new tab
        if (data?.url) {
          window.open(data.url, '_blank', 'noopener,noreferrer')
          return { error: null };
        } else {
          return { error: new Error('Failed to generate authentication URL') };
        }
      }
    } catch (error) {
      return { error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

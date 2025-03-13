import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // The hash contains the token information
        if (!window.location.hash) {
          setError('No authentication data found');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Process the callback from OAuth provider
        const { error } = await supabase.auth.getSessionFromUrl();
        
        if (error) {
          setError(error.message);
          toast.error('Authentication failed: ' + error.message);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Success - close this window if it was opened as a popup
        toast.success('Successfully authenticated!');
        
        // If this is a popup window, close it
        if (window.opener) {
          // Notify the opener window
          window.opener.postMessage('AUTHENTICATION_SUCCESSFUL', window.location.origin);
          window.close(); // Close this popup/tab
        } else {
          // If not a popup, navigate to the home page
          navigate('/');
        }
      } catch (err) {
        console.error('Error during auth callback:', err);
        setError('An unexpected error occurred');
        toast.error('Authentication failed due to an unexpected error');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8 rounded-lg shadow-sm max-w-md mx-auto">
        {error ? (
          <>
            <div className="text-xl text-destructive font-semibold mb-4">Authentication Failed</div>
            <p className="text-muted-foreground">{error}</p>
            <p className="mt-4">Redirecting you back to login...</p>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
              <h2 className="text-xl font-semibold">Completing authentication...</h2>
              <p className="text-muted-foreground">Please wait while we complete the authentication process.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storeGitHubToken } from '@/utils/github';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// This would typically be handled by a server for security, but for demo purposes we'll use a client approach
// In a production environment, you would use a serverless function or backend to exchange the code for a token
const BACKEND_EXCHANGE_URL = process.env.REACT_APP_GITHUB_EXCHANGE_URL || '/api/github/exchange';

const GitHubCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing GitHub authentication...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const exchangeCodeForToken = async (code: string) => {
      try {
        // In a real-world scenario, you would make a request to your backend
        // to exchange the code for a token securely
        const response = await fetch(BACKEND_EXCHANGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for token');
        }

        const data = await response.json();
        const { access_token } = data;

        if (!access_token) {
          throw new Error('No access token received');
        }

        // Store the token and redirect
        storeGitHubToken(access_token);
        setStatus('success');
        setMessage('Successfully authenticated with GitHub!');
        
        // Notify the opener window about successful authentication
        if (window.opener) {
          window.opener.postMessage({ type: 'github-auth-success', token: access_token }, window.location.origin);
          // Close this popup window after a brief delay
          setTimeout(() => window.close(), 2000);
        } else {
          // If opened in same window, redirect back
          setTimeout(() => navigate('/concept-explainer'), 2000);
        }
      } catch (error) {
        console.error('Error exchanging code for token:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
        setTimeout(() => navigate('/concept-explainer'), 3000);
      }
    };

    // Extract the code from the URL
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`GitHub authentication error: ${error}`);
      setTimeout(() => navigate('/concept-explainer'), 3000);
    } else if (code) {
      exchangeCodeForToken(code);
    } else {
      setStatus('error');
      setMessage('No authentication code received from GitHub');
      setTimeout(() => navigate('/concept-explainer'), 3000);
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/50 p-4">
      <div className="max-w-md w-full p-8 bg-card border rounded-lg shadow-lg text-center">
        {status === 'loading' && (
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
        )}
        {status === 'success' && (
          <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-4">
          GitHub Authentication
        </h2>
        <p className="mb-4 text-muted-foreground">
          {message}
        </p>
        {status === 'success' && (
          <p className="text-sm text-green-600">
            This window will automatically close or redirect you in a moment...
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">
            Redirecting you back to the application...
          </p>
        )}
      </div>
    </div>
  );
};

export default GitHubCallback; 
import { toast } from 'sonner';

const GITHUB_API_URL = 'https://api.github.com';
const CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID || 'your_github_client_id';
const REDIRECT_URI = `${window.location.origin}/github-callback`;

// GitHub authentication
export const initiateGitHubAuth = () => {
  const scope = 'repo';
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}`;
  window.open(authUrl, '_blank', 'width=800,height=600');
};

// Store GitHub token
export const storeGitHubToken = (token: string) => {
  localStorage.setItem('github_token', token);
};

// Get GitHub token
export const getGitHubToken = (): string | null => {
  return localStorage.getItem('github_token');
};

// Check if user is authenticated with GitHub
export const isGitHubAuthenticated = (): boolean => {
  return !!getGitHubToken();
};

// Logout from GitHub
export const logoutFromGitHub = () => {
  localStorage.removeItem('github_token');
};

// Fetch user's repositories
export const fetchUserRepositories = async (): Promise<any[]> => {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('Not authenticated with GitHub');
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}/user/repos?sort=updated&per_page=100`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
};

// Fetch repository details
export const fetchRepository = async (owner: string, repo: string): Promise<any> => {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('Not authenticated with GitHub');
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching repository details:', error);
    throw error;
  }
};

// Check if README exists
export const checkReadmeExists = async (owner: string, repo: string): Promise<{exists: boolean, sha?: string}> => {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('Not authenticated with GitHub');
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/README.md`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return { exists: false };
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return { exists: true, sha: data.sha };
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return { exists: false };
    }
    console.error('Error checking README existence:', error);
    throw error;
  }
};

// Create or update README file
export const createOrUpdateReadme = async (
  owner: string, 
  repo: string, 
  content: string, 
  commitMessage: string
): Promise<boolean> => {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('Not authenticated with GitHub');
  }

  try {
    // Check if README already exists
    const { exists, sha } = await checkReadmeExists(owner, repo);
    
    // Encode content to base64
    const encodedContent = btoa(unescape(encodeURIComponent(content)));
    
    // Prepare request body
    const body: any = {
      message: commitMessage,
      content: encodedContent,
    };
    
    // If README exists, add SHA to update it
    if (exists && sha) {
      body.sha = sha;
    }
    
    // Create or update README
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/README.md`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating/updating README:', error);
    throw error;
  }
};

// Get GitHub user details
export const getGitHubUser = async (): Promise<any> => {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('Not authenticated with GitHub');
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    throw error;
  }
}; 
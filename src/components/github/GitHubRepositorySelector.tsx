import React, { useState, useEffect } from 'react';
import { fetchUserRepositories, isGitHubAuthenticated, initiateGitHubAuth, getGitHubUser } from '@/utils/github';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Github, Star, GitFork } from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  private: boolean;
}

interface GitHubRepositorySelectorProps {
  onSelect: (repo: Repository) => void;
}

const GitHubRepositorySelector: React.FC<GitHubRepositorySelectorProps> = ({ onSelect }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  // Listen for GitHub auth completion message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data.type === 'github-auth-success'
      ) {
        toast.success('Successfully connected to GitHub!');
        setIsAuthenticated(true);
        loadRepositories();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = isGitHubAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        loadRepositories();
        try {
          const userData = await getGitHubUser();
          setUser(userData);
        } catch (error) {
          console.error('Error fetching GitHub user:', error);
        }
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Filter repositories based on search term
  useEffect(() => {
    if (repositories.length > 0) {
      if (searchTerm.trim() === '') {
        setFilteredRepositories(repositories);
      } else {
        const term = searchTerm.toLowerCase();
        const filtered = repositories.filter(repo => 
          repo.name.toLowerCase().includes(term) || 
          repo.description?.toLowerCase().includes(term) || 
          repo.full_name.toLowerCase().includes(term)
        );
        setFilteredRepositories(filtered);
      }
    }
  }, [searchTerm, repositories]);

  const loadRepositories = async () => {
    setIsLoading(true);
    try {
      const repos = await fetchUserRepositories();
      setRepositories(repos);
      setFilteredRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      toast.error('Failed to load repositories from GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthClick = () => {
    initiateGitHubAuth();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {!isAuthenticated ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Github className="w-16 h-16 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Connect to GitHub</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Connect your GitHub account to select a repository where you'd like to publish your README.
          </p>
          <Button onClick={handleAuthClick} className="gap-2">
            <Github className="w-4 h-4" />
            Connect with GitHub
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Select Repository</h3>
            {user && (
              <div className="flex items-center gap-2">
                <img 
                  src={user.avatar_url} 
                  alt={user.login}
                  className="h-6 w-6 rounded-full"
                />
                <span className="text-sm font-medium">{user.login}</span>
              </div>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-md">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {filteredRepositories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No repositories found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] rounded-md border p-2">
                  <div className="space-y-2 p-2">
                    {filteredRepositories.map((repo) => (
                      <div key={repo.id}>
                        <div 
                          className="p-4 hover:bg-accent rounded-md cursor-pointer"
                          onClick={() => onSelect(repo)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-primary">{repo.name}</h4>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {repo.private ? 'Private' : 'Public'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {repo.description || 'No description provided'}
                          </p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Star className="h-3.5 w-3.5 mr-1" />
                              {repo.stargazers_count}
                            </div>
                            <div className="flex items-center">
                              <GitFork className="h-3.5 w-3.5 mr-1" />
                              {repo.forks_count}
                            </div>
                            <div>
                              Updated {formatDate(repo.updated_at)}
                            </div>
                          </div>
                        </div>
                        <Separator className="my-2" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GitHubRepositorySelector; 
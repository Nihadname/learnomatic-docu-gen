import React, { useState } from 'react';
import { createOrUpdateReadme } from '@/utils/github';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { FileDown, AlertTriangle, Github, CheckCircle2 } from 'lucide-react';
import GitHubRepositorySelector from './GitHubRepositorySelector';

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
}

interface PushToGitHubProps {
  content: string;
  title: string;
}

const PushToGitHub: React.FC<PushToGitHubProps> = ({ content, title }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [commitMessage, setCommitMessage] = useState<string>(`Add README for ${title}`);
  const [isPushing, setIsPushing] = useState(false);

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setStep('confirm');
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('select');
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) return;

    try {
      setIsPushing(true);
      const [owner, repo] = selectedRepo.full_name.split('/');
      
      await createOrUpdateReadme(owner, repo, content, commitMessage);
      
      setStep('success');
      toast.success('README successfully pushed to GitHub!');
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      toast.error('Failed to push README to GitHub');
    } finally {
      setIsPushing(false);
    }
  };

  const closeDialog = () => {
    setOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep('select');
      setSelectedRepo(null);
      setCommitMessage(`Add README for ${title}`);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Github className="h-4 w-4" />
          <span>Push to GitHub</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Push to GitHub as README'}
            {step === 'confirm' && 'Confirm Push to GitHub'}
            {step === 'success' && 'Successfully Pushed to GitHub'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a GitHub repository to add this content as a README file.'}
            {step === 'confirm' && 'Review and confirm the changes before pushing to GitHub.'}
            {step === 'success' && 'Your content has been successfully pushed as a README file.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <GitHubRepositorySelector onSelect={handleRepoSelect} />
        )}

        {step === 'confirm' && selectedRepo && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <img 
                src={selectedRepo.owner.avatar_url} 
                alt={selectedRepo.owner.login}
                className="h-6 w-6 rounded-full"
              />
              <span className="font-medium">{selectedRepo.full_name}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commit-message">Commit Message</Label>
              <Input
                id="commit-message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Content Preview</Label>
                <span className="text-xs text-muted-foreground">README.md</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 text-sm font-mono bg-muted/30">
                {content.length > 500 
                  ? content.substring(0, 500) + '...' 
                  : content
                }
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Warning</p>
                <p>This will {selectedRepo ? 'update' : 'create'} the README.md file in the root directory of your repository. Any existing README.md will be overwritten.</p>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && selectedRepo && (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-medium mb-2">README Published!</h3>
            <p className="text-center text-muted-foreground mb-4">
              Your content has been successfully pushed to {selectedRepo.full_name}
            </p>
            <Button
              variant="outline"
              onClick={() => window.open(selectedRepo.html_url, '_blank')}
              className="gap-2"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {step === 'select' ? (
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
          ) : step === 'confirm' ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handlePush} 
                disabled={isPushing}
                className="gap-2"
              >
                {isPushing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-current animate-spin"></div>
                    <span>Pushing...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Push to GitHub
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={closeDialog}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushToGitHub; 
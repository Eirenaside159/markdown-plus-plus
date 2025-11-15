import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Github, Loader2, AlertCircle, Cloud, Eye, EyeOff, Lock, Globe, ChevronLeft } from 'lucide-react';
import { createRemoteProvider, type Repository } from '@/lib/remoteProviders';
import { getSettings, saveSettings } from '@/lib/settings';

// GitLab Icon Component
const GitLabIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 210 194"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    style={{ display: 'block' }}
  >
    <g>
      <path d="M105.0614 193.655L105 193.517l.0614.138z" fill="#E24329"/>
      <path d="M105.0614 193.655L67.2452 74.6914H142.815L105.0614 193.655z" fill="#E24329"/>
      <path d="M105.0614 193.6548L67.2452 74.6914H12.2637L105.0614 193.6548z" fill="#FC6D26"/>
      <path d="M12.2637 74.6914L.5688 110.9619c-1.0599 3.2434.0633 6.8062 2.8046 8.9033l101.6879 73.7896L12.2637 74.6914z" fill="#FCA326"/>
      <path d="M12.2637 74.6914h54.9815L47.4043 12.1832c-.5952-1.8239-3.1666-1.8239-3.7617 0L12.2637 74.6914z" fill="#E24329"/>
      <path d="M105.0614 193.6548L142.8776 74.6914h54.9815L105.0614 193.6548z" fill="#FC6D26"/>
      <path d="M197.8591 74.6914L209.554 110.9619c1.0599 3.2434-.0633 6.8062-2.8046 8.9033l-101.6879 73.7896 92.7976-118.9634z" fill="#FCA326"/>
      <path d="M197.8591 74.6914h-54.9815l19.8409-62.5082c.5952-1.8239 3.1666-1.8239 3.7617 0l31.3789 62.5082z" fill="#E24329"/>
    </g>
  </svg>
);

interface RemoteConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (provider: 'github' | 'gitlab', repo: Repository & { branch: string; token: string }) => void;
}

type Step = 'provider' | 'token' | 'repos' | 'branch';

export function RemoteConnectionModal({ open, onClose, onConnect }: RemoteConnectionModalProps) {
  const [step, setStep] = useState<Step>('provider');
  const [provider, setProvider] = useState<'github' | 'gitlab'>('github');
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Check for OAuth token on mount
  useEffect(() => {
    if (open) {
      const oauthToken = localStorage.getItem('oauth_temp_token');
      const oauthProvider = localStorage.getItem('oauth_temp_provider') as 'github' | 'gitlab' | null;
      
      if (oauthToken && oauthProvider) {
        // OAuth'dan geliyoruz, token'ı set et ve direkt repo listesine geç
        setToken(oauthToken);
        setProvider(oauthProvider);
        setStep('token');
        
        // Clean up temp storage
        localStorage.removeItem('oauth_temp_token');
        localStorage.removeItem('oauth_temp_provider');
        
        // Auto-submit
        setTimeout(() => {
          handleTokenSubmitWithProvider(oauthToken, oauthProvider);
        }, 100);
      }
    }
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('provider');
        setToken('');
        setRepos([]);
        setSelectedRepo(null);
        setBranches([]);
        setSelectedBranch('');
        setError('');
        setSearchQuery('');
      }, 300);
    }
  }, [open]);

  const handleProviderSelect = (selectedProvider: 'github' | 'gitlab') => {
    setProvider(selectedProvider);
    setStep('token');
    setError('');
    
    // Auto-fill token from settings if available
    const savedSettings = getSettings();
    const savedToken = selectedProvider === 'github' 
      ? savedSettings.githubToken 
      : savedSettings.gitlabToken;
    
    if (savedToken && savedToken.trim()) {
      setToken(savedToken);
    }
  };

  const handleOAuthLogin = (provider: 'github' | 'gitlab') => {
    // Get OAuth URLs from settings (if user configured custom workers)
    const savedSettings = getSettings();
    
    let authUrl: string;
    
    if (provider === 'github') {
      authUrl = savedSettings.githubOAuthUrl && savedSettings.githubOAuthUrl.trim()
        ? `${savedSettings.githubOAuthUrl.trim().replace(/\/$/, '')}/auth/github/login`
        : 'https://oauth-github.YOUR-SUBDOMAIN.workers.dev/auth/github/login';
    } else {
      authUrl = savedSettings.gitlabOAuthUrl && savedSettings.gitlabOAuthUrl.trim()
        ? `${savedSettings.gitlabOAuthUrl.trim().replace(/\/$/, '')}/auth/gitlab/login`
        : 'https://oauth-gitlab.YOUR-SUBDOMAIN.workers.dev/auth/gitlab/login';
    }
    
    // Check if URL is still placeholder
    if (authUrl.includes('YOUR-SUBDOMAIN')) {
      setError('OAuth not configured. Please use Personal Access Token or configure OAuth URLs in Settings.');
      return;
    }
    
    // Provider bilgisini localStorage'a kaydet (geri dönüşte kullanmak için)
    localStorage.setItem('oauth_provider', provider);
    
    window.location.href = authUrl;
  };

  const handleTokenSubmitWithProvider = async (tokenValue: string, providerValue: 'github' | 'gitlab') => {
    if (!tokenValue.trim()) {
      setError('Please enter a token');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const providerInstance = createRemoteProvider(providerValue, tokenValue.trim());
      const fetchedRepos = await providerInstance.listRepositories();
      
      if (fetchedRepos.length === 0) {
        setError('No repositories found. Make sure your token has the correct permissions.');
        setLoading(false);
        return;
      }

      // Token is valid, save it to settings
      const currentSettings = getSettings();
      const updatedSettings = {
        ...currentSettings,
        [providerValue === 'github' ? 'githubToken' : 'gitlabToken']: tokenValue.trim(),
      };
      saveSettings(updatedSettings);

      setRepos(fetchedRepos);
      setStep('repos');
    } catch (err: any) {
      console.error('Failed to fetch repositories:', err);
      setError(err.message || 'Failed to fetch repositories. Check your token and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async () => {
    await handleTokenSubmitWithProvider(token, provider);
  };

  const handleRepoSelect = async (repo: Repository) => {
    setLoading(true);
    setError('');
    setSelectedRepo(repo);

    try {
      const providerInstance = createRemoteProvider(provider, token);
      const fetchedBranches = await providerInstance.listBranches(repo.id.toString());
      
      if (fetchedBranches.length === 0) {
        setError('No branches found in this repository.');
        setLoading(false);
        return;
      }

      setBranches(fetchedBranches);
      setSelectedBranch(repo.defaultBranch);
      setStep('branch');
    } catch (err: any) {
      console.error('Failed to fetch branches:', err);
      setError(err.message || 'Failed to fetch branches.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!selectedRepo || !selectedBranch) return;

    onConnect(provider, {
      ...selectedRepo,
      branch: selectedBranch,
      token,
    });
    
    // Close modal immediately after connecting
    onClose();
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenChange = (open: boolean) => {
    // Prevent closing when on repository or branch selection step
    if (!open && (step === 'repos' || step === 'branch')) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-xl max-h-[90vh] overflow-auto"
        onEscapeKeyDown={(e) => {
          if (step === 'repos' || step === 'branch') {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (step === 'repos' || step === 'branch') {
            e.preventDefault();
          }
        }}
      >
        {/* Dynamic Header based on step */}
        {step === 'provider' && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Connect Remote Repository
            </DialogTitle>
            <DialogDescription>
              Work directly with your GitHub or GitLab repository without downloading files.
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm whitespace-pre-line">{error}</div>
          </div>
        )}

        {/* Step 1: Choose Provider */}
        {step === 'provider' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose your Git provider to get started
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleProviderSelect('github')}
                className="h-32 flex items-center justify-center border-2 rounded-lg hover:border-primary hover:bg-accent transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <Github size={40} />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="font-medium">GitHub</div>
                    <div className="text-xs text-muted-foreground">Connect to GitHub</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleProviderSelect('gitlab')}
                className="h-32 flex items-center justify-center border-2 rounded-lg hover:border-primary hover:bg-accent transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <GitLabIcon size={36} />
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="font-medium">GitLab</div>
                    <div className="text-xs text-muted-foreground">Connect to GitLab</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Token */}
        {step === 'token' && (
          <>
            <button 
              onClick={() => setStep('provider')}
              className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm inline-flex items-center gap-0.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <DialogHeader className="pt-6">
              <DialogTitle className="flex items-center gap-2">
                {provider === 'github' ? (
                  <>
                    <Github className="w-5 h-5" />
                    Connect to GitHub
                  </>
                ) : (
                  <>
                    <GitLabIcon size={20} />
                    Connect to GitLab
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Choose your preferred authentication method
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* OAuth Login Section */}
              <div className="space-y-3">
                <div className="text-sm font-medium">Quick Login (Recommended)</div>
                {provider === 'github' ? (
                  <button
                    onClick={() => handleOAuthLogin(provider)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#24292e] hover:bg-[#2c313a] text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <Github className="w-5 h-5" />
                    <span>Continue with GitHub</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOAuthLogin(provider)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FC6D26] hover:bg-[#e8590c] text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <GitLabIcon size={20} />
                    <span>Continue with GitLab</span>
                  </button>
                )}
                <div className="text-xs text-muted-foreground text-center">
                  Secure OAuth authentication - no manual token needed
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or use token</span>
                </div>
              </div>

              {/* Manual Token Input */}
              <div className="space-y-2">
                <Label htmlFor="token">
                  {provider === 'github' ? 'GitHub' : 'GitLab'} Personal Access Token
                  {token && (
                    <span className="ml-2 text-xs text-emerald-800 dark:text-emerald-600">
                      ✓ Loaded from Settings
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? 'text' : 'password'}
                    placeholder={provider === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxxxx' : 'glpat-xxxxxxxxxxxxxxxxxxxx'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
                    className="pr-10"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {provider === 'github' ? (
                    <>
                      Need a token?{' '}
                      <a 
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Markdown%2B%2B"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Create one
                      </a>
                      {' '}with <code className="bg-muted px-1 rounded">repo</code> scope
                    </>
                  ) : (
                    <>
                      Need a token?{' '}
                      <a 
                        href="https://gitlab.com/-/user_settings/personal_access_tokens?name=Markdown%2B%2B&scopes=api,read_user,read_repository,write_repository"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Create one
                      </a>
                      {' '}with scopes: <code className="bg-muted px-1 rounded text-xs">api</code>,{' '}
                      <code className="bg-muted px-1 rounded text-xs">read_user</code>,{' '}
                      <code className="bg-muted px-1 rounded text-xs">write_repository</code>
                    </>
                  )}
                </div>
              </div>

              <Button
                onClick={handleTokenSubmit}
                disabled={!token.trim() || loading}
                className="w-full"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading Repositories...
                  </>
                ) : (
                  'Continue with Token'
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Select Repository */}
        {step === 'repos' && (
          <>
            <button 
              onClick={() => setStep('token')}
              className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm inline-flex items-center gap-0.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <DialogHeader className="pt-6">
              <DialogTitle className="flex items-center gap-2">
                {provider === 'github' ? (
                  <>
                    <Github className="w-5 h-5" />
                    Select GitHub Repository
                  </>
                ) : (
                  <>
                    <GitLabIcon size={20} />
                    Select GitLab Repository
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Choose a repository to work with
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search repositories</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                Found {filteredRepos.length} {filteredRepos.length === 1 ? 'repository' : 'repositories'}
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoSelect(repo)}
                    disabled={loading}
                    className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium">{repo.fullName}</div>
                    {repo.description && (
                      <div className="text-sm text-muted-foreground mt-1">{repo.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        {repo.private ? (
                          <>
                            <Lock className="w-3 h-3" />
                            Private
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            Public
                          </>
                        )}
                      </span>
                      <span>Branch: {repo.defaultBranch}</span>
                      <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Select Branch */}
        {step === 'branch' && selectedRepo && (
          <>
            <button 
              onClick={() => setStep('repos')}
              className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-sm inline-flex items-center gap-0.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <DialogHeader className="pt-6">
              <DialogTitle className="flex items-center gap-2">
                {provider === 'github' ? (
                  <>
                    <Github className="w-5 h-5" />
                    Select Branch
                  </>
                ) : (
                  <>
                    <GitLabIcon size={20} />
                    Select Branch
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedRepo.fullName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="font-medium">{selectedRepo.fullName}</div>
                {selectedRepo.description && (
                  <div className="text-sm text-muted-foreground mt-1">{selectedRepo.description}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Select Branch</Label>
                <select
                  id="branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-background"
                >
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch} {branch === selectedRepo.defaultBranch && '(default)'}
                    </option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleConnect} 
                disabled={!selectedBranch || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect to {selectedRepo.name} ({selectedBranch})
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


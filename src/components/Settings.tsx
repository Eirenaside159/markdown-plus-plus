import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, Trash2, Download, Upload, AlertTriangle, EyeOff, Eye, Save, Link2, Palette, FileText, ListTree, Archive, FolderOpen, Info, Github, BookOpen, Heart, ExternalLink, ChevronDown, ChevronRight, Sparkles, GitBranch, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getSettings, saveSettings } from '@/lib/settings';
import { getHiddenFiles, unhideFile, clearHiddenFiles } from '@/lib/hiddenFiles';
import { applyColorPalette, getPaletteDisplayName, PALETTE_CATEGORIES } from '@/lib/colorPalettes';
import type { AppSettings, ColorPalette } from '@/types/settings';
import { useConfirm } from './ui/confirm-dialog';
import { AISettings } from './AISettings';
import packageJson from '../../package.json';

function UrlPreview({ baseUrl, urlFormat }: { baseUrl: string; urlFormat: string }) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const tokens: Record<string, string> = {
    SLUG: 'my-post-title',
    CATEGORY: 'news',
    YEAR: String(now.getFullYear()),
    MONTH: pad(now.getMonth() + 1),
    DAY: pad(now.getDate()),
  };
  const path = (urlFormat || '')
    .replaceAll('{SLUG}', tokens.SLUG)
    .replaceAll('{CATEGORY}', tokens.CATEGORY)
    .replaceAll('{YEAR}', tokens.YEAR)
    .replaceAll('{MONTH}', tokens.MONTH)
    .replaceAll('{DAY}', tokens.DAY)
    .replace(/^\/+/, '');
  const base = (baseUrl || '').trim().replace(/\/+$/, '');
  const preview = base ? `${base}/${path}` : `/${path}`;

  return (
    <div className="p-4 rounded-md bg-muted/50 border border-border">
      <div className="text-sm text-muted-foreground mb-2 font-medium">Preview URL</div>
      <code className="text-sm font-mono text-foreground break-all">{preview || '/'}</code>
    </div>
  );
}

interface SettingsProps {
  onClose?: () => void;
  directoryName?: string;
  onHiddenFilesChange?: () => void;
}

const Section = ({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string;
  description?: string | React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'muted' | 'danger';
}) => {
  const toneClasses =
    tone === 'danger'
      ? 'bg-destructive/10 border border-destructive/20 shadow-sm'
      : 'border border-border bg-card shadow-sm';

  return (
    <section className={`p-5 rounded-lg ${toneClasses} hover:shadow-md transition-shadow`}>
      <div className="space-y-4">
        {/* Başlık ve Açıklama */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        
        {/* İçerik */}
        <div>
          {children}
        </div>
      </div>
    </section>
  );
};

export function Settings({ onClose, directoryName, onHiddenFilesChange }: SettingsProps = {}) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [activeTab, setActiveTab] = useState<string>('git');
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const [newMultiplicityKey, setNewMultiplicityKey] = useState('');
  const [newMultiplicityMode, setNewMultiplicityMode] = useState<'single' | 'multi'>('multi');
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([]);
  const [isLibrariesOpen, setIsLibrariesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const urlFormatInputRef = useRef<HTMLInputElement>(null);
  
  // Save feedback state
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const saveTimeoutRef = useRef<Record<string, number>>({});
  
  // Token visibility toggles
  const [showGitToken, setShowGitToken] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showGitlabToken, setShowGitlabToken] = useState(false);
  
  // Show save feedback
  const showSaveFeedback = (fieldId: string, showToast: boolean = true) => {
    // Clear existing timeout for this field
    if (saveTimeoutRef.current[fieldId]) {
      clearTimeout(saveTimeoutRef.current[fieldId]);
    }
    
    // Mark field as saved
    setSavedFields(prev => ({ ...prev, [fieldId]: true }));
    
    // Show toast (only once per save action)
    if (showToast) {
      toast.success('Saved', { duration: 2000 });
    }
    
    // Clear saved indicator after 2 seconds
    saveTimeoutRef.current[fieldId] = setTimeout(() => {
      setSavedFields(prev => ({ ...prev, [fieldId]: false }));
    }, 2000);
  };
  
  // Local state for URL input to preserve user's exact input
  const [urlInputValue, setUrlInputValue] = useState(() => {
    const saved = getSettings();
    return saved.baseUrl && saved.urlFormat 
      ? `${saved.baseUrl.replace(/\/+$/, '')}/${saved.urlFormat.replace(/^\/+/, '')}`
      : saved.baseUrl || saved.urlFormat || '';
  });

  useEffect(() => {
    const saved = getSettings();
    setSettings(saved);
    // Update local URL input value when settings are loaded
    const urlValue = saved.baseUrl && saved.urlFormat 
      ? `${saved.baseUrl.replace(/\/+$/, '')}/${saved.urlFormat.replace(/^\/+/, '')}`
      : saved.baseUrl || saved.urlFormat || '';
    setUrlInputValue(urlValue);
  }, []);

  // Parse desired tab from location hash (e.g., #settings?tab=ai)
  useEffect(() => {
    const parseTabFromHash = () => {
      const hash = window.location.hash || '';
      if (!hash.startsWith('#settings')) return;
      const match = hash.match(/tab=([a-z-]+)/i);
      const tab = match?.[1];
      if (tab && ['git','website','appearance','default-meta','field-types','hidden-files','backup','about','ai'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    // Initial parse
    parseTabFromHash();
    // Listen for hash changes
    const onHashChange = () => parseTabFromHash();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (directoryName) {
      const hidden = getHiddenFiles(directoryName);
      setHiddenFiles(hidden);
    }
  }, [directoryName]);

  const handleAddMeta = () => {
    if (!newMetaKey.trim()) {
      toast.warning('Please enter a meta key');
      return;
    }
    
    const updatedSettings = {
      ...settings,
      defaultMeta: {
        ...settings.defaultMeta,
        [newMetaKey.trim()]: newMetaValue.trim(),
      },
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    setNewMetaKey('');
    setNewMetaValue('');
    toast.success('Meta field added');
  };

  const handleRemoveMeta = (key: string) => {
    const newMeta = { ...settings.defaultMeta };
    delete newMeta[key];
    const updatedSettings = {
      ...settings,
      defaultMeta: newMeta,
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    toast.success('Meta field removed');
  };

  const handleUpdateMetaLocal = (key: string, value: string) => {
    const updatedSettings = {
      ...settings,
      defaultMeta: {
        ...settings.defaultMeta,
        [key]: value,
      },
    };
    setSettings(updatedSettings);
  };

  const handleUpdateMeta = (key: string, value: string) => {
    const updatedSettings = {
      ...settings,
      defaultMeta: {
        ...settings.defaultMeta,
        [key]: value,
      },
    };
    
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    showSaveFeedback(`meta-${key}`);
  };

  const handleSetMultiplicity = (key: string, mode: 'single' | 'multi') => {
    const current = settings.metaFieldMultiplicity || {};
    const updatedSettings = {
      ...settings,
      metaFieldMultiplicity: {
        ...current,
        [key]: mode,
      },
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    toast.success(`'${key}' set to ${mode === 'multi' ? 'Multiple' : 'Single'}`);
    showSaveFeedback(`multiplicity-${key}`, false); // Don't show duplicate toast
  };

  const handleRemoveMultiplicity = (key: string) => {
    const current = { ...(settings.metaFieldMultiplicity || {}) };
    delete current[key];
    const updatedSettings = {
      ...settings,
      metaFieldMultiplicity: current,
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    toast.success(`Removed setting for '${key}'`);
  };

  const handleAddMultiplicity = () => {
    if (!newMultiplicityKey.trim()) {
      toast.warning('Please enter a field name');
      return;
    }
    handleSetMultiplicity(newMultiplicityKey.trim(), newMultiplicityMode);
    setNewMultiplicityKey('');
    setNewMultiplicityMode('multi');
  };


  const handleExport = async () => {
    try {
      // Collect all relevant localStorage data
      const allData: Record<string, any> = {};

      // Build list of keys to include:
      // - Any key that starts with "mdplusplus"
      // - Specific UI/consent flags that don't use the prefix
      const includeKeys = new Set<string>();

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith('mdplusplus')) {
          includeKeys.add(k);
        }
      }

      [
        'isFileTreeVisible',
        'fileTreeWidth',
        'markdown-plus-plus-warning-accepted',
      ].forEach(k => includeKeys.add(k));

      includeKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          try {
            allData[key] = JSON.parse(value);
          } catch {
            allData[key] = value;
          }
        }
      });

      // Export AI settings from IndexedDB
      const { exportAISettings } = await import('@/lib/aiSettings');
      try {
        const aiSettingsJson = await exportAISettings();
        allData['ai-settings'] = JSON.parse(aiSettingsJson);
      } catch (error) {
        console.warn('Failed to export AI settings:', error);
      }

      // Create export object with metadata
      const exportData = {
        version: '1.2',
        exportDate: new Date().toISOString(),
        data: allData,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mdplusplus-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        // Check if it's the new format (with version) or old format
        let dataToImport: Record<string, any>;
        
        if (importedData.version && importedData.data) {
          // New format
          dataToImport = importedData.data;
        } else if (importedData.defaultMeta !== undefined) {
          // Old format (just settings)
          dataToImport = { 'mdplusplus-settings': importedData };
        } else {
          throw new Error('Invalid config format');
        }

        // Import AI settings separately (IndexedDB)
        if (dataToImport['ai-settings']) {
          try {
            const { importAISettings } = await import('@/lib/aiSettings');
            await importAISettings(JSON.stringify(dataToImport['ai-settings']));
          } catch (error) {
            console.warn('Failed to import AI settings:', error);
          }
          // Remove from localStorage import
          delete dataToImport['ai-settings'];
        }

        // Validate and import each key
        let importedCount = 0;
        Object.entries(dataToImport).forEach(([key, value]) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
            importedCount++;
          } catch (error) {
            // Silently skip invalid keys
          }
        });

        if (importedCount === 0) {
          throw new Error('No data was imported');
        }

        // Reload settings from localStorage
        const newSettings = getSettings();
        setSettings(newSettings);
        
        toast.success(`Imported ${importedCount} setting(s). Reloading...`);
        
        // Reload page to apply all changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        toast.error('Invalid config file format');
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUnhideFile = (filePath: string) => {
    if (!directoryName) return;
    
    unhideFile(directoryName, filePath);
    setHiddenFiles(prev => prev.filter(path => path !== filePath));
    onHiddenFilesChange?.();
    toast.success('File unhidden');
  };

  const handleClearAllHidden = async () => {
    if (!directoryName) return;
    
    const confirmed = await confirm('Unhide all files? They will appear in the table again.', {
      title: 'Unhide All Files',
      confirmLabel: 'Unhide All',
    });
    if (confirmed) {
      clearHiddenFiles(directoryName);
      setHiddenFiles([]);
      onHiddenFilesChange?.();
      toast.success('All files unhidden');
    }
  };

  return (
      <div className="min-h-full flex justify-center pb-6">
        <div className="flex flex-col w-full max-w-4xl px-4 md:px-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold leading-none tracking-tight">Settings</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center"
                title="Close Settings"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tabs Layout: Left sidebar tabs, Right content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-6 pb-6">
          {/* Left Sidebar - Vertical Tabs */}
          <TabsList className="flex md:flex-col h-fit w-full md:w-48 shrink-0 bg-muted/50 p-1.5 gap-0.5 rounded-lg border border-border overflow-x-auto md:overflow-x-visible scrollbar-hide">
            <TabsTrigger 
              value="git" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <GitBranch className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Git</span>
            </TabsTrigger>
            <TabsTrigger 
              value="website" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Link2 className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">URL Configuration</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ai" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">AI</span>
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Appearance</span>
            </TabsTrigger>
            <TabsTrigger 
              value="default-meta" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Default Meta</span>
            </TabsTrigger>
            <TabsTrigger 
              value="field-types" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <ListTree className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Field Types</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hidden-files" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Hidden Files</span>
            </TabsTrigger>
            <TabsTrigger 
              value="backup" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Backup</span>
            </TabsTrigger>
            <TabsTrigger 
              value="about" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Info className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">About</span>
            </TabsTrigger>
          </TabsList>

          {/* Right Content Area */}
          <div className="flex-1">
            {/* Git Tab */}
            <TabsContent value="git" className="mt-0 space-y-6 pr-2">
          {/* Git Configuration */}
          <Section 
            title="Git Configuration" 
            description="Set your Git author name and email for commits. These will be used when publishing changes via Markdown++."
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="git-author-input" className="text-sm font-medium text-foreground">Author Name</label>
                <input
                  id="git-author-input"
                  name="gitAuthor"
                  type="text"
                  autoComplete="off"
                  value={settings.gitAuthor || ''}
                  onChange={(e) => {
                    const updatedSettings = { ...settings, gitAuthor: e.target.value };
                    setSettings(updatedSettings);
                  }}
                  onBlur={(e) => {
                    const updatedSettings = { ...settings, gitAuthor: e.target.value };
                    saveSettings(updatedSettings);
                    showSaveFeedback('git-author');
                  }}
                  placeholder="Your Name"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 transition-colors ${
                    savedFields['git-author'] 
                      ? 'border-emerald-700 focus:ring-emerald-700' 
                      : 'border-input focus:ring-ring'
                  }`}
                />
                {savedFields['git-author'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="git-email-input" className="text-sm font-medium text-foreground">Email Address</label>
                <input
                  id="git-email-input"
                  name="gitEmail"
                  type="email"
                  autoComplete="off"
                  value={settings.gitEmail || ''}
                  onChange={(e) => {
                    const updatedSettings = { ...settings, gitEmail: e.target.value };
                    setSettings(updatedSettings);
                  }}
                  onBlur={(e) => {
                    const updatedSettings = { ...settings, gitEmail: e.target.value };
                    saveSettings(updatedSettings);
                    showSaveFeedback('git-email');
                  }}
                  placeholder="your.email@example.com"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 transition-colors ${
                    savedFields['git-email'] 
                      ? 'border-emerald-700 focus:ring-emerald-700' 
                      : 'border-input focus:ring-ring'
                  }`}
                />
                {savedFields['git-email'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="git-token-input" className="text-sm font-medium text-foreground">
                  Personal Access Token (Optional)
                </label>
                <div className="relative">
                  <input
                    id="git-token-input"
                    name="gitToken"
                    type={showGitToken ? 'text' : 'password'}
                    autoComplete="off"
                    value={settings.gitToken || ''}
                    onChange={(e) => {
                      const updatedSettings = { ...settings, gitToken: e.target.value };
                      setSettings(updatedSettings);
                    }}
                    onBlur={(e) => {
                      const updatedSettings = { ...settings, gitToken: e.target.value };
                      saveSettings(updatedSettings);
                      showSaveFeedback('git-token');
                    }}
                    placeholder="ghp_xxxxxxxxxxxx or glpat-xxxxxxxxxxxx"
                    className={`w-full px-3 py-2 pr-10 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 font-mono transition-colors ${
                      savedFields['git-token'] 
                        ? 'border-emerald-700 focus:ring-emerald-700' 
                        : 'border-input focus:ring-ring'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGitToken(!showGitToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded"
                    title={showGitToken ? 'Hide token' : 'Show token'}
                  >
                    {showGitToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {savedFields['git-token'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Required for pushing to private repos from browser. Get token from{' '}
                  <a 
                    href="https://github.com/settings/tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitHub
                  </a>
                  {' '}or{' '}
                  <a 
                    href="https://gitlab.com/-/profile/personal_access_tokens" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitLab
                  </a>
                  {' '}with <code className="px-1 py-0.5 bg-muted rounded text-xs">write_repository</code> scope.
                </p>
              </div>
            </div>
          </Section>

          {/* Remote Repository Integration */}
          <Section 
            title="Remote Repository Integration" 
            description="Configure Personal Access Tokens for GitHub and GitLab to work directly with your repositories without downloading files."
          >
            <div className="space-y-4">
              {/* GitHub Token */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <label htmlFor="github-token-input" className="text-sm font-medium text-foreground">
                    GitHub Personal Access Token
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="github-token-input"
                    name="githubToken"
                    type={showGithubToken ? 'text' : 'password'}
                    autoComplete="off"
                    value={settings.githubToken || ''}
                    onChange={(e) => {
                      const updatedSettings = { ...settings, githubToken: e.target.value };
                      setSettings(updatedSettings);
                    }}
                    onBlur={(e) => {
                      const updatedSettings = { ...settings, githubToken: e.target.value };
                      saveSettings(updatedSettings);
                      showSaveFeedback('github-token');
                    }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className={`w-full px-3 py-2 pr-10 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 font-mono transition-colors ${
                      savedFields['github-token'] 
                        ? 'border-emerald-700 focus:ring-emerald-700' 
                        : 'border-input focus:ring-ring'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded"
                    title={showGithubToken ? 'Hide token' : 'Show token'}
                  >
                    {showGithubToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {savedFields['github-token'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  <a 
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Markdown%2B%2B%20Remote%20Access" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Create token <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}with <code className="px-1 py-0.5 bg-muted rounded text-xs">repo</code> scope
                </p>
              </div>

              {/* GitLab Token */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <label htmlFor="gitlab-token-input" className="text-sm font-medium text-foreground">
                    GitLab Personal Access Token
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="gitlab-token-input"
                    name="gitlabToken"
                    type={showGitlabToken ? 'text' : 'password'}
                    autoComplete="off"
                    value={settings.gitlabToken || ''}
                    onChange={(e) => {
                      const updatedSettings = { ...settings, gitlabToken: e.target.value };
                      setSettings(updatedSettings);
                    }}
                    onBlur={(e) => {
                      const updatedSettings = { ...settings, gitlabToken: e.target.value };
                      saveSettings(updatedSettings);
                      showSaveFeedback('gitlab-token');
                    }}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    className={`w-full px-3 py-2 pr-10 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 font-mono transition-colors ${
                      savedFields['gitlab-token'] 
                        ? 'border-emerald-700 focus:ring-emerald-700' 
                        : 'border-input focus:ring-ring'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGitlabToken(!showGitlabToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded"
                    title={showGitlabToken ? 'Hide token' : 'Show token'}
                  >
                    {showGitlabToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                {savedFields['gitlab-token'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  <a 
                    href="https://gitlab.com/-/user_settings/personal_access_tokens?name=Markdown%2B%2B&scopes=api,read_user,read_repository,write_repository" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Create token <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}with scopes: <code className="px-1 py-0.5 bg-muted rounded text-xs">api</code>,{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">read_user</code>,{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">write_repository</code>
                </p>
              </div>

              {/* Info Box */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-xs text-blue-900 dark:text-blue-100">
                    <p className="font-medium">Remote Repository Mode</p>
                    <p>
                      Save your tokens here for quick access. When connecting to a remote repository, 
                      saved tokens will be pre-filled automatically.
                    </p>
                    <p className="mt-2">
                      <strong>Benefits:</strong> Works on iOS/iPad, no File System API needed, auto-commits on save!
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      <strong>Note:</strong> Tokens are stored securely in your browser's localStorage. 
                      They are never sent to any server except GitHub/GitLab APIs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* OAuth Configuration (Advanced) */}
          <Section 
            title="OAuth Configuration (Advanced)" 
            description="Optional: Configure custom OAuth endpoints if you've deployed your own OAuth workers."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="github-oauth-url-input" className="text-sm font-medium text-foreground">
                  GitHub OAuth Worker URL
                </label>
                <input
                  id="github-oauth-url-input"
                  name="githubOAuthUrl"
                  type="url"
                  autoComplete="off"
                  value={settings.githubOAuthUrl || ''}
                  onChange={(e) => {
                    const updatedSettings = { ...settings, githubOAuthUrl: e.target.value };
                    setSettings(updatedSettings);
                  }}
                  onBlur={(e) => {
                    const updatedSettings = { ...settings, githubOAuthUrl: e.target.value };
                    saveSettings(updatedSettings);
                    showSaveFeedback('github-oauth-url');
                  }}
                  placeholder="https://oauth-github.your-subdomain.workers.dev"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 font-mono transition-colors ${
                    savedFields['github-oauth-url'] 
                      ? 'border-emerald-700 focus:ring-emerald-700' 
                      : 'border-input focus:ring-ring'
                  }`}
                />
                {savedFields['github-oauth-url'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="gitlab-oauth-url-input" className="text-sm font-medium text-foreground">
                  GitLab OAuth Worker URL
                </label>
                <input
                  id="gitlab-oauth-url-input"
                  name="gitlabOAuthUrl"
                  type="url"
                  autoComplete="off"
                  value={settings.gitlabOAuthUrl || ''}
                  onChange={(e) => {
                    const updatedSettings = { ...settings, gitlabOAuthUrl: e.target.value };
                    setSettings(updatedSettings);
                  }}
                  onBlur={(e) => {
                    const updatedSettings = { ...settings, gitlabOAuthUrl: e.target.value };
                    saveSettings(updatedSettings);
                    showSaveFeedback('gitlab-oauth-url');
                  }}
                  placeholder="https://oauth-gitlab.your-subdomain.workers.dev"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 font-mono transition-colors ${
                    savedFields['gitlab-oauth-url'] 
                      ? 'border-emerald-700 focus:ring-emerald-700' 
                      : 'border-input focus:ring-ring'
                  }`}
                />
                {savedFields['gitlab-oauth-url'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
              </div>

              <div className="p-3 bg-muted/50 border border-border rounded-md">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Leave empty to use manual tokens.</strong> OAuth URLs are only needed if you've deployed 
                  Cloudflare Workers for OAuth authentication. See <code className="px-1 py-0.5 bg-background rounded">workers/README.md</code> for setup instructions.
                </p>
              </div>
            </div>
          </Section>
            </TabsContent>

            {/* Website Tab */}
            <TabsContent value="website" className="mt-0 space-y-6 pr-2">
          {/* URL Configuration */}
          <Section 
            title="URL Configuration" 
            description="Set up your website URL pattern for generating post links. Use placeholders like {SLUG}, {CATEGORY}, {YEAR}, {MONTH}, and {DAY}."
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="url-pattern-input" className="text-sm font-medium text-foreground">Complete URL Pattern</label>
                <input
                  id="url-pattern-input"
                  name="urlPatternConfig"
                  ref={urlFormatInputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={urlInputValue}
                  onChange={(e) => {
                    // Update local state immediately to show user's input
                    setUrlInputValue(e.target.value);
                  }}
                  onBlur={(e) => {
                    const fullUrl = e.target.value;
                    
                    // Parse the URL to extract domain and path - preserve special characters
                    // Use regex matching instead of URL constructor to preserve special chars like {}
                    const match = fullUrl.match(/^(https?:\/\/[^\/]+)(.*)$/);
                    if (match) {
                      const baseUrl = match[1];
                      const path = match[2].replace(/^\/+/, ''); // Remove leading slashes from path
                      
                      const updatedSettings = { 
                        ...settings, 
                        baseUrl: baseUrl,
                        urlFormat: path
                      };
                      setSettings(updatedSettings);
                      saveSettings(updatedSettings);
                      showSaveFeedback('url-pattern');
                    } else {
                      // If no protocol found, save the whole thing as baseUrl or urlFormat
                      if (fullUrl.startsWith('/')) {
                        // Starts with slash, treat as urlFormat only
                        const updatedSettings = { 
                          ...settings, 
                          urlFormat: fullUrl.replace(/^\/+/, '')
                        };
                        setSettings(updatedSettings);
                        saveSettings(updatedSettings);
                        showSaveFeedback('url-pattern');
                      } else {
                        // No slash, treat as baseUrl
                        const updatedSettings = { 
                          ...settings, 
                          baseUrl: fullUrl,
                          urlFormat: ''
                        };
                        setSettings(updatedSettings);
                        saveSettings(updatedSettings);
                        showSaveFeedback('url-pattern');
                      }
                    }
                  }}
                  placeholder="https://myblog.com/blog/{SLUG}"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 font-mono transition-colors ${
                    savedFields['url-pattern'] 
                      ? 'border-emerald-700 focus:ring-emerald-700' 
                      : 'border-input focus:ring-ring'
                  }`}
                />
                {savedFields['url-pattern'] && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Saved
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Use tokens: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{SLUG}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{CATEGORY}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{YEAR}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{MONTH}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{DAY}`}</code>
                </p>
              </div>
              <UrlPreview baseUrl={settings.baseUrl || ''} urlFormat={settings.urlFormat || ''} />
            </div>
          </Section>
            </TabsContent>

            {/* AI Tab */}
            <TabsContent value="ai" className="mt-0">
              <AISettings />
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="mt-0 space-y-6 pr-2">
          {/* Color Palette */}
          <Section 
            title="Color Palette" 
            description="Choose your preferred color theme for the interface. Works seamlessly in both light and dark modes."
          >
            <div className="space-y-4">
              {Object.entries(PALETTE_CATEGORIES).map(([categoryName, palettes]) => (
                <div key={categoryName}>
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    {categoryName}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(palettes as readonly ColorPalette[]).map((palette) => (
                      <button
                        key={palette}
                        onClick={() => {
                          const updatedSettings = { ...settings, colorPalette: palette };
                          setSettings(updatedSettings);
                          saveSettings(updatedSettings);
                                    const isDark = document.documentElement.classList.contains('dark');
                                    applyColorPalette(palette, isDark);
                                    toast.success(`Palette changed to ${getPaletteDisplayName(palette)}`);
                        }}
                        className={`
                          px-4 py-2 rounded-md text-sm font-medium transition-all
                          ${settings.colorPalette === palette 
                            ? 'bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2 ring-offset-background' 
                            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          }
                        `}
                      >
                        {getPaletteDisplayName(palette)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
            </TabsContent>

            {/* Default Meta Tab */}
            <TabsContent value="default-meta" className="mt-0 space-y-6 pr-2">
          {/* Default Meta */}
          <Section 
            title="Default Meta" 
            description="Add fields that automatically appear in every new post. Perfect for author, status, or other repeated metadata."
          >
            <div className="space-y-3">
              {Object.entries(settings.defaultMeta).length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">No default meta fields defined yet.</div>
              ) : (
                Object.entries(settings.defaultMeta).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <input
                        id={`meta-key-${key}`}
                        name={`metaKey-${key}`}
                        type="text"
                        value={key}
                        disabled
                        autoComplete="off"
                        className="w-40 px-3 py-2 text-sm rounded-md border border-input bg-muted cursor-not-allowed font-medium"
                      />
                      <input
                        id={`meta-value-${key}`}
                        name={`metaValue-${key}`}
                        type="text"
                        autoComplete="off"
                        value={typeof value === 'string' ? value : JSON.stringify(value)}
                        onChange={(e) => handleUpdateMetaLocal(key, e.target.value)}
                        onBlur={(e) => handleUpdateMeta(key, e.target.value)}
                        placeholder="Value"
                        className={`flex-1 px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 transition-colors ${
                          savedFields[`meta-${key}`]
                            ? 'border-emerald-700 focus:ring-emerald-700'
                            : 'border-input focus:ring-ring'
                        }`}
                      />
                      <button
                        onClick={() => handleRemoveMeta(key)}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-md text-destructive hover:bg-destructive hover:text-white transition-colors shrink-0"
                        title="Remove field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {savedFields[`meta-${key}`] && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1 ml-44">
                        <Check className="h-3 w-3" />
                        Saved
                      </p>
                    )}
                  </div>
                ))
              )}

              <div className="pt-3 border-t border-border">
                <div className="flex gap-2 items-center">
                  <input
                    id="new-meta-key"
                    name="newMetaKey"
                    type="text"
                    autoComplete="off"
                    value={newMetaKey}
                    onChange={(e) => setNewMetaKey(e.target.value)}
                    placeholder="Field name (e.g., author)"
                    className="w-40 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                      }
                    }}
                  />
                  <input
                    id="new-meta-value"
                    name="newMetaValue"
                    type="text"
                    autoComplete="off"
                    value={newMetaValue}
                    onChange={(e) => setNewMetaValue(e.target.value)}
                    placeholder="Default value"
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMeta();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddMeta}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    title="Add field"
                  >
                    <Save className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </Section>
            </TabsContent>

            {/* Field Types Tab */}
            <TabsContent value="field-types" className="mt-0 space-y-6 pr-2">
          {/* Meta Field Types */}
          <Section 
            title="Meta Field Types" 
            description="Choose whether fields accept single or multiple values. For example, 'author' is usually single, while 'tags' is multi."
          >
            <div className="space-y-3">
              {Object.entries(settings.metaFieldMultiplicity || {}).length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">No custom field type settings defined yet.</div>
              ) : (
                Object.entries(settings.metaFieldMultiplicity || {}).map(([key, mode]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        id={`field-type-${key}`}
                        name={`fieldType-${key}`}
                        type="text"
                        value={key}
                        disabled
                        autoComplete="off"
                        className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-muted cursor-not-allowed font-medium"
                      />
                      <div className={`inline-flex rounded-md border p-0.5 transition-colors ${
                        savedFields[`multiplicity-${key}`]
                          ? 'border-emerald-700'
                          : 'border-input'
                      }`}>
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded text-sm ${mode === 'single' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => handleSetMultiplicity(key, 'single')}
                          title="Single value"
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded text-sm ${mode === 'multi' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => handleSetMultiplicity(key, 'multi')}
                          title="Multiple values"
                        >
                          Multi
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveMultiplicity(key)}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-md text-destructive hover:bg-destructive hover:text-white transition-colors shrink-0"
                        title="Remove setting"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {savedFields[`multiplicity-${key}`] && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Saved
                      </p>
                    )}
                  </div>
                ))
              )}

              <div className="pt-3 border-t border-border">
                <div className="flex gap-2 items-center">
                  <input
                    id="new-multiplicity-key"
                    name="newMultiplicityKey"
                    type="text"
                    autoComplete="off"
                    value={newMultiplicityKey}
                    onChange={(e) => setNewMultiplicityKey(e.target.value)}
                    placeholder="Field name (e.g., tags)"
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMultiplicity();
                      }
                    }}
                  />
                  <div className="inline-flex rounded-md border border-input p-0.5">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded text-sm ${newMultiplicityMode === 'single' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setNewMultiplicityMode('single')}
                      title="Single value"
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded text-sm ${newMultiplicityMode === 'multi' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setNewMultiplicityMode('multi')}
                      title="Multiple values"
                    >
                      Multi
                    </button>
                  </div>
                  <button
                    onClick={handleAddMultiplicity}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    title="Add field type"
                  >
                    <Save className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </Section>
            </TabsContent>

            {/* Hidden Files Tab */}
            <TabsContent value="hidden-files" className="mt-0 space-y-6 pr-2">
          {/* Hidden Files */}
          <Section 
            title={`Hidden Files ${hiddenFiles.length > 0 ? `(${hiddenFiles.length})` : ''}`}
            description="View and restore files you've hidden from the post table. Hidden files stay in your folders but won't show in the list."
          >
            {hiddenFiles.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={handleClearAllHidden}
                    className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    Unhide All
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {hiddenFiles.map((filePath) => (
                    <div 
                      key={filePath} 
                      className="flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate font-mono" title={filePath}>
                          {filePath}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnhideFile(filePath)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 font-medium"
                        title="Unhide file"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Unhide</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="flex justify-center">
                  <Eye className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground">No hidden files in this workspace</p>
              </div>
            )}
          </Section>
            </TabsContent>

            {/* Backup Tab */}
            <TabsContent value="backup" className="mt-0 space-y-6 pr-2">
          {/* Export Configuration */}
          <Section 
            title="Export Configuration" 
            description="Save all your settings to a file. Great for backups or moving to another computer."
          >
            <button
              onClick={handleExport}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Configuration
            </button>
          </Section>

          {/* Import Configuration */}
          <Section 
            title="Import Configuration" 
            description="Load settings from a backup file. This replaces your current settings and reloads the page."
          >
            <div className="space-y-2.5">
              <button
                onClick={handleImport}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border-2 border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose Configuration File
              </button>
              <input
                id="config-file-input"
                name="configFile"
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-start gap-2 p-2.5 bg-warning/10 border border-warning/20 rounded-md">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">
                  <strong>Warning:</strong> Importing will replace all current settings and reload the page.
                </p>
              </div>
            </div>
          </Section>
            </TabsContent>

            {/* About Tab */}
            <TabsContent value="about" className="mt-0 space-y-6 pr-2">
          {/* App Information */}
          <Section 
            title="About Markdown++" 
            description="A powerful markdown editor that helps you create, edit, and organize your blog posts with ease. Manage metadata, preview content, and maintain your entire blog from one place."
          >
            <div className="space-y-6">
              {/* Logo and Version */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0">
                  <img 
                    src="/logo-white.png" 
                    alt="Markdown++ Logo" 
                    className="h-16 w-16 object-contain dark:hidden"
                  />
                  <img 
                    src="/logo.png" 
                    alt="Markdown++ Logo" 
                    className="h-16 w-16 object-contain hidden dark:block"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-foreground">Markdown++</h4>
                  <p className="text-sm text-muted-foreground mt-1">Version {packageJson.version}</p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Quick Links</h4>
                <div className="space-y-2">
                  {/* GitHub */}
                  <a
                    href="https://github.com/emir/markdown-plus-plus"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Github className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <div>
                        <div className="text-sm font-medium text-foreground">GitHub Repository</div>
                        <div className="text-xs text-muted-foreground">View source code, report issues, contribute</div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>

                  {/* Docs */}
                  <a
                    href="https://github.com/emir/markdown-plus-plus?tab=readme-ov-file#markdown"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <div>
                        <div className="text-sm font-medium text-foreground">Documentation</div>
                        <div className="text-xs text-muted-foreground">Learn how to use all features</div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>

                  {/* Donate */}
                  <a
                    href="https://buymeacoffee.com/emir"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                      <div>
                        <div className="text-sm font-medium text-foreground">Support Development</div>
                        <div className="text-xs text-muted-foreground">Help keep this project alive</div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                </div>
              </div>

              {/* Additional Info */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">License</span>
                  <span className="font-medium text-foreground">MIT</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Homepage</span>
                  <a 
                    href="https://markdown-plus-plus.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    markdown-plus-plus.com
                  </a>
                </div>
              </div>

              {/* Open Source Libraries */}
              <div className="space-y-3">
                <button
                  onClick={() => setIsLibrariesOpen(!isLibrariesOpen)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors group"
                >
                  <h4 className="text-sm font-medium text-foreground">Open Source Libraries</h4>
                  {isLibrariesOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </button>
                
                {isLibrariesOpen && (
                <div className="space-y-4 pt-3">
                  {/* Core Framework */}
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Core Framework</h5>
                    <div className="space-y-1.5">
                      <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • React - UI Library
                      </a>
                      <a href="https://www.typescriptlang.org" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • TypeScript - Type Safety
                      </a>
                      <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Vite - Build Tool
                      </a>
                    </div>
                  </div>

                  {/* Editor */}
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Editor</h5>
                    <div className="space-y-1.5">
                      <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • TipTap - Rich Text Editor
                      </a>
                      <a href="https://github.com/jonschlinkert/gray-matter" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Gray Matter - Frontmatter Parser
                      </a>
                      <a href="https://marked.js.org" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Marked - Markdown Parser
                      </a>
                      <a href="https://github.com/mixmark-io/turndown" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Turndown - HTML to Markdown
                      </a>
                    </div>
                  </div>

                  {/* UI Components */}
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">UI Components</h5>
                    <div className="space-y-1.5">
                      <a href="https://www.radix-ui.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Radix UI - Accessible Components
                      </a>
                      <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • shadcn/ui - UI Component System
                      </a>
                      <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Tailwind CSS - Utility-First CSS
                      </a>
                      <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Lucide React - Icon Library
                      </a>
                      <a href="https://sonner.emilkowal.ski" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Sonner - Toast Notifications
                      </a>
                    </div>
                  </div>

                  {/* Data & State */}
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Data & State</h5>
                    <div className="space-y-1.5">
                      <a href="https://tanstack.com/table" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • TanStack Table - Data Tables
                      </a>
                      <a href="https://isomorphic-git.org" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Isomorphic Git - Git Operations
                      </a>
                      <a href="https://github.com/feross/buffer" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Buffer - Node.js Buffer API
                      </a>
                    </div>
                  </div>

                  {/* Utilities */}
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Utilities</h5>
                    <div className="space-y-1.5">
                      <a href="https://github.com/lukeed/clsx" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • clsx - Conditional Classnames
                      </a>
                      <a href="https://github.com/dcastil/tailwind-merge" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • tailwind-merge - Tailwind Class Merger
                      </a>
                      <a href="https://github.com/kpdecker/jsdiff" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • diff - Text Diffing
                      </a>
                      <a href="https://atomiks.github.io/tippyjs" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • Tippy.js - Tooltip Library
                      </a>
                      <a href="https://www.kirilv.com/canvas-confetti" target="_blank" rel="noopener noreferrer" className="block text-sm text-foreground hover:text-primary transition-colors">
                        • canvas-confetti - Celebration Effects
                      </a>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </Section>
            </TabsContent>
          </div>
        </Tabs>

        {/* Confirm Dialog */}
        <ConfirmDialog />
        </div>
      </div>
  );
}


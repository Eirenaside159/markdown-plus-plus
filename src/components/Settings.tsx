import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, Trash2, Download, Upload, AlertTriangle, EyeOff, Eye, Save, Link2, Palette, FileText, ListTree, Archive, FolderOpen, Info, Github, BookOpen, Heart, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getSettings, saveSettings } from '@/lib/settings';
import { getHiddenFiles, unhideFile, clearHiddenFiles } from '@/lib/hiddenFiles';
import { applyColorPalette, getPaletteDisplayName, PALETTE_CATEGORIES } from '@/lib/colorPalettes';
import type { AppSettings, ColorPalette } from '@/types/settings';
import { useConfirm } from './ui/confirm-dialog';
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
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const [newMultiplicityKey, setNewMultiplicityKey] = useState('');
  const [newMultiplicityMode, setNewMultiplicityMode] = useState<'single' | 'multi'>('multi');
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([]);
  const [isLibrariesOpen, setIsLibrariesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const urlFormatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getSettings();
    setSettings(saved);
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


  const handleExport = () => {
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

      // Create export object with metadata
      const exportData = {
        version: '1.1',
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
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
          <Tabs defaultValue="publishing" className="flex flex-col md:flex-row gap-6 pb-6">
          {/* Left Sidebar - Vertical Tabs */}
          <TabsList className="flex md:flex-col h-fit w-full md:w-48 shrink-0 bg-muted/50 p-1.5 gap-0.5 rounded-lg border border-border overflow-x-auto md:overflow-x-visible scrollbar-hide">
            <TabsTrigger 
              value="publishing" 
              className="flex-shrink-0 w-full justify-center md:justify-start gap-2 text-left px-3 py-2 rounded text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-accent/50 hover:text-accent-foreground"
            >
              <Link2 className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Website</span>
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
            {/* Website Tab */}
            <TabsContent value="publishing" className="mt-0 space-y-6 pr-2">
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
                  name="urlPattern"
                  ref={urlFormatInputRef}
                  type="text"
                  value={settings.baseUrl && settings.urlFormat 
                    ? `${settings.baseUrl.replace(/\/+$/, '')}/${settings.urlFormat.replace(/^\/+/, '')}`
                    : settings.baseUrl || settings.urlFormat || ''}
                  onChange={(e) => {
                    const fullUrl = e.target.value;
                    // Parse the URL to extract domain and path
                    try {
                      const url = new URL(fullUrl);
                      const baseUrl = `${url.protocol}//${url.host}`;
                      const urlFormat = url.pathname.replace(/^\/+/, '');
                      
                      const updatedSettings = { 
                        ...settings, 
                        baseUrl: baseUrl,
                        urlFormat: urlFormat 
                      };
                      setSettings(updatedSettings);
                      saveSettings(updatedSettings);
                    } catch {
                      // If not a valid URL, try to split by first slash after protocol
                      const match = fullUrl.match(/^(https?:\/\/[^\/]+)\/(.*)$/);
                      if (match) {
                        const updatedSettings = { 
                          ...settings, 
                          baseUrl: match[1],
                          urlFormat: match[2]
                        };
                        setSettings(updatedSettings);
                        saveSettings(updatedSettings);
                      } else {
                        // Just save as baseUrl if no slash found
                        const updatedSettings = { 
                          ...settings, 
                          baseUrl: fullUrl,
                          urlFormat: ''
                        };
                        setSettings(updatedSettings);
                        saveSettings(updatedSettings);
                      }
                    }
                  }}
                  placeholder="https://myblog.com/blog/{SLUG}"
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Use tokens: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{SLUG}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{CATEGORY}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{YEAR}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{MONTH}`}</code> <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{`{DAY}`}</code>
                </p>
              </div>
              <UrlPreview baseUrl={settings.baseUrl || ''} urlFormat={settings.urlFormat || ''} />
            </div>
          </Section>
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
                  <div key={key} className="flex gap-2 items-center">
                    <input
                      id={`meta-key-${key}`}
                      name={`metaKey-${key}`}
                      type="text"
                      value={key}
                      disabled
                      className="w-40 px-3 py-2 text-sm rounded-md border border-input bg-muted cursor-not-allowed font-medium"
                    />
                    <input
                      id={`meta-value-${key}`}
                      name={`metaValue-${key}`}
                      type="text"
                      value={typeof value === 'string' ? value : JSON.stringify(value)}
                      onChange={(e) => handleUpdateMeta(key, e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleRemoveMeta(key)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-md text-destructive hover:bg-destructive hover:text-white transition-colors shrink-0"
                      title="Remove field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}

              <div className="pt-3 border-t border-border">
                <div className="flex gap-2 items-center">
                  <input
                    id="new-meta-key"
                    name="newMetaKey"
                    type="text"
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
                  <div key={key} className="flex items-center gap-2">
                    <input
                      id={`field-type-${key}`}
                      name={`fieldType-${key}`}
                      type="text"
                      value={key}
                      disabled
                      className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-muted cursor-not-allowed font-medium"
                    />
                    <div className="inline-flex rounded-md border border-input p-0.5">
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
                ))
              )}

              <div className="pt-3 border-t border-border">
                <div className="flex gap-2 items-center">
                  <input
                    id="new-multiplicity-key"
                    name="newMultiplicityKey"
                    type="text"
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


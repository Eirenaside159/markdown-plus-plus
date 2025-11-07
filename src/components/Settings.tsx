import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, FileText, Trash2, Download, Upload, FolderSync, Lightbulb, Package, AlertTriangle, LogOut, EyeOff, Eye, Save } from 'lucide-react';
import { Toast, useToast } from './ui/Toast';
import { getSettings, saveSettings } from '@/lib/settings';
import { getHiddenFiles, unhideFile, clearHiddenFiles } from '@/lib/hiddenFiles';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

function UrlPreview({ baseUrl, urlFormat }: { baseUrl: string; urlFormat: string }) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const tokens: Record<string, string> = {
    SLUG: 'example-post',
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
    <div className="p-3 rounded-md text-xs sm:text-sm text-muted-foreground bg-muted/30">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">Preview:</span>
        <code className="px-1.5 py-0.5 rounded bg-muted font-mono">{preview || '/'}</code>
      </div>
    </div>
  );
}

interface SettingsProps {
  onClose?: () => void;
  onLogout?: () => void;
  directoryName?: string;
}

type SettingsTab = 'general' | 'defaults' | 'import-export' | 'hidden-files';

export function Settings({ onClose, onLogout, directoryName }: SettingsProps = {}) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const [newMultiplicityKey, setNewMultiplicityKey] = useState('');
  const [newMultiplicityMode, setNewMultiplicityMode] = useState<'single' | 'multi'>('multi');
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  // URL builder state
  const [urlMode, setUrlMode] = useState<'simple' | 'advanced'>(() => {
    const format = (getSettings().urlFormat || '').trim();
    return /^\s*[^{}]*\{SLUG\}\s*$/.test(format) ? 'simple' : 'advanced';
  });
  const [pathPrefix, setPathPrefix] = useState<string>(() => {
    const format = (getSettings().urlFormat || '').trim();
    const m = format.match(/^\s*([^{}]*)\{SLUG\}\s*$/);
    const raw = m ? (m[1] || '') : '';
    return raw.replace(/^\/+/, '').replace(/\/+$/, '');
  });
  const urlFormatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const format = (settings.urlFormat || '').trim();
    const isSimple = /^\s*[^{}]*\{SLUG\}\s*$/.test(format);
    setUrlMode(isSimple ? 'simple' : 'advanced');
    if (isSimple) {
      const m = format.match(/^\s*([^{}]*)\{SLUG\}\s*$/);
      const raw = m ? (m[1] || '') : '';
      setPathPrefix(raw.replace(/^\/+/, '').replace(/\/+$/, ''));
    }
  }, [settings.urlFormat]);

  const insertToken = (token: string) => {
    const input = urlFormatInputRef.current;
    const current = settings.urlFormat || '';
    if (!input) {
      const updated = { ...settings, urlFormat: current + token };
      setSettings(updated);
      saveSettings(updated);
      return;
    }
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const next = current.slice(0, start) + token + current.slice(end);
    const updated = { ...settings, urlFormat: next };
    setSettings(updated);
    saveSettings(updated);
    requestAnimationFrame(() => {
      const pos = start + token.length;
      input.focus();
      input.setSelectionRange(pos, pos);
    });
  };

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
        ? 'bg-destructive/10 border border-destructive/20'
        : 'border border-border bg-card';

    return (
      <section className={`p-4 rounded-lg ${toneClasses}`}>
        <div className="mb-3">
          <h3 className="text-base font-semibold leading-none tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="space-y-3">{children}</div>
      </section>
    );
  };

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
      showToast('Please enter a meta key', 'warning');
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
    showToast('Meta field added', 'success');
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
    showToast('Meta field removed', 'success');
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
    showToast(`'${key}' set to ${mode === 'multi' ? 'Multiple' : 'Single'}`, 'success');
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
    showToast(`Removed setting for '${key}'`, 'success');
  };

  const handleAddMultiplicity = () => {
    if (!newMultiplicityKey.trim()) {
      showToast('Please enter a field name', 'warning');
      return;
    }
    handleSetMultiplicity(newMultiplicityKey.trim(), newMultiplicityMode);
    setNewMultiplicityKey('');
    setNewMultiplicityMode('multi');
  };


  const handleExport = () => {
    try {
      // Collect all localStorage data
      const allData: Record<string, any> = {};
      
      // Get all mdplusplus-related keys
      const keys = [
        'mdplusplus-settings',
        'mdplusplus_recent_folders',
        'mdplusplus-visible-columns',
        'mdplusplus-hidden-files',
      ];
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            allData[key] = JSON.parse(value);
          } catch {
            allData[key] = value;
          }
        }
      });

      // Create export object with metadata
      const exportData = {
        version: '1.0',
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
      showToast('Configuration exported', 'success');
    } catch (error) {
      showToast('Failed to export settings', 'error');
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
        
        showToast(`Imported ${importedCount} setting(s). Reloading...`, 'success');
        
        // Reload page to apply all changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        showToast('Invalid config file format', 'error');
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
    showToast('File unhidden', 'success');
  };

  const handleClearAllHidden = () => {
    if (!directoryName) return;
    
    if (window.confirm('Unhide all files? They will appear in the table again.')) {
      clearHiddenFiles(directoryName);
      setHiddenFiles([]);
      showToast('All files unhidden', 'success');
    }
  };

  const tabs = [
    {
      id: 'general' as const,
      label: 'General',
      icon: SettingsIcon,
    },
    {
      id: 'defaults' as const,
      label: 'Defaults',
      icon: FileText,
    },
    {
      id: 'hidden-files' as const,
      label: 'Hidden Files',
      icon: EyeOff,
      badge: hiddenFiles.length > 0 ? hiddenFiles.length : undefined,
    },
    {
      id: 'import-export' as const,
      label: 'Import / Export',
      icon: FolderSync,
    },
  ];

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Settings</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center"
              title="Close Settings"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Layout */}
        <div className="md:flex md:gap-6">
          {/* Sidebar */}
          <nav className="md:w-56 mb-4 md:mb-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      inline-flex items-center justify-between md:justify-start gap-2 h-10 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                      ${isActive 
                        ? 'bg-muted text-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }
                    `}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
              <Section title="URL" description="Base and pattern.">
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-md border border-input p-0.5 text-xs">
                    <button
                      className={`px-2 py-1 rounded ${urlMode === 'simple' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => {
                        setUrlMode('simple');
                        const normalized = pathPrefix ? `${pathPrefix.replace(/^\/+|\/+$/g,'')}/{SLUG}` : '{SLUG}';
                        const updated = { ...settings, urlFormat: normalized };
                        setSettings(updated);
                        saveSettings(updated);
                      }}
                    >
                      Simple
                    </button>
                    <button
                      className={`px-2 py-1 rounded ${urlMode === 'advanced' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setUrlMode('advanced')}
                    >
                      Advanced
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const updatedSettings = {
                        ...settings,
                        baseUrl: DEFAULT_SETTINGS.baseUrl,
                        urlFormat: DEFAULT_SETTINGS.urlFormat,
                      };
                      setSettings(updatedSettings);
                      saveSettings(updatedSettings);
                      setUrlMode('simple');
                      setPathPrefix('');
                      showToast('URL settings reset', 'info');
                    }}
                    className="text-xs rounded-md border border-input px-2 py-1 hover:bg-accent transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {urlMode === 'simple' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Base URL</label>
                      <input
                        type="text"
                        value={settings.baseUrl || ''}
                        onChange={(e) => {
                          const updatedSettings = { ...settings, baseUrl: e.target.value };
                          setSettings(updatedSettings);
                          saveSettings(updatedSettings);
                        }}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Path Prefix</label>
                      <input
                        type="text"
                        value={pathPrefix}
                        onChange={(e) => {
                          const nextPrefix = e.target.value.replace(/\s+/g, '-');
                          setPathPrefix(nextPrefix);
                          const normalized = nextPrefix ? `${nextPrefix.replace(/^\/+|\/+$/g,'')}/{SLUG}` : '{SLUG}';
                          const updated = { ...settings, urlFormat: normalized };
                          setSettings(updated);
                          saveSettings(updated);
                        }}
                        placeholder="blog"
                        className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL Format</label>
                    <input
                      ref={urlFormatInputRef}
                      type="text"
                      value={settings.urlFormat || ''}
                      onChange={(e) => {
                        const updated = { ...settings, urlFormat: e.target.value };
                        setSettings(updated);
                        saveSettings(updated);
                      }}
                      placeholder="blog/{CATEGORY}/{SLUG}"
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {['{SLUG}', '{CATEGORY}', '{YEAR}', '{MONTH}', '{DAY}'].map((t) => (
                        <button
                          key={t}
                          onClick={() => insertToken(t)}
                          className="text-xs rounded-md border border-input px-2 py-1 hover:bg-accent transition-colors"
                        >
                          <code className="font-mono">{t}</code>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <UrlPreview baseUrl={settings.baseUrl || ''} urlFormat={settings.urlFormat || ''} />
              </Section>

              {onLogout && (
                <Section title="Log Out" description="Close current workspace." tone="danger">
                  <button
                    onClick={onLogout}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </Section>
              )}
          </div>
        )}

        {/* Default Meta Tab */}
        {activeTab === 'defaults' && (
          <div className="space-y-4">
            <Section title="Default Meta" description="Added to new posts.">
              <div className="space-y-2">
                {Object.entries(settings.defaultMeta).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      disabled
                      className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-muted cursor-not-allowed"
                    />
                    <input
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
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMetaKey}
                    onChange={(e) => setNewMetaKey(e.target.value)}
                    placeholder="Field (e.g., author)"
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const nextInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                      }
                    }}
                  />
                  <input
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
                    className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    title="Save field"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Section>

            <Section title="Meta Field Types" description="Force specific fields to Single value or Multiple values.">
              <div className="space-y-2">
                {Object.entries(settings.metaFieldMultiplicity || {}).length === 0 && (
                  <div className="text-sm text-muted-foreground">No custom field type settings.</div>
                )}
                {Object.entries(settings.metaFieldMultiplicity || {}).map(([key, mode]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={key}
                      disabled
                      className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-muted cursor-not-allowed"
                    />
                    <div className="inline-flex rounded-md border border-input p-0.5 text-xs">
                      <button
                        type="button"
                        className={`px-2 py-1 rounded ${mode === 'single' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => handleSetMultiplicity(key, 'single')}
                        title="Single value"
                      >
                        Single
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded ${mode === 'multi' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => handleSetMultiplicity(key, 'multi')}
                        title="Multiple values"
                      >
                        Multiple
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
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMultiplicityKey}
                    onChange={(e) => setNewMultiplicityKey(e.target.value)}
                    placeholder="Field name (e.g., categories)"
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMultiplicity();
                      }
                    }}
                  />
                  <div className="inline-flex rounded-md border border-input p-0.5 text-xs">
                    <button
                      type="button"
                      className={`px-2 py-1 rounded ${newMultiplicityMode === 'single' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setNewMultiplicityMode('single')}
                      title="Single value"
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded ${newMultiplicityMode === 'multi' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setNewMultiplicityMode('multi')}
                      title="Multiple values"
                    >
                      Multiple
                    </button>
                  </div>
                  <button
                    onClick={handleAddMultiplicity}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    title="Save field type"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Section>

            <div className="p-3 bg-muted/30 rounded-md text-xs sm:text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span>Merged with standard meta when creating new posts.</span>
              </p>
            </div>
          </div>
        )}

        {/* Hidden Files Tab */}
        {activeTab === 'hidden-files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Files hidden from the table.</p>
              {hiddenFiles.length > 0 && (
                <button
                  onClick={handleClearAllHidden}
                  className="text-sm text-primary hover:text-primary/80 transition-colors px-3 py-1.5"
                >
                  Unhide All
                </button>
              )}
            </div>

            {hiddenFiles.length > 0 ? (
              <div className="space-y-2">
                {hiddenFiles.map((filePath) => (
                  <div 
                    key={filePath} 
                    className="flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate" title={filePath}>
                        {filePath}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnhideFile(filePath)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                      title="Unhide file"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Unhide</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="flex justify-center">
                  <Eye className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No hidden files</p>
              </div>
            )}

            <div className="p-3 bg-muted/30 rounded-md text-xs sm:text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span>Hidden files are stored per workspace.</span>
              </p>
            </div>
          </div>
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <div className="space-y-4">
            <Section title="Included in Export">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>Default Meta, Recent Folders, Column Settings, Hidden Files</span>
              </div>
            </Section>

            <Section title="Export Configuration" description="Download all data as JSON.">
              <button
                onClick={handleExport}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export All
              </button>
            </Section>

            <Section title="Import Configuration" description="Restore from JSON file.">
              <div className="space-y-3">
                <button
                  onClick={handleImport}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-xs sm:text-sm text-yellow-700 dark:text-yellow-500">
                  <p className="flex items-start gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Import replaces current data and reloads the page.</span>
                  </p>
                </div>
              </div>
            </Section>
          </div>
        )}
          </div>
        </div>
      </div>
    </>
  );
}


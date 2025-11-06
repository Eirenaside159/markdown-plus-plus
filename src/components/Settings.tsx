import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, X, FileText, Trash2, Download, Upload, FolderSync, Lightbulb, Package, AlertTriangle, LogOut, EyeOff, Eye, Save } from 'lucide-react';
import { Toast, useToast } from './ui/Toast';
import { getSettings, saveSettings } from '@/lib/settings';
import { getHiddenFiles, unhideFile, clearHiddenFiles } from '@/lib/hiddenFiles';
import type { AppSettings } from '@/types/settings';

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
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

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
          <h2 className="text-xl sm:text-2xl font-semibold">Settings</h2>
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

      {/* Tabs */}
      <div className="border-b overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap relative
                  ${isActive 
                    ? 'text-foreground border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <section className="space-y-4">
              {/* URL Configuration */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="text-lg font-semibold">URL Configuration</div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={settings.baseUrl || ''}
                      onChange={(e) => {
                        const updatedSettings = {
                          ...settings,
                          baseUrl: e.target.value,
                        };
                        setSettings(updatedSettings);
                        saveSettings(updatedSettings);
                      }}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      URL Format
                    </label>
                    <input
                      type="text"
                      value={settings.urlFormat || ''}
                      onChange={(e) => {
                        const updatedSettings = {
                          ...settings,
                          urlFormat: e.target.value,
                        };
                        setSettings(updatedSettings);
                        saveSettings(updatedSettings);
                      }}
                      placeholder="blog/{CATEGORY}/{SLUG}"
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
                    <p className="flex items-start gap-1.5">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Use placeholders like <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{'{SLUG}'}</code>, <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{'{CATEGORY}'}</code>, or any meta field in curly braces. Example: <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">blog/{'{CATEGORY}'}/{'{SLUG}'}</code>
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* App Info */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="text-lg font-semibold">Application Info</div>
                <div className="text-base text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-medium">v0.6.0-beta</span>
                  </div>
                  {directoryName && (
                    <div className="flex justify-between">
                      <span>Current Workspace:</span>
                      <span className="font-medium">{directoryName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logout Section */}
              {onLogout && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <LogOut className="h-5 w-5 text-destructive" />
                    <div className="text-lg font-semibold text-destructive">Logout</div>
                  </div>
                  <p className="text-base text-muted-foreground">
                    Close the current workspace and return to folder selection. Make sure you've saved all your changes.
                  </p>
                  <button
                    onClick={onLogout}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout from Workspace
                  </button>
                </div>
              )}
          </section>
        )}

        {/* Default Meta Tab */}
        {activeTab === 'defaults' && (
          <section className="space-y-4">
            <p className="text-base text-muted-foreground">
              These meta fields will be automatically added to new posts when created.
            </p>

            <div className="space-y-2">
              {/* Existing meta fields */}
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
                    placeholder="Default value"
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

              {/* Add new meta field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMetaKey}
                  onChange={(e) => setNewMetaKey(e.target.value)}
                  placeholder="Field name (e.g., author)"
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

            <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span>These fields will be merged with standard meta (title, date, etc.) when creating new posts.</span>
              </p>
            </div>
          </section>
        )}

        {/* Hidden Files Tab */}
        {activeTab === 'hidden-files' && (
          <section className="space-y-4">
            {hiddenFiles.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleClearAllHidden}
                  className="text-sm text-primary hover:text-primary/80 transition-colors px-3 py-1.5"
                >
                  Unhide All
                </button>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-base text-muted-foreground">
                Files you've hidden from the table view. Click to unhide them.
              </p>

              {hiddenFiles.length > 0 ? (
                <div className="space-y-2">
                  {hiddenFiles.map((filePath) => (
                    <div 
                      key={filePath} 
                      className="flex items-center justify-between p-3 rounded-md border border-input bg-background hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-base truncate" title={filePath}>
                          {filePath}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnhideFile(filePath)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
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
                  <p className="text-base text-muted-foreground">
                    No hidden files
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use the hide button in the table to hide files you don't want to see
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  <span>Hidden files are stored per workspace. They remain hidden even after closing the app.</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <section className="space-y-4">
            <p className="text-base text-muted-foreground">
              Backup all your application data or restore from a previously saved configuration file.
            </p>

            {/* What's Included */}
            <div className="p-3 bg-muted/20 rounded-md text-sm">
                <p className="font-medium mb-2 flex items-center gap-1.5">
                  <Package className="h-4 w-4 shrink-0" />
                  Included in Export:
                </p>
              <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                <li>Default Meta Fields - Your custom metadata templates</li>
                <li>Recent Folders - Recently accessed project folders</li>
                <li>Column Settings - Table column visibility preferences</li>
                <li>Hidden Files - Files you've hidden from the table view</li>
              </ul>
            </div>

            {/* Export Section */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-muted-foreground" />
                <div className="text-lg font-semibold">Export Configuration</div>
              </div>
              <p className="text-base text-muted-foreground">
                Download all your application data as a JSON file. This includes settings, recent folders, and column preferences.
              </p>
              <button
                onClick={handleExport}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export All Data
              </button>
            </div>

            {/* Import Section */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div className="text-lg font-semibold">Import Configuration</div>
              </div>
              <p className="text-base text-muted-foreground">
                Select a previously exported JSON file to restore all your data. This will replace your current settings and preferences.
              </p>
              <button
                onClick={handleImport}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import Config File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-700 dark:text-yellow-500">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Importing will replace ALL your current data. Export your current config first if you want to keep a backup. The page will reload after import.</span>
                </p>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
              <p className="font-medium mb-1 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 shrink-0" />
                Tips:
              </p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Export files are named with the current date for easy organization</li>
                <li>Config files include version info for compatibility checking</li>
                <li>You can manually edit the JSON file if needed (advanced users)</li>
                <li>Keep backups in a safe location (cloud storage, USB drive, etc.)</li>
                <li>Import automatically applies changes and reloads the page</li>
                <li>Compatible with both old (settings-only) and new (full) formats</li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
    </>
  );
}


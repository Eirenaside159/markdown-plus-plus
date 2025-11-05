import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw, X, FileText, Plus, Trash2, Download, Upload, FolderSync, Lightbulb, Package, AlertTriangle } from 'lucide-react';
import { Toast, useToast } from './ui/Toast';
import { getSettings, saveSettings, resetSettings } from '@/lib/settings';
import type { AppSettings } from '@/types/settings';

interface SettingsProps {
  onClose?: () => void;
}

type SettingsTab = 'defaults' | 'import-export';

export function Settings({ onClose }: SettingsProps = {}) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('defaults');
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaValue, setNewMetaValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const saved = getSettings();
    setSettings(saved);
  }, []);

  const handleAddMeta = () => {
    if (!newMetaKey.trim()) {
      showToast('Please enter a meta key', 'warning');
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      defaultMeta: {
        ...prev.defaultMeta,
        [newMetaKey.trim()]: newMetaValue.trim(),
      },
    }));
    setNewMetaKey('');
    setNewMetaValue('');
    setHasChanges(true);
    showToast('Meta field added', 'success');
  };

  const handleRemoveMeta = (key: string) => {
    setSettings(prev => {
      const newMeta = { ...prev.defaultMeta };
      delete newMeta[key];
      return {
        ...prev,
        defaultMeta: newMeta,
      };
    });
    setHasChanges(true);
  };

  const handleUpdateMeta = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      defaultMeta: {
        ...prev.defaultMeta,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    showToast('Settings saved successfully!', 'success');
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to default? This cannot be undone.')) {
      resetSettings();
      const defaults = getSettings();
      setSettings(defaults);
      setHasChanges(false);
      showToast('Settings reset to default', 'success');
    }
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
      showToast('Configuration exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export settings. Please try again.', 'error');
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
        setHasChanges(false);
        
        showToast(`Successfully imported ${importedCount} setting(s)! Reloading...`, 'success');
        
        // Reload page to apply all changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        showToast('Failed to import config. Please check the file format.', 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tabs = [
    {
      id: 'defaults' as const,
      label: 'Default Meta',
      icon: FileText,
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
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base sm:text-lg font-semibold">Settings</h2>
          {hasChanges && (
            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
              <span className="h-2 w-2 rounded-full bg-yellow-600 dark:bg-yellow-500" />
              <span className="hidden sm:inline">Unsaved</span>
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors touch-target inline-flex items-center justify-center"
            title="Close Settings"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
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
                  flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] touch-target whitespace-nowrap
                  ${isActive 
                    ? 'text-foreground border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Default Meta Tab */}
        {activeTab === 'defaults' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Default Meta Fields</h3>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                These meta fields will be automatically added to new posts when created.
              </p>

              {/* Add new meta field */}
              <div className="p-3 sm:p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="text-sm font-medium">Add New Field</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newMetaKey}
                    onChange={(e) => setNewMetaKey(e.target.value)}
                    placeholder="Field name (e.g., author)"
                    className="px-3 py-2 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring touch-target"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMeta();
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={newMetaValue}
                    onChange={(e) => setNewMetaValue(e.target.value)}
                    placeholder="Default value"
                    className="px-3 py-2 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring touch-target"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMeta();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handleAddMeta}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-target"
                >
                  <Plus className="h-4 w-4" />
                  Add Field
                </button>
              </div>

              {/* Existing meta fields */}
              {Object.keys(settings.defaultMeta).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Current Default Fields</div>
                  <div className="space-y-2">
                    {Object.entries(settings.defaultMeta).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-3 rounded-md border border-input bg-background">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            {key}
                          </div>
                          <input
                            type="text"
                            value={typeof value === 'string' ? value : JSON.stringify(value)}
                            onChange={(e) => handleUpdateMeta(key, e.target.value)}
                            className="px-2 py-1 text-sm rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveMeta(key)}
                          className="inline-flex items-center justify-center p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Remove field"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No default fields configured. Add some above!
                </div>
              )}

              <div className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                  <span>These fields will be merged with standard meta (title, date, etc.) when creating new posts.</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FolderSync className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Import / Export Settings</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Backup all your application data or restore from a previously saved configuration file.
              </p>

              {/* What's Included */}
              <div className="p-3 bg-muted/20 rounded-md text-xs">
                <p className="font-medium mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  Included in Export:
                </p>
                <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                  <li>Default Meta Fields - Your custom metadata templates</li>
                  <li>Recent Folders - Recently accessed project folders</li>
                  <li>Column Settings - Table column visibility preferences</li>
                </ul>
              </div>

              {/* Export Section */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">Export Configuration</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Download all your application data as a JSON file. This includes settings, recent folders, and column preferences.
                </p>
                <button
                  onClick={handleExport}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export All Data
                </button>
              </div>

              {/* Import Section */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">Import Configuration</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a previously exported JSON file to restore all your data. This will replace your current settings and preferences.
                </p>
                <button
                  onClick={handleImport}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
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
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-xs text-yellow-700 dark:text-yellow-500">
                  <p className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Importing will replace ALL your current data. Export your current config first if you want to keep a backup. The page will reload after import.</span>
                  </p>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <p className="font-medium mb-1 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
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
            </div>
          </section>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t gap-2 flex-wrap">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors touch-target"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Reset to Default</span>
          <span className="sm:hidden">Reset</span>
        </button>

        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Save Settings</span>
          <span className="sm:hidden">Save</span>
        </button>
      </div>
    </div>
    </>
  );
}


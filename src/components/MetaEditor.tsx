import { useState } from 'react';
import type { MarkdownFile } from '@/types';
import { DynamicField } from './DynamicField';
import { getFieldValues } from '@/lib/metaAnalyzer';
import { formatFieldLabel, inferFieldType } from '@/lib/fieldUtils';
import { Plus, X, Check } from 'lucide-react';
import { getSettings } from '@/lib/settings';

export interface MetaEditorProps {
  frontmatter: MarkdownFile['frontmatter'];
  onChange: (frontmatter: MarkdownFile['frontmatter']) => void;
  allPosts: MarkdownFile[];
  fileName?: string;
  onFileNameChange?: (newFileName: string) => void;
}

export function MetaEditor({ frontmatter, onChange, allPosts, fileName, onFileNameChange }: MetaEditorProps) {
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [editingFileName, setEditingFileName] = useState('');

  const handleFieldChange = (key: string, value: unknown) => {
    onChange({ ...frontmatter, [key]: value });
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    
    // Convert field name to lowercase with underscores
    const fieldKey = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    
    // Add the field
    onChange({ ...frontmatter, [fieldKey]: newFieldValue.trim() });
    
    // Reset form
    setNewFieldName('');
    setNewFieldValue('');
    setIsAddingField(false);
  };

  const handleCancelAddField = () => {
    setNewFieldName('');
    setNewFieldValue('');
    setIsAddingField(false);
  };

  // Get fields from current file's frontmatter
  const fields = Object.keys(frontmatter).filter(key => {
    // Keep all fields except null/undefined
    const value = frontmatter[key];
    return value !== null && value !== undefined;
  });

  // Sort fields: common fields first, then alphabetically
  const commonFields = ['title', 'date', 'author', 'description', 'categories', 'tags'];
  fields.sort((a, b) => {
    const aIndex = commonFields.indexOf(a);
    const bIndex = commonFields.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return a.localeCompare(b);
  });

  const handleFileNameSave = () => {
    if (editingFileName.trim() && onFileNameChange) {
      onFileNameChange(editingFileName.trim());
    }
    setEditingFileName('');
  };

  const handleFileNameCancel = () => {
    setEditingFileName('');
  };

  return (
    <div className="space-y-5">
      {/* File Name Editor */}
      {fileName && onFileNameChange && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">File Name</label>
          
          {editingFileName !== '' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editingFileName}
                onChange={(e) => setEditingFileName(e.target.value)}
                placeholder="Enter new file name"
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFileNameSave();
                  if (e.key === 'Escape') handleFileNameCancel();
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleFileNameSave}
                  disabled={!editingFileName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={handleFileNameCancel}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                const nameWithoutExt = fileName.replace(/\.md$/, '');
                setEditingFileName(nameWithoutExt);
              }}
              className="w-full text-left px-3 py-2 text-sm rounded-md border bg-background hover:bg-accent transition-colors font-mono"
            >
              {fileName}
            </button>
          )}
        </div>
      )}

      {/* Meta Fields */}
      <div className="space-y-4">
        {fields.map((key) => {
          const value = frontmatter[key];
          const settings = getSettings();
          const override = settings.metaFieldMultiplicity?.[key];
          let fieldType = inferFieldType(value);
          if (override === 'multi' && (fieldType === 'string' || fieldType === 'array')) {
            fieldType = 'array';
          } else if (override === 'single' && (fieldType === 'string' || fieldType === 'array')) {
            fieldType = 'string';
          }
          const suggestions = getFieldValues(allPosts, key);
          const label = formatFieldLabel(key);
          
          return (
            <DynamicField
              key={key}
              fieldKey={key}
              fieldLabel={label}
              fieldType={fieldType}
              value={value}
              onChange={handleFieldChange}
              suggestions={suggestions}
            />
          );
        })}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No meta fields found</p>
        </div>
      )}

      {/* Add Field */}
      {isAddingField ? (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1.5">
            <label htmlFor="new-field-name" className="text-sm font-medium">Field Name</label>
            <input
              id="new-field-name"
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g., author"
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          
          <div className="space-y-1.5">
            <label htmlFor="new-field-value" className="text-sm font-medium">Field Value</label>
            <input
              id="new-field-value"
              type="text"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddField();
                if (e.key === 'Escape') handleCancelAddField();
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddField}
              disabled={!newFieldName.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="h-4 w-4" />
              Add
            </button>
            <button
              onClick={handleCancelAddField}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingField(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border-2 border-dashed hover:border-primary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </button>
      )}
    </div>
  );
}


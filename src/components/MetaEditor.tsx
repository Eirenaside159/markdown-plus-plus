import { useState } from 'react';
import type { MarkdownFile } from '@/types';
import { DynamicField } from './DynamicField';
import { getFieldValues } from '@/lib/metaAnalyzer';
import { formatFieldLabel, inferFieldType } from '@/lib/fieldUtils';
import { Plus, X, Check } from 'lucide-react';

export interface MetaEditorProps {
  frontmatter: MarkdownFile['frontmatter'];
  onChange: (frontmatter: MarkdownFile['frontmatter']) => void;
  allPosts: MarkdownFile[];
}

export function MetaEditor({ frontmatter, onChange, allPosts }: MetaEditorProps) {
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

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

  return (
    <div className="space-y-4">
      {fields.map((key) => {
        const value = frontmatter[key];
        const fieldType = inferFieldType(value);
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

      {/* Show a message if no fields found */}
      {fields.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            No meta fields found
          </p>
        </div>
      )}

      {/* Add Field Section */}
      {isAddingField ? (
        <div className="space-y-3 p-4 border border-primary/50 rounded-md bg-accent/30">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Field Name
            </label>
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g., custom_field"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Field Value
            </label>
            <input
              type="text"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <Check className="h-4 w-4" />
              Add Field
            </button>
            <button
              onClick={handleCancelAddField}
              className="inline-flex items-center justify-center px-3 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingField(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border-2 border-dashed border-input hover:border-primary hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Custom Field
        </button>
      )}
    </div>
  );
}


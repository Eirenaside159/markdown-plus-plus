import type { FrontMatter } from '@/types';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';

interface MetadataEditorProps {
  frontmatter: FrontMatter;
  onChange: (frontmatter: FrontMatter) => void;
}

export function MetadataEditor({ frontmatter, onChange }: MetadataEditorProps) {
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleChange = (field: string, value: string) => {
    onChange({ ...frontmatter, [field]: value });
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onChange({
        ...frontmatter,
        tags: [...(frontmatter.tags || []), newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    const tags = frontmatter.tags || [];
    onChange({
      ...frontmatter,
      tags: tags.filter((_, i) => i !== index),
    });
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onChange({
        ...frontmatter,
        categories: [...(frontmatter.categories || []), newCategory.trim()],
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (index: number) => {
    const categories = frontmatter.categories || [];
    onChange({
      ...frontmatter,
      categories: categories.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={frontmatter.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter title"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="author" className="text-sm font-medium">
          Author
        </label>
        <input
          id="author"
          type="text"
          value={frontmatter.author || ''}
          onChange={(e) => handleChange('author', e.target.value)}
          placeholder="Enter author"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={frontmatter.date || ''}
          onChange={(e) => handleChange('date', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <input
          id="description"
          type="text"
          value={frontmatter.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter description"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Categories</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {(frontmatter.categories || []).map((category, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground"
            >
              {category}
              <button
                onClick={() => handleRemoveCategory(index)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="Add category"
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            onClick={handleAddCategory}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <div className="flex flex-wrap gap-1 mb-2">
          {(frontmatter.tags || []).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(index)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add tag"
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            onClick={handleAddTag}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

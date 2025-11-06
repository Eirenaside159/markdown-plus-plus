import { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, Sparkles, Plus } from 'lucide-react';
import { Toast, useToast } from './ui/Toast';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (filename: string, title: string) => void;
}

// Türkçe karakterleri ve özel karakterleri temizleyip slug'a çevir
const generateSlug = (text: string): string => {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
  };

  return text
    // Türkçe karakterleri değiştir
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    // Küçük harfe çevir
    .toLowerCase()
    // Özel karakterleri ve birden fazla boşluğu temizle
    .replace(/[^a-z0-9\s-]/g, '')
    // Boşlukları tire ile değiştir
    .replace(/\s+/g, '-')
    // Birden fazla tire varsa tek tire yap
    .replace(/-+/g, '-')
    // Baş ve sondaki tireleri temizle
    .replace(/^-+|-+$/g, '');
};

export function NewPostModal({ isOpen, onClose, onCreate }: NewPostModalProps) {
  const [title, setTitle] = useState('');
  const [filename, setFilename] = useState('');
  const [isFilenameManuallyEdited, setIsFilenameManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; filename?: string }>({});
  const { toast, showToast, hideToast } = useToast();

  // Title değişince otomatik slug üret (kullanıcı manuel düzenlemezse)
  useEffect(() => {
    if (title && !isFilenameManuallyEdited) {
      const slug = generateSlug(title);
      setFilename(slug);
    }
  }, [title, isFilenameManuallyEdited]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: { title?: string; filename?: string } = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!filename.trim()) {
      newErrors.filename = 'Filename is required';
    } else if (!/^[a-z0-9-]+$/.test(filename)) {
      newErrors.filename = 'Filename can only contain lowercase letters, numbers, and hyphens';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the errors before continuing', 'error');
      return;
    }

    // Clear errors
    setErrors({});

    // Ensure .md extension
    const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    
    onCreate(finalFilename, title);
    
    // Show success message
    showToast('Post created successfully!', 'success');
    
    // Reset form
    setTitle('');
    setFilename('');
    setIsFilenameManuallyEdited(false);
  };

  const handleClose = () => {
    setTitle('');
    setFilename('');
    setIsFilenameManuallyEdited(false);
    setErrors({});
    hideToast();
    onClose();
  };

  const handleFilenameChange = (value: string) => {
    setFilename(value);
    setIsFilenameManuallyEdited(true);
    // Clear filename error when user starts typing
    if (errors.filename) {
      setErrors(prev => ({ ...prev, filename: undefined }));
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Clear title error when user starts typing
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: undefined }));
    }
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
      
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-background rounded-lg shadow-xl border border-border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Create New Post</h2>
                <p className="text-sm text-muted-foreground">Add a new markdown file</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-9 w-9 rounded-md hover:bg-accent transition-colors inline-flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Title Field */}
            <div className="space-y-2">
              <label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Title <span className="text-destructive">*</span>
              </label>
              <div className="relative group">
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="My Awesome Blog Post"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground focus:outline-none transition-all ${
                    errors.title 
                      ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20' 
                      : 'border-input focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50'
                  }`}
                  autoFocus
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                />
              </div>
              {errors.title && (
                <div id="title-error" className="flex items-center gap-1.5 text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{errors.title}</p>
                </div>
              )}
            </div>

            {/* Filename Field */}
            <div className="space-y-2">
              <label htmlFor="filename" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Filename <span className="text-destructive">*</span>
              </label>
              <div className="relative group">
                <input
                  id="filename"
                  type="text"
                  value={filename}
                  onChange={(e) => handleFilenameChange(e.target.value)}
                  placeholder="my-awesome-blog-post"
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground focus:outline-none font-mono transition-all ${
                    errors.filename 
                      ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20' 
                      : 'border-input focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50'
                  }`}
                  aria-invalid={!!errors.filename}
                  aria-describedby={errors.filename ? 'filename-error' : undefined}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs font-mono pointer-events-none">
                  .md
                </div>
              </div>
              {errors.filename ? (
                <div id="filename-error" className="flex items-center gap-1.5 text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{errors.filename}</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {isFilenameManuallyEdited ? (
                    <>
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span>Will be saved as <span className="font-mono font-medium text-foreground">{filename || 'filename'}.md</span></span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>Auto-generated from title</span>
                    </>
                  )}
                </div>
              )}
            </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t bg-muted/30 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}


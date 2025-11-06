import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
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
      
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
        onClick={handleClose}
      >
      <div 
        className="bg-background border-t sm:border border-border rounded-t-2xl sm:rounded-lg shadow-lg w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-4 border-b shrink-0">
          <h2 className="text-lg sm:text-lg font-semibold">Create New Post</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-md transition-colors touch-target inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-4 space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="My Awesome Blog Post"
                className={`w-full px-4 py-3 text-base rounded-lg border-2 bg-background text-foreground focus:outline-none touch-target transition-colors ${
                  errors.title 
                    ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20' 
                    : 'border-input focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
                autoFocus
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title ? (
                <div id="title-error" className="flex items-start gap-2 text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errors.title}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enter the title of your post
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="filename" className="block text-sm font-medium">
                Filename (Slug) <span className="text-destructive">*</span>
              </label>
              <input
                id="filename"
                type="text"
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="my-awesome-blog-post"
                className={`w-full px-4 py-3 text-base rounded-lg border-2 bg-background text-foreground focus:outline-none touch-target font-mono transition-colors ${
                  errors.filename 
                    ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20' 
                    : 'border-input focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
                aria-invalid={!!errors.filename}
                aria-describedby={errors.filename ? 'filename-error' : undefined}
              />
              {errors.filename ? (
                <div id="filename-error" className="flex items-start gap-2 text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errors.filename}</p>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {isFilenameManuallyEdited ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span>Custom filename</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Will be saved as <span className="font-mono font-medium text-foreground">{filename || 'filename'}.md</span></span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span>✨ Auto-generated from title</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Edit to customize</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Sticky on mobile */}
          <div className="sticky bottom-0 bg-background border-t p-4 sm:p-4 mt-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="sm:flex-1 order-2 sm:order-1 px-4 py-1.5 rounded-lg border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 transition-colors touch-target text-base font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sm:flex-1 order-1 sm:order-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-colors touch-target text-base font-semibold shadow-lg shadow-primary/20"
              >
                Create Post
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}


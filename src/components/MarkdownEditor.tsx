import { TiptapEditor } from './TiptapEditor';
import { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Eye, Sparkles } from 'lucide-react';
import { AIGeneratorModal } from './AIGeneratorModal';
import type { AIGeneratedContent } from '@/types/ai-providers';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  autoFocus?: boolean;
  onMetaChange?: (meta: Record<string, any>) => void;
}

type EditorMode = 'tiptap' | 'raw';

// Configure marked for parsing markdown to HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Configure turndown for converting HTML to markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

export function MarkdownEditor({ content, onChange, title, onTitleChange, autoFocus = false, onMetaChange }: MarkdownEditorProps) {
  const [htmlContent, setHtmlContent] = useState(() => {
    // Initialize with converted HTML content if content exists
    return content ? (marked(content) as string) : '';
  });
  const [editorMode, setEditorMode] = useState<EditorMode>('tiptap');
  const [rawMarkdown, setRawMarkdown] = useState(content);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const isUpdatingFromEditor = useRef(false);
  const lastContent = useRef(content);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Convert markdown to HTML on initial load or when content changes from outside
  useEffect(() => {
    // Only update if the change came from outside (not from the editor itself)
    if (!isUpdatingFromEditor.current && content !== lastContent.current) {
      if (content) {
        const html = marked(content) as string;
        setHtmlContent(html);
        setRawMarkdown(content);
      } else {
        setHtmlContent('');
        setRawMarkdown('');
      }
      lastContent.current = content;
    }
  }, [content]);

  const handleChange = (html: string) => {
    // Convert HTML back to markdown
    const markdown = turndownService.turndown(html);
    
    // Only trigger onChange if content actually changed
    if (markdown !== lastContent.current) {
      isUpdatingFromEditor.current = true;
      lastContent.current = markdown;
      setRawMarkdown(markdown);
      onChange(markdown);
      // Reset flag after parent component updates
      setTimeout(() => {
        isUpdatingFromEditor.current = false;
      }, 0);
    }
  };

  const handleRawChange = (markdown: string) => {
    isUpdatingFromEditor.current = true;
    setRawMarkdown(markdown);
    lastContent.current = markdown;
    onChange(markdown);
    setTimeout(() => {
      isUpdatingFromEditor.current = false;
    }, 0);
  };

  // Auto-resize title textarea in raw mode
  useEffect(() => {
    if (editorMode === 'raw' && titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = titleTextareaRef.current.scrollHeight + 'px';
    }
  }, [title, editorMode]);

  // Auto-resize raw markdown textarea
  useEffect(() => {
    if (editorMode === 'raw' && rawTextareaRef.current) {
      rawTextareaRef.current.style.height = 'auto';
      rawTextareaRef.current.style.height = rawTextareaRef.current.scrollHeight + 'px';
    }
  }, [rawMarkdown, editorMode]);

  const toggleMode = () => {
    if (editorMode === 'tiptap') {
      // Switching to raw mode - ensure rawMarkdown is in sync
      setRawMarkdown(lastContent.current);
      setEditorMode('raw');
    } else {
      // Switching to tiptap mode - convert markdown to HTML
      const html = marked(rawMarkdown) as string;
      setHtmlContent(html);
      setEditorMode('tiptap');
    }
  };

  const handleAIGenerate = (generatedContent: AIGeneratedContent) => {
    // Update content - mark that this is coming from internal edit
    isUpdatingFromEditor.current = true;
    lastContent.current = generatedContent.content;
    setRawMarkdown(generatedContent.content);
    
    // Send content to parent first
    onChange(generatedContent.content);

    // Update HTML content for tiptap mode
    // This needs to happen AFTER onChange to keep editor in sync
    if (editorMode === 'tiptap') {
      const html = marked(generatedContent.content) as string;
      setHtmlContent(html);
    }

    // Update all metadata including title in a single atomic update
    // This prevents race conditions when multiple state updates happen
    if (onMetaChange) {
      onMetaChange({
        title: generatedContent.title,
        ...generatedContent.meta,
      });
    }
    // Note: We don't call onTitleChange separately because title is already
    // included in the meta update above. The editor will receive the updated
    // title through its title prop when the parent component re-renders.

    // Reset the flag immediately (next tick) to ensure subsequent edits work
    setTimeout(() => {
      isUpdatingFromEditor.current = false;
    }, 0);
  };

  if (editorMode === 'raw') {
    return (
      <>
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-background">
          <div className="w-full max-w-[680px] mx-auto px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:border-accent-foreground/20 transition-colors touch-target"
              title="Generate with AI"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden xs:inline">AI Generate</span>
              <span className="xs:hidden">AI</span>
            </button>
            <button
              onClick={toggleMode}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-target"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden xs:inline">Visual Editor</span>
              <span className="xs:hidden">Visual</span>
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div className="pt-4 sm:pt-6 -mb-2 px-4 sm:px-6">
          <textarea
            ref={titleTextareaRef}
            value={title === 'Untitled Post' ? '' : title}
            onChange={(e) => onTitleChange(e.target.value || 'Untitled Post')}
            placeholder="Untitled"
            rows={1}
            className="block w-full max-w-[680px] mx-auto text-3xl sm:text-4xl font-semibold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 p-0 leading-tight text-left resize-none overflow-hidden"
          />
        </div>

        {/* Raw Markdown Textarea */}
        <div className="py-4 sm:py-6 px-4 sm:px-6">
          <textarea
            ref={rawTextareaRef}
            value={rawMarkdown}
            onChange={(e) => handleRawChange(e.target.value)}
            autoFocus={autoFocus}
            placeholder="Start writing your markdown content..."
            className="block w-full max-w-[680px] mx-auto min-h-[400px] sm:min-h-[500px] resize-none border-none outline-none bg-transparent focus:ring-0 p-0 placeholder:text-muted-foreground/60 text-base sm:text-lg"
            style={{ 
              lineHeight: '1.68',
              letterSpacing: 'normal',
              color: 'hsl(var(--foreground))',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility',
              fontKerning: 'normal'
            }}
          />
        </div>

        {/* AI Generator Modal */}
        <AIGeneratorModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onGenerate={handleAIGenerate}
        />
      </>
    );
  }

  return (
    <>
      <TiptapEditor 
        content={htmlContent} 
        onChange={handleChange}
        title={title}
        onTitleChange={onTitleChange}
        autoFocus={autoFocus}
        onModeToggle={toggleMode}
        onAIGenerate={() => setIsAIModalOpen(true)}
      />
      
      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={handleAIGenerate}
      />
    </>
  );
}

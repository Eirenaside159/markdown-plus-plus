import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  Link2
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Write something amazing...',
      }),
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80 transition-colors',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Don't trigger onUpdate when setting content programmatically
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content);
      // Restore cursor position if possible
      try {
        editor.commands.setTextSelection({ from: Math.min(from, editor.state.doc.content.size), to: Math.min(to, editor.state.doc.content.size) });
      } catch {
        // Ignore cursor position errors
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Floating Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 p-2 bg-background border-b flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('bold') ? 'bg-accent text-primary' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('italic') ? 'bg-accent text-primary' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('code') ? 'bg-accent text-primary' : ''
          }`}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-accent text-primary' : ''
          }`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-accent text-primary' : ''
          }`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-accent text-primary' : ''
          }`}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('bulletList') ? 'bg-accent text-primary' : ''
          }`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('orderedList') ? 'bg-accent text-primary' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('blockquote') ? 'bg-accent text-primary' : ''
          }`}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={addLink}
          className={`p-2 rounded hover:bg-accent transition-colors ${
            editor.isActive('link') ? 'bg-accent text-primary' : ''
          }`}
          title="Add Link"
        >
          <Link2 className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded hover:bg-accent transition-colors"
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2 rounded hover:bg-accent transition-colors disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2 rounded hover:bg-accent transition-colors disabled:opacity-30"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Custom Styles */}
      <style>{`
        .ProseMirror {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }

        .ProseMirror h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 2.5rem;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }

        .ProseMirror h2 {
          font-size: 1.875rem;
          font-weight: 600;
          line-height: 2.25rem;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror h3 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 2rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror p {
          margin-bottom: 1rem;
          line-height: 1.75;
        }

        .ProseMirror strong {
          font-weight: 700;
          color: hsl(var(--foreground));
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror code {
          background-color: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
          font-family: ui-monospace, monospace;
        }

        .ProseMirror pre {
          background-color: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }

        .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin-bottom: 0.25rem;
        }

        .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 2rem 0;
        }

        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
        }

        .ProseMirror a:hover {
          color: hsl(var(--primary) / 0.8);
        }

        /* Task list styles */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          margin-top: 0.375rem;
        }

        /* Selection */
        .ProseMirror ::selection {
          background-color: hsl(var(--primary) / 0.2);
        }
      `}</style>
    </div>
  );
}


import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
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
  Table as TableIcon,
  Image as ImageIcon,
  Underline as UnderlineIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
}

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block in favor of lowlight
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block-lowlight',
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading';
          }
          return 'Start writing your content...';
        },
      }),
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80 transition-colors cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'table-editor',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: false,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content);
      try {
        editor.commands.setTextSelection({
          from: Math.min(from, editor.state.doc.content.size),
          to: Math.min(to, editor.state.doc.content.size),
        });
      } catch {
        // Ignore cursor position errors
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="tiptap-editor-wrapper flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="toolbar sticky top-0 z-10 flex items-center gap-1 p-3 bg-background/95 backdrop-blur border-b flex-wrap">
        {/* Text Formatting */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Headings */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Insert */}
        <div className="flex items-center gap-0.5">
          <button onClick={addImage} className="toolbar-btn" title="Add Image">
            <ImageIcon className="h-4 w-4" />
          </button>

          <button onClick={addTable} className="toolbar-btn" title="Insert Table">
            <TableIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="toolbar-btn"
            title="Horizontal Rule"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* History */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="toolbar-btn disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="toolbar-btn disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto editor-content-wrapper">
        <EditorContent editor={editor} />
      </div>

      {/* Styles */}
      <style>{`
        /* Toolbar Styles */
        .toolbar-btn {
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          color: hsl(var(--foreground));
        }

        .toolbar-btn:hover:not(:disabled) {
          background: hsl(var(--accent));
        }

        .toolbar-btn.active {
          background: hsl(var(--accent));
          color: hsl(var(--primary));
        }

        .toolbar-divider {
          width: 1px;
          height: 1.5rem;
          background: hsl(var(--border));
          margin: 0 0.5rem;
        }

        /* Editor Base Styles */
        .ProseMirror {
          outline: none;
        }

        /* Placeholder */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }

        /* Headings */
        .ProseMirror h1 {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 2rem;
          margin-bottom: 1rem;
          letter-spacing: -0.025em;
        }

        .ProseMirror h2 {
          font-size: 2rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1.75rem;
          margin-bottom: 0.875rem;
          letter-spacing: -0.0125em;
        }

        .ProseMirror h3 {
          font-size: 1.625rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        /* Paragraphs */
        .ProseMirror p {
          margin-bottom: 1rem;
          line-height: 1.75;
          font-size: 1.0625rem;
          color: hsl(var(--foreground));
        }

        /* Text Formatting */
        .ProseMirror strong {
          font-weight: 700;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror u {
          text-decoration: underline;
        }

        .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.9em;
          font-family: 'SF Mono', 'Roboto Mono', 'Courier New', monospace;
          color: hsl(var(--foreground));
        }

        .ProseMirror mark {
          background: hsl(var(--primary) / 0.2);
          padding: 0.125rem 0;
          border-radius: 0.125rem;
        }

        /* Code Blocks with Syntax Highlighting */
        .ProseMirror pre {
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1.5rem 0;
          overflow-x: auto;
          font-family: 'SF Mono', 'Roboto Mono', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.7;
        }

        .ProseMirror pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
          color: inherit;
        }

        /* Blockquote */
        .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
          font-size: 1.125rem;
        }

        /* Lists */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.75rem;
          margin: 1rem 0;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin-bottom: 0.5rem;
          line-height: 1.75;
        }

        .ProseMirror li p {
          margin: 0;
        }

        /* Task Lists */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }

        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          margin-top: 0.4rem;
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
          accent-color: hsl(var(--primary));
        }

        /* Horizontal Rule */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 3rem 0;
        }

        /* Links */
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
          cursor: pointer;
          text-underline-offset: 2px;
        }

        .ProseMirror a:hover {
          color: hsl(var(--primary) / 0.8);
        }

        /* Images */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          display: block;
        }

        /* Tables */
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5rem 0;
          overflow: hidden;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
        }

        .ProseMirror table td,
        .ProseMirror table th {
          min-width: 1em;
          border: 1px solid hsl(var(--border));
          padding: 0.75rem 1rem;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }

        .ProseMirror table th {
          font-weight: 600;
          text-align: left;
          background: hsl(var(--muted) / 0.5);
        }

        .ProseMirror table .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          background: hsl(var(--primary) / 0.1);
          pointer-events: none;
        }

        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: hsl(var(--primary));
          pointer-events: none;
        }

        /* Selection */
        .ProseMirror ::selection {
          background: hsl(var(--primary) / 0.2);
        }

        /* Bubble Menu */
        .bubble-menu {
          z-index: 50;
        }

        /* Slash Commands */
        .slash-commands {
          z-index: 50;
          min-width: 16rem;
          max-width: 24rem;
        }

        /* Smooth scrolling */
        .editor-content-wrapper {
          scroll-behavior: smooth;
        }

        /* Focus styles for better UX */
        .ProseMirror:focus {
          outline: none;
        }

        /* Better line spacing for readability */
        .ProseMirror > * + * {
          margin-top: 0.75em;
        }

        /* Syntax highlighting for code blocks */
        .hljs-comment,
        .hljs-quote {
          color: #6a737d;
          font-style: italic;
        }

        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-addition {
          color: #d73a49;
        }

        .hljs-number,
        .hljs-string,
        .hljs-meta .hljs-meta-string,
        .hljs-literal,
        .hljs-doctag,
        .hljs-regexp {
          color: #032f62;
        }

        .hljs-title,
        .hljs-section,
        .hljs-name,
        .hljs-selector-id,
        .hljs-selector-class {
          color: #6f42c1;
        }

        .hljs-attribute,
        .hljs-attr,
        .hljs-variable,
        .hljs-template-variable,
        .hljs-class .hljs-title,
        .hljs-type {
          color: #e36209;
        }

        .hljs-symbol,
        .hljs-bullet,
        .hljs-subst,
        .hljs-meta,
        .hljs-meta .hljs-keyword,
        .hljs-selector-attr,
        .hljs-selector-pseudo,
        .hljs-link {
          color: #005cc5;
        }

        .hljs-built_in,
        .hljs-deletion {
          color: #b31d28;
        }

        .hljs-formula {
          background-color: #eee;
        }

        .hljs-emphasis {
          font-style: italic;
        }

        .hljs-strong {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

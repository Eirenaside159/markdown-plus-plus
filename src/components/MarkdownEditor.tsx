import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('edit');

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4">
        <button
          onClick={() => setActiveTab('edit')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'edit'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'preview'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab('split')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'split'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
          }`}
        >
          Split
        </button>
      </div>

      {/* Content */}
      {activeTab === 'edit' && (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          placeholder="Write your markdown here..."
        />
      )}

      {activeTab === 'preview' && (
        <div className="flex-1 overflow-auto border rounded-md p-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {activeTab === 'split' && (
        <div className="flex-1 grid grid-cols-2 gap-4">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            placeholder="Write your markdown here..."
          />
          <div className="overflow-auto border rounded-md p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

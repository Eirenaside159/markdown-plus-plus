import { useEffect, useRef } from 'react';
import EditorJS, { type OutputData } from '@editorjs/editorjs';
// @ts-ignore - No type definitions
import Header from '@editorjs/header';
// @ts-ignore - No type definitions
import List from '@editorjs/list';
// @ts-ignore - No type definitions
import Quote from '@editorjs/quote';
// @ts-ignore - No type definitions
import Code from '@editorjs/code';
// @ts-ignore - No type definitions
import Embed from '@editorjs/embed';
// @ts-ignore - No type definitions
import Table from '@editorjs/table';
// @ts-ignore - No type definitions
import LinkTool from '@editorjs/link';
// @ts-ignore - No type definitions
import Checklist from '@editorjs/checklist';
// @ts-ignore - No type definitions
import Delimiter from '@editorjs/delimiter';
// @ts-ignore - No type definitions
import InlineCode from '@editorjs/inline-code';
// @ts-ignore - No type definitions
import Marker from '@editorjs/marker';
// @ts-ignore - No type definitions
import Underline from '@editorjs/underline';

interface EditorJSComponentProps {
  data: OutputData;
  onChange: (data: OutputData) => void;
  readOnly?: boolean;
}

export function EditorJSComponent({ data, onChange, readOnly = false }: EditorJSComponentProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const initialData = useRef(data);

  useEffect(() => {
    if (!holderRef.current || isInitialized.current) return;

    isInitialized.current = true;

    // Initialize Editor.js
    const editor = new EditorJS({
      holder: holderRef.current,
      data: initialData.current,
      readOnly: readOnly,
      placeholder: 'Start writing your content...',
      onChange: async () => {
        if (editorRef.current) {
          const outputData = await editorRef.current.save();
          onChange(outputData);
        }
      },
      tools: {
        header: {
          // @ts-expect-error - Plugin type definitions mismatch
          class: Header,
          config: {
            placeholder: 'Enter a header',
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2,
          },
        },
        list: {
          class: List,
          inlineToolbar: true,
          config: {
            defaultStyle: 'unordered',
          },
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Enter a quote',
            captionPlaceholder: 'Quote author',
          },
        },
        code: Code,
        embed: Embed,
        table: {
          // @ts-expect-error - Plugin type definitions mismatch
          class: Table,
          inlineToolbar: true,
        },
        linkTool: {
          class: LinkTool,
          config: {
            endpoint: '', // We're not using link preview
          },
        },
        checklist: {
          class: Checklist,
          inlineToolbar: true,
        },
        delimiter: Delimiter,
        inlineCode: {
          class: InlineCode,
          shortcut: 'CMD+SHIFT+M',
        },
        marker: {
          class: Marker,
          shortcut: 'CMD+SHIFT+H',
        },
        underline: Underline,
      },
    });

    editor.isReady
      .then(() => {
        editorRef.current = editor;
      })
      .catch(() => {
        // Silently handle initialization error
      });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []); // Initialize only once

  return (
    <div className="editorjs-wrapper">
      <div
        ref={holderRef}
        id="editorjs"
        className="prose prose-sm dark:prose-invert max-w-none"
      />
      <style>{`
        .editorjs-wrapper {
          height: 100%;
          overflow-y: auto;
        }
        
        .codex-editor__redactor {
          padding-bottom: 150px !important;
        }
        
        .ce-block__content,
        .ce-toolbar__content {
          max-width: 100%;
        }
        
        /* Toolbar buttons */
        .ce-toolbar__plus,
        .ce-toolbar__settings-btn {
          color: hsl(var(--foreground)) !important;
        }
        
        .ce-toolbar__plus:hover,
        .ce-toolbar__settings-btn:hover {
          background: hsl(var(--accent)) !important;
        }
        
        /* Settings button */
        .cdx-settings-button,
        .ce-settings__button {
          color: hsl(var(--foreground)) !important;
        }
        
        .cdx-settings-button:hover,
        .ce-settings__button:hover {
          background: hsl(var(--accent)) !important;
        }
        
        /* Block selection */
        .ce-block--selected .ce-block__content {
          background: hsl(var(--accent) / 0.3) !important;
        }
        
        /* Placeholder */
        .ce-paragraph[data-placeholder]:empty::before,
        .ce-header[data-placeholder]:empty::before {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        /* Code block */
        .ce-code__textarea {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }
        
        /* Table */
        .tc-table {
          color: hsl(var(--foreground)) !important;
        }
        
        .tc-table__cell {
          border: 1px solid hsl(var(--border)) !important;
        }
        
        /* Quote */
        .cdx-quote {
          color: hsl(var(--foreground)) !important;
        }
        
        .cdx-quote__text {
          color: hsl(var(--foreground)) !important;
        }
        
        .cdx-quote__caption {
          color: hsl(var(--muted-foreground)) !important;
        }
        
        /* Checklist */
        .cdx-checklist__item-checkbox {
          border: 1px solid hsl(var(--border)) !important;
        }
        
        .cdx-checklist__item-text {
          color: hsl(var(--foreground)) !important;
        }
        
        /* Link */
        .ce-inline-tool--link {
          color: hsl(var(--primary)) !important;
        }
        
        /* Delimiter */
        .ce-delimiter {
          color: hsl(var(--border)) !important;
        }
      `}</style>
    </div>
  );
}


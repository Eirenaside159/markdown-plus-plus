import type { OutputData } from '@editorjs/editorjs';

/**
 * Convert Markdown to Editor.js JSON format
 */
export function markdownToEditorJS(markdown: string): OutputData {
  const blocks: OutputData['blocks'] = [];
  const lines = markdown.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }
    
    // Headers (# ## ###)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      blocks.push({
        type: 'header',
        data: {
          text: headerMatch[2],
          level: headerMatch[1].length,
        },
      });
      i++;
      continue;
    }
    
    // Code blocks (```)
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        data: {
          code: codeLines.join('\n'),
        },
      });
      i++; // Skip closing ```
      continue;
    }
    
    // Unordered list (- or *)
    if (line.match(/^[\s]*[-*]\s+(.+)$/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s+(.+)$/)) {
        const itemMatch = lines[i].match(/^[\s]*[-*]\s+(.+)$/);
        if (itemMatch) {
          items.push(itemMatch[1]);
        }
        i++;
      }
      blocks.push({
        type: 'list',
        data: {
          style: 'unordered',
          items,
        },
      });
      continue;
    }
    
    // Ordered list (1. 2. 3.)
    if (line.match(/^[\s]*\d+\.\s+(.+)$/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s+(.+)$/)) {
        const itemMatch = lines[i].match(/^[\s]*\d+\.\s+(.+)$/);
        if (itemMatch) {
          items.push(itemMatch[1]);
        }
        i++;
      }
      blocks.push({
        type: 'list',
        data: {
          style: 'ordered',
          items,
        },
      });
      continue;
    }
    
    // Blockquote (>)
    if (line.match(/^>\s+(.+)$/)) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].match(/^>\s+(.+)$/)) {
        const quoteMatch = lines[i].match(/^>\s+(.+)$/);
        if (quoteMatch) {
          quoteLines.push(quoteMatch[1]);
        }
        i++;
      }
      blocks.push({
        type: 'quote',
        data: {
          text: quoteLines.join(' '),
          alignment: 'left',
        },
      });
      continue;
    }
    
    // Horizontal rule (--- or ***)
    if (line.match(/^[-*]{3,}$/)) {
      blocks.push({
        type: 'delimiter',
        data: {},
      });
      i++;
      continue;
    }
    
    // Regular paragraph
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^[#>`\-*\d]|^```/)) {
      paragraphLines.push(lines[i]);
      i++;
    }
    
    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        data: {
          text: paragraphLines.join(' '),
        },
      });
    }
  }
  
  return {
    time: Date.now(),
    blocks,
    version: '2.28.2',
  };
}

/**
 * Convert Editor.js JSON to Markdown
 */
export function editorJSToMarkdown(data: OutputData): string {
  const lines: string[] = [];
  
  for (const block of data.blocks) {
    switch (block.type) {
      case 'header':
        lines.push(`${'#'.repeat(block.data.level || 1)} ${block.data.text}`);
        lines.push('');
        break;
        
      case 'paragraph':
        lines.push(block.data.text || '');
        lines.push('');
        break;
        
      case 'list':
        if (block.data.style === 'ordered') {
          block.data.items?.forEach((item: string, idx: number) => {
            lines.push(`${idx + 1}. ${item}`);
          });
        } else {
          block.data.items?.forEach((item: string) => {
            lines.push(`- ${item}`);
          });
        }
        lines.push('');
        break;
        
      case 'quote':
        const quoteText = block.data.text || '';
        quoteText.split('\n').forEach((line: string) => {
          lines.push(`> ${line}`);
        });
        lines.push('');
        break;
        
      case 'code':
        lines.push('```');
        lines.push(block.data.code || '');
        lines.push('```');
        lines.push('');
        break;
        
      case 'delimiter':
        lines.push('---');
        lines.push('');
        break;
        
      case 'table':
        if (block.data.content && Array.isArray(block.data.content)) {
          block.data.content.forEach((row: string[]) => {
            lines.push(`| ${row.join(' | ')} |`);
          });
        }
        lines.push('');
        break;
        
      default:
        // For unknown blocks, try to extract text
        if (block.data.text) {
          lines.push(block.data.text);
          lines.push('');
        }
    }
  }
  
  return lines.join('\n').trim();
}


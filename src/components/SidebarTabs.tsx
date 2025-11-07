import { useState } from 'react';
import { FileText, Link2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { MetaEditor } from './MetaEditor';
import { CanonicalRelated } from './CanonicalRelated';
import type { MarkdownFile } from '@/types';

interface SidebarTabsProps {
  currentFile: MarkdownFile | null;
  allPosts: MarkdownFile[];
  onMetaChange: (frontmatter: MarkdownFile['frontmatter']) => void;
  onPostClick: (post: MarkdownFile) => void;
  onFileNameChange?: (newFileName: string) => void;
}

export function SidebarTabs({ currentFile, allPosts, onMetaChange, onPostClick, onFileNameChange }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('meta');

  // Count canonical related posts
  const canonicalCount = (() => {
    if (!currentFile) return 0;
    
    const canonical = currentFile.frontmatter.canonical || currentFile.frontmatter.canonical_url;
    if (!canonical) return 0;
    
    const canonicalUrl = String(canonical).trim();
    return allPosts.filter(post => {
      if (post.path === currentFile.path) return false;
      const postCanonical = post.frontmatter.canonical || post.frontmatter.canonical_url;
      return postCanonical && String(postCanonical).trim() === canonicalUrl;
    }).length;
  })();

  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No file selected</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
      <TabsList className="w-full grid grid-cols-2 h-14 shrink-0 rounded-none border-b bg-background p-0">
        <TabsTrigger 
          value="meta" 
          className="gap-2 rounded-none h-14 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
        >
          <FileText className="h-4 w-4" />
          Metadata
        </TabsTrigger>
        <TabsTrigger 
          value="canonical" 
          disabled={canonicalCount === 0} 
          className="gap-2 rounded-none h-14 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
        >
          <Link2 className="h-4 w-4" />
          Canonical
          {canonicalCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
              {canonicalCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="meta" className="flex-1 overflow-y-auto overflow-x-visible data-[state=active]:block mt-0 pt-6 pb-6 px-6">
        <MetaEditor
          frontmatter={currentFile.frontmatter}
          onChange={onMetaChange}
          allPosts={allPosts}
          fileName={currentFile.name}
          onFileNameChange={onFileNameChange}
        />
      </TabsContent>

      <TabsContent value="canonical" className="flex-1 overflow-y-auto overflow-x-visible data-[state=active]:block mt-0 pt-6 pb-6 px-6">
        <CanonicalRelated
          currentPost={currentFile}
          allPosts={allPosts}
          onPostClick={onPostClick}
        />
      </TabsContent>
    </Tabs>
  );
}


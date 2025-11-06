import { useState } from 'react';
import { FileText, Link2 } from 'lucide-react';
import { MetaEditor } from './MetaEditor';
import { CanonicalRelated } from './CanonicalRelated';
import type { MarkdownFile } from '@/types';

interface SidebarTabsProps {
  currentFile: MarkdownFile | null;
  allPosts: MarkdownFile[];
  onMetaChange: (frontmatter: MarkdownFile['frontmatter']) => void;
  onPostClick: (post: MarkdownFile) => void;
}

type TabType = 'meta' | 'canonical';

export function SidebarTabs({ currentFile, allPosts, onMetaChange, onPostClick }: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('meta');

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

  const tabs = [
    {
      id: 'meta' as const,
      label: 'Meta',
      icon: FileText,
      count: null,
      disabled: !currentFile,
    },
    {
      id: 'canonical' as const,
      label: 'Canonical',
      icon: Link2,
      count: canonicalCount > 0 ? canonicalCount : null,
      disabled: !currentFile || canonicalCount === 0,
    },
  ];


  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;
          
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-4 text-sm font-medium transition-colors
                ${isActive 
                  ? 'text-foreground border-b-2 border-primary -mb-[1px]' 
                  : isDisabled
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'meta' && currentFile && (
          <MetaEditor
            frontmatter={currentFile.frontmatter}
            onChange={onMetaChange}
            allPosts={allPosts}
          />
        )}
        
        {activeTab === 'canonical' && currentFile && (
          <CanonicalRelated
            currentPost={currentFile}
            allPosts={allPosts}
            onPostClick={onPostClick}
          />
        )}

        {!currentFile && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No file selected</p>
          </div>
        )}
      </div>
    </div>
  );
}


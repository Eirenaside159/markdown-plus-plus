import { useState, useEffect } from 'react';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { PostsDataTable } from '@/components/PostsDataTable';
import { RawMarkdownModal } from '@/components/RawMarkdownModal';
import { PublishModal } from '@/components/PublishModal';
import { SidebarTabs } from '@/components/SidebarTabs';
import { Settings } from '@/components/Settings';
import { Sheet, SheetContent } from '@/components/ui/Sheet';
import { toast } from 'sonner';
import { WelcomeWarningModal, shouldShowWarning } from '@/components/WelcomeWarningModal';
import { FileBrowser } from '@/components/FileBrowser';
import confetti from 'canvas-confetti';
import { selectDirectory, readFile, writeFile, deleteFile, renameFile, moveFile, isFileSystemAccessSupported } from '@/lib/fileSystem';
import { parseMarkdown, stringifyMarkdown, updateFrontmatter } from '@/lib/markdown';
import { getRecentFolders, addRecentFolder, clearRecentFolders, formatTimestamp } from '@/lib/recentFolders';
import { getSettings, saveSettings } from '@/lib/settings';
import { setTheme } from '@/lib/theme';
import { saveDirectoryHandle, loadDirectoryHandle, saveAppState, loadAppState, clearPersistedData } from '@/lib/persistedState';
import { subscribePosts, initializePosts, refreshPosts, refreshFileTree, applyPostAdded, applyPostUpdated, applyPostDeleted, applyPostPathChanged } from '@/lib/postsStore';
import { checkGitStatus, publishFile, generateCommitMessage, type GitStatus } from '@/lib/gitOperations';
import { hideFile, getHiddenFiles } from '@/lib/hiddenFiles';
import { updateFaviconBadge } from '@/lib/faviconBadge';
import type { FileTreeItem, MarkdownFile } from '@/types';
import { FolderOpen, Save, Clock, FileCode, Plus, RotateCcw, Settings as SettingsIcon, Github, AlertCircle, Upload, Lightbulb, ChevronDown, PanelRightOpen, Loader2, BookOpen, Sun, Moon, Monitor, LogOut, Eye } from 'lucide-react';

type ViewMode = 'table' | 'editor' | 'settings';

// Demo sample posts
const DEMO_POSTS: MarkdownFile[] = [
  {
    name: 'welcome.md',
    path: 'welcome.md',
    content: `This is a **sample markdown document** to demonstrate the features of the Markdown++ application.

## Features

- Edit markdown content with live preview
- Manage frontmatter metadata
- Categories and tags support
- Beautiful UI with Shadcn components
- Multi-language support

## Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Lists

### Unordered List
- Item 1
- Item 2
- Item 3

### Ordered List
1. First
2. Second
3. Third

## Blockquote

> This is a blockquote example.
> It can span multiple lines.

## Links and Images

[Visit OpenAI](https://openai.com)

## Table

| Feature | Status |
|---------|--------|
| Edit | ✅ |
| Preview | ✅ |
| Metadata | ✅ |

## Conclusion

Enjoy using Markdown++!
`,
    frontmatter: {
      title: "Welcome to Markdown++",
      author: "John Doe",
      date: "2025-11-08",
      description: "A sample markdown file for testing the markdown admin interface",
      image: "https://picsum.photos/400/300",
      categories: ["Tutorial", "Documentation"],
      tags: ["markdown", "sample", "welcome"]
    },
    rawContent: ''
  },
  {
    name: 'getting-started.md',
    path: 'guides/getting-started.md',
    content: `Learn how to use Markdown++ effectively.

## Quick Start

1. Select or create a folder
2. Browse your markdown files
3. Edit and save changes
4. Publish to Git when ready

## Tips

- Use the file tree to organize content
- Leverage frontmatter for metadata
- Save with Cmd/Ctrl + S
`,
    frontmatter: {
      title: "Getting Started Guide",
      author: "John Doe",
      date: "2025-11-07",
      description: "Quick start guide for Markdown++",
      categories: ["Tutorial", "Guide"],
      tags: ["getting-started", "tutorial"]
    },
    rawContent: ''
  },
  {
    name: 'advanced-features.md',
    path: 'guides/advanced-features.md',
    content: `Explore the advanced capabilities of Markdown++.

## Git Integration

- Automatic commit messages
- Branch management
- Push to remote

## File Organization

- Nested folders
- Drag and drop
- Search and filter

## Metadata Management

- Custom fields
- Date formatting
- Category organization
`,
    frontmatter: {
      title: "Advanced Features",
      author: "Jane Smith",
      date: "2025-11-06",
      categories: ["Tutorial", "Advanced"],
      tags: ["advanced", "features", "git"]
    },
    rawContent: ''
  },
  {
    name: 'willkommen.md',
    path: 'de/willkommen.md',
    content: `Dies ist ein **Beispiel-Markdown-Dokument** auf Deutsch.

## Funktionen

- Markdown-Inhalte mit Live-Vorschau bearbeiten
- Frontmatter-Metadaten verwalten
- Kategorien und Tags unterstützen
- Schöne Benutzeroberfläche

## Beispielcode

\`\`\`javascript
function hallo() {
  console.log("Hallo Welt!");
}
\`\`\`

## Listen

### Unsortierte Liste
- Punkt 1
- Punkt 2
- Punkt 3

## Fazit

Viel Spaß mit Markdown++!
`,
    frontmatter: {
      title: "Willkommen bei Markdown++",
      author: "Hans Mueller",
      date: "2025-11-05",
      description: "Ein Beispiel-Markdown-Dokument auf Deutsch",
      language: "de",
      categories: ["Tutorial", "Deutsch"],
      tags: ["markdown", "beispiel", "deutsch"]
    },
    rawContent: ''
  },
  {
    name: 'anleitung.md',
    path: 'de/anleitung.md',
    content: `Eine umfassende Anleitung zur Verwendung von Markdown++.

## Erste Schritte

1. Ordner auswählen oder erstellen
2. Markdown-Dateien durchsuchen
3. Änderungen bearbeiten und speichern
4. Bei Bedarf in Git veröffentlichen

## Wichtige Funktionen

- **Dateibaum**: Organisieren Sie Ihre Inhalte
- **Metadaten**: Verwalten Sie Frontmatter
- **Vorschau**: Live-Vorschau beim Bearbeiten

## Tastenkombinationen

- Speichern: Cmd/Strg + S
- Vorschau: Live während der Eingabe
`,
    frontmatter: {
      title: "Anleitung für Markdown++",
      author: "Anna Schmidt",
      date: "2025-11-04",
      description: "Vollständige Anleitung auf Deutsch",
      language: "de",
      categories: ["Anleitung", "Tutorial"],
      tags: ["anleitung", "hilfe", "tutorial"]
    },
    rawContent: ''
  },
  {
    name: 'bienvenue.md',
    path: 'fr/bienvenue.md',
    content: `Ceci est un **exemple de document Markdown** en français.

## Fonctionnalités

- Éditer du contenu Markdown avec aperçu en direct
- Gérer les métadonnées frontmatter
- Support des catégories et tags
- Belle interface utilisateur

## Exemple de Code

\`\`\`javascript
function bonjour() {
  console.log("Bonjour le monde!");
}
\`\`\`

## Listes

### Liste non ordonnée
- Élément 1
- Élément 2
- Élément 3

## Citation

> Ceci est un exemple de citation.
> Elle peut s'étendre sur plusieurs lignes.

## Conclusion

Profitez de Markdown++!
`,
    frontmatter: {
      title: "Bienvenue dans Markdown++",
      author: "Marie Dubois",
      date: "2025-11-03",
      description: "Un exemple de document Markdown en français",
      language: "fr",
      categories: ["Tutoriel", "Français"],
      tags: ["markdown", "exemple", "français"]
    },
    rawContent: ''
  },
  {
    name: 'guide-utilisateur.md',
    path: 'fr/guide-utilisateur.md',
    content: `Un guide complet pour utiliser Markdown++.

## Démarrage Rapide

1. Sélectionner ou créer un dossier
2. Parcourir vos fichiers Markdown
3. Éditer et enregistrer les modifications
4. Publier sur Git si nécessaire

## Fonctionnalités Principales

- **Arborescence**: Organisez votre contenu
- **Métadonnées**: Gérez le frontmatter
- **Aperçu**: Aperçu en direct pendant l'édition

## Raccourcis Clavier

- Enregistrer: Cmd/Ctrl + S
- Aperçu: En direct pendant la saisie
`,
    frontmatter: {
      title: "Guide de l'utilisateur",
      author: "Pierre Martin",
      date: "2025-11-02",
      description: "Guide complet en français",
      language: "fr",
      categories: ["Guide", "Documentation"],
      tags: ["guide", "aide", "documentation"]
    },
    rawContent: ''
  },
  {
    name: 'giris.md',
    path: 'tr/giris.md',
    content: `Bu, Türkçe **örnek bir Markdown belgesidir**.

## Özellikler

- Canlı önizleme ile Markdown içeriği düzenleme
- Frontmatter metadata yönetimi
- Kategori ve etiket desteği
- Güzel kullanıcı arayüzü

## Kod Örneği

\`\`\`javascript
function merhaba() {
  console.log("Merhaba Dünya!");
}
\`\`\`

## Listeler

### Sırasız Liste
- Öğe 1
- Öğe 2
- Öğe 3

### Sıralı Liste
1. Birinci
2. İkinci
3. Üçüncü

## Alıntı

> Bu bir alıntı örneğidir.
> Birden fazla satıra yayılabilir.

## Sonuç

Markdown++ ile keyifli çalışmalar!
`,
    frontmatter: {
      title: "Markdown++ 'a Hoş Geldiniz",
      author: "Ahmet Yılmaz",
      date: "2025-11-01",
      description: "Türkçe örnek Markdown belgesi",
      language: "tr",
      categories: ["Eğitim", "Türkçe"],
      tags: ["markdown", "örnek", "türkçe"]
    },
    rawContent: ''
  },
  {
    name: 'kullanim-klavuzu.md',
    path: 'tr/kullanim-klavuzu.md',
    content: `Markdown++ uygulamasını etkin bir şekilde kullanmayı öğrenin.

## Hızlı Başlangıç

1. Klasör seçin veya oluşturun
2. Markdown dosyalarınıza göz atın
3. Değişiklikleri düzenleyin ve kaydedin
4. Hazır olduğunuzda Git'e yayınlayın

## Ana Özellikler

- **Dosya Ağacı**: İçeriğinizi organize edin
- **Metadata**: Frontmatter yönetin
- **Önizleme**: Düzenleme sırasında canlı önizleme

## Kısayol Tuşları

- Kaydet: Cmd/Ctrl + S
- Önizleme: Yazarken canlı
`,
    frontmatter: {
      title: "Kullanım Kılavuzu",
      author: "Ayşe Demir",
      date: "2025-10-31",
      description: "Türkçe kullanım kılavuzu",
      language: "tr",
      categories: ["Kılavuz", "Dokümantasyon"],
      tags: ["kılavuz", "yardım", "dokümantasyon"]
    },
    rawContent: ''
  },
  {
    name: 'bienvenido.md',
    path: 'es/bienvenido.md',
    content: `Este es un **documento de ejemplo en Markdown** en español.

## Características

- Editar contenido Markdown con vista previa en vivo
- Gestionar metadatos frontmatter
- Soporte para categorías y etiquetas
- Hermosa interfaz de usuario

## Ejemplo de Código

\`\`\`javascript
function hola() {
  console.log("¡Hola Mundo!");
}
\`\`\`

## Listas

### Lista desordenada
- Elemento 1
- Elemento 2
- Elemento 3

## Cita

> Este es un ejemplo de cita.
> Puede abarcar múltiples líneas.

## Conclusión

¡Disfruta de Markdown++!
`,
    frontmatter: {
      title: "Bienvenido a Markdown++",
      author: "Carlos García",
      date: "2025-10-30",
      description: "Un documento de ejemplo en español",
      language: "es",
      categories: ["Tutorial", "Español"],
      tags: ["markdown", "ejemplo", "español"]
    },
    rawContent: ''
  },
  {
    name: 'web-development.md',
    path: 'blog/web-development.md',
    content: `The landscape of web development continues to evolve rapidly.

## Key Trends

- **React & Next.js**: Still dominating the frontend
- **TypeScript**: Now the standard
- **AI Integration**: ChatGPT and AI assistants everywhere
- **Edge Computing**: Faster, closer to users

## Best Practices

1. Use TypeScript for type safety
2. Implement proper error handling
3. Optimize for performance
4. Focus on accessibility

## Tools We Love

- Vite for fast builds
- Tailwind CSS for styling
- Shadcn/ui for components
`,
    frontmatter: {
      title: "Modern Web Development in 2025",
      author: "Sarah Johnson",
      date: "2025-10-28",
      description: "Exploring the current state of web development",
      categories: ["Blog", "Technology", "Web Development"],
      tags: ["webdev", "react", "typescript", "2025"]
    },
    rawContent: ''
  },
  {
    name: 'productivity-tips.md',
    path: 'blog/productivity-tips.md',
    content: `Boost your productivity with these proven strategies.

## 1. Use the Right Tools

Choose tools that enhance your workflow, not complicate it.

## 2. Organize Your Files

A well-organized project structure saves time.

## 3. Write Documentation

Document as you go, not after.

## 4. Learn Keyboard Shortcuts

Speed up your workflow significantly.

## 5. Take Regular Breaks

Avoid burnout and maintain focus.

## 6. Automate Repetitive Tasks

Use scripts and tools to automate.

## 7. Keep Learning

Stay updated with new technologies.

## 8. Code Reviews Matter

Learn from others and improve your code.

## 9. Test Early, Test Often

Catch bugs before they become problems.

## 10. Focus on One Task

Multitasking is a myth for developers.
`,
    frontmatter: {
      title: "10 Productivity Tips for Developers",
      author: "Mike Chen",
      date: "2025-10-25",
      description: "Proven strategies to boost developer productivity",
      categories: ["Blog", "Productivity"],
      tags: ["productivity", "tips", "development", "workflow"]
    },
    rawContent: ''
  },
  {
    name: 'typescript-guide.md',
    path: 'tutorials/typescript-guide.md',
    content: `A comprehensive guide to writing better TypeScript code.

## Why TypeScript?

- Type safety prevents bugs
- Better IDE support
- Improved code documentation
- Easier refactoring

## Basic Types

\`\`\`typescript
const name: string = "John";
const age: number = 30;
const isActive: boolean = true;
\`\`\`

## Interfaces

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}
\`\`\`

## Generics

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
\`\`\`

## Conclusion

TypeScript makes JavaScript development more robust and maintainable.
`,
    frontmatter: {
      title: "TypeScript Best Practices",
      author: "Emily Davis",
      date: "2025-10-20",
      description: "Learn TypeScript best practices",
      categories: ["Tutorial", "Programming"],
      tags: ["typescript", "javascript", "programming", "tutorial"]
    },
    rawContent: ''
  },
  {
    name: 'react-hooks.md',
    path: 'tutorials/react-hooks.md',
    content: `Master React Hooks for modern component development.

## useState

\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

## useEffect

\`\`\`jsx
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

## useCallback

\`\`\`jsx
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]
);
\`\`\`

## useMemo

\`\`\`jsx
const memoizedValue = useMemo(() => 
  computeExpensiveValue(a, b), 
  [a, b]
);
\`\`\`

## Best Practices

- Don't call Hooks inside loops or conditions
- Always declare Hooks at the top level
- Use ESLint plugin for rules enforcement
`,
    frontmatter: {
      title: "Understanding React Hooks",
      author: "David Wilson",
      date: "2025-10-15",
      description: "Complete guide to React Hooks",
      categories: ["Tutorial", "React"],
      tags: ["react", "hooks", "javascript", "frontend"]
    },
    rawContent: ''
  },
  {
    name: 'git-workflows.md',
    path: 'tutorials/git-workflows.md',
    content: `Learn effective Git workflows for collaborative development.

## Feature Branch Workflow

1. Create a feature branch
2. Make commits
3. Open a pull request
4. Code review
5. Merge to main

## Commit Message Guidelines

\`\`\`
feat: add new feature
fix: resolve bug
docs: update documentation
style: format code
refactor: restructure code
test: add tests
\`\`\`

## Best Practices

- Commit often, push regularly
- Write meaningful commit messages
- Keep commits atomic
- Use pull requests for code review
- Never force push to shared branches

## Useful Commands

\`\`\`bash
git status
git add .
git commit -m "message"
git push origin branch-name
git pull origin main
\`\`\`
`,
    frontmatter: {
      title: "Git Workflows for Teams",
      author: "Lisa Anderson",
      date: "2025-10-10",
      description: "Best practices for Git collaboration",
      categories: ["Tutorial", "Git"],
      tags: ["git", "version-control", "collaboration", "workflow"]
    },
    rawContent: ''
  },
  {
    name: 'release-notes-v1.md',
    path: 'releases/release-notes-v1.md',
    content: `## 🎉 Initial Release

Welcome to the first stable release of Markdown++!

## Features

- ✅ Markdown editing with live preview
- ✅ Frontmatter metadata management
- ✅ File tree navigation
- ✅ Git integration
- ✅ Multi-language support
- ✅ Dark mode
- ✅ Responsive design

## Technical Details

- Built with React 18
- TypeScript for type safety
- Tailwind CSS for styling
- Shadcn/ui components

## Known Issues

None at this time!

## What's Next?

- Cloud sync (v1.1)
- Collaborative editing (v1.2)
- Plugin system (v2.0)
`,
    frontmatter: {
      title: "Release Notes v1.0.0",
      author: "Release Team",
      date: "2025-11-08",
      description: "First stable release of Markdown++",
      categories: ["Release", "Announcement"],
      tags: ["release", "v1.0.0", "announcement"]
    },
    rawContent: ''
  }
];

// Demo file tree structure
const DEMO_FILE_TREE: FileTreeItem[] = [
  {
    name: 'blog',
    path: 'blog',
    isDirectory: true,
    children: [
      {
        name: 'web-development.md',
        path: 'blog/web-development.md',
        isDirectory: false
      },
      {
        name: 'productivity-tips.md',
        path: 'blog/productivity-tips.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'de',
    path: 'de',
    isDirectory: true,
    children: [
      {
        name: 'willkommen.md',
        path: 'de/willkommen.md',
        isDirectory: false
      },
      {
        name: 'anleitung.md',
        path: 'de/anleitung.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'es',
    path: 'es',
    isDirectory: true,
    children: [
      {
        name: 'bienvenido.md',
        path: 'es/bienvenido.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'fr',
    path: 'fr',
    isDirectory: true,
    children: [
      {
        name: 'bienvenue.md',
        path: 'fr/bienvenue.md',
        isDirectory: false
      },
      {
        name: 'guide-utilisateur.md',
        path: 'fr/guide-utilisateur.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'guides',
    path: 'guides',
    isDirectory: true,
    children: [
      {
        name: 'getting-started.md',
        path: 'guides/getting-started.md',
        isDirectory: false
      },
      {
        name: 'advanced-features.md',
        path: 'guides/advanced-features.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'releases',
    path: 'releases',
    isDirectory: true,
    children: [
      {
        name: 'release-notes-v1.md',
        path: 'releases/release-notes-v1.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'tr',
    path: 'tr',
    isDirectory: true,
    children: [
      {
        name: 'giris.md',
        path: 'tr/giris.md',
        isDirectory: false
      },
      {
        name: 'kullanim-klavuzu.md',
        path: 'tr/kullanim-klavuzu.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'tutorials',
    path: 'tutorials',
    isDirectory: true,
    children: [
      {
        name: 'typescript-guide.md',
        path: 'tutorials/typescript-guide.md',
        isDirectory: false
      },
      {
        name: 'react-hooks.md',
        path: 'tutorials/react-hooks.md',
        isDirectory: false
      },
      {
        name: 'git-workflows.md',
        path: 'tutorials/git-workflows.md',
        isDirectory: false
      }
    ]
  },
  {
    name: 'welcome.md',
    path: 'welcome.md',
    isDirectory: false
  }
];

// Typewriter hook for animated text
function useTypewriter(text: string, speed: number = 100) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete };
}

function App() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [allPosts, setAllPosts] = useState<MarkdownFile[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasPendingPublish, setHasPendingPublish] = useState(false); // Track if user saved but hasn't published yet
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showRawModal, setShowRawModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(() => {
    const saved = localStorage.getItem('isFileTreeVisible');
    return saved ? saved === 'true' : true; // Default true
  });
  const [fileTreeWidth, setFileTreeWidth] = useState(() => {
    const saved = localStorage.getItem('fileTreeWidth');
    return saved ? parseInt(saved, 10) : 256; // Default 256px (w-64 = 16rem = 256px)
  });
  const [isResizing, setIsResizing] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [isMovingFile, setIsMovingFile] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Centralized posts subscription (cache-first, serialized scanning)
  useEffect(() => {
    const unsubscribe = subscribePosts(({ posts, isLoading, fileTree }) => {
      setAllPosts(posts);
      setIsLoadingPosts(isLoading);
      setFileTree(fileTree);
    });
    return unsubscribe;
  }, []);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  
  // Always call the hook, but only use it when dirHandle is null
  const { displayedText } = useTypewriter('Markdown++', 80);

  // Check if warning should be shown on mount
  useEffect(() => {
    setShowWarningModal(shouldShowWarning());
  }, []);

  // Update page title
  useEffect(() => {
    if (viewMode === 'editor' && currentFile) {
      const baseTitle = currentFile.frontmatter.title === 'Untitled Post' 
        ? 'Untitled' 
        : (currentFile.frontmatter.title || currentFile.name || 'Untitled');
      document.title = `${baseTitle} - Markdown++`;
    } else if (viewMode === 'settings') {
      document.title = 'Settings - Markdown++';
    } else if (viewMode === 'table' && dirHandle) {
      document.title = `${dirHandle.name} - Markdown++`;
    } else {
      document.title = 'Markdown++';
    }
  }, [viewMode, currentFile, dirHandle]);

  // Update favicon badge based on changes (only in editor mode)
  useEffect(() => {
    const shouldShowBadge = viewMode === 'editor' && hasChanges;
    console.log('Favicon badge update:', { viewMode, hasChanges, shouldShowBadge });
    updateFaviconBadge(shouldShowBadge);
  }, [hasChanges, viewMode]);


  // Fast, non-blocking reload helper: refresh posts without clearing UI
  const reloadPosts = async () => {
    if (!dirHandle || isRefreshingPosts) return;
    setIsRefreshingPosts(true);
    try {
      // Cache-first: initializePosts loads from cache then refreshes in background
      await initializePosts(dirHandle);
    } finally {
      setIsRefreshingPosts(false);
    }
  };

  const handleStartDemo = () => {
    // Clear any existing toasts
    toast.dismiss();
    
    // Set demo mode
    setIsDemoMode(true);
    setAllPosts(DEMO_POSTS);
    setFileTree(DEMO_FILE_TREE);
    setViewMode('table');
    
    // Set a mock directory handle name for UI
    setDirHandle({ name: 'Demo Workspace' } as FileSystemDirectoryHandle);
    
    // Initialize browser history with table view
    window.history.replaceState({ viewMode: 'table' }, '', '#table');
    
    toast.success('Welcome to the demo! 👋', { duration: 3000 });
  };

  const handleExitDemo = () => {
    if (hasChanges && !window.confirm('You have unsaved changes. Exit demo?')) {
      return;
    }
    
    // Clear demo state
    setIsDemoMode(false);
    setDirHandle(null);
    setAllPosts([]);
    setFileTree([]);
    setSelectedFolderPath(null);
    setCurrentFile(null);
    setSelectedFilePath(null);
    setHasChanges(false);
    setViewMode('table');
    
    toast.info('Demo exited');
  };

  const handleSelectDirectory = async () => {
    // Check browser support first
    if (!isFileSystemAccessSupported()) {
      toast.error('File API not supported. Use desktop Chrome, Edge, or Safari 15.2+');
      return;
    }
    
    const handle = await selectDirectory();
    if (handle) {
      // Clear any existing toasts first
      toast.dismiss();
      
      setDirHandle(handle);
      addRecentFolder(handle);
      // Save to IndexedDB for persistence
      await saveDirectoryHandle(handle);
      
      // Centralized posts init (cache-first, serialized scan)
      await initializePosts(handle);
      
      const tree = await refreshFileTree(handle);
      await refreshPosts(handle, tree);
      
      // Initialize browser history with table view
      window.history.replaceState({ viewMode: 'table' }, '', '#table');
      
      // Check git status
      const status = await checkGitStatus(handle);
      setGitStatus(status);
      
      // Show git status to user
      if (!status.isGitRepo) {
        console.warn('⚠️ Git repository not found in:', handle.name);
        console.log('Selected folder:', handle.name);
        console.log('Error:', status.error);
        toast.info('Git not detected - publish limited');
      } else {
        console.log('✓ Git repository found in:', handle.name, '| Branch:', status.currentBranch);
      }
    }
  };

  // Restore directory and state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        // Try to load persisted directory handle
        const savedHandle = await loadDirectoryHandle();

        if (savedHandle) {
          // Clear any existing toasts
          toast.dismiss();

          // Set handle first so UI can render app shell immediately
          setDirHandle(savedHandle);
          addRecentFolder(savedHandle);

          // Prefill posts from cache if available for instant list
          // Load saved app state to choose fast path
          const savedState = await loadAppState();

          if (savedState?.viewMode === 'editor' && savedState.selectedFilePath) {
            // Fast path: open editor immediately without waiting for all posts
            window.history.replaceState(
              { viewMode: 'editor', filePath: savedState.selectedFilePath },
              '',
              '#editor'
            );

            // Load the currently edited file right away
            try {
              const fileContent = await readFile(savedHandle, savedState.selectedFilePath);
              const fileName = savedState.selectedFilePath.split('/').pop() || savedState.selectedFilePath;
              const parsed = parseMarkdown(fileContent, savedState.selectedFilePath, fileName);
              setCurrentFile(parsed);
              setSelectedFilePath(savedState.selectedFilePath);
              setShouldAutoFocus(false);
              setViewMode('editor');
            } catch (error) {
              // If file cannot be restored, fall back to table view
              console.warn('Could not restore file:', savedState.selectedFilePath);
              setViewMode('table');
              window.history.replaceState({ viewMode: 'table' }, '', '#table');
            }

            // Initialize posts and background refresh (cache-first)
            initializePosts(savedHandle);

            // Check git status in the background
            (async () => {
              const status = await checkGitStatus(savedHandle);
              setGitStatus(status);
            })();
          } else if (savedState?.viewMode && savedState.viewMode === 'settings') {
            // Fast path: open settings immediately without waiting for all posts
            setViewMode('settings');
            window.history.replaceState({ viewMode: 'settings' }, '', '#settings');

            // Initialize posts and background refresh (cache-first)
            initializePosts(savedHandle);

            // Check git status in the background
            (async () => {
              const status = await checkGitStatus(savedHandle);
              setGitStatus(status);
            })();
          } else {
            // Default path: load posts then apply view (table/settings)
            await initializePosts(savedHandle);

            if (savedState?.viewMode) {
              setViewMode(savedState.viewMode);
              const hash = savedState.viewMode === 'settings' ? '#settings' : '#table';
              window.history.replaceState({ viewMode: savedState.viewMode }, '', hash);
            } else {
              // No saved state, initialize with table view
              window.history.replaceState({ viewMode: 'table' }, '', '#table');
            }

            // Check git status
            const status = await checkGitStatus(savedHandle);
            setGitStatus(status);
            if (!status.isGitRepo) {
              console.warn('⚠️ Restored folder is not a Git repository');
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore state:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreState();
  }, []);

  const handleLogout = async () => {
    // Check for unsaved changes
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them and logout?')) {
      return;
    }

    // Clear any existing toasts
    toast.dismiss();

    // Clear persisted data from IndexedDB
    await clearPersistedData();

    // Clear state
    setDirHandle(null);
    setAllPosts([]);
    setSelectedFilePath(null);
    setCurrentFile(null);
    setHasChanges(false);
    setViewMode('table');
    
    // Don't show toast - the UI change (back to folder selection) is clear enough
  };

  const handleClearRecent = () => {
    if (window.confirm('Clear all recent folders?')) {
      clearRecentFolders();
      // Don't show toast before reload - it won't be visible anyway
      window.location.reload();
    }
  };

  const handleDiscardChanges = async () => {
    if (!currentFile || !dirHandle || !selectedFilePath || !hasChanges) return;

    const confirmMsg = 'Discard all unsaved changes?\n\nThis action cannot be undone.';
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      // Reload the file from disk
      const fileContent = await readFile(dirHandle, selectedFilePath);
      const parsed = parseMarkdown(fileContent, selectedFilePath, currentFile.name);
      
      setCurrentFile(parsed);
      setHasChanges(false);
      setHasPendingPublish(false); // Clear publish flag when discarding
      toast.info('Changes discarded');
    } catch (error) {
      toast.error('Failed to discard changes');
    }
  };

  const handleEditPost = (post: MarkdownFile) => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setCurrentFile(post);
    setSelectedFilePath(post.path);
    setHasChanges(false);
    setHasPendingPublish(false); // Reset publish flag when switching files
    setShouldAutoFocus(false); // Don't auto-focus when editing existing posts
    setViewMode('editor');
    
    // Save state (skip in demo mode)
    if (!isDemoMode) {
      saveAppState({
        selectedFilePath: post.path,
        viewMode: 'editor',
      });
    }
    
    // Push to browser history
    window.history.pushState({ viewMode: 'editor', filePath: post.path }, '', '#editor');
  };

  const handleDeletePost = async (post: MarkdownFile) => {
    if (!dirHandle) return;

    const confirmMsg = `Are you sure you want to delete "${post.frontmatter.title || post.name}"?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await deleteFile(dirHandle, post.path);

      // Update centralized posts store and refresh file tree
      await applyPostDeleted(dirHandle.name, post.path);
      await refreshFileTree(dirHandle);

      // Clear current file if it was deleted
      if (currentFile?.path === post.path) {
        setCurrentFile(null);
        setSelectedFilePath(null);
        setHasChanges(false);
        setHasPendingPublish(false);
      }

      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete file');
      setIsLoadingPosts(false);
    }
  };

  const handleHidePost = (post: MarkdownFile) => {
    if (!dirHandle) return;

    hideFile(dirHandle.name, post.path);
    toast.info(`"${post.frontmatter.title || post.name}" hidden`);
  };

  const handleCreatePost = async () => {
    if (isDemoMode) {
      toast.info('Creating posts is disabled in demo mode');
      return;
    }
    
    if (!dirHandle || isCreatingPost) return;

    try {
      setIsCreatingPost(true);
      
      // Generate temporary filename with timestamp
      const timestamp = Date.now();
      const baseFilename = `new-post-${timestamp}.md`;
      
      // If a folder is selected in file tree, create the file there
      const filePath = selectedFolderPath 
        ? `${selectedFolderPath}/${baseFilename}`
        : baseFilename;
      
      const title = 'Untitled Post';
      
      // Get default meta from settings
      const settings = getSettings();
      const defaultMeta = settings.defaultMeta || {};
      
      // Create new post with minimal frontmatter (user-configured defaults only)
      const newPost: MarkdownFile = {
        name: baseFilename,
        path: filePath,
        content: '',
        frontmatter: {
          title: title,
          // Merge in default meta from settings (explicit user intent)
          ...defaultMeta,
        },
        rawContent: '',
      };

      // Convert to markdown string and write to file
      const content = stringifyMarkdown(newPost);
      await writeFile(dirHandle, filePath, content);
      
      // Set rawContent to the saved content so View Changes can compare properly
      newPost.rawContent = content;

      // Immediately switch to editor with the new post
      setCurrentFile(newPost);
      setSelectedFilePath(filePath);
      setHasChanges(false);
      setHasPendingPublish(true);
      setShouldAutoFocus(true); // Auto-focus when creating new post
      setViewMode('editor');
      
      // Save state and update history
      saveAppState({
        selectedFilePath: filePath,
        viewMode: 'editor',
      });
      window.history.pushState({ viewMode: 'editor', filePath: filePath }, '', '#editor');
      
      // Update posts store immediately
      await applyPostAdded(dirHandle.name, newPost);
      
      // Update file tree in background
      refreshFileTree(dirHandle).catch(() => {});
    } catch (error) {
      toast.error('Failed to create file');
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleSave = async () => {
    if (isDemoMode) {
      toast.info('Saving is disabled in demo mode');
      return;
    }
    
    if (!dirHandle || !currentFile || !selectedFilePath || isSaving) return;
    
    try {
      setIsSaving(true);
      
      const content = stringifyMarkdown(currentFile);
      await writeFile(dirHandle, selectedFilePath, content);
      
      // Update rawContent to the saved content so View Changes can compare properly
      const updatedFile = {
        ...currentFile,
        rawContent: content,
      };
      
      // Update posts store
      await applyPostUpdated(dirHandle.name, updatedFile);
      
      // Update current file with new rawContent
      setCurrentFile(updatedFile);
      
      // Update states in one batch
      setHasChanges(false);
      setHasPendingPublish(true);
      
      toast.success('Changes saved');
      
      // Celebrate with confetti! 🎉
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishClick = async () => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;
    
    // First save the file if there are changes
    if (hasChanges) {
      await handleSave();
    }
    
    // Show publish modal
    setShowPublishModal(true);
  };

  const handlePublish = async (commitMessage: string) => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;
    
    try {
      const result = await publishFile(dirHandle, {
        filePath: selectedFilePath,
        commitMessage,
        branch: gitStatus?.currentBranch || 'main',
      });
      
      if (result.success) {
        setHasPendingPublish(false);
        // Don't show toast - success is shown in modal
        // Return result to modal so it can show appropriate message
        return {
          pushed: result.pushed,
          needsManualPush: result.needsManualPush,
          commitSha: result.commitSha,
        };
      } else {
        // Throw error so modal can catch and show it
        throw new Error(result.error || 'Failed to publish changes');
      }
    } catch (error) {
      // Re-throw error so modal can catch it
      throw error;
    }
  };

  const handleContentChange = (content: string) => {
    if (currentFile) {
      setCurrentFile({ ...currentFile, content });
      setHasChanges(true);
    }
  };

  const handleMetaChange = (frontmatter: MarkdownFile['frontmatter']) => {
    if (currentFile) {
      const updated = updateFrontmatter(currentFile, frontmatter);
      setCurrentFile(updated);
      setHasChanges(true);
    }
  };

  const handleTitleChange = (title: string) => {
    if (currentFile) {
      const updated = updateFrontmatter(currentFile, {
        ...currentFile.frontmatter,
        title,
      });
      setCurrentFile(updated);
      setHasChanges(true);
    }
  };

  const handleFileNameChange = async (newFileName: string) => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;

    try {
      // Rename the file
      const newPath = await renameFile(dirHandle, selectedFilePath, newFileName);

      // Update current file state
      const updatedFile = {
        ...currentFile,
        name: newFileName.endsWith('.md') ? newFileName : `${newFileName}.md`,
        path: newPath,
      };
      setCurrentFile(updatedFile);
      setSelectedFilePath(newPath);

      // Update posts store
      await applyPostPathChanged(dirHandle.name, selectedFilePath, newPath);

      // Update file tree
      await refreshFileTree(dirHandle);

      // Save state with new path
      saveAppState({
        selectedFilePath: newPath,
        viewMode: 'editor',
      });

      // Update browser history
      window.history.replaceState({ viewMode: 'editor', filePath: newPath }, '', '#editor');

      toast.success('File renamed successfully');
    } catch (error) {
      toast.error('Failed to rename file');
      console.error('Rename error:', error);
    }
  };

  const handleFileMove = async (sourcePath: string, targetDirPath: string) => {
    if (!dirHandle || isMovingFile) return;

    // Get the filename for better UX messaging
    const fileName = sourcePath.split('/').pop() || sourcePath;

    try {
      // Show loading state
      setIsMovingFile(true);

      // Move the file (this is slow due to browser API: read + write + delete)
      const newPath = await moveFile(dirHandle, sourcePath, targetDirPath);

      // Update posts store
      await applyPostPathChanged(dirHandle.name, sourcePath, newPath);

      // Update current file if it was the moved file
      if (currentFile?.path === sourcePath) {
        const updatedFile = {
          ...currentFile,
          path: newPath,
        };
        setCurrentFile(updatedFile);
        setSelectedFilePath(newPath);

        // Save state with new path
        saveAppState({
          selectedFilePath: newPath,
          viewMode: 'editor',
        });

        // Update browser history
        window.history.replaceState({ viewMode: 'editor', filePath: newPath }, '', '#editor');
      }

      // Update file tree
      await refreshFileTree(dirHandle);

      toast.success(`"${fileName}" moved successfully`, { duration: 3000 });
    } catch (error) {
      // Show error
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(`Failed to move "${fileName}"`);
      }
      console.error('Move error:', error);
    } finally {
      setIsMovingFile(false);
    }
  };

  // Save view mode changes
  useEffect(() => {
    if (!isRestoring && dirHandle && !isDemoMode) {
      saveAppState({
        viewMode,
        selectedFilePath: viewMode === 'editor' ? selectedFilePath : null,
      });
    }
  }, [viewMode, selectedFilePath, dirHandle, isRestoring, isDemoMode]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = async (event: PopStateEvent) => {
      const state = event.state;
      
      if (!state) {
        // No state, go to table view
        if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
          // User cancelled, push current state back
          window.history.pushState({ viewMode }, '', viewMode === 'editor' ? '#editor' : viewMode === 'settings' ? '#settings' : '#table');
          return;
        }
        setViewMode('table');
        setCurrentFile(null);
        setSelectedFilePath(null);
        setHasChanges(false);
        setHasPendingPublish(false);
        return;
      }

      // Handle unsaved changes
      if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
        // User cancelled, push current state back
        window.history.pushState({ viewMode }, '', viewMode === 'editor' ? '#editor' : viewMode === 'settings' ? '#settings' : '#table');
        return;
      }

      // Navigate to the requested view
      if (state.viewMode === 'table') {
        setViewMode('table');
        setCurrentFile(null);
        setSelectedFilePath(null);
        setHasChanges(false);
        setHasPendingPublish(false);
        // Ensure posts are loaded when navigating back to table (non-blocking if already present)
        // Skip reload in demo mode
        if (!isDemoMode) {
          await reloadPosts();
        }
      } else if (state.viewMode === 'settings') {
        setViewMode('settings');
      } else if (state.viewMode === 'editor' && state.filePath) {
        // In demo mode, load from allPosts array instead of file system
        if (isDemoMode) {
          const post = allPosts.find(p => p.path === state.filePath);
          if (post) {
            setCurrentFile(post);
            setSelectedFilePath(state.filePath);
            setHasChanges(false);
            setHasPendingPublish(false);
            setShouldAutoFocus(false);
            setViewMode('editor');
          } else {
            // Post not found, go to table
            setViewMode('table');
            setCurrentFile(null);
            setSelectedFilePath(null);
            setHasChanges(false);
            setHasPendingPublish(false);
          }
        } else if (dirHandle) {
          // Normal mode: load from file system
          try {
            const fileContent = await readFile(dirHandle, state.filePath);
            const fileName = state.filePath.split('/').pop() || state.filePath;
            const parsed = parseMarkdown(fileContent, state.filePath, fileName);
            setCurrentFile(parsed);
            setSelectedFilePath(state.filePath);
            setHasChanges(false);
            setHasPendingPublish(false);
            setShouldAutoFocus(false); // Don't auto-focus when navigating back
            setViewMode('editor');
          } catch (error) {
            // File not found, go to table
            setViewMode('table');
            setCurrentFile(null);
            setSelectedFilePath(null);
            setHasChanges(false);
            setHasPendingPublish(false);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasChanges, viewMode, dirHandle, isDemoMode, allPosts]);

  // Reset autoFocus after editor has had time to focus
  useEffect(() => {
    if (shouldAutoFocus) {
      const timer = setTimeout(() => {
        setShouldAutoFocus(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoFocus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving) handleSave();
      }
      if (e.key === 'Escape' && showActionsDropdown) {
        setShowActionsDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, currentFile, selectedFilePath, showActionsDropdown]);

  // Track scroll to show/hide title in header (only in editor mode)
  useEffect(() => {
    if (viewMode !== 'editor' || !currentFile) {
      setShowTitleInHeader(false);
      return;
    }

    const handleScroll = () => {
      const scrollContainer = document.querySelector('.flex-1.overflow-auto');
      if (scrollContainer) {
        // Show title in header when scrolled more than 100px
        setShowTitleInHeader(scrollContainer.scrollTop > 100);
      }
    };

    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [viewMode, currentFile]);

  // Save file tree visibility preference to localStorage
  useEffect(() => {
    localStorage.setItem('isFileTreeVisible', isFileTreeVisible.toString());
  }, [isFileTreeVisible]);

  // Handle resizing file tree panel
  useEffect(() => {
    if (!isResizing) return;

    // Disable text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      // Min width: 200px, Max width: 500px
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      setFileTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // Save to localStorage
      localStorage.setItem('fileTreeWidth', fileTreeWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Cleanup styles
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, fileTreeWidth]);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!dirHandle) {
    // Show loading while restoring
    if (isRestoring) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16">
              <img src="/logo.png" alt="Markdown++" className="w-full h-full object-contain animate-pulse" />
            </div>
            <p className="text-muted-foreground animate-pulse">Restoring workspace...</p>
          </div>
        </div>
      );
    }

    const recentFolders = getRecentFolders();
    const isSupported = isFileSystemAccessSupported();
    
    return (
      <div className="flex h-screen items-center justify-center bg-background p-3 sm:p-4">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
          {/* Header */}
              <div className="text-center space-y-2 sm:space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-2 cursor-pointer hover:scale-105 transition-transform"
                  title="Markdown++"
                >
                  <img src="/logo.png" alt="Markdown++" className="w-full h-full object-contain" />
                </button>
                <h1 className="text-3xl sm:text-4xl font-bold">
                  {displayedText}
                  <span className="font-thin animate-cursor-blink">|</span>
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg px-4">
                  Select a folder to start editing your markdown files
                </p>
              </div>

          {/* Browser Compatibility Warning */}
          {!isSupported && (
            <div className="mx-auto max-w-xl">
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-warning">Device Not Supported</p>
                    <p className="text-muted-foreground">
                      Local folder access is not available on iOS or iPadOS devices. 
                      Please use a <strong>desktop computer</strong> with <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong> to access your local files.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>Tip:</strong> Works on Android with Chrome/Edge</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <button
              onClick={handleSelectDirectory}
              disabled={!isSupported}
              className="inline-flex items-center gap-3 rounded-md bg-primary px-6 py-2.5 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-lg"
            >
              <FolderOpen className="h-5 w-5" />
              Select Folder
            </button>
            
            <button
              onClick={handleStartDemo}
              className="inline-flex items-center gap-3 rounded-md bg-white dark:bg-white/10 border-2 border-primary/20 px-6 py-2.5 text-base font-medium text-foreground hover:bg-accent hover:border-primary/40 transition-colors shadow-lg hover:shadow-xl touch-target"
            >
              <Eye className="h-5 w-5 text-primary" />
              Try Demo
            </button>
          </div>

          {/* Recent Folders */}
          {recentFolders.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Folders
                </div>
                <button
                  onClick={handleClearRecent}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  Clear
                </button>
              </div>
              
              <div className="grid gap-2">
                {recentFolders.map((folder) => (
                  <button
                    key={folder.name + folder.timestamp}
                    onClick={handleSelectDirectory}
                    disabled={!isSupported}
                    className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-accent active:bg-accent/80 transition-colors text-left group touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="shrink-0">
                        <FolderOpen className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm sm:text-base">{folder.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(folder.timestamp)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer with GitHub Link */}
          <div className="pt-6 border-t border-border space-y-4">
            {/* Privacy Statement */}
            <div className="text-center px-4">
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Markdown++ works fully in your browser. No servers, no tracking, no data stored anywhere.
                <br />
                We cannot see what you write or what you do here. Your privacy stays with you.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/emir/markdown-plus-plus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
                >
                  <Github className="h-4 w-4" />
                  <span>View on GitHub</span>
                </a>
                <span className="text-muted-foreground/50">•</span>
                <a
                  href="https://github.com/emir/markdown-plus-plus?tab=readme-ov-file#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Documentation</span>
                </a>
                <span className="text-muted-foreground/50">•</span>
                <a
                  href="https://buymeacoffee.com/emirkarsiyakali"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
                >
                  <span>☕</span>
                  <span>Support Me</span>
                </a>
              </div>
              <span className="hidden sm:inline text-muted-foreground/50">•</span>
              <span>v0.7.0-beta</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <>
      <WelcomeWarningModal
        isOpen={showWarningModal}
        onAccept={() => setShowWarningModal(false)}
      />
      
      <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="relative flex items-center px-2 sm:px-4 gap-2 sm:gap-4 h-14">
          {/* Logo and Title */}
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
                  return;
                }
                // If in editor mode, go to table view and ensure posts are loaded
                if (viewMode === 'editor') {
                  setViewMode('table');
                  setCurrentFile(null);
                  setSelectedFilePath(null);
                  setHasChanges(false);
                  setHasPendingPublish(false);
                  window.history.pushState({ viewMode: 'table' }, '', '#table');
                  if (!isDemoMode) await reloadPosts();
                } else if (viewMode === 'settings') {
                  // If in settings, go to table view and ensure posts are loaded
                  setViewMode('table');
                  window.history.pushState({ viewMode: 'table' }, '', '#table');
                  if (!isDemoMode) await reloadPosts();
                } else if (viewMode === 'table' && dirHandle && !isDemoMode) {
                  // If in table view, refresh posts (cache-first)
                  await initializePosts(dirHandle);
                  toast.success('Posts refreshed', { duration: 2000 });
                }
              }}
              className="flex items-center gap-1.5 text-base sm:text-lg font-semibold opacity-40 hover:opacity-100 transition-all duration-500 ease-in-out group cursor-pointer relative z-10"
            >
              <img src="/logo.png" alt="Markdown++" className="w-6 h-6 sm:w-7 sm:h-7 object-contain group-hover:scale-105 transition-transform duration-500" />
              <span>Markdown++</span>
            </button>
            
            {isDemoMode && (
              <button
                onClick={handleExitDemo}
                className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 hover:border-primary/30 transition-colors cursor-pointer"
                title="Click to exit demo"
              >
                Demo ✕
              </button>
            )}
          </div>
          
          {/* Unsaved Changes Indicator */}
          {viewMode === 'editor' && hasChanges && (
            <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse -ml-1 relative z-10" title="Unsaved changes" />
          )}

          {/* Title in Header (when scrolled in editor) - Absolutely positioned to center */}
          {showTitleInHeader && viewMode === 'editor' && currentFile && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <div className="w-[720px] px-4">
                <div 
                  onClick={scrollToTop}
                  className={`font-bold text-center leading-tight truncate cursor-pointer hover:opacity-80 transition-opacity ${
                    (() => {
                      const title = currentFile.frontmatter.title === 'Untitled Post' ? 'Untitled' : (currentFile.frontmatter.title || 'Untitled');
                      const length = title.length;
                      if (length > 60) return 'text-sm';
                      if (length > 40) return 'text-base';
                      if (length > 25) return 'text-lg';
                      return 'text-xl';
                    })()
                  } ${currentFile.frontmatter.title === 'Untitled Post' ? 'opacity-40' : ''}`}
                  title={currentFile.frontmatter.title === 'Untitled Post' ? 'Untitled' : (currentFile.frontmatter.title || 'Untitled')}
                >
                  {currentFile.frontmatter.title === 'Untitled Post' ? 'Untitled' : (currentFile.frontmatter.title || 'Untitled')}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 min-w-0"></div>
          
          <div className="ml-auto flex items-center gap-2 relative z-10">
            {viewMode !== 'editor' && (
              <>
                <button
                  onClick={handleCreatePost}
                  disabled={isCreatingPost}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingPost ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">New Post</span>
                </button>

                {/* Settings Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium transition-colors shadow-sm ${
                      showSettingsDropdown
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-white dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20'
                    }`}
                  >
                    <SettingsIcon className="h-4 w-4" />
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showSettingsDropdown && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-[999]"
                        onClick={() => setShowSettingsDropdown(false)}
                      />
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-2 w-64 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="px-4 py-3 bg-muted/80 border-b border-border">
                          <div className="flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Settings</h3>
                          </div>
                        </div>

                        {/* Theme Section */}
                        <div className="p-3">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                            Appearance
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'light', label: 'Light', icon: Sun },
                              { value: 'dark', label: 'Dark', icon: Moon },
                              { value: 'system', label: 'System', icon: Monitor }
                            ].map(({ value, label, icon: Icon }) => {
                              const settings = getSettings();
                              const isActive = settings.theme === value;
                              
                              return (
                                <button
                                  key={value}
                                  onClick={() => {
                                    const updatedSettings = { ...settings, theme: value as 'light' | 'dark' | 'system' };
                                    saveSettings(updatedSettings);
                                    setTheme(value as 'light' | 'dark' | 'system');
                                    toast.success(`Theme: ${label}`);
                                    setShowSettingsDropdown(false);
                                  }}
                                  className={`flex flex-col items-center gap-2 px-2 py-3 rounded-lg border-2 transition-all ${
                                    isActive
                                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                      : 'border-border hover:border-primary/50 hover:bg-accent'
                                  }`}
                                >
                                  <Icon className={`h-5 w-5 ${isActive ? '' : 'text-muted-foreground'}`} />
                                  <span className="text-xs font-medium">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border" />

                        {/* Actions */}
                        <div className="p-2">
                          {!isDemoMode && (
                            <button
                              onClick={() => {
                                setShowSettingsDropdown(false);
                                setViewMode('settings');
                                window.history.pushState({ viewMode: 'settings' }, '', '#settings');
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors group"
                            >
                              <SettingsIcon className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                              <span>Advanced Settings</span>
                            </button>
                          )}
                          
                          {isDemoMode ? (
                            <button
                              onClick={() => {
                                setShowSettingsDropdown(false);
                                handleExitDemo();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors group"
                            >
                              <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                              <span className="text-muted-foreground group-hover:text-destructive">Exit Demo</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowSettingsDropdown(false);
                                handleLogout();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors group"
                            >
                              <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                              <span className="text-muted-foreground group-hover:text-destructive">Log Out</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {viewMode === 'editor' && currentFile && (
              <>
                {/* Save Button Group */}
                <div className="relative flex items-stretch">
                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-l-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save Changes"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save</span>
                  </button>
                  
                  {/* Dropdown Toggle */}
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="inline-flex items-center justify-center rounded-r-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 transition-colors border-l border-primary-foreground/20"
                    title="More actions"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showActionsDropdown && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowActionsDropdown(false)}
                      />
                      
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border border-border bg-background shadow-lg">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handlePublishClick();
                              setShowActionsDropdown(false);
                            }}
                            disabled={hasChanges || !hasPendingPublish}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                            title={
                              hasChanges 
                                ? "Save changes before publishing" 
                                : !hasPendingPublish 
                                  ? "No changes to publish" 
                                  : "Publish to Git"
                            }
                          >
                            <Upload className="h-4 w-4" />
                            <span>Publish</span>
                          </button>
                          
                          <div className="h-px bg-border my-1" />
                          
                          <button
                            onClick={() => {
                              setShowRawModal(true);
                              setShowActionsDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
                          >
                            <FileCode className="h-4 w-4" />
                            <span>View Changes</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              handleDiscardChanges();
                              setShowActionsDropdown(false);
                            }}
                            disabled={!hasChanges}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Discard Changes</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Sidebar Icon Button */}
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="inline-flex items-center justify-center rounded-md bg-white dark:bg-white/10 h-9 w-9 hover:bg-white/90 dark:hover:bg-white/20 transition-colors shadow-sm"
                  title="Open Sidebar"
                >
                  <PanelRightOpen className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'settings' ? (
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 h-full">
            <Settings 
              onClose={async () => {
                setViewMode('table');
                window.history.pushState({ viewMode: 'table' }, '', '#table');
                await reloadPosts();
              }} 
              directoryName={dirHandle?.name}
            />
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Two-column layout */}
          <div className="flex-1 overflow-hidden flex">
            {/* File Tree Sidebar */}
            {isFileTreeVisible && (
              <div className="relative border-r overflow-y-auto overflow-x-hidden p-3 hidden sm:block text-muted-foreground" style={{ width: `${fileTreeWidth}px` }}>
                {/* Loading Overlay */}
                {isMovingFile && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="text-center space-y-3 p-6">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Moving file...</p>
                        <p className="text-xs text-muted-foreground">
                          This may take a moment due to browser limitations
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  Folders
                </div>
                <button
                  onClick={() => setSelectedFolderPath(null)}
                  onDragOver={isDemoMode ? undefined : (e) => {
                    if (isMovingFile) return;
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-primary/20', 'border-2', 'border-primary', 'border-dashed');
                  }}
                  onDragLeave={isDemoMode ? undefined : (e) => {
                    if (isMovingFile) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-primary/20', 'border-2', 'border-primary', 'border-dashed');
                  }}
                  onDrop={isDemoMode ? undefined : (e) => {
                    if (isMovingFile) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-primary/20', 'border-2', 'border-primary', 'border-dashed');
                    const sourcePath = e.dataTransfer.getData('text/plain');
                    if (sourcePath) {
                      // Move to root directory (empty string)
                      handleFileMove(sourcePath, '');
                    }
                  }}
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors mb-1 ${
                    !selectedFolderPath ? 'bg-accent font-medium text-foreground' : 'hover:bg-accent/50'
                  } ${isMovingFile ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  All Posts
                </button>
                <FileBrowser
                  files={fileTree}
                  selectedFile={selectedFolderPath}
                  hiddenFiles={dirHandle ? getHiddenFiles(dirHandle.name) : []}
                  onFileSelect={(path) => {
                    // Check if this is a directory or file
                    const findItem = (items: FileTreeItem[], targetPath: string): FileTreeItem | null => {
                      for (const item of items) {
                        if (item.path === targetPath) return item;
                        if (item.children) {
                          const found = findItem(item.children, targetPath);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const item = findItem(fileTree, path);
                    if (item?.isDirectory) {
                      // If directory, filter posts
                      setSelectedFolderPath(path);
                    } else {
                      // If file, find the post and open it for editing
                      const post = allPosts.find(p => p.path === path);
                      if (post) {
                        handleEditPost(post);
                      }
                    }
                  }}
                  onFileMove={isDemoMode ? undefined : handleFileMove}
                  isMoving={isMovingFile}
                />
                {/* Resize Handle */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                  }}
                  title="Drag to resize"
                >
                  <div className="absolute inset-y-0 -right-1 w-3" />
                </div>
              </div>
            )}
            
            {/* Main Content - Data Table */}
            <div className="flex-1 overflow-auto p-3 sm:p-4">
              <PostsDataTable
                posts={allPosts.filter(post => {
                  if (!dirHandle) return true;
                  const hiddenFiles = isDemoMode ? [] : getHiddenFiles(dirHandle.name);
                  if (hiddenFiles.includes(post.path)) return false;
                  // Filter by selected folder
                  if (selectedFolderPath && !post.path.startsWith(selectedFolderPath + '/')) return false;
                  return true;
                })}
                isLoading={isLoadingPosts}
                onEdit={handleEditPost}
                onDelete={isDemoMode ? () => toast.info('Deleting is disabled in demo mode') : handleDeletePost}
                onHide={isDemoMode ? () => toast.info('Hiding is disabled in demo mode') : handleHidePost}
                title={selectedFolderPath || 'All Posts'}
                onClearFilter={selectedFolderPath ? () => setSelectedFolderPath(null) : undefined}
                onToggleSidebar={() => setIsFileTreeVisible(!isFileTreeVisible)}
                isSidebarVisible={isFileTreeVisible}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-h-full flex justify-center">
            {currentFile ? (
              <div className="w-full max-w-[720px]">
                <MarkdownEditor
                  content={currentFile.content}
                  onChange={handleContentChange}
                  title={currentFile.frontmatter.title || ''}
                  onTitleChange={handleTitleChange}
                  autoFocus={shouldAutoFocus}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground w-full">
                <div className="text-center space-y-2">
                  <p>No file selected</p>
                  <button
                    onClick={() => {
                      setViewMode('table');
                      window.history.pushState({ viewMode: 'table' }, '', '#table');
                    }}
                    className="text-sm text-primary hover:underline px-4 py-2"
                  >
                    Go to Table View to select a post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Sheet */}
      {viewMode === 'editor' && (
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0">
            <SidebarTabs
              currentFile={currentFile}
              allPosts={allPosts}
              onMetaChange={handleMetaChange}
              onPostClick={(post) => {
                handleEditPost(post);
                setIsMobileSidebarOpen(false);
              }}
              onFileNameChange={handleFileNameChange}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Raw Markdown Modal */}
      {currentFile && (
        <RawMarkdownModal
          isOpen={showRawModal}
          onClose={() => setShowRawModal(false)}
          content={hasChanges ? stringifyMarkdown(currentFile) : currentFile.rawContent}
          originalContent={currentFile.rawContent}
          filename={currentFile.path}
        />
      )}

      {/* Publish Modal */}
      {currentFile && selectedFilePath && (
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublish}
          fileName={selectedFilePath}
          gitStatus={gitStatus}
          defaultMessage={generateCommitMessage(currentFile.name, 'update')}
          projectPath={dirHandle?.name}
        />
      )}
    </div>
    </>
  );
}

export default App;

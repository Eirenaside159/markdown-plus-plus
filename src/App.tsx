import { useState, useEffect } from 'react';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { PostsDataTable } from '@/components/PostsDataTable';
import { RawMarkdownModal } from '@/components/RawMarkdownModal';
import { PublishModal } from '@/components/PublishModal';
import { SidebarTabs } from '@/components/SidebarTabs';
import { Settings } from '@/components/Settings';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet';
import { toast } from 'sonner';
import { WelcomeWarningModal, shouldShowWarning } from '@/components/WelcomeWarningModal';
import { DemoInfoModal } from '@/components/DemoInfoModal';
import { FileBrowser } from '@/components/FileBrowser';
import { RemoteConnectionModal } from '@/components/RemoteConnectionModal';
import { useConfirm } from '@/components/ui/confirm-dialog';
import confetti from 'canvas-confetti';
import { selectDirectory, readFile, writeFile, deleteFile, renameFile, moveFile, isFileSystemAccessSupported, selectSingleFile, createNewFile, readSingleFile, writeSingleFile } from '@/lib/fileSystem';
import { parseMarkdown, stringifyMarkdown, updateFrontmatter } from '@/lib/markdown';
import { getRecentFolders, addRecentFolder, clearRecentFolders, formatTimestamp } from '@/lib/recentFolders';
import { getSettings, saveSettings } from '@/lib/settings';
import { setTheme } from '@/lib/theme';
import { saveDirectoryHandle, loadDirectoryHandle, saveAppState, loadAppState, clearCurrentWorkspace, saveRecentFolderHandle, loadRecentFolderHandle, clearAllRecentFolderHandles, saveSingleFileHandle, loadSingleFileHandle, clearSingleFileHandle } from '@/lib/persistedState';
import { subscribePosts, initializePosts, refreshPosts, refreshFileTree, applyPostAdded, applyPostUpdated, applyPostDeleted, applyPostPathChanged } from '@/lib/postsStore';
import { checkGitStatus, publishFile, generateCommitMessage, type GitStatus } from '@/lib/gitOperations';
import { hideFile, getHiddenFiles } from '@/lib/hiddenFiles';
import { updateFaviconBadge } from '@/lib/faviconBadge';
import type { FileTreeItem, MarkdownFile } from '@/types';
import { FolderOpen, Save, Clock, FileCode, Plus, RotateCcw, Settings as SettingsIcon, Github, AlertCircle, Upload, Lightbulb, ChevronDown, PanelRightOpen, Loader2, BookOpen, Sun, Moon, Monitor, LogOut, Eye, Search, X, Sliders, File, Cloud, Play } from 'lucide-react';
import { connectRemoteWorkspace, subscribeWorkspace, loadRemoteFile, saveRemoteFileContent, deleteRemoteFileFromWorkspace, renameRemoteFileInWorkspace, isRemoteWorkspace, getCurrentRemoteWorkspace } from '@/lib/workspaceManager';
import type { Repository } from '@/lib/remoteProviders';

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

// Confetti celebration animation
function fireCelebrationConfetti() {
  const duration = 1 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    );
  }, 250);
}

function App() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [singleFileHandle, setSingleFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isSingleFileMode, setIsSingleFileMode] = useState(false);
  const [allPosts, setAllPosts] = useState<MarkdownFile[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
  const [showFolderOptionsDropdown, setShowFolderOptionsDropdown] = useState(false);
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
  const [isEditorFileTreeVisible, setIsEditorFileTreeVisible] = useState(() => {
    const saved = localStorage.getItem('isEditorFileTreeVisible');
    return saved ? saved === 'true' : false; // Default false (closed)
  });
  const [editorFileTreeWidth, setEditorFileTreeWidth] = useState(() => {
    const saved = localStorage.getItem('editorFileTreeWidth');
    return saved ? parseInt(saved, 10) : 256; // Default 256px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
  const [isMovingFile, setIsMovingFile] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const [recentFolders, setRecentFolders] = useState(() => getRecentFolders());
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([]);
  
  // File tree filters
  const [fileTreeSearchQuery, setFileTreeSearchQuery] = useState('');
  const [editorFileTreeSearchQuery, setEditorFileTreeSearchQuery] = useState('');
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [showFileTreeConfig, setShowFileTreeConfig] = useState(false);
  const [showEditorFileTreeConfig, setShowEditorFileTreeConfig] = useState(false);
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  // Update hidden files when directory changes
  useEffect(() => {
    if (dirHandle) {
      setHiddenFiles(getHiddenFiles(dirHandle.name));
    } else {
      setHiddenFiles([]);
    }
  }, [dirHandle]);
  
  // Clean up recent folders that don't have saved handles on mount
  useEffect(() => {
    const cleanupRecentFolders = async () => {
      const folders = getRecentFolders();
      const validFolders: typeof folders = [];
      
      for (const folder of folders) {
        const handle = await loadRecentFolderHandle(folder.name);
        if (handle) {
          validFolders.push(folder);
        }
      }
      
      // If some folders were removed, update localStorage and state
      if (validFolders.length !== folders.length) {
        localStorage.setItem('mdplusplus_recent_folders', JSON.stringify(validFolders));
        setRecentFolders(validFolders);
      }
    };
    
    cleanupRecentFolders();
  }, []);
  
  // Centralized posts subscription (cache-first, serialized scanning)
  useEffect(() => {
    const unsubscribe = subscribePosts(({ posts, isLoading, fileTree }) => {
      setAllPosts(posts);
      setIsLoadingPosts(isLoading);
      setFileTree(fileTree);
    });
    return unsubscribe;
  }, []);
  
  // Remote workspace subscription
  useEffect(() => {
    const unsubscribe = subscribeWorkspace(({ posts, isLoading, fileTree, workspace }) => {
      if (workspace?.type === 'remote') {
        setAllPosts(posts);
        setIsLoadingPosts(isLoading);
        setFileTree(fileTree);
        setIsRemoteMode(true);
      }
    });
    return unsubscribe;
  }, []);
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  
  // Confirm dialog hook
  const { confirm, ConfirmDialog } = useConfirm();
  
  // Always call the hook, but only use it when dirHandle is null
  const { displayedText } = useTypewriter('Markdown++', 80);

  // Check if warning should be shown on mount
  useEffect(() => {
    setShowWarningModal(!isDemoMode && shouldShowWarning());
  }, [isDemoMode]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthProvider = params.get('provider') as 'github' | 'gitlab' | null;
    const oauthError = params.get('error');

    if (oauthError) {
      toast.error(`OAuth Error: ${params.get('error_description') || oauthError}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauthToken && oauthProvider) {
      // OAuth başarılı! Modal'ı aç ve token'ı set et
      toast.success('Authentication successful! Loading repositories...');
      
      // Modal'ı aç
      setShowRemoteModal(true);
      
      // Token'ı localStorage'a geçici olarak kaydet
      localStorage.setItem('oauth_temp_token', oauthToken);
      localStorage.setItem('oauth_temp_provider', oauthProvider);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install button
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      // Hide the install button after app is installed
      setShowInstallButton(false);
      setDeferredPrompt(null);
      toast.success('Markdown++ installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Update page title
  useEffect(() => {
    if (viewMode === 'editor' && currentFile) {
      const baseTitle = currentFile.frontmatter.title === 'Untitled Post' 
        ? 'Untitled' 
        : (currentFile.frontmatter.title || currentFile.name || 'Untitled');
      
      let suffix = '';
      if (isSingleFileMode && singleFileHandle) {
        suffix = ` - ${singleFileHandle.name}`;
      } else if (isRemoteMode) {
        const remoteWorkspace = getCurrentRemoteWorkspace();
        suffix = remoteWorkspace ? ` - ${remoteWorkspace.repository.fullName}` : '';
      }
      
      document.title = `${baseTitle}${suffix} - Markdown++`;
    } else if (viewMode === 'settings') {
      document.title = 'Settings - Markdown++';
    } else if (viewMode === 'table' && isRemoteMode) {
      const remoteWorkspace = getCurrentRemoteWorkspace();
      document.title = remoteWorkspace 
        ? `${remoteWorkspace.repository.fullName} - Markdown++`
        : 'Markdown++';
    } else if (viewMode === 'table' && dirHandle) {
      document.title = `${dirHandle.name} - Markdown++`;
    } else {
      document.title = 'Markdown++';
    }
  }, [viewMode, currentFile, dirHandle, isSingleFileMode, singleFileHandle, isRemoteMode]);

  // Update favicon badge based on changes (only in editor mode)
  useEffect(() => {
    const shouldShowBadge = viewMode === 'editor' && hasChanges;
    updateFaviconBadge(shouldShowBadge);
  }, [hasChanges, viewMode]);


  // Fast, non-blocking reload helper: refresh posts without clearing UI
  const reloadPosts = async () => {
    if (!dirHandle || isRefreshingPosts || isDemoMode) return;
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
    
    // Clear single file mode first
    setIsSingleFileMode(false);
    setSingleFileHandle(null);
    
    // Set demo mode FIRST to prevent file system operations
    setIsDemoMode(true);
    
    // Set posts and file tree
    setAllPosts(DEMO_POSTS);
    setFileTree(DEMO_FILE_TREE);
    
    // Set a mock directory handle name for UI
    setDirHandle({ name: 'Demo Workspace' } as FileSystemDirectoryHandle);
    
    // Set view mode
    setViewMode('table');
    
    // Initialize browser history with table view
    window.history.replaceState({ viewMode: 'table' }, '', '#posts');
    
    // Show demo info modal
    setShowDemoModal(true);
  };

  const handleExitDemo = async () => {
    if (hasChanges) {
      const confirmed = await confirm('You have unsaved changes. Exit demo?', {
        title: 'Exit Demo',
        confirmLabel: 'Exit',
        variant: 'destructive'
      });
      if (!confirmed) return;
    }
    
    // Clear demo state
    setIsDemoMode(false);
    setDirHandle(null);
    setSingleFileHandle(null);
    setIsSingleFileMode(false);
    setAllPosts([]);
    setFileTree([]);
    setSelectedFolderPath(null);
    setCurrentFile(null);
    setSelectedFilePath(null);
    setHasChanges(false);
    setViewMode('table');
    
    toast.info('Demo exited');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('Thanks! App is installing...');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
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
      
      // Clear single file mode and demo mode
      setIsSingleFileMode(false);
      setSingleFileHandle(null);
      setIsDemoMode(false);
      await clearSingleFileHandle();
      
      setDirHandle(handle);
      addRecentFolder(handle);
      setRecentFolders(getRecentFolders());
      // Save to IndexedDB for persistence
      try {
        await saveDirectoryHandle(handle);
        await saveRecentFolderHandle(handle.name, handle);
      } catch (error) {
        // Don't block the flow, just log the error
      }
      
      // Centralized posts init (cache-first, serialized scan)
      await initializePosts(handle);
      
      const tree = await refreshFileTree(handle);
      await refreshPosts(handle, tree);
      
      // Initialize browser history with table view
      window.history.replaceState({ viewMode: 'table' }, '', '#posts');
      
      // Check git status
      const status = await checkGitStatus(handle);
      setGitStatus(status);
      
      // Show git status to user
      if (!status.isGitRepo) {
        toast.info('Git not detected - publish limited');
      }
    }
  };

  const handleSelectSingleFile = async () => {
    // Check browser support first
    if (!isFileSystemAccessSupported()) {
      toast.error('File API not supported. Use desktop Chrome, Edge, or Safari 15.2+');
      return;
    }
    
    try {
      const handle = await selectSingleFile();
      if (handle) {
        // Clear any existing toasts first
        toast.dismiss();
        
        // Clear folder mode
        setDirHandle(null);
        await clearCurrentWorkspace();
        
        // Set single file mode
        setIsSingleFileMode(true);
        setSingleFileHandle(handle);
        await saveSingleFileHandle(handle);
        
        // Read and parse the file
        try {
          const content = await readSingleFile(handle);
          const parsed = parseMarkdown(content, handle.name, handle.name);
          setCurrentFile(parsed);
          setSelectedFilePath(handle.name);
          setShouldAutoFocus(false); // Don't auto-focus when opening existing file
          setViewMode('editor');
          
          // Update browser history
          window.history.replaceState(
            { viewMode: 'editor', filePath: handle.name },
            '',
            '#editor'
          );
          
          toast.success(`Opened ${handle.name}`);
        } catch (error) {
          toast.error('Failed to read file');
          console.error('Error reading file:', error);
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('not supported')) {
        toast.error('File picker not supported in this browser');
      } else {
        toast.error('Failed to select file');
      }
      console.error('Error selecting file:', error);
    }
  };

  const handleCreateNewFile = async () => {
    // Check browser support first
    if (!isFileSystemAccessSupported()) {
      toast.error('File API not supported. Use desktop Chrome, Edge, or Safari 15.2+');
      return;
    }
    
    try {
      const handle = await createNewFile('untitled.md');
      if (handle) {
        // Clear any existing toasts first
        toast.dismiss();
        
        // Clear folder mode
        setDirHandle(null);
        await clearCurrentWorkspace();
        
        // Set single file mode
        setIsSingleFileMode(true);
        setSingleFileHandle(handle);
        await saveSingleFileHandle(handle);
        
        // Create initial content with frontmatter
        // Generate title from filename (remove .md extension and capitalize)
        const fileName = handle.name.replace(/\.md$/, '');
        const title = fileName
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        const initialContent = `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
author: 
description: 
tags: []
categories: []
---
`;
        
        // Write initial content to file
        try {
          await writeSingleFile(handle, initialContent);
          const parsed = parseMarkdown(initialContent, handle.name, handle.name);
          setCurrentFile(parsed);
          setSelectedFilePath(handle.name);
          setShouldAutoFocus(true);
          setViewMode('editor');
          
          // Update browser history
          window.history.replaceState(
            { viewMode: 'editor', filePath: handle.name },
            '',
            '#editor'
          );
          
          toast.success(`Created ${handle.name}`);
        } catch (error) {
          toast.error('Failed to write to file');
          console.error('Error writing file:', error);
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('not supported')) {
        toast.error('File picker not supported in this browser');
      } else {
        toast.error('Failed to create file');
      }
      console.error('Error creating file:', error);
    }
  };

  const handleRemoteConnect = async (provider: 'github' | 'gitlab', repo: Repository & { branch: string; token: string }) => {
    try {
      toast.dismiss();
      setIsLoadingPosts(true);
      
      // Clear local and demo modes
      setDirHandle(null);
      setIsSingleFileMode(false);
      setSingleFileHandle(null);
      setIsDemoMode(false);
      await clearCurrentWorkspace();
      await clearSingleFileHandle();
      
      // Connect to remote workspace
      await connectRemoteWorkspace(provider, repo.token, {
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.fullName,
        owner: repo.owner,
        branch: repo.branch,
        defaultBranch: repo.defaultBranch,
        url: repo.url,
      });
      
      setIsRemoteMode(true);
      setShowRemoteModal(false);
      
      // Save remote workspace info for restoration
      try {
        await saveAppState({
          workspaceType: 'remote',
          remoteProvider: provider,
          remoteRepo: {
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.fullName,
            owner: repo.owner,
            branch: repo.branch,
            defaultBranch: repo.defaultBranch,
            url: repo.url,
          },
          remoteToken: repo.token,
        });
      } catch (error) {
        console.error('Failed to save remote workspace state:', error);
      }
      
      // Show success toast with slight delay to avoid duplicates
      setTimeout(() => {
        toast.success(`Connected to ${repo.fullName} (${repo.branch})`);
      }, 200);
    } catch (error: any) {
      console.error('Failed to connect remote workspace:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to connect to repository');
      setIsLoadingPosts(false);
      setIsRemoteMode(false);
    }
  };

  const handleDisconnectRemote = async () => {
    const confirmed = await confirm(
      'Are you sure you want to disconnect from the remote repository? You can reconnect anytime.',
      {
        title: 'Disconnect Repository',
        confirmLabel: 'Disconnect',
        cancelLabel: 'Cancel',
        variant: 'destructive'
      }
    );
    
    if (confirmed) {
      // Clear state
      setIsRemoteMode(false);
      setAllPosts([]);
      setFileTree([]);
      setCurrentFile(null);
      setSelectedFilePath(null);
      setViewMode('table');
      setHasChanges(false);
      
      // Clear persisted state (including remote token)
      await clearCurrentWorkspace();
      
      toast.success('Disconnected from repository');
    }
  };

  // Restore directory and state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        // First, check for remote workspace
        const savedState = await loadAppState();
        
        if (savedState?.workspaceType === 'remote' && savedState.remoteProvider && savedState.remoteToken && savedState.remoteRepo) {
          console.log('Restoring remote workspace:', savedState.remoteRepo.fullName);
          
          try {
            setIsLoadingPosts(true);
            
            // Dismiss any existing toasts first
            toast.dismiss();
            
            await connectRemoteWorkspace(
              savedState.remoteProvider,
              savedState.remoteToken,
              savedState.remoteRepo
            );
            
            setIsRemoteMode(true);
            
            // Show success toast after a brief delay to ensure only one shows
            setTimeout(() => {
              toast.success(`Reconnected to ${savedState.remoteRepo!.fullName}`);
            }, 100);
          } catch (error: any) {
            console.error('Failed to restore remote workspace:', error);
            toast.dismiss();
            toast.error('Failed to restore remote connection. Please reconnect.');
            // Clear invalid remote state
            await clearCurrentWorkspace();
          }
          
          setIsRestoring(false);
          return;
        }
        
        // Try to load single file handle
        const savedFileHandle = await loadSingleFileHandle();
        
        if (savedFileHandle) {
          // Clear any existing toasts
          toast.dismiss();
          
          // Set single file mode
          setIsSingleFileMode(true);
          setSingleFileHandle(savedFileHandle);
          
          // Read and parse the file
          try {
            const content = await readSingleFile(savedFileHandle);
            const parsed = parseMarkdown(content, savedFileHandle.name, savedFileHandle.name);
            setCurrentFile(parsed);
            setSelectedFilePath(savedFileHandle.name);
            setShouldAutoFocus(false); // Don't auto-focus on page restore
            setViewMode('editor');
            
            // Update browser history
            window.history.replaceState(
              { viewMode: 'editor', filePath: savedFileHandle.name },
              '',
              '#editor'
            );
          } catch (error) {
            // If file cannot be restored, clear single file mode
            setIsSingleFileMode(false);
            setSingleFileHandle(null);
            await clearSingleFileHandle();
          }
          
          setIsRestoring(false);
          return;
        }
        
        // Try to load persisted directory handle
        const savedHandle = await loadDirectoryHandle();

        if (savedHandle) {
          // Clear any existing toasts
          toast.dismiss();

          // Set handle first so UI can render app shell immediately
          setDirHandle(savedHandle);
          addRecentFolder(savedHandle);
          setRecentFolders(getRecentFolders());
          try {
            await saveRecentFolderHandle(savedHandle.name, savedHandle);
          } catch (error) {
            // Handle error silently
          }

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
              setViewMode('table');
              window.history.replaceState({ viewMode: 'table' }, '', '#posts');
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
              const hash = savedState.viewMode === 'settings' ? '#settings' : '#posts';
              window.history.replaceState({ viewMode: savedState.viewMode }, '', hash);
            } else {
              // No saved state, initialize with table view
              window.history.replaceState({ viewMode: 'table' }, '', '#posts');
            }

            // Check git status
            const status = await checkGitStatus(savedHandle);
            setGitStatus(status);
          }
        }
      } catch (error) {
        // Failed to restore state
      } finally {
        setIsRestoring(false);
      }
    };

    restoreState();
  }, []);

  const handleLogout = async () => {
    // Check for unsaved changes
    if (hasChanges) {
      const confirmed = await confirm('You have unsaved changes. Discard them and logout?', {
        title: 'Logout',
        confirmLabel: 'Logout',
        variant: 'destructive'
      });
      if (!confirmed) return;
    }

    // Clear any existing toasts
    toast.dismiss();

    // Clear current workspace from IndexedDB (keeps recent folders)
    await clearCurrentWorkspace();

    // Clear state
    setDirHandle(null);
    setSingleFileHandle(null);
    setIsSingleFileMode(false);
    setAllPosts([]);
    setSelectedFilePath(null);
    setCurrentFile(null);
    setHasChanges(false);
    setViewMode('table');
    setIsRestoring(false);
    
    // Clear URL hash
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    
    // Don't show toast - the UI change (back to folder selection) is clear enough
  };

  const handleClearRecent = async () => {
    const confirmed = await confirm('Clear all recent folders?', {
      title: 'Clear Recent Folders',
      confirmLabel: 'Clear',
      variant: 'destructive'
    });
    if (confirmed) {
      clearRecentFolders();
      await clearAllRecentFolderHandles();
      setRecentFolders([]);
      toast.success('Recent folders cleared');
    }
  };

  const handleOpenRecentFolder = async (folderName: string) => {
    const toastId = toast.loading(`Opening ${folderName}...`);
    
    try {
      // Try to load the saved handle
      const handle = await loadRecentFolderHandle(folderName);
      
      if (!handle) {
        // Handle not found or permission denied
        toast.dismiss(toastId);
        toast.error(`Cannot access "${folderName}". Permission may have been revoked.`);
        return;
      }

      // Save handle and update recent folders
      await saveDirectoryHandle(handle);
      await saveRecentFolderHandle(handle.name, handle);
      addRecentFolder(handle);
      setRecentFolders(getRecentFolders());
      
      // Open UI immediately with cached data
      setDirHandle(handle);
      setViewMode('table');
      
      // Dismiss loading toast and show success
      toast.dismiss(toastId);
      toast.success(`Opened ${folderName}`);
      
      // Initialize posts in background (cache-first, then refresh)
      initializePosts(handle);
      
      // Refresh file tree and git status in background
      (async () => {
        const tree = await refreshFileTree(handle);
        setFileTree(tree);
        
        const status = await checkGitStatus(handle);
        setGitStatus(status);
      })();
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Failed to open folder');
    }
  };

  const handleDiscardChanges = async () => {
    if (!currentFile || !dirHandle || !selectedFilePath || !hasChanges) return;

    const confirmed = await confirm('Discard all unsaved changes?\n\nThis action cannot be undone.', {
      title: 'Discard Changes',
      confirmLabel: 'Discard',
      variant: 'destructive'
    });
    if (!confirmed) return;

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

  const handleEditPost = async (post: MarkdownFile) => {
    if (hasChanges) {
      const confirmed = await confirm('You have unsaved changes. Discard them?', {
        title: 'Unsaved Changes',
        confirmLabel: 'Discard',
        variant: 'destructive'
      });
      if (!confirmed) return;
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
    if (!dirHandle && !isRemoteMode) return;

    const confirmed = await confirm(`Are you sure you want to delete "${post.frontmatter.title || post.name}"?\n\nThis action cannot be undone.`, {
      title: 'Delete Post',
      confirmLabel: 'Delete',
      variant: 'destructive'
    });
    if (!confirmed) return;

    try {
      if (isRemoteMode) {
        // Remote mode
        await deleteRemoteFileFromWorkspace(post.path);
        
        // Clear current file if it was deleted
        if (currentFile?.path === post.path) {
          setCurrentFile(null);
          setSelectedFilePath(null);
          setHasChanges(false);
          setHasPendingPublish(false);
        }
        
        toast.success('Post deleted and committed');
      } else if (dirHandle) {
        // Local mode
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
      }
    } catch (error) {
      toast.error('Failed to delete file');
      setIsLoadingPosts(false);
    }
  };

  const handleHidePost = (post: MarkdownFile) => {
    if (!dirHandle) return;

    hideFile(dirHandle.name, post.path);
    setHiddenFiles(getHiddenFiles(dirHandle.name));
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
    
    // Single file mode
    if (isSingleFileMode && singleFileHandle && currentFile) {
      try {
        setIsSaving(true);
        
        const content = stringifyMarkdown(currentFile);
        await writeSingleFile(singleFileHandle, content);
        
        // Update rawContent to the saved content
        const updatedFile = {
          ...currentFile,
          rawContent: content,
        };
        
        setCurrentFile(updatedFile);
        setHasChanges(false);
        setHasPendingPublish(false); // No git operations in single file mode
        
        toast.success('Changes saved');
        
        // Celebrate with confetti! 🎉
        fireCelebrationConfetti();
      } catch (error) {
        toast.error('Failed to save file');
      } finally {
        setIsSaving(false);
      }
      return;
    }
    
    // Remote mode
    if (isRemoteMode && currentFile && selectedFilePath) {
      try {
        setIsSaving(true);
        
        await saveRemoteFileContent(
          selectedFilePath,
          currentFile.content,
          currentFile.frontmatter
        );
        
        // Update current file
        const updatedFile = {
          ...currentFile,
          rawContent: stringifyMarkdown(currentFile),
        };
        
        setCurrentFile(updatedFile);
        setHasChanges(false);
        setHasPendingPublish(false); // Remote saves commit directly
        
        toast.success('Changes saved and committed');
        
        // Celebrate with confetti! 🎉
        fireCelebrationConfetti();
      } catch (error: any) {
        toast.error(error.message || 'Failed to save file');
      } finally {
        setIsSaving(false);
      }
      return;
    }
    
    // Folder mode
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
      fireCelebrationConfetti();
    } catch (error) {
      toast.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishClick = async () => {
    if (!dirHandle || !currentFile || !selectedFilePath || isPublishing) return;
    
    // First save the file if there are changes
    if (hasChanges) {
      await handleSave();
    }
    
    // Show publish modal
    setShowPublishModal(true);
  };

  const handlePublish = async (commitMessage: string) => {
    if (!dirHandle || !currentFile || !selectedFilePath || isPublishing) return;
    
    // Prevent multiple concurrent publish operations
    setIsPublishing(true);
    
    try {
      // Get git author and email from settings
      const settings = getSettings();
      
      const result = await publishFile(dirHandle, {
        filePath: selectedFilePath,
        commitMessage,
        branch: gitStatus?.currentBranch || 'main',
        gitAuthor: settings.gitAuthor,
        gitEmail: settings.gitEmail,
        gitToken: settings.gitToken,
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
    } finally {
      // Always reset publishing state
      setIsPublishing(false);
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
    } finally {
      setIsMovingFile(false);
    }
  };

  // Save view mode changes (only in folder mode)
  useEffect(() => {
    if (!isRestoring && dirHandle && !isDemoMode && !isSingleFileMode) {
      saveAppState({
        viewMode,
        selectedFilePath: viewMode === 'editor' ? selectedFilePath : null,
      });
    }
  }, [viewMode, selectedFilePath, dirHandle, isRestoring, isDemoMode, isSingleFileMode]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = async (event: PopStateEvent) => {
      const state = event.state;
      
      if (!state) {
        // No state, go to table view
        if (hasChanges) {
          const confirmed = await confirm('You have unsaved changes. Discard them?', {
            title: 'Unsaved Changes',
            confirmLabel: 'Discard',
            variant: 'destructive'
          });
          if (!confirmed) {
            // User cancelled, push current state back
            window.history.pushState({ viewMode }, '', viewMode === 'editor' ? '#editor' : viewMode === 'settings' ? '#settings' : '#posts');
            return;
          }
        }
        setViewMode('table');
        setCurrentFile(null);
        setSelectedFilePath(null);
        setHasChanges(false);
        setHasPendingPublish(false);
        return;
      }

      // Handle unsaved changes
      if (hasChanges) {
        const confirmed = await confirm('You have unsaved changes. Discard them?', {
          title: 'Unsaved Changes',
          confirmLabel: 'Discard',
          variant: 'destructive'
        });
        if (!confirmed) {
          // User cancelled, push current state back
          window.history.pushState({ viewMode }, '', viewMode === 'editor' ? '#editor' : viewMode === 'settings' ? '#settings' : '#posts');
          return;
        }
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
      const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
      if (scrollContainer) {
        // Show title in header when scrolled more than 100px
        setShowTitleInHeader(scrollContainer.scrollTop > 100);
      }
    };

    const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
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

  // Save editor file tree visibility preference to localStorage
  useEffect(() => {
    localStorage.setItem('isEditorFileTreeVisible', isEditorFileTreeVisible.toString());
  }, [isEditorFileTreeVisible]);

  // Reload file tree when showAllFolders changes
  useEffect(() => {
    if (dirHandle && !isDemoMode) {
      refreshFileTree(dirHandle, showAllFolders);
    }
  }, [showAllFolders, dirHandle, isDemoMode]);

  // Handle resizing file tree panel
  useEffect(() => {
    if (!isResizing) return;

    // Disable text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      // Min width: 200px, Max width: 500px
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      if (viewMode === 'table') {
        setFileTreeWidth(newWidth);
      } else if (viewMode === 'editor') {
        setEditorFileTreeWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // Save to localStorage based on which panel was resized
      if (viewMode === 'table') {
        localStorage.setItem('fileTreeWidth', fileTreeWidth.toString());
      } else if (viewMode === 'editor') {
        localStorage.setItem('editorFileTreeWidth', editorFileTreeWidth.toString());
      }
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
  }, [isResizing, fileTreeWidth, editorFileTreeWidth, viewMode]);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.flex-1.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Show folder selection screen only if no folder AND no single file AND not remote
  if (!dirHandle && !isSingleFileMode && !isDemoMode && !isRemoteMode) {
    // Show loading while restoring
    if (isRestoring) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16">
              <img src="/logo-white.png" alt="Markdown++" className="w-full h-full object-contain animate-pulse dark:hidden" />
              <img src="/logo.png" alt="Markdown++" className="w-full h-full object-contain animate-pulse hidden dark:block" />
            </div>
            <p className="text-muted-foreground animate-pulse">Restoring workspace...</p>
          </div>
        </div>
      );
    }

    const isSupported = isFileSystemAccessSupported();
    
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 sm:p-6">
        {/* Try Demo Button - Left Side */}
        <button
          onClick={handleStartDemo}
          className="fixed left-0 bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-300 rounded-r-lg group z-50 flex items-center gap-2 py-3 text-sm overflow-hidden px-3 hover:px-4"
          style={{ top: '25%', transform: 'translateY(-50%)' }}
        >
          <Play className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="whitespace-nowrap w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden">Try Demo</span>
        </button>
        
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
          {/* Header */}
              <div className="text-center space-y-2 sm:space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mb-2 cursor-pointer hover:scale-105 transition-transform touch-target"
                  title="Markdown++"
                >
                  <img src="/logo-white.png" alt="Markdown++" className="w-full h-full object-contain dark:hidden" />
                  <img src="/logo.png" alt="Markdown++" className="w-full h-full object-contain hidden dark:block" />
                </button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  {displayedText}
                  <span className="font-thin animate-cursor-blink">|</span>
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-4">
                  Select a folder to start editing your markdown files
                </p>
              </div>

          {/* Browser Compatibility Warning */}
          {!isSupported && (
            <div className="mx-auto max-w-xl">
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p className="font-medium text-warning">Device Not Supported</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Local folder access is not available on iOS or iPadOS devices. 
                      Please use a <strong>desktop computer</strong> with <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong> to access your local files.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Lightbulb className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span><strong>Tip:</strong> Works on Android with Chrome/Edge</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-3 sm:gap-4">
            {/* Select Folder Button Group with Dropdown */}
            <div className="relative flex items-stretch justify-center">
              <button
                onClick={handleSelectDirectory}
                disabled={!isSupported}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-l-md bg-primary px-3 sm:px-4 py-3 sm:py-2.5 text-sm sm:text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-lg"
              >
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Select Folder</span>
                <span className="xs:hidden">Folder</span>
              </button>
              
              <button
                onClick={() => setShowFolderOptionsDropdown(!showFolderOptionsDropdown)}
                disabled={!isSupported}
                className="inline-flex items-center justify-center rounded-r-md bg-primary px-3 sm:px-3.5 py-3 sm:py-2.5 text-primary-foreground hover:bg-primary/90 transition-colors border-l border-primary-foreground/20 shadow-lg hover:shadow-xl touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-lg"
                title="More options"
              >
                <ChevronDown className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </button>

              {showFolderOptionsDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowFolderOptionsDropdown(false)}
                  />
                  
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 w-56 rounded-md border border-border bg-background shadow-xl">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleSelectSingleFile();
                          setShowFolderOptionsDropdown(false);
                        }}
                        disabled={!isSupported}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                      >
                        <File className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Select File</div>
                          <div className="text-xs text-muted-foreground">Open a single markdown file</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleCreateNewFile();
                          setShowFolderOptionsDropdown(false);
                        }}
                        disabled={!isSupported}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                      >
                        <Plus className="h-4 w-4" />
                        <div>
                          <div className="font-medium">New File</div>
                          <div className="text-xs text-muted-foreground">Create a new markdown file</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={() => setShowRemoteModal(true)}
              className="relative inline-flex items-center justify-center gap-2 sm:gap-3 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 px-6 text-sm sm:text-base font-medium text-white shadow-lg touch-target overflow-hidden transition-all duration-300 hover:brightness-110 hover:shadow-[0_0_25px_rgba(139,92,246,0.6)]"
            >
              <Cloud className="h-4 w-4 sm:h-5 sm:w-5" />
              Connect Remote
            </button>
          </div>

          {/* Recent Folders */}
          {recentFolders.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between px-1 sm:px-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Recent Folders
                </div>
                <button
                  onClick={handleClearRecent}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 sm:px-3 py-1.5 touch-target"
                >
                  Clear
                </button>
              </div>
              
              <div className="grid gap-2">
                {recentFolders.map((folder) => (
                  <button
                    key={folder.name + folder.timestamp}
                    onClick={() => handleOpenRecentFolder(folder.name)}
                    disabled={!isSupported}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-md border border-border bg-card hover:bg-accent active:bg-accent/80 transition-colors text-left group touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="shrink-0">
                        <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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
          <div className="pt-4 sm:pt-6 border-t border-border space-y-3 sm:space-y-4">
            {/* Privacy Statement */}
            <div className="text-center px-3 sm:px-4">
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Markdown++ works fully in your browser. No servers, no tracking, no data stored anywhere.
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                We cannot see what you write or what you do here. Your privacy stays with you.
              </p>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                <a
                  href="https://github.com/emir/markdown-plus-plus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 sm:gap-2 hover:text-foreground transition-colors px-3 sm:px-4 py-2 rounded-md hover:bg-accent touch-target"
                >
                  <Github className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">View on GitHub</span>
                  <span className="xs:hidden">GitHub</span>
                </a>
                <span className="text-muted-foreground/50 hidden xs:inline">•</span>
                <a
                  href="https://github.com/emir/markdown-plus-plus?tab=readme-ov-file#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 sm:gap-2 hover:text-foreground transition-colors px-3 sm:px-4 py-2 rounded-md hover:bg-accent touch-target"
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Documentation</span>
                  <span className="xs:hidden">Docs</span>
                </a>
                <span className="text-muted-foreground/50 hidden xs:inline">•</span>
                <a
                  href="https://buymeacoffee.com/emirkarsiyakali"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 sm:gap-2 hover:text-foreground transition-colors px-3 sm:px-4 py-2 rounded-md hover:bg-accent touch-target"
                >
                  <span>☕</span>
                  <span className="hidden xs:inline">Support Me</span>
                  <span className="xs:hidden">Support</span>
                </a>
              </div>
              <span className="text-xs">v0.7.0-beta</span>
            </div>
          </div>

        </div>

        {/* PWA Install Banner - Bottom Right */}
        {showInstallButton && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-auto sm:max-w-md bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 dark:from-neutral-100 dark:via-neutral-100 dark:to-neutral-200 text-white dark:text-neutral-900 shadow-2xl border border-neutral-700 dark:border-neutral-300 rounded-2xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Left side - Icon + Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-white/10 dark:bg-neutral-900/10 rounded-xl flex items-center justify-center mt-0.5">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm sm:text-base font-semibold mb-1">Install Markdown++</p>
                    <p className="text-xs sm:text-sm opacity-80 mb-3">Get quick access from your home screen</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleInstallClick}
                        className="px-4 sm:px-5 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg font-medium text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg"
                      >
                        Install
                      </button>
                      <button
                        onClick={() => setShowInstallButton(false)}
                        className="px-3 py-2 hover:bg-white/10 dark:hover:bg-neutral-900/10 rounded-lg transition-colors text-xs sm:text-sm opacity-80 hover:opacity-100"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowInstallButton(false)}
                  className="flex-shrink-0 p-1 hover:bg-white/10 dark:hover:bg-neutral-900/10 rounded-lg transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remote Connection Modal */}
        <RemoteConnectionModal
          open={showRemoteModal}
          onClose={() => setShowRemoteModal(false)}
          onConnect={handleRemoteConnect}
        />

        <ConfirmDialog />
      </div>
    );
  }

  return (
    <>
      <WelcomeWarningModal
        isOpen={showWarningModal}
        onAccept={() => setShowWarningModal(false)}
      />
      
      <DemoInfoModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
      
      <div className="h-screen overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="relative flex items-center px-3 sm:px-4 gap-2 sm:gap-4 h-12 sm:h-14">
          {/* Logo and Title */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={async () => {
                if (hasChanges) {
                  const confirmed = await confirm('You have unsaved changes. Discard them?', {
                    title: 'Unsaved Changes',
                    confirmLabel: 'Discard',
                    variant: 'destructive'
                  });
                  if (!confirmed) return;
                }
                
                // In single file mode, close the file and go to home
                if (isSingleFileMode) {
                  await handleLogout();
                  return;
                }
                
                // If in editor mode, go to table view and ensure posts are loaded
                if (viewMode === 'editor') {
                  setViewMode('table');
                  setCurrentFile(null);
                  setSelectedFilePath(null);
                  setHasChanges(false);
                  setHasPendingPublish(false);
                  window.history.pushState({ viewMode: 'table' }, '', '#posts');
                  if (!isDemoMode) await reloadPosts();
                } else if (viewMode === 'settings') {
                  // If in settings, go to table view and ensure posts are loaded
                  setViewMode('table');
                  window.history.pushState({ viewMode: 'table' }, '', '#posts');
                  if (!isDemoMode) await reloadPosts();
                } else if (viewMode === 'table' && dirHandle && !isDemoMode) {
                  // If in table view, refresh posts (cache-first)
                  await initializePosts(dirHandle);
                  toast.success('Posts refreshed', { duration: 2000 });
                }
              }}
              className="flex items-center gap-1.5 text-sm sm:text-base md:text-lg font-semibold opacity-40 hover:opacity-100 transition-all duration-500 ease-in-out group cursor-pointer relative z-10 touch-target"
            >
              <img src="/logo-white.png" alt="Markdown++" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 object-contain group-hover:scale-105 transition-transform duration-500 dark:hidden" />
              <img src="/logo.png" alt="Markdown++" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 object-contain group-hover:scale-105 transition-transform duration-500 hidden dark:block" />
              <span className="hidden xs:inline">Markdown++</span>
              <span className="xs:hidden">MD++</span>
            </button>
            
            {isDemoMode && (
              <button
                onClick={handleExitDemo}
                className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 hover:border-primary/30 transition-colors cursor-pointer whitespace-nowrap"
                title="Click to exit demo"
              >
                <span className="hidden xs:inline">Demo ✕</span>
                <span className="xs:hidden">✕</span>
              </button>
            )}
            
            {isSingleFileMode && singleFileHandle && (
              <div
                className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full whitespace-nowrap flex items-center gap-1"
                title={`Editing single file: ${singleFileHandle.name}`}
              >
                <File className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">{singleFileHandle.name}</span>
              </div>
            )}
          </div>
          
          {/* Unsaved Changes Indicator */}
          {viewMode === 'editor' && hasChanges && (
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-yellow-500 animate-pulse -ml-1 relative z-10" title="Unsaved changes" />
          )}

          {/* Title in Header (when scrolled in editor) - Absolutely positioned to center */}
          {showTitleInHeader && viewMode === 'editor' && currentFile && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto max-w-[calc(100%-120px)] sm:max-w-[calc(100%-200px)]">
              <div className="px-2 sm:px-4">
                <div 
                  onClick={scrollToTop}
                  className={`font-bold text-center leading-tight truncate cursor-pointer hover:opacity-80 transition-opacity ${
                    (() => {
                      const title = currentFile.frontmatter.title === 'Untitled Post' ? 'Untitled' : (currentFile.frontmatter.title || 'Untitled');
                      const length = title.length;
                      if (length > 60) return 'text-xs sm:text-sm';
                      if (length > 40) return 'text-sm sm:text-base';
                      if (length > 25) return 'text-sm sm:text-lg';
                      return 'text-base sm:text-xl';
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
          
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 relative z-10">
            {viewMode !== 'editor' && (
              <>
                <button
                  onClick={handleCreatePost}
                  disabled={isCreatingPost}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-md bg-primary px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                >
                  {isCreatingPost ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">New Post</span>
                  <span className="sm:hidden">New</span>
                </button>

                {/* Settings Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 h-9 text-sm font-medium transition-colors shadow-sm touch-target ${
                      showSettingsDropdown
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-white dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20'
                    }`}
                  >
                    <SettingsIcon className="h-4 w-4" />
                    <ChevronDown className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} />
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
                          ) : isRemoteMode ? (
                            <button
                              onClick={() => {
                                setShowSettingsDropdown(false);
                                handleDisconnectRemote();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors group"
                            >
                              <Cloud className="h-4 w-4 text-muted-foreground group-hover:text-destructive" />
                              <span className="text-muted-foreground group-hover:text-destructive">Disconnect Repository</span>
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
                              <span className="text-muted-foreground group-hover:text-destructive">Close Workspace</span>
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
                    className="inline-flex items-center gap-1 sm:gap-1.5 rounded-l-md bg-primary px-2 sm:px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    title="Save Changes"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden xs:inline">Save</span>
                  </button>
                  
                  {/* Dropdown Toggle */}
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="inline-flex items-center justify-center rounded-r-md bg-primary px-2 sm:px-3 py-2 text-primary-foreground hover:bg-primary/90 transition-colors border-l border-primary-foreground/20 touch-target"
                    title="More actions"
                  >
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                          {/* Publish button - Hidden in single file mode */}
                          {!isSingleFileMode && (
                            <>
                              <button
                                onClick={() => {
                                  handlePublishClick();
                                  setShowActionsDropdown(false);
                                }}
                                disabled={hasChanges || !hasPendingPublish || isPublishing}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                                title={
                                  isPublishing
                                    ? "Publishing in progress..."
                                    : hasChanges 
                                      ? "Save changes before publishing" 
                                      : !hasPendingPublish 
                                        ? "No changes to publish" 
                                        : "Publish to Git"
                                }
                              >
                                <Upload className="h-4 w-4" />
                                <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
                              </button>
                              
                              <div className="h-px bg-border my-1" />
                            </>
                          )}
                          
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

                {/* Sidebar Icon Button - Hidden in single file mode */}
                {!isSingleFileMode && (
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="inline-flex items-center justify-center rounded-md bg-white dark:bg-white/10 h-9 w-9 hover:bg-white/90 dark:hover:bg-white/20 transition-colors shadow-sm touch-target"
                    title="Open Sidebar"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </button>
                )}
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
                window.history.pushState({ viewMode: 'table' }, '', '#posts');
                await reloadPosts();
              }} 
              directoryName={dirHandle?.name}
              onHiddenFilesChange={() => {
                if (dirHandle) {
                  setHiddenFiles(getHiddenFiles(dirHandle.name));
                }
              }}
            />
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex-1 min-h-0 flex relative">
          {/* File Tree Sidebar */}
          {isFileTreeVisible && (
            <div className="relative min-h-0 border-r overflow-y-auto overflow-x-hidden hidden sm:block text-muted-foreground" style={{ width: `${fileTreeWidth}px` }}>
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
                
                {/* Header with toggle */}
                <div className="sticky top-0 bg-background border-b z-10">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">
                      Files
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="relative">
                        <button
                          onClick={() => setShowFileTreeConfig(!showFileTreeConfig)}
                          className="p-1 hover:bg-accent rounded transition-colors flex items-center justify-center"
                          title="Filter options"
                        >
                          <Sliders className="h-4 w-4" />
                        </button>
                        
                        {showFileTreeConfig && (
                          <>
                            <div
                              className="fixed inset-0 z-[998]"
                              onClick={() => setShowFileTreeConfig(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-[999] w-48 bg-background border border-border rounded-md shadow-lg py-1">
                              <button
                                onClick={() => {
                                  setShowAllFolders(!showAllFolders);
                                  setShowFileTreeConfig(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                              >
                                <span>Show all folders</span>
                                {showAllFolders && <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => setIsFileTreeVisible(false)}
                        className="p-1 hover:bg-accent rounded transition-colors flex items-center justify-center"
                        title="Hide files"
                      >
                        <PanelRightOpen className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Search input */}
                  <div className="px-3 pb-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={fileTreeSearchQuery}
                        onChange={(e) => setFileTreeSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-7 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {fileTreeSearchQuery && (
                        <button
                          onClick={() => setFileTreeSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
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
                  hiddenFiles={hiddenFiles}
                  searchQuery={fileTreeSearchQuery}
                  isLoading={isLoadingPosts}
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
                  onFileEdit={(path) => {
                    const post = allPosts.find(p => p.path === path);
                    if (post) {
                      handleEditPost(post);
                    }
                  }}
                  onFileHide={isDemoMode 
                    ? () => toast.info('Hiding is disabled in demo mode')
                    : (path) => {
                        const post = allPosts.find(p => p.path === path);
                        if (post) {
                          handleHidePost(post);
                        }
                      }
                  }
                  onFileDelete={isDemoMode 
                    ? () => toast.info('Deleting is disabled in demo mode')
                    : (path) => {
                        const post = allPosts.find(p => p.path === path);
                        if (post) {
                          handleDeletePost(post);
                        }
                      }
                  }
                />
                </div>
                
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
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
              <PostsDataTable
                posts={allPosts.filter(post => {
                  if (!dirHandle) return true;
                  if (!isDemoMode && hiddenFiles.includes(post.path)) return false;
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
                onToggleFileTree={() => setIsFileTreeVisible(true)}
                isFileTreeVisible={isFileTreeVisible}
              />
            </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex relative">
          {/* Editor File Tree Sidebar - Hidden in single file mode */}
          {!isSingleFileMode && isEditorFileTreeVisible && (
            <div className="relative min-h-0 border-r overflow-y-auto overflow-x-hidden hidden sm:block text-muted-foreground" style={{ width: `${editorFileTreeWidth}px` }}>
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
                
                {/* Header with toggle */}
                <div className="sticky top-0 bg-background border-b z-10">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">
                      Files
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="relative">
                        <button
                          onClick={() => setShowEditorFileTreeConfig(!showEditorFileTreeConfig)}
                          className="p-1 hover:bg-accent rounded transition-colors flex items-center justify-center"
                          title="Filter options"
                        >
                          <Sliders className="h-4 w-4" />
                        </button>
                        
                        {showEditorFileTreeConfig && (
                          <>
                            <div
                              className="fixed inset-0 z-[998]"
                              onClick={() => setShowEditorFileTreeConfig(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-[999] w-48 bg-background border border-border rounded-md shadow-lg py-1">
                              <button
                                onClick={() => {
                                  setShowAllFolders(!showAllFolders);
                                  setShowEditorFileTreeConfig(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                              >
                                <span>Show all folders</span>
                                {showAllFolders && <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => setIsEditorFileTreeVisible(false)}
                        className="p-1 hover:bg-accent rounded transition-colors flex items-center justify-center"
                        title="Hide files"
                      >
                        <PanelRightOpen className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Search input */}
                  <div className="px-3 pb-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={editorFileTreeSearchQuery}
                        onChange={(e) => setEditorFileTreeSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-7 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {editorFileTreeSearchQuery && (
                        <button
                          onClick={() => setEditorFileTreeSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-3">
                <FileBrowser
                  files={fileTree}
                  selectedFile={currentFile?.path || null}
                  hiddenFiles={hiddenFiles}
                  searchQuery={editorFileTreeSearchQuery}
                  isLoading={isLoadingPosts}
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
                    if (!item?.isDirectory) {
                      // If file, find the post and open it for editing
                      const post = allPosts.find(p => p.path === path);
                      if (post) {
                        handleEditPost(post);
                      }
                    }
                  }}
                  onFileMove={isDemoMode ? undefined : handleFileMove}
                  isMoving={isMovingFile}
                  onFileEdit={(path) => {
                    const post = allPosts.find(p => p.path === path);
                    if (post) {
                      handleEditPost(post);
                    }
                  }}
                  onFileHide={isDemoMode 
                    ? () => toast.info('Hiding is disabled in demo mode')
                    : (path) => {
                        const post = allPosts.find(p => p.path === path);
                        if (post) {
                          handleHidePost(post);
                        }
                      }
                  }
                  onFileDelete={isDemoMode 
                    ? () => toast.info('Deleting is disabled in demo mode')
                    : (path) => {
                        const post = allPosts.find(p => p.path === path);
                        if (post) {
                          handleDeletePost(post);
                        }
                      }
                  }
                />
                </div>
                
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

          {/* Toggle button when file tree is hidden - Hidden in single file mode */}
          {!isSingleFileMode && !isEditorFileTreeVisible && (
            <button
              onClick={() => setIsEditorFileTreeVisible(true)}
              className="hidden sm:flex absolute left-0 top-24 z-10 bg-background border border-l-0 rounded-r-md p-2 hover:bg-accent transition-colors shadow-md"
              title="Show files"
            >
              <PanelRightOpen className="h-4 w-4 rotate-180" />
            </button>
          )}

          {/* Editor Content - Always centered regardless of sidebar */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="min-h-full flex justify-center" style={{ 
              marginLeft: (!isSingleFileMode && isEditorFileTreeVisible) ? `-${editorFileTreeWidth / 2}px` : '0',
              transition: 'margin-left 0.2s ease-in-out'
            }}>
              {currentFile ? (
                <div className="w-full max-w-[720px]">
                  <MarkdownEditor
                    content={currentFile.content}
                    onChange={handleContentChange}
                    title={currentFile.frontmatter.title || ''}
                    onTitleChange={handleTitleChange}
                    autoFocus={shouldAutoFocus}
                    currentFrontmatter={currentFile.frontmatter}
                    onMetaChange={(meta) => {
                      // Merge AI-generated meta with existing frontmatter
                      if (currentFile) {
                        const updatedFrontmatter = {
                          ...currentFile.frontmatter,
                          ...meta,
                        };
                        handleMetaChange(updatedFrontmatter);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center text-muted-foreground w-full min-h-full">
                  <div className="text-center space-y-2">
                    <p>No file selected</p>
                    <button
                      onClick={() => {
                        setViewMode('table');
                        window.history.pushState({ viewMode: 'table' }, '', '#posts');
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
        </div>
      )}

      {/* Sidebar Sheet - Hidden in single file mode */}
      {!isSingleFileMode && viewMode === 'editor' && (
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen} modal={false}>
          <SheetContent side="right" className="w-full sm:max-w-md p-0" hideOverlay={true}>
            <SheetHeader className="sr-only">
              <SheetTitle>Post Metadata and Settings</SheetTitle>
              <SheetDescription>
                Edit post metadata, file name, and view canonical related posts
              </SheetDescription>
            </SheetHeader>
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

      {/* Remote Connection Modal */}
      <RemoteConnectionModal
        open={showRemoteModal}
        onClose={() => setShowRemoteModal(false)}
        onConnect={handleRemoteConnect}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
    </>
  );
}

export default App;

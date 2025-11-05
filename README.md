# Markdown++

**Markdown++ is the missing web-based panel for static site generators.**

[![Try it online](https://img.shields.io/badge/Try%20it%20Online-Click%20Here-blue)](https://markdown-plus-plus.pages.dev/)
![Version](https://img.shields.io/badge/version-0.5.0--beta-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎬 Demo

<a href="https://markdown-plus-plus.pages.dev/" style="text-decoration:none;">➡️ Try it Online</a>

[![Watch the video](public/readme.png)](https://www.youtube.com/watch?v=IyDVN-sSOfA)

## 💡 Why?

We build our landing pages using static site generators instead of heavy, database-driven CMS platforms. This keeps our websites fast, stable, and highly compatible, which is ideal for performance-focused projects and ad campaigns.

But managing content this way is not easy. Writing and editing Markdown files, especially in multiple languages, quickly becomes painful and time-consuming.

Markdown++ solves this problem.
It is a lightweight editor for static sites that makes creating, editing, and managing Markdown content simple, fast, and collaborative without compromising performance.

**Markdown++ is the missing web-based panel for static site generators.**

- **No backend** - Runs entirely in your browser
- **No database** - Your data stays on your computer
- **Zero setup** - Use it directly from the web or run locally
- **Optional auth** - Deploy with basic auth if needed
- **Android & Desktop** - Works on Android phones and desktop computers

Built to be simple, practical, and work the way you do.

## ✨ Features

### Content Management
- **Local folder access** - Direct file system access via browser
- **Table view** - Sortable, filterable list of all posts
- **WYSIWYG editor** - Medium-like editing with Tiptap
- **Smart metadata** - Auto-detects and manages frontmatter
- **Create & delete** - Full CRUD operations
- **Related posts** - Links posts by canonical URL
- **Quick save** - Ctrl/Cmd + S support
- **Git integration** - One-click publish with automatic commit & push

### General
- **Privacy-first** - Zero data collection
- **File System API** - Native browser file access
- **Mobile optimized** - Touch-friendly UI (Android supported, iOS not supported)
- **PWA ready** - Install as native app

## 🚀 Quick Start

### Option 1: Use Online 
Just visit the hosted version and start editing.

<a href="https://markdown-plus-plus.pages.dev/" style="text-decoration:none;">➡️ Try it Online</a>

### Option 2: Run Locally
```bash
npm install
npm run dev
```

### Option 3: Deploy Your Own
```bash
npm run build
# Deploy the dist/ folder anywhere
# Add basic auth if you want protection
```

## 📖 Usage

1. **Open** - Visit the app or run locally
2. **Select folder** - Choose your markdown files directory
3. **Edit** - Browse, filter, and edit posts
4. **Save** - Changes write directly to files
5. **Publish** - Commit and push to Git with one click
6. **Refresh** - Your workspace persists

**That's it.** No setup, no config, no database.

### 🚢 Publishing to Git

Markdown++ includes built-in Git integration for seamless publishing:

1. **Edit your content** - Make changes in the editor
2. **Click Publish** - Button appears in the editor toolbar
3. **Review commit message** - Auto-generated, fully editable
4. **Publish** - Automatically performs:
   - `git add <file>`
   - `git commit -m "message"`
   - `git push origin <branch>`

The app detects Git repositories automatically. If your folder isn't a Git repo, you'll see a helpful warning with instructions.

**Note:** For private repositories, you may need to configure Git credentials on your system. The app uses the browser's File System Access API to interact with Git.

## 🛠️ Tech Stack

- **React 19** + **TypeScript** - UI
- **Vite 7** - Build
- **Tailwind CSS** - Styling
- **Tiptap** - Editor
- **File System API** - File access
- **IndexedDB** - State persistence
- **isomorphic-git** - Git operations in browser

## 🌐 Browser Support

| Browser | Platform | Version | Status |
|---------|----------|---------|--------|
| Chrome | Desktop | 86+ | ✅ Full support |
| Chrome | Android | 86+ | ✅ Full support |
| Chrome | iOS/iPadOS | Any | ❌ Not supported |
| Edge | Desktop | 86+ | ✅ Full support |
| Edge | Android | 86+ | ✅ Full support |
| Edge | iOS/iPadOS | Any | ❌ Not supported |
| Safari | macOS | 15.2+ | ✅ Full support |
| Safari | iOS/iPadOS | Any | ❌ Not supported |
| Firefox | All | - | ❌ Not supported yet |

**Note:** iOS and iPadOS do not support File System Access API in any browser due to platform limitations.

## 📝 Frontmatter

Works with any frontmatter structure:
```yaml
---
title: "My Post"
date: 2025-11-03
tags: [react, typescript]
custom_field: "anything"
---
```

Auto-detects fields and creates proper inputs. No config needed.

## 🔐 Privacy

- All data stays on your device
- No tracking, analytics, or telemetry
- No server, no database
- Optional: Deploy with auth for team access

## 💬 Feedback

Ideas and suggestions welcome! Open an issue to discuss.

## 📄 License

MIT - Use freely for personal or commercial projects.

---

Built for teams who love static sites but hate the friction.

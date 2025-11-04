# Markdown++

**A web-based content management panel for static site generators and file-driven solutions.**

![Version](https://img.shields.io/badge/version-0.5.0--beta-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎬 Demo

[➡️ Try it Online](https://markdown-plus-plus.pages.dev/)

[![Watch the video](https://img.youtube.com/vi/IyDVN-sSOfA/maxresdefault.jpg)](https://www.youtube.com/watch?v=IyDVN-sSOfA)

## 💡 Why?

We build our landing pages using static site generators and file-based systems instead of heavy, database-driven CMS platforms. This keeps our websites fast, stable, and highly compatible, which is ideal for performance-focused projects and ad campaigns.

But managing content this way is not easy. Writing and editing Markdown files, especially in multiple languages, quickly becomes painful and time-consuming.

Markdown++ solves this problem.
It is a lightweight editor for static sites that makes creating, editing, and managing Markdown content simple, fast, and collaborative without compromising performance.

**Markdown++ is the missing web-based panel for static site generators.**

- ✅ **No backend** - Runs entirely in your browser
- ✅ **No database** - Your data stays on your computer
- ✅ **Zero setup** - Use it directly from the web or run locally
- ✅ **Optional auth** - Deploy with basic auth if needed
- ✅ **Mobile & iPad ready** - Edit from anywhere

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

### General
- **Privacy-first** - Zero data collection
- **File System API** - Native browser file access
- **iOS/Android optimized** - Touch-friendly, safe areas
- **PWA ready** - Install as native app

## 🚀 Quick Start

### Option 1: Use Online 
Just visit the hosted version and start editing.

[➡️ Try it Online](https://markdown-plus-plus.pages.dev/)

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
5. **Refresh** - Your workspace persists

**That's it.** No setup, no config, no database.

## 🛠️ Tech Stack

- **React 19** + **TypeScript** - UI
- **Vite 7** - Build
- **Tailwind CSS** - Styling
- **Tiptap** - Editor
- **File System API** - File access
- **IndexedDB** - State persistence

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 86+ | ✅ Full support |
| Edge | 86+ | ✅ Full support |
| Safari | 15.2+ | ⚠️ Limited (no File System API) |
| Firefox | - | ❌ Not supported yet |

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

- ✅ All data stays on your device
- ✅ No tracking, analytics, or telemetry
- ✅ No server, no database
- ✅ Optional: Deploy with auth for team access

## 💬 Feedback

Ideas and suggestions welcome! Open an issue to discuss.

## 📄 License

MIT - Use freely for personal or commercial projects.

---

Built for teams who love static sites but hate the friction.

# Markdown Editor

Basit ve temiz bir markdown editörü. Vite, React, TypeScript ve Tailwind CSS ile geliştirilmiştir.

## Özellikler

- 📁 **Folder Seçimi**: Bilgisayarınızdan klasör seçin ve markdown dosyalarını görüntüleyin
- 📊 **Tablo Görünümü**: Tüm gönderileri tarihe göre sıralı tablo halinde listeleyin
- ✏️ **Markdown Editör**: Canlı önizleme ile düzenleme  
- 🏷️ **Metadata Yönetimi**: Frontmatter (kategoriler, taglar) düzenleme
- 💾 **Hızlı Kaydetme**: Ctrl/Cmd + S ile kaydetme
- 🗑️ **Silme**: Tabloda doğrudan dosya silme
- ✏️ **Hızlı Düzenleme**: Tablodan tek tıkla editöre geçiş
- 🎨 **Pure HTML + Tailwind**: Saf HTML elementleri ve Tailwind CSS
- 🚫 **No Dependencies**: Radix UI veya UI kütüphanesi yok
- 👁️ **3 Görünüm Modu**: Edit, Preview, Split
- 🔄 **İki Görünüm**: Table ve Editor arasında geçiş

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
npm run dev
```

Tarayıcınızda `http://localhost:5173` adresine gidin.

## Build

```bash
npm run build
```

## Kullanım

### Tablo Görünümü
1. **Select Folder** ile markdown klasörünüzü seçin
2. Tüm gönderileri tarihe göre sıralı tablo halinde görün
3. Sütunlar: Title, Author, Date, Categories, Tags, Description
4. **Edit** butonu ile dosyayı editöre açın
5. **Delete** butonu ile dosyayı silin (onay gerektirir)

### Editör Görünümü
1. Header'daki **Table / Editor** toggle ile görünüm değiştirin
2. Sol panelden düzenlemek istediğiniz dosyayı seçin
3. Orta panelde markdown içeriğini düzenleyin (Edit/Preview/Split)
4. Sağ panelden metadata'ları düzenleyin
5. **Save** veya **Ctrl/Cmd + S** ile kaydedin
6. **Refresh** butonu ile dosya listesini yenileyin

## Frontmatter Desteği

Uygulamanın desteklediği metadata alanları:

```yaml
---
title: "Başlık"
author: "Yazar"
date: "2025-11-02"
description: "Açıklama"
categories:
  - Kategori 1
  - Kategori 2
tags:
  - tag1
  - tag2
---
```

## Teknolojiler

- **Vite**: Hızlı build tool
- **React**: UI kütüphanesi
- **TypeScript**: Type-safe geliştirme
- **Tailwind CSS**: Utility-first CSS styling (Radix UI kullanılmadan)
- **react-markdown**: Markdown rendering
- **gray-matter**: Frontmatter parsing
- **File System Access API**: Tarayıcıdan dosya sistemi erişimi
- **Lucide Icons**: Modern icon seti

### Önemli Not
Bu proje **Radix UI kullanmaz**. Tüm UI elementleri saf HTML ve Tailwind CSS ile yazılmıştır.

## Tarayıcı Desteği

File System Access API kullanıldığı için modern tarayıcılar gereklidir:
- Chrome 86+
- Edge 86+
- Safari 15.2+ (kısıtlı)

## Lisans

MIT

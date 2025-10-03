# notion-to-ssg

> Export Notion databases to Markdown files for static site generators like 11ty (Eleventy)

[![npm version](https://img.shields.io/npm/v/notion-to-ssg.svg)](https://www.npmjs.com/package/notion-to-ssg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A flexible and powerful tool to export your Notion databases as Markdown files with YAML front matter, perfect for static site generators like [11ty (Eleventy)](https://www.11ty.dev/), Hugo, Jekyll, and more.

## ✨ Features

- 🚀 **Zero hardcoded properties** - Works with any Notion database schema
- 📝 **Automatic Markdown conversion** - Converts Notion blocks to clean Markdown
- 🖼️ **Image downloading** - Downloads and saves images locally with smart caching
- 🔧 **Flexible configuration** - YAML or JSON config files
- 🎯 **Multiple databases** - Export multiple databases in one run
- 🧹 **Stale file cleanup** - Automatically removes deleted pages
- 🏷️ **Smart slugification** - Customizable URL-friendly slug generation
- 📦 **Front matter support** - All Notion properties exported as YAML front matter
- 🌐 **Cover & icon support** - Downloads page covers and icons
- 🔄 **Property normalization** - Handles all Notion property types (relations, rollups, formulas, etc.)

## 📦 Installation

### As a CLI tool (global)

```bash
npm install -g notion-to-ssg
```

### As a project dependency

```bash
npm install --save-dev notion-to-ssg
```

### Quick start

```bash
npx notion-to-ssg
```

## 🚀 Quick Start

### 1. Get your Notion API token

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the "Internal Integration Token"
4. Share your database with the integration

### 2. Get your database ID

Your database ID is in the URL:
```
https://www.notion.so/[workspace]/[database-id]?v=[view-id]
```

Example: `https://www.notion.so/myworkspace/a1b2c3d4e5f6...` → database ID is `a1b2c3d4e5f6...`

### 3. Create a configuration file

Create `notion.config.yml` in your project root:

```yaml
databases:
  - databaseId: "your-database-id-here"
    srcDir: "src/posts"
    srcDirImages: "src/assets/images"
    basePath: "/blog"
    layout: "layouts/post.njk"
```

### 4. Set your environment variable

Create a `.env` file:

```env
NOTION_TOKEN=secret_your_token_here
```

### 5. Run the export

```bash
notion-to-ssg
```

## 📖 Usage

### CLI

```bash
# Use default config file (notion.config.yml or notion.config.json)
notion-to-ssg

# Specify a custom config file
notion-to-ssg -c my-config.yml
notion-to-ssg --config custom-config.json

# Show help
notion-to-ssg --help

# Show version
notion-to-ssg --version
```

### Programmatic API

```javascript
const { exportNotionToSSG } = require('notion-to-ssg');

async function exportMyContent() {
  const results = await exportNotionToSSG({
    notionToken: process.env.NOTION_TOKEN,
    configPath: './my-config.yml', // Optional
    // Or provide config directly:
    config: {
      databases: [
        {
          databaseId: 'your-database-id',
          srcDir: 'src/posts',
          basePath: '/blog',
          layout: 'layouts/post.njk'
        }
      ]
    }
  });

  console.log(results);
}
```

### npm scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "notion:export": "notion-to-ssg",
    "prebuild": "npm run notion:export",
    "build": "eleventy"
  }
}
```

## ⚙️ Configuration

### Configuration File Options

#### Required fields

- **`databaseId`** - Your Notion database ID
- **`srcDir`** - Output directory for markdown files
- **`basePath`** - URL base path (e.g., `/blog`)
- **`layout`** - Template layout file (e.g., `layouts/post.njk`)

#### Optional fields

- **`srcDirImages`** - Directory for downloaded images (default: `src/images/notion`)
- **`excludeProperties`** - Array of property names to exclude from front matter
- **`slug`** - Slug generation configuration
  - `from` - Property to use: `"title"`, `"id"`, or any property name (default: `"title"`)
  - `fallback` - Fallback if primary source is empty (default: `"id"`)
  - `lower` - Convert to lowercase (default: `true`)
- **`permalink`** - URL pattern (default: `"{basePath}/{slug}/"`)
- **`frontMatter`** - Additional static fields to add to all pages

### Example: Full Configuration

```yaml
databases:
  - databaseId: "abc123def456"
    srcDir: "src/blog"
    srcDirImages: "src/assets/images/blog"
    basePath: "/blog"
    layout: "layouts/post.njk"
    
    excludeProperties:
      - "Internal Notes"
      - "Status"
      - "Private Field"
    
    slug:
      from: "title"
      fallback: "id"
      lower: true
    
    permalink: "/blog/{slug}/"
    
    frontMatter:
      tags: "post"
      templateEngineOverride: "njk,md"
      eleventyExcludeFromCollections: false

  - databaseId: "xyz789uvw012"
    srcDir: "src/projects"
    srcDirImages: "src/assets/images/projects"
    basePath: "/work"
    layout: "layouts/project.njk"
    permalink: "/work/{slug}/"
    frontMatter:
      tags: "project"
```

## 📄 Output Example

Given a Notion page with these properties:
- **Title**: "My First Blog Post"
- **Date**: 2025-01-15
- **Tags**: `["javascript", "tutorial"]`
- **Author**: "John Doe"
- **Published**: `true`

The exported Markdown file (`my-first-blog-post.md`) will look like:

```markdown
---
layout: layouts/post.njk
title: My First Blog Post
permalink: /blog/my-first-blog-post/
notionPageId: abc123def456
Date: '2025-01-15'
Tags:
  - javascript
  - tutorial
Author: John Doe
Published: true
tags: post
templateEngineOverride: njk,md
---

# My First Blog Post

This is the content from the Notion page, converted to Markdown.

## A heading

- Bullet points work
- All Notion blocks are converted

![An image](../assets/images/blog/my-first-blog-post-0-a1b2c3d4.jpg)

**Bold** and *italic* text are preserved.
```

## 🎨 Notion Property Type Support

All Notion property types are automatically converted:

| Notion Type | Output Format |
|------------|---------------|
| Title | Plain text string |
| Rich Text | Plain text string |
| Number | Number |
| Select | String (option name) |
| Multi-select | Array of strings |
| Date | ISO date string |
| People | Array of names/emails |
| Files & Media | Array of URLs |
| Checkbox | Boolean |
| URL | String |
| Email | String |
| Phone | String |
| Formula | Extracted value based on result type |
| Relation | Array of page IDs |
| Rollup | Computed value |
| Status | String (status name) |

## 🖼️ Image Handling

- **Automatic download** - All Notion-hosted images are downloaded locally
- **Smart caching** - Images are cached to avoid re-downloading
- **Unique filenames** - Uses content hash to prevent collisions
- **Relative paths** - Generated paths work with 11ty and other SSGs
- **Cover images** - Page cover images saved as `coverImage` in front matter
- **Icons** - Page icons saved as `iconImage` in front matter

## 🔧 Use Cases

### 11ty (Eleventy)

Perfect for building blogs, documentation sites, and portfolios:

```yaml
databases:
  - databaseId: "your-blog-db"
    srcDir: "src/blog"
    basePath: "/blog"
    layout: "layouts/post.njk"
    frontMatter:
      tags: "post"
```

### Hugo

```yaml
databases:
  - databaseId: "your-content-db"
    srcDir: "content/posts"
    basePath: "/posts"
    layout: "post"
```

### Jekyll

```yaml
databases:
  - databaseId: "your-db"
    srcDir: "_posts"
    basePath: "/blog"
    layout: "post"
```

### Automated Workflows

Use with GitHub Actions or other CI/CD:

```yaml
# .github/workflows/export-notion.yml
name: Export Notion
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run notion:export
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
      - run: npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🚀 Releasing

This project uses [release-it](https://github.com/release-it/release-it) for automated releases.

For maintainers:
```bash
# Interactive release
npm run release

# Or specify version bump
npm run release:patch  # 1.0.0 → 1.0.1
npm run release:minor  # 1.0.0 → 1.1.0
npm run release:major  # 1.0.0 → 2.0.0

# Dry run to test
npm run release:dry
```

See [RELEASING.md](RELEASING.md) for complete release documentation.

## 📝 License

MIT © ZeFish

## 🙏 Credits

Built with:
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Official Notion SDK
- [notion-to-md](https://github.com/souvikinator/notion-to-md) - Notion to Markdown converter
- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parser
- [slugify](https://github.com/simov/slugify) - URL slug generator

## 📚 Related

- [11ty (Eleventy)](https://www.11ty.dev/)
- [Notion API Documentation](https://developers.notion.com/)

---

Made with ❤️ for the Jamstack community
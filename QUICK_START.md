# Quick Start Guide

Get up and running with notion-to-ssg in 5 minutes!

## 1. Install

```bash
npm install --save-dev notion-to-ssg
```

## 2. Get Your Notion API Token

1. Visit [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Give it a name (e.g., "My Site Export")
4. Copy the **"Internal Integration Token"** (starts with `secret_`)

## 3. Share Your Database

1. Open your Notion database
2. Click the **"•••"** menu in the top right
3. Click **"Add connections"**
4. Select your integration

## 4. Get Your Database ID

Your database ID is in the URL:

```
https://www.notion.so/[workspace]/[DATABASE_ID]?v=[view-id]
                                  ^^^^^^^^^^^^
```

Example:
```
https://www.notion.so/myworkspace/a1b2c3d4e5f6...
                                  ^^^^^^^^^^^^^ (this part)
```

## 5. Create Configuration File

Create `notion.config.yml` in your project root:

```yaml
databases:
  - databaseId: "paste-your-database-id-here"
    srcDir: "src/posts"
    srcDirImages: "src/assets/images"
    basePath: "/blog"
    layout: "layouts/post.njk"
```

Replace:
- `databaseId` with your database ID from step 4
- `srcDir` with where you want markdown files
- `basePath` with your URL path
- `layout` with your template file

## 6. Set Environment Variable

Create a `.env` file in your project root:

```env
NOTION_TOKEN=secret_paste_your_token_here
```

⚠️ **Important**: Add `.env` to your `.gitignore`!

## 7. Run the Export

```bash
npx notion-to-ssg
```

Or add to your `package.json`:

```json
{
  "scripts": {
    "export": "notion-to-ssg",
    "prebuild": "npm run export"
  }
}
```

Then run:

```bash
npm run export
```

## 8. Build Your Site

```bash
npm run build
```

Your Notion content is now exported as Markdown files! 🎉

## What Gets Exported?

- ✅ All page content converted to Markdown
- ✅ All properties in YAML front matter
- ✅ Images downloaded locally
- ✅ Cover images and icons
- ✅ Clean, URL-friendly slugs

## Example Output

**Input**: Notion page titled "My First Post"

**Output**: `src/posts/my-first-post.md`

```markdown
---
layout: layouts/post.njk
title: My First Post
permalink: /blog/my-first-post/
date: '2025-01-15'
tags:
  - tutorial
---

# My First Post

Your content here...
```

## Troubleshooting

### "Missing NOTION_TOKEN"
- Check your `.env` file exists
- Verify the token starts with `secret_`
- Make sure there are no extra spaces

### "No notion.config.yml found"
- Check the filename is exactly `notion.config.yml` or `.json`
- Make sure it's in your project root
- Verify the YAML/JSON syntax is valid

### "No data sources found"
- Make sure you've shared the database with your integration (Step 3)
- Wait a few seconds and try again
- Verify the database ID is correct

### Images not downloading
- Check the `srcDirImages` directory exists or can be created
- Verify you have write permissions
- Images from external URLs may need different handling

## Next Steps

- Read the [full README](README.md) for all configuration options
- Check out the [example configurations](notion.config.example.yml)
- Set up [automated exports with GitHub Actions](README.md#automated-workflows)
- Explore [property exclusions and custom front matter](README.md#configuration)

## Need Help?

- 📖 [Full Documentation](README.md)
- 🐛 [Report an Issue](https://github.com/ZeFish/notion-to-ssg/issues)
- 💬 [Discussions](https://github.com/ZeFish/notion-to-ssg/discussions)

Happy exporting! 🚀
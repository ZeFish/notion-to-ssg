# Quick Start: Notion Comments for Eleventy + Cloudflare Pages

Get up and running with Notion-powered comments in 10 minutes.

## Step 1: Install Dependencies

```bash
npm install @notionhq/client
```

## Step 2: Create Notion Integration

1. Visit [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it "Blog Comments" (or whatever you like)
4. Copy the **Internal Integration Token**

## Step 3: Create Comments Database

1. In Notion, create a new database
2. Add these properties exactly as shown:

   - `author` - Title
   - `email` - Email  
   - `content` - Text
   - `pageId` - Text
   - `published` - Checkbox
   - `createdAt` - Date

3. Click **"..."** → **"Add connections"** → Select your integration
4. Copy the database ID from the URL

## Step 4: Configure Environment Variables

Create `.env` in your project root:

```bash
NOTION_TOKEN=secret_your_token_here
NOTION_COMMENTS_DB_ID=your_database_id_here
```

Add to `.gitignore`:

```
.env
```

## Step 5: Add Plugin to Eleventy

Copy `src/eleventy-plugin-notion-comments.js` to your project.

In `.eleventy.js`:

```javascript
require("dotenv").config();
const notionCommentsPlugin = require("./eleventy-plugin-notion-comments.js");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(notionCommentsPlugin, {
    notionToken: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_COMMENTS_DB_ID,
  });
  
  // ... rest of config
};
```

## Step 6: Add Cloudflare Pages Function

Create `functions/api/comments.js`:

```javascript
import { Client } from "@notionhq/client";

export async function onRequestPost(context) {
  const { request, env } = context;
  const notion = new Client({ auth: env.NOTION_TOKEN });
  
  // Parse form data
  const formData = await request.formData();
  const data = {
    pageId: formData.get("pageId"),
    author: formData.get("author"),
    email: formData.get("email"),
    content: formData.get("content"),
  };
  
  // Create comment in Notion
  await notion.pages.create({
    parent: { database_id: env.NOTION_COMMENTS_DB_ID },
    properties: {
      pageId: { rich_text: [{ text: { content: data.pageId } }] },
      author: { title: [{ text: { content: data.author } }] },
      email: { email: data.email },
      content: { rich_text: [{ text: { content: data.content } }] },
      published: { checkbox: false }, // Requires approval
      createdAt: { date: { start: new Date().toISOString() } },
    },
  });
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
```

> **Note:** Use the full version from `examples/cloudflare-function-comments.js` for production (includes validation, sanitization, error handling).

## Step 7: Use in Templates

In your blog post template:

```njk
---
layout: base.njk
title: My Post
---

<article>
  {{ content | safe }}
</article>

<!-- Add comments -->
{% notionComments %}
```

## Step 8: Add Styles (Optional)

Copy `examples/notion-comments.css` to your CSS directory and include it:

```html
<link rel="stylesheet" href="/css/notion-comments.css">
```

## Step 9: Add JavaScript (Optional)

Copy `examples/notion-comments.js` for AJAX form submission:

```html
<script src="/js/notion-comments.js"></script>
```

## Step 10: Deploy to Cloudflare Pages

### Set Environment Variables

In Cloudflare Pages Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add:
   - `NOTION_TOKEN` = your integration token
   - `NOTION_COMMENTS_DB_ID` = your database ID

### Deploy

```bash
git add .
git commit -m "Add Notion comments"
git push
```

Cloudflare Pages will automatically build and deploy!

## Testing

1. Visit your deployed site
2. Navigate to a blog post
3. Submit a test comment
4. Check your Notion database - the comment should appear
5. Check the `published` checkbox in Notion
6. Rebuild your site to see the approved comment

## What's Next?

- Customize the CSS to match your design
- Add spam protection (CAPTCHA, rate limiting)
- Set up automatic rebuilds when comments are approved
- Read the full documentation in `NOTION_COMMENTS_PLUGIN.md`

## Troubleshooting

**Comments not showing?**
- Check that database properties are named exactly as specified
- Verify the integration has access to the database
- Make sure `published` checkbox is checked for comments

**Form not submitting?**
- Check environment variables are set in Cloudflare Pages
- Look at function logs in Cloudflare dashboard
- Verify function is at `functions/api/comments.js`

**Build errors?**
- Make sure `.env` file exists with valid credentials
- Check that Notion integration has database access
- Try `cacheComments: false` in plugin options

## Support

- [Full Documentation](./NOTION_COMMENTS_PLUGIN.md)
- [notion-to-ssg GitHub](https://github.com/ZeFish/notion-to-ssg)
- [Notion API Docs](https://developers.notion.com/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

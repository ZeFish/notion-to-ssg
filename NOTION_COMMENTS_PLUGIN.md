# Eleventy Notion Comments Plugin

An Eleventy plugin that uses Notion as a comment engine for your static site. Comments are stored in a Notion database and rendered on your pages using a simple shortcode.

## Features

- ✅ Use Notion as a database for blog comments
- ✅ Simple shortcode to render comments and forms
- ✅ Built-in comment moderation support
- ✅ Works with Cloudflare Pages Functions (or Netlify Functions)
- ✅ Progressive enhancement with AJAX form submission
- ✅ Customizable styling with CSS
- ✅ XSS protection and input sanitization
- ✅ Build-time comment caching for performance

## Table of Contents

1. [Setup](#setup)
2. [Notion Database Configuration](#notion-database-configuration)
3. [Plugin Installation](#plugin-installation)
4. [Cloudflare Pages Setup](#cloudflare-pages-setup)
5. [Usage](#usage)
6. [Customization](#customization)
7. [Moderation Workflow](#moderation-workflow)

---

## Setup

### Prerequisites

- Node.js 14+
- An Eleventy (11ty) project
- A Notion account with API access

### 1. Install Dependencies

```bash
npm install @notionhq/client
```

### 2. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Give it a name (e.g., "My Blog Comments")
4. Select the workspace
5. Copy the **Internal Integration Token** (starts with `secret_`)

### 3. Set Environment Variables

Create or update your `.env` file:

```bash
NOTION_TOKEN=secret_your_notion_integration_token_here
NOTION_COMMENTS_DB_ID=your_comments_database_id_here
```

---

## Notion Database Configuration

### Create the Comments Database

1. Create a new database in Notion
2. Add the following properties:

| Property Name | Property Type | Description |
|---------------|---------------|-------------|
| `author` | Title | Comment author's name |
| `email` | Email | Comment author's email (not shown publicly) |
| `content` | Text | Comment content |
| `pageId` | Text | Unique identifier for the page (slug or URL) |
| `published` | Checkbox | Whether the comment is approved/published |
| `createdAt` | Date | When the comment was submitted |

### Database Schema Example

```
┌─────────────────────────────────────────────────────────────────┐
│ Comments Database                                                │
├───────────┬──────────┬──────────┬─────────┬───────────┬─────────┤
│ author    │ email    │ content  │ pageId  │ published │createdAt│
│ (Title)   │ (Email)  │ (Text)   │ (Text)  │(Checkbox) │ (Date)  │
├───────────┼──────────┼──────────┼─────────┼───────────┼─────────┤
│ John Doe  │ john@... │ Great... │ /blog/..│ ☑         │ 2025... │
│ Jane S.   │ jane@... │ Thanks...│ /blog/..│ ☐         │ 2025... │
└───────────┴──────────┴──────────┴─────────┴───────────┴─────────┘
```

### Share Database with Integration

1. Open your Comments database in Notion
2. Click the **"..."** menu (top right)
3. Click **"Add connections"**
4. Select your integration
5. Click **"Confirm"**

### Get Database ID

From the database URL:
```
https://www.notion.so/workspace/abc123def456?v=...
                              ^^^^^^^^^^^^
                              This is your database ID
```

Or use the full URL - the plugin will extract the ID automatically.

---

## Plugin Installation

### 1. Copy Plugin File

Copy `src/eleventy-plugin-notion-comments.js` to your Eleventy project (e.g., `_plugins/notion-comments.js`).

### 2. Configure Eleventy

In your `.eleventy.js` or `eleventy.config.js`:

```javascript
const notionCommentsPlugin = require("./_plugins/notion-comments.js");

module.exports = function (eleventyConfig) {
  // Add Notion Comments plugin
  eleventyConfig.addPlugin(notionCommentsPlugin, {
    notionToken: process.env.NOTION_TOKEN, // Or hardcode (not recommended)
    databaseId: process.env.NOTION_COMMENTS_DB_ID,
    commentFormAction: "/api/comments", // Cloudflare Pages Function endpoint
    enableModeration: true, // Require approval before showing comments
    cacheComments: true, // Cache comments during build (recommended)
  });

  // ... rest of your config
};
```

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `notionToken` | String | `process.env.NOTION_TOKEN` | Notion API token |
| `databaseId` | String | Required | Notion database ID for comments |
| `commentFormAction` | String | `"/api/comments"` | Form submission endpoint |
| `enableModeration` | Boolean | `true` | Require approval before publishing |
| `cacheComments` | Boolean | `true` | Cache comments during build |

---

## Cloudflare Pages Setup

### 1. Create Functions Directory

```bash
mkdir -p functions/api
```

### 2. Add Comments Handler

Copy `examples/cloudflare-function-comments.js` to `functions/api/comments.js`.

Your project structure should look like:

```
your-project/
├── functions/
│   └── api/
│       └── comments.js       ← Cloudflare Pages Function
├── src/
│   └── posts/
│       └── my-post.md
├── .eleventy.js
├── package.json
└── .env
```

### 3. Configure Environment Variables

In your Cloudflare Pages dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

**Production:**
```
NOTION_TOKEN = secret_your_notion_integration_token
NOTION_COMMENTS_DB_ID = your_database_id
```

**Preview (optional):**
```
NOTION_TOKEN = secret_your_notion_integration_token
NOTION_COMMENTS_DB_ID = your_database_id
```

### 4. Update package.json

Make sure you're using ESM format for Cloudflare Functions:

```json
{
  "type": "module",
  "dependencies": {
    "@notionhq/client": "^2.2.15"
  }
}
```

Or keep CommonJS and convert the function to use `require()`.

### 5. Deploy

```bash
git add .
git commit -m "Add Notion comments"
git push
```

Cloudflare Pages will automatically deploy your site with the function at `/api/comments`.

---

## Usage

### Basic Usage

In any of your templates (Nunjucks, Liquid, etc.):

```njk
<!-- In your blog post template -->
<article>
  <h1>{{ title }}</h1>
  <div class="post-content">
    {{ content | safe }}
  </div>
</article>

<!-- Add comments section -->
{% notionComments %}
```

### With Custom Page ID

```njk
<!-- Use a custom identifier -->
{% notionComments "/blog/my-post" %}
```

### Full Example Template

```njk
---
layout: layouts/base.njk
---

<article class="blog-post">
  <header>
    <h1>{{ title }}</h1>
    <time datetime="{{ date }}">{{ date | dateFormat }}</time>
  </header>

  <div class="post-content">
    {{ content | safe }}
  </div>

  <footer>
    <hr>
    <!-- Comments section -->
    {% notionComments page.url %}
  </footer>
</article>
```

### Add Styles

Include the CSS in your layout:

```html
<link rel="stylesheet" href="/css/notion-comments.css">
```

Or copy `examples/notion-comments.css` to your project's CSS directory.

### Add JavaScript (Optional)

For enhanced form handling with AJAX:

```html
<script src="/js/notion-comments.js"></script>
```

Or copy `examples/notion-comments.js` to your project's JS directory.

---

## Customization

### Styling

The plugin outputs semantic HTML with CSS classes you can style:

```css
.notion-comments-container { /* Main wrapper */ }
.notion-comments-list { /* Comments list container */ }
.notion-comment { /* Individual comment */ }
.notion-comment-author { /* Author name */ }
.notion-comment-date { /* Timestamp */ }
.notion-comment-content { /* Comment text */ }
.notion-comment-form { /* Comment form */ }
.notion-comment-submit { /* Submit button */ }
```

See `examples/notion-comments.css` for a complete example with dark mode support.

### Custom Form Templates

You can override the form rendering by modifying the plugin's `renderCommentForm()` function or by hiding the default form with CSS and creating your own that posts to the same endpoint.

### Multiple Comment Sections

You can have different comment sections by using unique page IDs:

```njk
<!-- Main post comments -->
{% notionComments page.url %}

<!-- Feature discussion -->
{% notionComments "feature-requests" %}
```

---

## Moderation Workflow

### Enable Moderation

In `.eleventy.js`:

```javascript
eleventyConfig.addPlugin(notionCommentsPlugin, {
  enableModeration: true, // ← Enable moderation
  // ... other options
});
```

Also update `functions/api/comments.js`:

```javascript
const ENABLE_MODERATION = true; // ← Must match plugin setting
```

### Approve Comments

1. Open your Notion Comments database
2. Find unapproved comments (`published` = unchecked)
3. Review the comment
4. Check the `published` checkbox to approve
5. Rebuild your site (or wait for next scheduled build)

### Auto-Approval

To disable moderation and auto-approve all comments:

```javascript
eleventyConfig.addPlugin(notionCommentsPlugin, {
  enableModeration: false, // ← Disable moderation
});
```

---

## Advanced Configuration

### Netlify Functions Alternative

If you're using Netlify instead of Cloudflare Pages, use `examples/netlify-function-comments.js`:

```bash
mkdir -p netlify/functions
cp examples/netlify-function-comments.js netlify/functions/comments.js
```

Update plugin config:

```javascript
commentFormAction: "/.netlify/functions/comments"
```

### Custom Database Schema

If you want to add additional fields (e.g., website URL, rating), update:

1. Your Notion database schema
2. The Cloudflare function (`functions/api/comments.js`)
3. The plugin rendering functions
4. The comment form HTML

### Spam Protection

Basic protection is included:
- Input sanitization
- Max length validation
- XSS prevention
- Pattern detection for malicious scripts

For advanced protection, consider:
- Adding CAPTCHA (hCaptcha, Turnstile)
- Rate limiting (Cloudflare Workers KV)
- Akismet integration
- Honeypot fields

---

## Troubleshooting

### Comments Not Showing

1. **Check Notion database sharing**: Make sure your integration has access
2. **Verify database ID**: Check that `NOTION_COMMENTS_DB_ID` is correct
3. **Check property names**: Ensure database properties match exactly (`author`, `email`, `content`, `pageId`, `published`, `createdAt`)
4. **Check `published` status**: If moderation is enabled, ensure comments are checked as published

### Form Submission Fails

1. **Check environment variables**: Verify `NOTION_TOKEN` and `NOTION_COMMENTS_DB_ID` are set in Cloudflare Pages
2. **Check function logs**: View logs in Cloudflare Pages dashboard
3. **Test the endpoint**: Use curl or Postman to test `/api/comments`
4. **Verify function path**: Ensure function is at `functions/api/comments.js`

### Build Errors

1. **Check Notion token**: Ensure token is valid and has database access
2. **Check rate limits**: Notion API has rate limits (~3 requests/second)
3. **Disable caching**: Set `cacheComments: false` for debugging

### CORS Errors

The Cloudflare function includes CORS headers. If you still see errors:

1. Check that the function returns proper headers
2. Verify the form action URL is correct
3. Test with `curl -X OPTIONS https://yoursite.com/api/comments`

---

## Examples

### Example 1: Blog Post with Comments

```markdown
---
title: "My First Post"
date: 2025-01-15
layout: layouts/post.njk
---

This is my blog post content...

<!-- Add at the end of your post template -->
{% notionComments %}
```

### Example 2: Custom Styling

```css
.notion-comment {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 15px;
  padding: 20px;
  margin: 20px 0;
}
```

### Example 3: Multiple Databases

```javascript
// Use different databases for different sections
eleventyConfig.addPlugin(notionCommentsPlugin, {
  notionToken: process.env.NOTION_TOKEN,
  databaseId: process.env.BLOG_COMMENTS_DB_ID, // Blog comments
});

eleventyConfig.addPlugin(notionCommentsPlugin, {
  notionToken: process.env.NOTION_TOKEN,
  databaseId: process.env.DOCS_COMMENTS_DB_ID, // Docs feedback
  commentFormAction: "/api/docs-comments",
});
```

---

## License

MIT

## Contributing

Issues and pull requests are welcome!

## Credits

Built on top of [notion-to-ssg](https://github.com/ZeFish/notion-to-ssg) by ZeFish.

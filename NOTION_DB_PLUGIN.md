# Notion DB Plugin for 11ty

Generic Eleventy plugin for writing form data to any Notion database. Includes helper functions for common use cases like comments and contact forms.

## Installation

```bash
npm install notion-to-ssg
```

## Setup

### 1. Environment Setup

Create a `.env` file with your Notion integration token:

```env
NOTION_TOKEN=secret_xxxxx...
```

[Get your Notion token](https://developers.notion.com/docs/getting-started#getting-started-with-the-api)

### 2. Configure in Eleventy

#### Basic Usage (Generic Database)

```javascript
// eleventy.config.js
const notionDB = require("notion-to-ssg/eleventy-plugin-notion-db");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(notionDB, {
    notionToken: process.env.NOTION_TOKEN,
    databases: {
      myForm: {
        databaseId: "abc123...",
        name: "My Custom Form",
        propertyMap: {
          name: { name: "Name", type: "title" },
          email: { name: "Email", type: "email" },
          message: { name: "Message", type: "rich_text" },
        },
      },
    },
  });
};
```

#### With Comments Helper

```javascript
const notionDB = require("notion-to-ssg/eleventy-plugin-notion-db");
const { createCommentsHelper } = notionDB;

const commentsHelper = createCommentsHelper({
  enableModeration: true, // Comments require approval before showing
});

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(notionDB, {
    notionToken: process.env.NOTION_TOKEN,
    databases: {
      comments: commentsHelper.createDatabaseConfig("abc123..."),
    },
  });
};
```

#### With Contact Form Helper

```javascript
const notionDB = require("notion-to-ssg/eleventy-plugin-notion-db");
const { createContactFormHelper } = notionDB;

const contactHelper = createContactFormHelper();

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(notionDB, {
    notionToken: process.env.NOTION_TOKEN,
    databases: {
      contact: contactHelper.createDatabaseConfig("abc123..."),
    },
  });
};
```

#### Multiple Databases

```javascript
const notionDB = require("notion-to-ssg/eleventy-plugin-notion-db");
const { createCommentsHelper, createContactFormHelper } = notionDB;

const commentsHelper = createCommentsHelper();
const contactHelper = createContactFormHelper();

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(notionDB, {
    notionToken: process.env.NOTION_TOKEN,
    databases: {
      comments: commentsHelper.createDatabaseConfig("comments-db-id..."),
      contact: contactHelper.createDatabaseConfig("contact-db-id..."),
      newsletter: {
        databaseId: "newsletter-db-id...",
        name: "Newsletter Signups",
        propertyMap: {
          email: { name: "Email", type: "email" },
          source: { name: "Source", type: "select" },
        },
      },
    },
  });
};
```

## Usage

### Shortcode for Forms

#### Generic Form

```liquid
{% notionForm "myForm", {
  title: "Contact Us",
  action: "/api/contact",
  fields: [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "message", label: "Message", type: "textarea", required: true, maxlength: 5000 }
  ],
  submitText: "Send",
  successMessage: "Thanks for reaching out!"
} %}
```

#### Comments Form (with helper)

```liquid
{% notionForm "comments", commentsHelper.getShortcodeOptions(page.fileSlug) %}
```

#### Contact Form (with helper)

```liquid
{% notionForm "contact", contactHelper.getShortcodeOptions() %}
```

### Global Data API

Access form submission functions in your serverless functions or build scripts:

```javascript
// In a Netlify/Cloudflare function or 11ty data file
eleventyConfig.addGlobalData("notionDB", {
  // Submit raw entry
  async submitEntry(dbKey, data) {
    // dbKey: "comments", "contact", etc.
    // data: { field1: value1, field2: value2, ... }
  },

  // Query database with filters
  async query(dbKey, filters) {
    // Returns array of entries matching filters
  },

  // Get database config
  getDatabase(dbKey) {
    // Returns database configuration object
  },

  // List all database keys
  getDatabases() {
    // Returns array of configured database keys
  },
});
```

### Serverless Function Example (Netlify)

```javascript
// netlify/functions/contact.js
const { Client } = require("@notionhq/client");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, message } = data;

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    await notion.pages.create({
      parent: { database_id: process.env.CONTACT_DB_ID },
      properties: {
        name: { title: [{ text: { content: name } }] },
        email: { email },
        message: { rich_text: [{ text: { content: message } }] },
        createdAt: { date: { start: new Date().toISOString() } },
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Form submission error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to submit form" }),
    };
  }
};
```

### Serverless Function Example (Cloudflare Pages)

```javascript
// functions/api/contact.js
import { Client } from "@notionhq/client";

export const onRequest = async (context) => {
  const { request } = context;

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const data = await request.json();
    const { name, email, message } = data;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const notion = new Client({
      auth: context.env.NOTION_TOKEN,
    });

    await notion.pages.create({
      parent: { database_id: context.env.CONTACT_DB_ID },
      properties: {
        name: { title: [{ text: { content: name } }] },
        email: { email },
        message: { rich_text: [{ text: { content: message } }] },
        createdAt: { date: { start: new Date().toISOString() } },
      },
    });

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Form submission error:", error);
    return new Response(JSON.stringify({ error: "Failed to submit form" }), {
      status: 500,
    });
  }
};
```

## Configuration

### Database Configuration

```javascript
{
  databaseId: "32-char-hex-id", // Required: Notion database ID
  name: "Display Name",          // Optional: Used in UI
  enableModeration: true,        // Optional: Require approval (for comments)
  propertyMap: {                 // Required: Maps form fields to Notion properties
    fieldName: {
      name: "Notion Property Name",
      type: "property_type"
    }
  }
}
```

### Property Types

Supported Notion property types in `propertyMap`:

- `title` - Page title (supports rich text formatting)
- `rich_text` - Plain text content
- `email` - Email addresses
- `checkbox` - Boolean values
- `date` - Date/datetime strings
- `select` - Single option from list
- `multi_select` - Multiple options from list

### Form Field Options

```javascript
{
  name: "fieldName",           // Required: Input field name
  label: "Field Label",        // Optional: Display label
  type: "text",                // Optional: input type (text, email, tel, textarea)
  required: true,              // Optional: Mark as required
  placeholder: "...",          // Optional: Placeholder text
  maxlength: 1000              // Optional: Max character length
}
```

## Helper Functions

### Comments Helper

Pre-configured for comment systems with moderation:

```javascript
const { createCommentsHelper } = require("notion-to-ssg/eleventy-plugin-notion-db");

const commentsHelper = createCommentsHelper({
  enableModeration: true, // Default: true
});

// Get database configuration
const dbConfig = commentsHelper.createDatabaseConfig(databaseId);

// Get form fields
const fields = commentsHelper.getFormFields();
// Returns: [
//   { name: "author", label: "Name", type: "text", ... },
//   { name: "email", label: "Email", type: "email", ... },
//   { name: "content", label: "Comment", type: "textarea", ... }
// ]

// Get shortcode options
const options = commentsHelper.getShortcodeOptions(pageId);
```

**Database Schema:**
- `pageId` (rich_text) - URL or identifier for the page
- `author` (title) - Comment author name
- `email` (email) - Author email
- `content` (rich_text) - Comment text
- `published` (checkbox) - Moderation status
- `createdAt` (date) - Submission timestamp

### Contact Form Helper

Pre-configured for contact/inquiry forms:

```javascript
const { createContactFormHelper } = require("notion-to-ssg/eleventy-plugin-notion-db");

const contactHelper = createContactFormHelper();

// Get database configuration
const dbConfig = contactHelper.createDatabaseConfig(databaseId);

// Get form fields
const fields = contactHelper.getFormFields();
// Returns: [
//   { name: "name", label: "Name", type: "text", ... },
//   { name: "email", label: "Email", type: "email", ... },
//   { name: "phone", label: "Phone", type: "tel", ... },
//   { name: "subject", label: "Subject", type: "text", ... },
//   { name: "message", label: "Message", type: "textarea", ... }
// ]

// Get shortcode options
const options = contactHelper.getShortcodeOptions();
```

**Database Schema:**
- `name` (title) - Sender name
- `email` (email) - Sender email
- `phone` (rich_text) - Sender phone
- `subject` (rich_text) - Message subject
- `message` (rich_text) - Message body
- `createdAt` (date) - Submission timestamp

## Advanced Usage

### Custom Database Configuration

```javascript
eleventyConfig.addPlugin(notionDB, {
  notionToken: process.env.NOTION_TOKEN,
  databases: {
    surveys: {
      databaseId: "survey-db-id...",
      name: "Customer Surveys",
      propertyMap: {
        email: { name: "Email", type: "email" },
        satisfaction: { name: "Satisfaction", type: "select" },
        comments: { name: "Comments", type: "rich_text" },
        tags: { name: "Tags", type: "multi_select" },
        responseDate: { name: "Response Date", type: "date" },
      },
    },
  },
});
```

### Custom Form Fields

```liquid
{% notionForm "surveys", {
  title: "Customer Satisfaction Survey",
  fields: [
    { name: "email", label: "Email", type: "email", required: true },
    { name: "satisfaction", label: "How satisfied are you?", type: "select", required: true },
    { name: "comments", label: "Additional Comments", type: "textarea", required: false, maxlength: 1000 }
  ],
  submitText: "Submit Survey",
  successMessage: "Thank you for your feedback!"
} %}
```

### Query Database in Build

```javascript
// In an 11ty data file (.11tydata.js)
module.exports = {
  eleventyCompute: {
    comments: async (data) => {
      const notionDB = data.notionDB;
      const comments = await notionDB.query("comments", {
        filter: {
          and: [
            { property: "pageId", rich_text: { equals: data.page.fileSlug } },
            { property: "published", checkbox: { equals: true } },
          ],
        },
        sorts: [{ property: "createdAt", direction: "ascending" }],
      });
      return comments;
    },
  },
};
```

## Best Practices

1. **Use helpers** - `createCommentsHelper()` and `createContactFormHelper()` handle most common cases
2. **Enable moderation** - Set `enableModeration: true` for user-submitted content
3. **Validate input** - Always validate on the server side (serverless function)
4. **Rate limiting** - Add rate limiting to your serverless functions
5. **Sanitize output** - The plugin escapes HTML in forms, but validate all submissions
6. **Use environment variables** - Store sensitive data in `.env`, never commit secrets
7. **Error handling** - Provide user-friendly error messages

## Troubleshooting

### "Database not configured"
- Verify the database key matches your config
- Check `notionDB.getDatabases()` for available keys

### Form not submitting
- Verify the `action` URL matches your serverless function endpoint
- Check browser console for JavaScript errors
- Verify Notion token has access to the database

### Missing database ID
- Copy the ID from the Notion URL: `https://www.notion.so/workspace/[32-CHAR-ID]?v=...`
- Ensure it's exactly 32 hexadecimal characters
- Verify the integration is shared with the database

## Legacy: Comments Plugin

The original `eleventy-plugin-notion-comments.js` is still available for backwards compatibility. For new projects, use the new plugin with the comments helper.

```javascript
// Old way (still works)
const commentsPlugin = require("notion-to-ssg/eleventy-plugin-notion-comments");
eleventyConfig.addPlugin(commentsPlugin, {
  notionToken: process.env.NOTION_TOKEN,
  databaseId: "...",
  commentFormAction: "/api/comments",
});

// New way (recommended)
const notionDB = require("notion-to-ssg/eleventy-plugin-notion-db");
const { createCommentsHelper } = notionDB;
eleventyConfig.addPlugin(notionDB, {
  notionToken: process.env.NOTION_TOKEN,
  databases: {
    comments: createCommentsHelper().createDatabaseConfig("..."),
  },
});
```

## Contributing

Feature requests for new helpers are welcome! Currently supported:
- Comments system (`createCommentsHelper`)
- Contact form (`createContactFormHelper`)

Submit ideas for other form types via GitHub issues.

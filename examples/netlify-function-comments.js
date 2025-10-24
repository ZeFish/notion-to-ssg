/**
 * Netlify Function Example for Notion Comments
 *
 * This serverless function handles comment form submissions and adds them to a Notion database.
 *
 * Setup:
 * 1. Place this file in your Netlify functions directory (e.g., `netlify/functions/comments.js`)
 * 2. Add NOTION_TOKEN and NOTION_COMMENTS_DB_ID to your Netlify environment variables
 * 3. Install dependencies: npm install @notionhq/client
 * 4. Configure your comment form action to point to `/.netlify/functions/comments`
 */

const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_COMMENTS_DB_ID;

// Enable moderation (comments require approval before showing)
const ENABLE_MODERATION = process.env.ENABLE_COMMENT_MODERATION !== "false";

// CORS headers
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize input to prevent malicious content
 */
function sanitizeInput(text, maxLength = 2000) {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}

/**
 * Extract form data from different content types
 */
function parseFormData(event) {
  const contentType = event.headers["content-type"] || "";

  if (contentType.includes("application/json")) {
    return JSON.parse(event.body);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(event.body);
    return {
      pageId: params.get("pageId"),
      author: params.get("author"),
      email: params.get("email"),
      content: params.get("content"),
    };
  }

  throw new Error("Unsupported content type");
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse form data
    const data = parseFormData(event);
    const { pageId, author, email, content } = data;

    // Validate required fields
    if (!pageId || !author || !email || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required fields: pageId, author, email, content",
        }),
      };
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid email format" }),
      };
    }

    // Sanitize inputs
    const sanitizedData = {
      pageId: sanitizeInput(pageId, 500),
      author: sanitizeInput(author, 100),
      email: sanitizeInput(email, 100),
      content: sanitizeInput(content, 2000),
    };

    // Validate sanitized data is not empty
    if (
      !sanitizedData.pageId ||
      !sanitizedData.author ||
      !sanitizedData.email ||
      !sanitizedData.content
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid input data" }),
      };
    }

    // Create comment in Notion database
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        pageId: {
          rich_text: [{ text: { content: sanitizedData.pageId } }],
        },
        author: {
          title: [{ text: { content: sanitizedData.author } }],
        },
        email: {
          email: sanitizedData.email,
        },
        content: {
          rich_text: [{ text: { content: sanitizedData.content } }],
        },
        published: {
          checkbox: !ENABLE_MODERATION, // Auto-publish if moderation is disabled
        },
        createdAt: {
          date: { start: new Date().toISOString() },
        },
      },
    });

    // Return success response
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message: ENABLE_MODERATION
          ? "Comment submitted successfully and is awaiting moderation."
          : "Comment published successfully!",
        commentId: response.id,
      }),
    };
  } catch (error) {
    console.error("Error creating comment:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to submit comment. Please try again later.",
        details: error.message,
      }),
    };
  }
};

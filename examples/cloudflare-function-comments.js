/**
 * Cloudflare Pages Function for Notion Comments
 *
 * This serverless function handles comment form submissions and adds them to a Notion database.
 *
 * Setup:
 * 1. Place this file at `functions/api/comments.js` in your Cloudflare Pages project
 * 2. Add NOTION_TOKEN and NOTION_COMMENTS_DB_ID to your Cloudflare Pages environment variables
 *    (Settings > Environment Variables in Cloudflare Dashboard)
 * 3. The function will be available at: https://yourdomain.com/api/comments
 * 4. Configure your comment form action to point to `/api/comments`
 *
 * Note: Cloudflare Pages Functions automatically install dependencies from your package.json
 * Make sure @notionhq/client is in your dependencies
 */

import { Client } from "@notionhq/client";

// Enable moderation (comments require approval before showing)
const ENABLE_MODERATION = true; // Set to false to auto-publish comments

/**
 * Extract database ID from URL or raw ID
 */
function extractDatabaseId(idOrUrl) {
  if (idOrUrl.match(/^[a-f0-9]{32}$/)) {
    return idOrUrl;
  }
  const match = idOrUrl.match(/[a-f0-9]{32}/);
  if (match) {
    return match[0];
  }
  throw new Error(`Invalid Notion database ID: ${idOrUrl}`);
}

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
 * Parse form data from request
 */
async function parseFormData(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await request.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return {
      pageId: params.get("pageId"),
      author: params.get("author"),
      email: params.get("email"),
      content: params.get("content"),
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      pageId: formData.get("pageId"),
      author: formData.get("author"),
      email: formData.get("email"),
      content: formData.get("content"),
    };
  }

  throw new Error("Unsupported content type");
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

/**
 * Main handler - Cloudflare Pages Function export
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Get environment variables
    const notionToken = env.NOTION_TOKEN;
    const databaseId = extractDatabaseId(env.NOTION_COMMENTS_DB_ID);

    if (!notionToken || !databaseId) {
      return jsonResponse(
        {
          error: "Server configuration error. Missing Notion credentials.",
        },
        500
      );
    }

    // Initialize Notion client
    const notion = new Client({ auth: notionToken });

    // Parse form data
    const data = await parseFormData(request);
    const { pageId, author, email, content } = data;

    // Validate required fields
    if (!pageId || !author || !email || !content) {
      return jsonResponse(
        {
          error: "Missing required fields: pageId, author, email, content",
        },
        400
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return jsonResponse({ error: "Invalid email format" }, 400);
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
      return jsonResponse({ error: "Invalid input data" }, 400);
    }

    // Optional: Simple spam protection (rate limiting could be added)
    // Check for suspicious patterns
    const spamPatterns = [
      /<script/i,
      /javascript:/i,
      /onclick=/i,
      /onerror=/i,
    ];
    const combinedText = `${sanitizedData.author} ${sanitizedData.content}`;
    if (spamPatterns.some((pattern) => pattern.test(combinedText))) {
      return jsonResponse(
        { error: "Suspicious content detected" },
        400
      );
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
    return jsonResponse({
      success: true,
      message: ENABLE_MODERATION
        ? "Comment submitted successfully and is awaiting moderation."
        : "Comment published successfully!",
      commentId: response.id,
    });
  } catch (error) {
    console.error("Error creating comment:", error);

    return jsonResponse(
      {
        error: "Failed to submit comment. Please try again later.",
        details: error.message,
      },
      500
    );
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

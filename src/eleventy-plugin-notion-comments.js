/* Eleventy Plugin: Notion Comments */
const { Client } = require("@notionhq/client");

/**
 * Eleventy plugin to use Notion as a comment engine
 *
 * @param {Object} eleventyConfig - The Eleventy configuration object
 * @param {Object} options - Plugin options
 * @param {string} options.notionToken - Notion API token
 * @param {string} options.databaseId - Notion database ID for comments
 * @param {string} [options.commentFormAction] - Optional form action URL for comment submission
 * @param {boolean} [options.enableModeration=true] - Whether to moderate comments (unpublished by default)
 */
module.exports = function (eleventyConfig, options = {}) {
  // Validate required options
  const notionToken = options.notionToken || process.env.NOTION_TOKEN;
  if (!notionToken) {
    throw new Error(
      "Notion Comments Plugin: Missing notionToken. Provide it via plugin options or NOTION_TOKEN environment variable.",
    );
  }

  if (!options.databaseId) {
    throw new Error(
      "Notion Comments Plugin: Missing databaseId option. Provide the Notion database ID for storing comments.",
    );
  }

  const databaseId = extractDatabaseId(options.databaseId);
  const commentFormAction = options.commentFormAction || "/api/comments";
  const enableModeration = options.enableModeration !== false; // default true
  const cacheComments = options.cacheComments !== false; // default true - cache during build

  // Initialize Notion client
  const notion = new Client({ auth: notionToken });

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
    throw new Error(`Invalid Notion database ID or URL: ${idOrUrl}`);
  }

  /**
   * Fetch comments for a specific page/post from Notion database
   * @param {string} pageId - The unique identifier for the page (e.g., slug or URL)
   * @returns {Promise<Array>} Array of comment objects
   */
  async function fetchComments(pageId) {
    try {
      const response = await notion.databases.query({
        database_id: databaseId,
        filter: {
          and: [
            {
              property: "pageId",
              rich_text: {
                equals: pageId,
              },
            },
            ...(enableModeration
              ? [
                  {
                    property: "published",
                    checkbox: {
                      equals: true,
                    },
                  },
                ]
              : []),
          ],
        },
        sorts: [
          {
            property: "createdAt",
            direction: "ascending",
          },
        ],
      });

      return response.results.map((page) => {
        const props = page.properties;
        return {
          id: page.id,
          author: extractPlainText(props.author),
          email: extractPlainText(props.email),
          content: extractPlainText(props.content),
          createdAt: props.createdAt?.date?.start || page.created_time,
          published: props.published?.checkbox || false,
        };
      });
    } catch (error) {
      console.error(
        `Error fetching comments for page "${pageId}":`,
        error.message,
      );
      return [];
    }
  }

  /**
   * Extract plain text from Notion rich text property
   */
  function extractPlainText(prop) {
    if (!prop) return "";
    switch (prop.type) {
      case "title":
        return (prop.title || []).map((t) => t.plain_text || "").join("");
      case "rich_text":
        return (prop.rich_text || []).map((t) => t.plain_text || "").join("");
      case "email":
        return prop.email || "";
      default:
        return "";
    }
  }

  /**
   * Format date in a readable format
   */
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Render comment list HTML
   */
  function renderComments(comments) {
    if (!comments || comments.length === 0) {
      return '<div class="notion-comments-empty"><p>No comments yet. Be the first to comment!</p></div>';
    }

    const commentsHtml = comments
      .map(
        (comment) => `
      <div class="notion-comment" id="comment-${comment.id}">
        <div class="notion-comment-header">
          <span class="notion-comment-author">${escapeHtml(comment.author)}</span>
          <time class="notion-comment-date" datetime="${comment.createdAt}">
            ${formatDate(comment.createdAt)}
          </time>
        </div>
        <div class="notion-comment-content">
          ${escapeHtml(comment.content).replace(/\n/g, "<br>")}
        </div>
      </div>
    `,
      )
      .join("\n");

    return `
      <div class="notion-comments-list">
        <h3 class="notion-comments-title">Comments (${comments.length})</h3>
        ${commentsHtml}
      </div>
    `;
  }

  /**
   * Render comment form HTML
   */
  function renderCommentForm(pageId, formAction) {
    return `
      <div class="notion-comment-form-wrapper">
        <h3 class="notion-comment-form-title">Leave a Comment</h3>
        <form class="notion-comment-form" action="${formAction}" method="POST" data-page-id="${escapeHtml(pageId)}">
          <input type="hidden" name="pageId" value="${escapeHtml(pageId)}">

          <div class="notion-comment-form-group">
            <label for="comment-author">Name *</label>
            <input
              type="text"
              id="comment-author"
              name="author"
              required
              placeholder="Your name"
              maxlength="100"
            >
          </div>

          <div class="notion-comment-form-group">
            <label for="comment-email">Email *</label>
            <input
              type="email"
              id="comment-email"
              name="email"
              required
              placeholder="your@email.com"
              maxlength="100"
            >
            <small>Your email will not be published.</small>
          </div>

          <div class="notion-comment-form-group">
            <label for="comment-content">Comment *</label>
            <textarea
              id="comment-content"
              name="content"
              required
              rows="5"
              placeholder="Write your comment here..."
              maxlength="2000"
            ></textarea>
          </div>

          <div class="notion-comment-form-group">
            <button type="submit" class="notion-comment-submit">
              Submit Comment
            </button>
          </div>

          ${enableModeration ? '<p class="notion-comment-moderation-notice"><small>Your comment will be reviewed before publication.</small></p>' : ""}
        </form>
      </div>
    `;
  }

  // Register the async shortcode
  eleventyConfig.addAsyncShortcode(
    "notionComments",
    async function (pageId = null) {
      // Use page URL or slug as default pageId if not provided
      const finalPageId =
        pageId || this.page?.url || this.page?.fileSlug || "unknown";

      try {
        const comments = await fetchComments(finalPageId);
        const commentsHtml = renderComments(comments);
        const formHtml = renderCommentForm(finalPageId, commentFormAction);

        return `
<div class="notion-comments-container" data-page-id="${escapeHtml(finalPageId)}">
  ${commentsHtml}
  ${formHtml}
</div>
        `;
      } catch (error) {
        console.error(
          `Error rendering comments for "${finalPageId}":`,
          error.message,
        );
        return `<div class="notion-comments-error"><p>Unable to load comments at this time.</p></div>`;
      }
    },
  );

  // Add helper function to submit comments (for use in serverless functions)
  eleventyConfig.addGlobalData("notionCommentsAPI", {
    /**
     * Submit a new comment to the Notion database
     * @param {Object} commentData
     * @param {string} commentData.pageId - Page identifier
     * @param {string} commentData.author - Comment author name
     * @param {string} commentData.email - Comment author email
     * @param {string} commentData.content - Comment content
     * @returns {Promise<Object>} Created comment page object
     */
    async submitComment(commentData) {
      const { pageId, author, email, content } = commentData;

      if (!pageId || !author || !email || !content) {
        throw new Error(
          "Missing required fields: pageId, author, email, content",
        );
      }

      try {
        const response = await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            pageId: {
              rich_text: [{ text: { content: String(pageId) } }],
            },
            author: {
              title: [{ text: { content: String(author) } }],
            },
            email: {
              email: String(email),
            },
            content: {
              rich_text: [{ text: { content: String(content) } }],
            },
            published: {
              checkbox: !enableModeration, // Auto-publish if moderation is disabled
            },
            createdAt: {
              date: { start: new Date().toISOString() },
            },
          },
        });

        return response;
      } catch (error) {
        console.error("Error submitting comment:", error.message);
        throw error;
      }
    },
  });

  console.log("✓ Notion Comments Plugin loaded");
};

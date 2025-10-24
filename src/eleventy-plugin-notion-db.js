/* Eleventy Plugin: Notion DB - Generic database writer for Notion */
const { Client } = require("@notionhq/client");

/**
 * Core Eleventy plugin to write form data to any Notion database
 *
 * @param {Object} eleventyConfig - The Eleventy configuration object
 * @param {Object} options - Plugin options
 * @param {string} options.notionToken - Notion API token
 * @param {Object} options.databases - Database configurations
 * @returns {Object} Notion DB API for use in serverless functions
 */
module.exports = function (eleventyConfig, options = {}) {
  // Validate required options
  const notionToken = options.notionToken || process.env.NOTION_TOKEN;
  if (!notionToken) {
    throw new Error(
      "Notion DB Plugin: Missing notionToken. Provide it via plugin options or NOTION_TOKEN environment variable."
    );
  }

  if (!options.databases || Object.keys(options.databases).length === 0) {
    throw new Error(
      "Notion DB Plugin: Missing databases option. Provide at least one database configuration."
    );
  }

  // Initialize Notion client
  const notion = new Client({ auth: notionToken });

  // Normalize and validate all database configs
  const databases = {};
  for (const [key, config] of Object.entries(options.databases)) {
    databases[key] = {
      id: extractDatabaseId(config.databaseId || config.id),
      name: config.name || key,
      propertyMap: config.propertyMap || {},
      enableModeration: config.enableModeration !== false,
      ...config,
    };
  }

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
   * Extract plain text from Notion property
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
   * Query database with filters
   */
  async function queryDatabase(dbKey, filters = {}) {
    const dbConfig = databases[dbKey];
    if (!dbConfig) {
      throw new Error(`Database "${dbKey}" not configured`);
    }

    try {
      const response = await notion.databases.query({
        database_id: dbConfig.id,
        filter: filters.filter || undefined,
        sorts: filters.sorts || undefined,
      });

      return response.results.map((page) => ({
        id: page.id,
        properties: page.properties,
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
      }));
    } catch (error) {
      console.error(
        `Error querying database "${dbKey}":`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Submit entry to database
   */
  async function submitEntry(dbKey, data) {
    const dbConfig = databases[dbKey];
    if (!dbConfig) {
      throw new Error(`Database "${dbKey}" not configured`);
    }

    try {
      // Map input data to Notion properties using propertyMap
      const properties = {};
      for (const [inputField, notionProp] of Object.entries(
        dbConfig.propertyMap
      )) {
        const value = data[inputField];
        if (value === undefined || value === null) continue;

        // Handle different property types
        const { name, type = "rich_text" } = typeof notionProp === "string"
          ? { name: notionProp }
          : notionProp;

        switch (type) {
          case "title":
            properties[name] = {
              title: [{ text: { content: String(value) } }],
            };
            break;
          case "rich_text":
            properties[name] = {
              rich_text: [{ text: { content: String(value) } }],
            };
            break;
          case "email":
            properties[name] = { email: String(value) };
            break;
          case "checkbox":
            properties[name] = { checkbox: Boolean(value) };
            break;
          case "date":
            properties[name] = { date: { start: String(value) } };
            break;
          case "select":
            properties[name] = { select: { name: String(value) } };
            break;
          case "multi_select":
            const values = Array.isArray(value) ? value : [value];
            properties[name] = {
              multi_select: values.map((v) => ({ name: String(v) })),
            };
            break;
          default:
            properties[name] = {
              rich_text: [{ text: { content: String(value) } }],
            };
        }
      }

      const response = await notion.pages.create({
        parent: { database_id: dbConfig.id },
        properties,
      });

      return response;
    } catch (error) {
      console.error(`Error submitting to database "${dbKey}":`, error.message);
      throw error;
    }
  }

  // Register the async shortcode for generic form rendering
  eleventyConfig.addAsyncShortcode(
    "notionForm",
    async function (dbKey, options = {}) {
      const dbConfig = databases[dbKey];
      if (!dbConfig) {
        return `<div class="notion-form-error">Database "${dbKey}" not configured</div>`;
      }

      const {
        title = `Submit to ${dbConfig.name}`,
        action = `/api/notion/${dbKey}`,
        fields = [],
        submitText = "Submit",
        successMessage = "Thank you for your submission!",
      } = options;

      const fieldsHtml = fields
        .map((field) => {
          const {
            name,
            label,
            type = "text",
            required = true,
            placeholder = "",
            maxlength = 1000,
          } = field;

          const requiredAttr = required ? "required" : "";
          const maxlengthAttr = type === "textarea" ? "" : `maxlength="${maxlength}"`;

          if (type === "textarea") {
            return `
        <div class="notion-form-group">
          <label for="form-${name}">${label || name}${required ? " *" : ""}</label>
          <textarea
            id="form-${name}"
            name="${name}"
            ${requiredAttr}
            rows="5"
            placeholder="${placeholder}"
            maxlength="${maxlength}"
          ></textarea>
        </div>
            `;
          }

          return `
        <div class="notion-form-group">
          <label for="form-${name}">${label || name}${required ? " *" : ""}</label>
          <input
            type="${type}"
            id="form-${name}"
            name="${name}"
            ${requiredAttr}
            placeholder="${placeholder}"
            ${maxlengthAttr}
          >
        </div>
          `;
        })
        .join("\n");

      return `
      <div class="notion-form-wrapper" data-db="${escapeHtml(dbKey)}">
        <h3 class="notion-form-title">${title}</h3>
        <form class="notion-form" action="${action}" method="POST">
          ${fieldsHtml}
          <div class="notion-form-group">
            <button type="submit" class="notion-form-submit">${submitText}</button>
          </div>
        </form>
        <div class="notion-form-message" style="display:none;" data-success="${successMessage}"></div>
      </div>
      `;
    }
  );

  // Add helper functions to global data
  eleventyConfig.addGlobalData("notionDB", {
    /**
     * Submit raw entry to database
     */
    async submitEntry(dbKey, data) {
      return submitEntry(dbKey, data);
    },

    /**
     * Query database with filters
     */
    async query(dbKey, filters) {
      return queryDatabase(dbKey, filters);
    },

    /**
     * Get database configuration
     */
    getDatabase(dbKey) {
      return databases[dbKey];
    },

    /**
     * Get all configured databases
     */
    getDatabases() {
      return Object.keys(databases);
    },
  });

  console.log(
    `✓ Notion DB Plugin loaded with ${Object.keys(databases).length} database(s): ${Object.keys(databases).join(", ")}`
  );
};

/**
 * Helper: Create a comments system configuration
 * Returns a factory function to set up comments for a database
 */
function createCommentsHelper(options = {}) {
  return {
    /**
     * Create comments database config
     */
    createDatabaseConfig(databaseId) {
      return {
        databaseId,
        name: "Comments",
        enableModeration: options.enableModeration !== false,
        propertyMap: {
          pageId: { name: "pageId", type: "rich_text" },
          author: { name: "author", type: "title" },
          email: { name: "email", type: "email" },
          content: { name: "content", type: "rich_text" },
          published: { name: "published", type: "checkbox" },
          createdAt: { name: "createdAt", type: "date" },
        },
      };
    },

    /**
     * Create form fields for comments
     */
    getFormFields() {
      return [
        {
          name: "author",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "Your name",
          maxlength: 100,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          placeholder: "your@email.com",
          maxlength: 100,
        },
        {
          name: "content",
          label: "Comment",
          type: "textarea",
          required: true,
          placeholder: "Write your comment here...",
          maxlength: 2000,
        },
      ];
    },

    /**
     * Get comments shortcode options
     */
    getShortcodeOptions(pageId) {
      return {
        title: "Leave a Comment",
        action: "/api/comments",
        fields: this.getFormFields(),
        submitText: "Submit Comment",
        successMessage: "Thank you for your comment! It will be reviewed before publication.",
      };
    },
  };
}

/**
 * Helper: Create a contact form system configuration
 * Returns a factory function to set up contact forms for a database
 */
function createContactFormHelper(options = {}) {
  return {
    /**
     * Create contact database config
     */
    createDatabaseConfig(databaseId) {
      return {
        databaseId,
        name: "Contact Submissions",
        enableModeration: false,
        propertyMap: {
          name: { name: "name", type: "title" },
          email: { name: "email", type: "email" },
          subject: { name: "subject", type: "rich_text" },
          message: { name: "message", type: "rich_text" },
          phone: { name: "phone", type: "rich_text" },
          createdAt: { name: "createdAt", type: "date" },
        },
      };
    },

    /**
     * Create form fields for contact form
     */
    getFormFields() {
      return [
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "Your full name",
          maxlength: 100,
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          placeholder: "your@email.com",
          maxlength: 100,
        },
        {
          name: "phone",
          label: "Phone",
          type: "tel",
          required: false,
          placeholder: "+1 (555) 000-0000",
          maxlength: 20,
        },
        {
          name: "subject",
          label: "Subject",
          type: "text",
          required: true,
          placeholder: "What is this about?",
          maxlength: 200,
        },
        {
          name: "message",
          label: "Message",
          type: "textarea",
          required: true,
          placeholder: "Tell us more...",
          maxlength: 5000,
        },
      ];
    },

    /**
     * Get contact form shortcode options
     */
    getShortcodeOptions() {
      return {
        title: "Get in Touch",
        action: "/api/contact",
        fields: this.getFormFields(),
        submitText: "Send Message",
        successMessage: "Thank you for contacting us! We'll get back to you soon.",
      };
    },
  };
}

module.exports.createCommentsHelper = createCommentsHelper;
module.exports.createContactFormHelper = createContactFormHelper;

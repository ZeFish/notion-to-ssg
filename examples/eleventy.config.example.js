/**
 * Example Eleventy Configuration with Notion Comments Plugin
 *
 * This is an example of how to configure Eleventy with the Notion Comments plugin.
 * Copy this to your project and customize as needed.
 */

require("dotenv").config();

const notionCommentsPlugin = require("../src/eleventy-plugin-notion-comments.js");

module.exports = function (eleventyConfig) {
  // ========================================
  // Notion Comments Plugin Configuration
  // ========================================

  eleventyConfig.addPlugin(notionCommentsPlugin, {
    // Notion API Token (from .env file or environment variable)
    notionToken: process.env.NOTION_TOKEN,

    // Notion Database ID for comments
    // You can use the full URL or just the 32-character ID
    databaseId: process.env.NOTION_COMMENTS_DB_ID,

    // Form action endpoint
    // For Cloudflare Pages: "/api/comments"
    // For Netlify Functions: "/.netlify/functions/comments"
    commentFormAction: "/api/comments",

    // Enable comment moderation
    // true: Comments must be approved before showing (recommended)
    // false: Comments are auto-published immediately
    enableModeration: true,

    // Cache comments during build
    // true: Fetch comments once during build (faster, recommended for production)
    // false: Fetch comments on every page render (slower, good for debugging)
    cacheComments: true,
  });

  // ========================================
  // Other Eleventy Configuration
  // ========================================

  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");

  // Date formatting filter
  eleventyConfig.addFilter("dateFormat", (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  // Return configuration
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};

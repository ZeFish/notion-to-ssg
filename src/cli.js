#!/usr/bin/env node

/* CLI wrapper for notion-to-ssg */
require("dotenv").config();
const { exportNotionToSSG } = require("./index");

async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let configPath = null;
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      showHelp = true;
    } else if (arg === "-v" || arg === "--version") {
      showVersion = true;
    } else if (arg === "-c" || arg === "--config") {
      configPath = args[i + 1];
      i++; // Skip next argument
    } else if (!arg.startsWith("-")) {
      configPath = arg;
    }
  }

  if (showVersion) {
    const pkg = require("../package.json");
    console.log(`notion-to-ssg v${pkg.version}`);
    process.exit(0);
  }

  if (showHelp) {
    console.log(`
notion-to-ssg - Export Notion databases to Markdown files for static site generators

USAGE:
  notion-to-ssg [OPTIONS] [CONFIG_FILE]

OPTIONS:
  -c, --config <file>    Path to config file (default: notion.config.yml/json)
  -h, --help             Show this help message
  -v, --version          Show version number

ENVIRONMENT VARIABLES:
  NOTION_TOKEN           Your Notion API integration token (required)

EXAMPLES:
  # Export using default config file (notion.config.yml)
  notion-to-ssg

  # Export using a specific config file
  notion-to-ssg -c my-config.yml
  notion-to-ssg custom-config.json

  # Set token inline (not recommended for production)
  NOTION_TOKEN=secret_xxx notion-to-ssg

CONFIGURATION:
  Create a notion.config.yml or notion.config.json file in your project root.
  See https://github.com/ZeFish/notion-to-ssg for full documentation.

`);
    process.exit(0);
  }

  try {
    console.log("🚀 Starting Notion export...\n");

    const results = await exportNotionToSSG({
      configPath,
      notionToken: process.env.NOTION_TOKEN,
    });

    console.log("\n✨ Export completed successfully!");
    console.log("\nSummary:");
    for (const result of results) {
      console.log(`  • ${result.databaseTitle}: ${result.pagesExported} pages exported`);
      if (result.filesDeleted.length > 0) {
        console.log(`    (${result.filesDeleted.length} stale files deleted)`);
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

/* Notion → SSG Markdown exporter library */
const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const yaml = require("js-yaml");
const https = require("https");
const http = require("http");
const crypto = require("crypto");

// Image download cache to avoid re-downloading the same image
const imageCache = new Map();

// ---------- Configuration Loading ----------
function loadConfig(configPath = null) {
  const tryPaths = configPath
    ? [configPath]
    : [
        path.join(process.cwd(), "notion.config.json"),
        path.join(process.cwd(), "notion.config.yaml"),
        path.join(process.cwd(), "notion.config.yml"),
      ];

  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      if (p.endsWith(".json")) {
        return JSON.parse(fs.readFileSync(p, "utf8"));
      } else {
        return yaml.load(fs.readFileSync(p, "utf8"));
      }
    }
  }

  if (configPath) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  throw new Error(
    "No notion.config.json, notion.config.yaml, or notion.config.yml found in project root",
  );
}

// ---------- File System Helpers ----------
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getAllMarkdownFilesInDir(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(dir, file));
}

// ---------- String Helpers ----------
function toSlug(str, opts = { lower: true }) {
  return slugify(String(str || ""), {
    lower: !!opts.lower,
    strict: true,
    locale: "fr",
    remove: /[*+~.()'":@/?]/g,
    trim: true,
  });
}

// ---------- Image Downloading ----------
async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download image: ${response.statusCode} ${url}`,
            ),
          );
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(destPath);
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {}); // Delete the file async
        reject(err);
      });

    file.on("error", (err) => {
      fs.unlink(destPath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

function getImageExtension(url) {
  const urlWithoutQuery = url.split("?")[0];
  const match = urlWithoutQuery.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  return match ? match[1].toLowerCase() : "jpg";
}

async function saveNotionImage(imageUrl, pageSlug, imageIndex, imagesDir) {
  // Check cache first
  if (imageCache.has(imageUrl)) {
    return imageCache.get(imageUrl);
  }

  try {
    ensureDir(imagesDir);

    const ext = getImageExtension(imageUrl);
    const urlHash = crypto
      .createHash("md5")
      .update(imageUrl)
      .digest("hex")
      .substring(0, 8);
    const filename = `${pageSlug}-${imageIndex}-${urlHash}.${ext}`;
    const destPath = path.join(imagesDir, filename);

    // Skip if already exists
    if (fs.existsSync(destPath)) {
      const relativePath = `/${path.relative(path.join(process.cwd(), "src"), destPath)}`;
      imageCache.set(imageUrl, relativePath);
      return relativePath;
    }

    await downloadImage(imageUrl, destPath);
    console.log(`  📷 Downloaded image: ${filename}`);

    const relativePath = `/${path.relative(path.join(process.cwd(), "src"), destPath)}`;
    imageCache.set(imageUrl, relativePath);
    return relativePath;
  } catch (error) {
    console.warn(`  ⚠️  Failed to download image: ${error.message}`);
    return imageUrl; // Fallback to original URL
  }
}

// ---------- Notion Property Extraction ----------
function getFirstTitleText(page) {
  if (!page?.properties) return null;
  for (const [name, prop] of Object.entries(page.properties)) {
    if (
      prop?.type === "title" &&
      Array.isArray(prop.title) &&
      prop.title.length > 0
    ) {
      return (
        prop.title
          .map((t) => t.plain_text || "")
          .join("")
          .trim() || null
      );
    }
  }
  return null;
}

function normalizeRichText(rtArray) {
  if (!Array.isArray(rtArray)) return "";
  return rtArray.map((t) => t.plain_text || "").join("");
}

function normalizePeople(peopleArray) {
  if (!Array.isArray(peopleArray)) return [];
  return peopleArray
    .map((p) => p?.name || p?.person?.email || p?.id)
    .filter(Boolean);
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files
    .map((f) => {
      if (f.type === "file") return f.file.url;
      if (f.type === "external") return f.external.url;
      return null;
    })
    .filter(Boolean);
}

function normalizeRelation(rel) {
  if (!Array.isArray(rel)) return [];
  return rel.map((r) => r.id).filter(Boolean);
}

function normalizeRollup(rollup) {
  if (!rollup) return null;
  switch (rollup.type) {
    case "number":
      return rollup.number ?? null;
    case "date":
      return rollup.date?.start ?? null;
    case "array":
      return (rollup.array || [])
        .map((el) => {
          if (!el || !el.type) return null;
          if (el.type === "title") return normalizeRichText(el.title);
          if (el.type === "rich_text") return normalizeRichText(el.rich_text);
          if (el.type === "people") return normalizePeople(el.people);
          if (el.type === "relation") return normalizeRelation(el.relation);
          if (el.type === "files") return normalizeFiles(el.files);
          if (el.type === "number") return el.number ?? null;
          if (el.type === "date") return el.date?.start ?? null;
          if (el.type === "rollup") return normalizeRollup(el.rollup);
          if (el.type === "select") return el.select?.name ?? null;
          if (el.type === "multi_select")
            return (el.multi_select || []).map((m) => m.name);
          if (el.type === "status") return el.status?.name ?? null;
          return null;
        })
        .filter((v) => v !== null);
    default:
      return null;
  }
}

function extractPropValue(prop) {
  if (!prop || !prop.type) return null;
  switch (prop.type) {
    case "title":
      return normalizeRichText(prop.title);
    case "rich_text":
      return normalizeRichText(prop.rich_text);
    case "select":
      return prop.select?.name ?? null;
    case "multi_select":
      return (prop.multi_select || []).map((m) => m.name);
    case "url":
      return prop.url ?? null;
    case "date":
      return prop.date?.start ?? null;
    case "email":
      return prop.email ?? null;
    case "phone_number":
      return prop.phone_number ?? null;
    case "number":
      return prop.number ?? null;
    case "checkbox":
      return !!prop.checkbox;
    case "people":
      return normalizePeople(prop.people);
    case "files":
      return normalizeFiles(prop.files);
    case "relation":
      return normalizeRelation(prop.relation);
    case "status":
      return prop.status?.name ?? null;
    case "formula":
      if (!prop.formula) return null;
      switch (prop.formula.type) {
        case "string":
          return prop.formula.string ?? null;
        case "number":
          return prop.formula.number ?? null;
        case "boolean":
          return prop.formula.boolean ?? null;
        case "date":
          return prop.formula.date?.start ?? null;
        default:
          return null;
      }
    case "rollup":
      return normalizeRollup(prop.rollup);
    default:
      return null;
  }
}

// ---------- Database Configuration ----------
function detectDbConfig(dbConf, dbMeta) {
  if (!dbConf.srcDir) {
    throw new Error(`Missing required field 'srcDir' in database config`);
  }
  if (!dbConf.basePath) {
    throw new Error(`Missing required field 'basePath' in database config`);
  }
  if (!dbConf.layout) {
    throw new Error(`Missing required field 'layout' in database config`);
  }

  const dir = path.join(process.cwd(), dbConf.srcDir);
  const imagesDir = path.join(
    process.cwd(),
    dbConf.srcDirImages || "src/images/notion",
  );
  const basePath = dbConf.basePath;
  const layout = dbConf.layout;
  const excludeProps = new Set(dbConf.excludeProperties || []);
  const slugConf = dbConf.slug || {
    from: "title",
    fallback: "id",
    lower: true,
  };
  const permalinkTpl = dbConf.permalink || `${basePath}/{slug}/`;
  const fmExtras = dbConf.frontMatter || {};

  return {
    dir,
    imagesDir,
    basePath,
    layout,
    excludeProps,
    slugConf,
    permalinkTpl,
    fmExtras,
  };
}

// ---------- Slug and Permalink Generation ----------
function buildSlug(page, slugConf) {
  let base = null;
  if (slugConf.from === "title") {
    base = getFirstTitleText(page);
  } else if (slugConf.from === "id") {
    base = page.id;
  } else if (slugConf.from && page.properties?.[slugConf.from]) {
    base = extractPropValue(page.properties[slugConf.from]);
  }
  if (!base || String(base).trim() === "") {
    if (slugConf.fallback === "id") base = page.id;
    else base = getFirstTitleText(page) || page.id;
  }
  return toSlug(String(base), { lower: slugConf.lower !== false });
}

function renderPermalink(tpl, ctx) {
  return tpl.replace("{slug}", ctx.slug);
}

function toFrontMatterYaml(obj) {
  return `---\n${yaml.dump(obj)}---\n`;
}

// ---------- Notion API Interactions ----------
async function fetchDatabaseMeta(notion, database_id) {
  return notion.databases.retrieve({ database_id });
}

async function fetchAllPages(notion, database_id) {
  const results = [];
  let hasMore = true;
  let start_cursor = undefined;
  while (hasMore) {
    const resp = await notion.databases.query({
      database_id: database_id,
      start_cursor: start_cursor,
    });
    results.push(...resp.results);
    hasMore = resp.has_more;
    start_cursor = resp.next_cursor;
  }
  return results;
}

async function pageBodyMarkdown(n2m, pageId, slug, imagesDir) {
  try {
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const md = n2m.toMarkdownString(mdBlocks);
    let markdown = md.parent || "";

    // Find all image URLs in the markdown and download them
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    let imageIndex = 0;
    const replacements = [];

    while ((match = imageRegex.exec(markdown)) !== null) {
      const [fullMatch, altText, imageUrl] = match;

      // Only process Notion URLs
      if (
        imageUrl.includes("notion") ||
        imageUrl.includes("secure.notion-static.com") ||
        imageUrl.includes("s3.us-west")
      ) {
        const localPath = await saveNotionImage(
          imageUrl,
          slug,
          imageIndex,
          imagesDir,
        );
        replacements.push({
          original: fullMatch,
          replacement: `![${altText}](${localPath})`,
        });
        imageIndex++;
      }
    }

    // Apply all replacements
    for (const { original, replacement } of replacements) {
      markdown = markdown.replace(original, replacement);
    }

    return markdown;
  } catch (e) {
    console.warn("Markdown conversion error for page", pageId, e.message);
    return "";
  }
}

// ---------- Page Writing ----------
async function writePage(n2m, dbCfg, page) {
  const slug = buildSlug(page, dbCfg.slugConf);
  const permalink = renderPermalink(dbCfg.permalinkTpl, { slug });

  // Collect front matter from all properties (except excluded)
  const front = {
    layout: dbCfg.layout,
    title: getFirstTitleText(page) || slug,
    permalink,
    notionPageId: page.id,
    ...dbCfg.fmExtras,
  };

  for (const [name, prop] of Object.entries(page.properties || {})) {
    if (dbCfg.excludeProps.has(name)) continue;
    const val = extractPropValue(prop);
    if (val !== null && val !== undefined && val !== "") {
      front[name.trim()] = val;
    }
  }

  // Handle cover image if present
  if (page.cover) {
    const coverUrl =
      page.cover.type === "external"
        ? page.cover.external?.url
        : page.cover.file?.url;

    if (coverUrl) {
      const localCoverPath = await saveNotionImage(
        coverUrl,
        slug,
        "cover",
        dbCfg.imagesDir,
      );
      front.coverImage = localCoverPath;
    }
  }

  // Handle icon if it's an image
  if (
    page.icon &&
    (page.icon.type === "external" || page.icon.type === "file")
  ) {
    const iconUrl =
      page.icon.type === "external"
        ? page.icon.external?.url
        : page.icon.file?.url;

    if (iconUrl) {
      const localIconPath = await saveNotionImage(
        iconUrl,
        slug,
        "icon",
        dbCfg.imagesDir,
      );
      front.iconImage = localIconPath;
    }
  }

  const fm = toFrontMatterYaml(front);
  const body = await pageBodyMarkdown(n2m, page.id, slug, dbCfg.imagesDir);

  ensureDir(dbCfg.dir);
  const outPath = path.join(dbCfg.dir, `${slug}.md`);
  fs.writeFileSync(outPath, fm + body, "utf8");
  return outPath;
}

// ---------- Main Export Function ----------
async function exportNotionToSSG(options = {}) {
  const { notionToken, configPath, config: providedConfig } = options;

  // Validate Notion token
  const token = notionToken || process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error(
      "Missing NOTION_TOKEN. Provide it via options or environment variable.",
    );
  }

  // Load configuration
  const config = providedConfig || loadConfig(configPath);

  if (!config.databases || !Array.isArray(config.databases)) {
    throw new Error(
      "Config must have a 'databases' array with at least one database",
    );
  }

  // Initialize Notion clients
  const notion = new Client({ auth: token });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  const results = [];

  for (const dbConf of config.databases) {
    if (!dbConf.databaseId) {
      throw new Error("Each database config must have a 'databaseId' field");
    }

    const dbId = dbConf.databaseId;
    const dbMeta = await fetchDatabaseMeta(notion, dbId);
    const dbCfg = detectDbConfig(dbConf, dbMeta);

    ensureDir(dbCfg.dir);

    const existingFiles = getAllMarkdownFilesInDir(dbCfg.dir);
    const writtenFiles = new Set();

    const pages = await fetchAllPages(notion, dbId);
    console.log(
      `Exporting ${pages.length} pages from ${dbMeta?.title?.[0]?.plain_text || dbId} → ${dbCfg.dir}`,
    );

    for (const page of pages) {
      const outPath = await writePage(n2m, dbCfg, page);
      writtenFiles.add(outPath);
      console.log("✓", outPath);
    }

    // Clean up stale files
    const deletedFiles = [];
    for (const file of existingFiles) {
      if (!writtenFiles.has(file)) {
        fs.unlinkSync(file);
        deletedFiles.push(file);
        console.log("✗ Deleted stale file:", file);
      }
    }

    results.push({
      databaseId: dbId,
      databaseTitle: dbMeta?.title?.[0]?.plain_text || dbId,
      pagesExported: pages.length,
      filesWritten: Array.from(writtenFiles),
      filesDeleted: deletedFiles,
    });
  }

  return results;
}

// ---------- Exports ----------
module.exports = {
  exportNotionToSSG,
  loadConfig,
  toSlug,
  getFirstTitleText,
  extractPropValue,
};

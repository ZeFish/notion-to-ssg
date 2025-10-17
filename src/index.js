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

function cleanDirectory(dir, pattern = null) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const deletedFiles = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      // If pattern provided, only delete matching files
      if (!pattern || file.match(pattern)) {
        fs.unlinkSync(filePath);
        deletedFiles.push(filePath);
      }
    }
  }

  return deletedFiles;
}

// ---------- String Helpers ----------
function extractDatabaseId(idOrUrl) {
  if (idOrUrl.match(/^[a-f0-9]{32}$/)) {
    return idOrUrl; // It's already a valid ID
  }
  const match = idOrUrl.match(/[a-f0-9]{32}/);
  if (match) {
    return match[0];
  }
  throw new Error(`Invalid Notion database ID or URL: ${idOrUrl}`);
}

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
    const hash = crypto.createHash("md5");

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

        // Hash the content as it's being downloaded
        response.on("data", (chunk) => {
          hash.update(chunk);
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          const contentHash = hash.digest("hex").substring(0, 8);
          resolve({ destPath, contentHash });
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

    // Download to a temporary path first to get content hash
    const tempFilename = `temp-${Date.now()}-${imageIndex}.${ext}`;
    const tempPath = path.join(imagesDir, tempFilename);

    const { destPath: downloadedPath, contentHash } = await downloadImage(
      imageUrl,
      tempPath,
    );

    // Use content hash instead of URL hash to avoid duplicates
    const filename = `${pageSlug}-${imageIndex}-${contentHash}.${ext}`;
    const finalPath = path.join(imagesDir, filename);

    // Check if an image with this content hash already exists
    if (fs.existsSync(finalPath)) {
      // Delete the temp file since we already have this image
      fs.unlinkSync(downloadedPath);
      console.log(`  📷 Image already exists (reusing): ${filename}`);
      const relativePath = `/${path.relative(path.join(process.cwd(), "src"), finalPath)}`;
      imageCache.set(imageUrl, relativePath);
      return relativePath;
    }

    // Rename temp file to final filename
    fs.renameSync(downloadedPath, finalPath);
    console.log(`  📷 Downloaded image: ${filename}`);

    const relativePath = `/${path.relative(path.join(process.cwd(), "src"), finalPath)}`;
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
  const cleanBeforeSync = dbConf.cleanBeforeSync !== false; // default true

  return {
    dir,
    imagesDir,
    basePath,
    layout,
    excludeProps,
    slugConf,
    permalinkTpl,
    fmExtras,
    cleanBeforeSync,
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
  return `---
${yaml.dump(obj)}---
`;
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

async function pageBodyMarkdown(n2m, pageId, slug, imagesDir, pageMap) {
  try {
    const mdBlocks = await n2m.pageToMarkdown(pageId);
    const md = n2m.toMarkdownString(mdBlocks);
    let markdown = md.parent || "";

    // Regex to find all links, including Notion internal links
    const linkRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    const replacements = [];

    while ((match = linkRegex.exec(markdown)) !== null) {
      const [fullMatch, altText, url] = match;

      // Handle images: download and replace URL
      if (fullMatch.startsWith("!")) {
        if (
          url.includes("notion") ||
          url.includes("secure.notion-static.com") ||
          url.includes("s3.us-west")
        ) {
          const localPath = await saveNotionImage(
            url,
            slug,
            replacements.length, // Use index for uniqueness
            imagesDir,
          );
          replacements.push({
            original: fullMatch,
            replacement: `![${altText}](${localPath})`,
          });
        }
        continue; // Move to the next match
      }

      // Handle internal Notion links: resolve to local permalink
      const notionUrlMatch = url.match(
        /https?:\/\/(?:www\.)?notion\.so\/(?:[a-zA-Z0-9-]+\/)?([a-f0-9]{32})/,
      );
      const notionId = notionUrlMatch ? notionUrlMatch[1] : null;

      if (notionId && pageMap.has(notionId)) {
        const localPermalink = pageMap.get(notionId);
        replacements.push({
          original: fullMatch,
          replacement: `[${altText}](${localPermalink})`,
        });
        console.log(
          `  → Resolved internal link: ${altText} → ${localPermalink}`,
        );
      }
    }

    // Apply all replacements in reverse order to avoid index issues
    for (let i = replacements.length - 1; i >= 0; i--) {
      markdown = markdown.replace(
        replacements[i].original,
        replacements[i].replacement,
      );
    }

    return markdown;
  } catch (e) {
    console.warn("Markdown conversion error for page", pageId, e.message);
    return "";
  }
}

// ---------- Page Writing ----------
async function writePage(n2m, dbCfg, page, pageMap) {
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
  const body = await pageBodyMarkdown(
    n2m,
    page.id,
    slug,
    dbCfg.imagesDir,
    pageMap,
  );

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
  const pageMap = new Map();
  const allDbPages = new Map();

  // First pass: collect all pages from all databases and build the ID-to-permalink map
  for (const dbConf of config.databases) {
    if (!dbConf.databaseId) {
      throw new Error("Each database config must have a 'databaseId' field");
    }

    const dbId = extractDatabaseId(dbConf.databaseId);
    const dbMeta = await fetchDatabaseMeta(notion, dbId);
    const dbCfg = detectDbConfig(dbConf, dbMeta);
    const pages = await fetchAllPages(notion, dbId);
    allDbPages.set(dbId, { pages, dbMeta, dbCfg });

    for (const page of pages) {
      const slug = buildSlug(page, dbCfg.slugConf);
      const permalink = renderPermalink(dbCfg.permalinkTpl, { slug });
      pageMap.set(page.id.replace(/-/g, ""), permalink);
    }
  }

  // Second pass: write all pages using the complete map
  for (const dbConf of config.databases) {
    const dbId = dbConf.databaseId;
    const { pages, dbMeta, dbCfg } = allDbPages.get(dbId);

    ensureDir(dbCfg.dir);
    ensureDir(dbCfg.imagesDir);

    let deletedFiles = [];

    // Clean before sync if enabled
    if (dbCfg.cleanBeforeSync) {
      console.log(`🧹 Cleaning old content in ${dbCfg.dir}...`);
      const deletedMd = cleanDirectory(dbCfg.dir, /\.md$/);
      deletedFiles.push(...deletedMd);
      console.log(`   Removed ${deletedMd.length} old markdown file(s)`);

      // Only clean images if the directory is specific to this database
      if (dbConf.srcDirImages) {
        console.log(`🧹 Cleaning old images in ${dbCfg.imagesDir}...`);
        const deletedImages = cleanDirectory(dbCfg.imagesDir);
        deletedFiles.push(...deletedImages);
        console.log(`   Removed ${deletedImages.length} old image file(s)`);
      }
    }

    const writtenFiles = new Set();

    console.log(
      `Exporting ${pages.length} pages from "${dbMeta?.title?.[0]?.plain_text || dbId}" → ${dbCfg.dir}`,
    );

    for (const page of pages) {
      const outPath = await writePage(n2m, dbCfg, page, pageMap);
      writtenFiles.add(outPath);
      console.log("✓", path.relative(process.cwd(), outPath));
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

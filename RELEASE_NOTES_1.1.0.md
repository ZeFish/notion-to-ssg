# Release Notes - v1.1.0

**Release Date:** October 3, 2025

## 🎉 What's New

### Content-Based Image Hashing
Images are now hashed by their **content** instead of their URL, preventing duplicates when the same image appears with different Notion URLs.

**Benefits:**
- 📦 Significant storage savings for sites with repeated images
- 🔄 Same image with different Notion URLs = single file on disk
- ✨ Automatic deduplication across all pages

**Example:**
```
Before: my-page-0-abc12345.jpg, other-page-0-def67890.jpg (same image, 2 files)
After:  my-page-0-a1b2c3d4.jpg (content hash, 1 file, reused everywhere)
```

### Smart Cleanup with `cleanBeforeSync`
New configuration option that automatically removes old content before syncing (enabled by default).

**What it does:**
- 🧹 Removes all `.md` files from `srcDir` before fetching
- 🖼️ Cleans all images from `srcDirImages` before downloading
- ✅ Ensures your output directory exactly matches Notion
- 🗑️ Automatically removes deleted Notion pages and orphaned files

**Configuration:**
```yaml
databases:
  - databaseId: "your-db-id"
    cleanBeforeSync: true  # Default: true
    # Set to false if you want to manage cleanup manually
```

## 🔄 Changes

### Image Handling
- Image filenames now use format: `{slug}-{index}-{contenthash}.{ext}`
- Added console message when images are reused: `📷 Image already exists (reusing): filename.jpg`
- Downloads to temporary file first, then renames after hashing content

### Logging
- Added cleanup progress: `🧹 Cleaning old content before sync...`
- Shows count of removed files: `Removed 8 old file(s)`
- Better visibility into what the tool is doing

## 📚 Documentation

- Added comprehensive **Image Handling** section to README
- Added **Content Cleanup** section explaining `cleanBeforeSync`
- Updated example configs with `cleanBeforeSync` option
- Added inline comments explaining default behavior
- Updated feature list to highlight new capabilities

## 🚀 Migration Guide

### From v1.0.x to v1.1.0

This is a **minor version** with new features but **fully backward compatible**.

**No action required!** Your existing configuration will work as-is.

**What happens automatically:**
1. Old content is cleaned before sync (new default behavior)
2. Images are deduplicated by content hash
3. Existing images may be re-downloaded once with new filenames

**To disable auto-cleanup** (if you prefer manual control):
```yaml
databases:
  - databaseId: "your-db-id"
    cleanBeforeSync: false  # Opt-out of automatic cleanup
```

## ⚙️ Technical Details

### New Functions
- `cleanDirectory(dir, pattern)` - Safely removes files matching pattern
- Enhanced `downloadImage()` - Returns both path and content hash
- Updated `saveNotionImage()` - Two-step process for content-based naming

### Changed Behavior
- **Before:** Images named by URL hash (could duplicate)
- **After:** Images named by content hash (automatic deduplication)
- **Before:** Stale files accumulated
- **After:** Clean slate on each sync (configurable)

## 🐛 Bug Fixes

- Fixed issue where deleted Notion pages would leave orphaned markdown files
- Fixed issue where same image with different URLs would download multiple times
- Fixed issue where renamed Notion pages would leave old markdown files

## 📦 Package Info

- **Version:** 1.1.0
- **Size:** ~12.5 KB
- **Node:** >=14.0.0
- **License:** MIT

## 🙏 Credits

Thanks to the community for reporting the image duplication issue!

---

**Full Changelog:** https://github.com/ZeFish/notion-to-ssg/compare/v1.0.4...v1.1.0
**npm:** https://www.npmjs.com/package/notion-to-ssg
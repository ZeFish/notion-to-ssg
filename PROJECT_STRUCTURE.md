# Project Structure

This document describes the structure of the notion-to-ssg npm package.

## Directory Layout

```
notion-to-ssg/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md           # Bug report template
│   │   └── feature_request.md      # Feature request template
│   └── workflows/
│       └── export-notion.example.yml  # Example GitHub Actions workflow
├── src/
│   ├── index.js                    # Main library code (exportable functions)
│   └── cli.js                      # CLI wrapper (executable)
├── .env.example                    # Example environment variables
├── .gitignore                      # Git ignore rules
├── .npmignore                      # npm ignore rules (what NOT to publish)
├── CHANGELOG.md                    # Version history and changes
├── CONTRIBUTING.md                 # Contribution guidelines
├── LICENSE                         # MIT License
├── notion.config.example.json     # Example JSON configuration
├── notion.config.example.yml      # Example YAML configuration
├── package.json                    # Package metadata and dependencies
├── PUBLISHING.md                   # Publishing checklist for maintainers
├── QUICK_START.md                  # Quick start guide for new users
├── PROJECT_STRUCTURE.md           # This file
└── README.md                       # Main documentation

## Files Not Published to npm

The following files are excluded via `.npmignore`:
- `.github/` - GitHub-specific files
- `.gitignore`, `.gitattributes` - Git configuration
- `export-notion-11ty.js` - Original script (before refactoring)
- `notion.config.yml` - Actual config (keep only examples)
- Test/development files
- Lock files
- Build artifacts

## Files Published to npm

Defined in `package.json` under the `files` field:
- `src/` - All library and CLI code
- `README.md` - Main documentation
- `LICENSE` - License file
- `CHANGELOG.md` - Version history
- `notion.config.example.yml` - YAML config example
- `notion.config.example.json` - JSON config example
- `.env.example` - Environment variable template

## Key Components

### src/index.js
Main library module containing:
- `exportNotionToSSG()` - Main export function
- `loadConfig()` - Configuration loader
- `toSlug()` - Slug generation
- `getFirstTitleText()` - Extract page title
- `extractPropValue()` - Property value extraction
- Helper functions for Notion API interaction
- Image downloading and caching
- Markdown conversion

### src/cli.js
Command-line interface:
- Argument parsing
- Help and version commands
- Environment variable loading via dotenv
- Error handling and user-friendly messages
- Calls the library functions from index.js

### Configuration Files

Users can create either:
- `notion.config.yml` (YAML format)
- `notion.config.json` (JSON format)

Both formats support the same options:
- `databases[]` - Array of database configurations
  - `databaseId` - Notion database ID (required)
  - `srcDir` - Output directory for markdown (required)
  - `srcDirImages` - Image output directory (optional)
  - `basePath` - URL base path (required)
  - `layout` - Template layout (required)
  - `excludeProperties[]` - Properties to exclude
  - `slug` - Slug generation config
  - `permalink` - URL pattern
  - `frontMatter` - Additional static fields

## Entry Points

### As CLI Tool
```bash
npx notion-to-ssg
```
→ Executes `src/cli.js` (defined in `package.json` bin field)

### As Library
```javascript
const { exportNotionToSSG } = require('notion-to-ssg');
```
→ Imports from `src/index.js` (defined in `package.json` main field)

## Dependencies

### Runtime Dependencies
- `@notionhq/client` - Official Notion SDK
- `notion-to-md` - Notion to Markdown converter
- `dotenv` - Environment variable loader
- `js-yaml` - YAML parser
- `slugify` - URL slug generator

### Built-in Node Modules
- `fs` - File system operations
- `path` - Path manipulation
- `https`/`http` - Image downloading
- `crypto` - Hash generation for image filenames

## Development Workflow

### Local Testing
```bash
# Install dependencies
npm install

# Test CLI
node src/cli.js --help
node src/cli.js --version
node src/cli.js

# Test as library
node -e "require('./src/index.js').exportNotionToSSG({...})"
```

### Package Testing
```bash
# Preview what will be published
npm pack --dry-run

# Create actual tarball
npm pack

# Test installation locally
npm install ./notion-to-ssg-1.0.0.tgz
```

### Publishing
```bash
# Login to npm (first time only)
npm login

# Bump version
npm version patch|minor|major

# Publish
npm publish

# Push tags
git push --tags
```

## API Surface

### Exported Functions

#### `exportNotionToSSG(options)`
Main export function.

**Options:**
- `notionToken` (string) - Notion API token (optional if in env)
- `configPath` (string) - Path to config file (optional)
- `config` (object) - Config object (alternative to file)

**Returns:** Promise<Array<Object>> - Export results for each database

#### `loadConfig(configPath)`
Load configuration from file.

**Parameters:**
- `configPath` (string|null) - Optional config file path

**Returns:** Object - Configuration object

#### `toSlug(str, opts)`
Generate URL-friendly slug.

**Parameters:**
- `str` (string) - String to slugify
- `opts` (object) - Options (lower, etc.)

**Returns:** string - URL-friendly slug

#### `getFirstTitleText(page)`
Extract title from Notion page.

**Parameters:**
- `page` (object) - Notion page object

**Returns:** string|null - Page title

#### `extractPropValue(prop)`
Extract value from Notion property.

**Parameters:**
- `prop` (object) - Notion property object

**Returns:** any - Normalized property value

## Future Enhancements

Potential additions (not yet implemented):
- Unit tests (Jest/Mocha)
- TypeScript type definitions
- ESLint configuration
- Prettier configuration
- CI/CD workflows
- Integration tests
- Code coverage reports
- Performance benchmarks
- Plugin system
- Custom transformers

## Maintenance

### Regular Tasks
- Update dependencies (`npm update`)
- Review and merge PRs
- Respond to issues
- Update documentation
- Publish new versions
- Monitor npm downloads
- Check for security vulnerabilities

### Version Strategy
Follow Semantic Versioning (semver):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## Support Channels

- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and community support
- npm page: Package information and stats
- README: Primary documentation

## License

MIT License - See LICENSE file for details.
# Publishing Checklist

This guide is for maintainers publishing new versions to npm.

## Pre-Publishing Checklist

### 1. Code Quality
- [ ] All features tested locally
- [ ] Code follows project conventions
- [ ] No hardcoded credentials or test data
- [ ] Dependencies are up to date
- [ ] No unnecessary dependencies

### 2. Documentation
- [ ] README.md is complete and accurate
- [ ] CHANGELOG.md updated with new version
- [ ] Examples are working
- [ ] Configuration options documented
- [ ] API documentation is current

### 3. Package Configuration
- [ ] package.json version updated
- [ ] package.json metadata correct (description, keywords, etc.)
- [ ] LICENSE file is present
- [ ] .npmignore excludes development files
- [ ] "files" field in package.json is correct

### 4. Testing
- [ ] CLI help command works (`node src/cli.js --help`)
- [ ] CLI version command works (`node src/cli.js --version`)
- [ ] Test with actual Notion database
- [ ] Test image downloading
- [ ] Test with YAML config
- [ ] Test with JSON config
- [ ] Test multiple database export
- [ ] Test stale file cleanup
- [ ] Test as installed package (`npm link` or `npm pack`)

### 5. Version Bump
```bash
# For patch release (bug fixes)
npm version patch

# For minor release (new features, backward compatible)
npm version minor

# For major release (breaking changes)
npm version major
```

## Publishing Steps

### First Time Setup

1. Create npm account at [https://www.npmjs.com/signup](https://www.npmjs.com/signup)

2. Login to npm:
```bash
npm login
```

3. Verify you're logged in:
```bash
npm whoami
```

### Publishing

1. **Clean install dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **Test the package:**
```bash
npm pack --dry-run
```

3. **Review what will be published:**
```bash
npm pack
tar -xvzf *.tgz
cd package
ls -la
cd ..
rm -rf package *.tgz
```

4. **Update CHANGELOG.md:**
```markdown
## [1.0.1] - 2025-01-XX

### Fixed
- Bug fix description

### Added
- New feature description
```

5. **Commit changes:**
```bash
git add .
git commit -m "chore: prepare v1.0.1 release"
```

6. **Bump version:**
```bash
npm version patch  # or minor, or major
```

7. **Publish to npm:**
```bash
npm publish
```

8. **Push changes and tags:**
```bash
git push
git push --tags
```

9. **Create GitHub Release:**
- Go to https://github.com/ZeFish/notion-to-ssg/releases
- Click "Draft a new release"
- Select the tag you just pushed
- Copy changelog entries for this version
- Publish release

## Post-Publishing

1. **Verify on npm:**
   - Visit https://www.npmjs.com/package/notion-to-ssg
   - Check version number
   - Verify README displays correctly

2. **Test installation:**
```bash
# In a different directory
mkdir test-install
cd test-install
npm init -y
npm install notion-to-ssg
npx notion-to-ssg --version
```

3. **Announce:**
   - Tweet about the release
   - Post in relevant communities
   - Update documentation sites

## Troubleshooting

### "You cannot publish over the previously published versions"
- You tried to publish a version that already exists
- Bump the version number: `npm version patch`

### "You do not have permission to publish"
- Make sure you're logged in: `npm whoami`
- Check package name isn't taken by someone else
- Verify you have publishing rights if it's a scoped package

### "Package name too similar to existing package"
- Choose a different package name
- Add a scope: `@yourusername/notion-to-ssg`

### README not showing on npm
- Ensure README.md is in the "files" array in package.json
- Wait a few minutes for npm to process
- Try updating the package with a patch version

## Version Numbering Guide

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
  - Changed configuration format
  - Removed features
  - Changed API signatures

- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
  - Added new configuration options
  - New functionality
  - New CLI commands

- **PATCH** (1.0.0 → 1.0.1): Bug fixes
  - Fixed bugs
  - Performance improvements
  - Documentation updates

## Automated Publishing (Optional)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add `NPM_TOKEN` to GitHub repository secrets.

## Unpublishing (Emergency Only)

⚠️ **Warning**: Only unpublish within 72 hours and if absolutely necessary!

```bash
npm unpublish notion-to-ssg@1.0.1
```

Better alternative - publish a patch:
```bash
npm version patch
npm publish
```

## Support

After publishing, monitor:
- GitHub Issues
- npm package page
- Email notifications from npm

Respond to issues and questions promptly to build community trust.
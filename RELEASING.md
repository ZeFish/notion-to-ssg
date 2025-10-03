# Releasing with release-it

This project uses [release-it](https://github.com/release-it/release-it) to automate the release process. This guide will help you publish new versions of notion-to-ssg to npm with ease.

## What is release-it?

release-it automates the entire release workflow:
- ✅ Bump version in package.json
- ✅ Generate changelog from commits
- ✅ Create git commit and tag
- ✅ Push to GitHub
- ✅ Create GitHub release
- ✅ Publish to npm

## Prerequisites

### First Time Setup

1. **Ensure you're logged into npm:**
   ```bash
   npm login
   ```

2. **Verify npm login:**
   ```bash
   npm whoami
   ```

3. **Set up GitHub token (for GitHub releases):**
   
   Create a personal access token at: https://github.com/settings/tokens
   
   Required scopes:
   - `repo` (Full control of private repositories)
   
   Then add to your shell profile (~/.zshrc, ~/.bashrc, etc.):
   ```bash
   export GITHUB_TOKEN="your_github_token_here"
   ```
   
   Or set it temporarily:
   ```bash
   export GITHUB_TOKEN="your_token"
   ```

4. **Ensure git is configured:**
   ```bash
   git config user.name "Your Name"
   git config user.email "your@email.com"
   ```

## Release Commands

### Interactive Release (Recommended for first-timers)

```bash
npm run release
```

This will:
1. Ask you which version to bump to (patch, minor, major)
2. Show you what changes will be made
3. Prompt for confirmation before each step

### Automatic Patch Release

For bug fixes and minor updates:
```bash
npm run release:patch
```

Example: 1.0.0 → 1.0.1

### Automatic Minor Release

For new features (backward compatible):
```bash
npm run release:minor
```

Example: 1.0.0 → 1.1.0

### Automatic Major Release

For breaking changes:
```bash
npm run release:major
```

Example: 1.0.0 → 2.0.0

### Dry Run (Test Without Publishing)

To see what would happen without making any changes:
```bash
npm run release:dry
```

This is great for testing your release process!

## Release Process Step-by-Step

### 1. Prepare Your Changes

Make sure all your changes are committed:
```bash
git status
```

Your working directory should be clean.

### 2. Use Conventional Commits

release-it uses conventional commits to generate the changelog automatically.

Commit message format:
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature (bumps MINOR version)
- `fix:` - Bug fix (bumps PATCH version)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `build:` - Build system changes
- `ci:` - CI/CD changes

**Breaking changes** (bumps MAJOR version):
```
feat: redesign configuration format

BREAKING CHANGE: Configuration now uses a different structure
```

**Examples:**
```bash
git commit -m "feat: add support for custom image naming"
git commit -m "fix: resolve issue with rollup property handling"
git commit -m "docs: update README with new examples"
```

### 3. Run Release

```bash
npm run release
```

You'll see prompts like:
```
? Select increment (next version): (Use arrow keys)
❯ patch (1.0.1)
  minor (1.1.0)
  major (2.0.0)
  prepatch (1.0.1-0)
  preminor (1.1.0-0)
  premajor (2.0.0-0)
  prerelease (1.0.1-0)
```

Select the appropriate version bump and press Enter.

### 4. Review Changes

release-it will show you:
- Version bump
- Changelog updates
- Files to be committed
- Git operations to be performed

Confirm each step when prompted.

### 5. Verify Release

After successful release:

1. **Check npm:**
   ```bash
   npm view notion-to-ssg version
   ```

2. **Check GitHub:**
   - Visit https://github.com/ZeFish/notion-to-ssg/releases
   - Verify the new release appears

3. **Test installation:**
   ```bash
   mkdir test-install
   cd test-install
   npm init -y
   npm install notion-to-ssg
   npx notion-to-ssg --version
   ```

## Configuration

The release-it configuration is in `.release-it.json`. Key settings:

### Commit Message
```json
"commitMessage": "chore: release v${version}"
```

### Tag Format
```json
"tagName": "v${version}"
```

### Changelog
Automatically generated from conventional commits into `CHANGELOG.md`.

### GitHub Release
Automatically creates a GitHub release with auto-generated notes.

## Troubleshooting

### "Working dir must be clean"

You have uncommitted changes. Commit or stash them:
```bash
git status
git add .
git commit -m "chore: prepare for release"
```

### "GitHub token is required"

Set your GITHUB_TOKEN environment variable:
```bash
export GITHUB_TOKEN="your_token_here"
```

### "npm publish failed"

Check if you're logged in:
```bash
npm whoami
```

If not logged in:
```bash
npm login
```

### "Version already exists"

You're trying to publish a version that already exists on npm. The release failed partway through. You need to:

1. Delete the git tag locally:
   ```bash
   git tag -d v1.0.1
   ```

2. Delete the tag remotely (if pushed):
   ```bash
   git push --delete origin v1.0.1
   ```

3. Reset the version in package.json

4. Try the release again

### "Not on upstream branch"

Push your commits first:
```bash
git push origin main
```

### Two-Factor Authentication (2FA)

If you have 2FA enabled on npm, you'll be prompted for an OTP (one-time password) during publish. Enter the code from your authenticator app when prompted.

## Best Practices

### 1. Always Use Conventional Commits

This ensures automatic changelog generation works properly:
```bash
✅ git commit -m "feat: add new feature"
✅ git commit -m "fix: resolve bug"
❌ git commit -m "updated stuff"
❌ git commit -m "wip"
```

### 2. Test Before Releasing

```bash
# Run your tests
npm test

# Test the CLI
node src/cli.js --help

# Do a dry run
npm run release:dry
```

### 3. Review the Changelog

Before confirming the release, review the generated changelog to ensure it makes sense.

### 4. Use Semantic Versioning

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### 5. Release from Main Branch

Always release from the main branch:
```bash
git checkout main
git pull origin main
npm run release
```

## Pre-release Versions

For testing before official release:

```bash
# Create a pre-release version (1.0.1-0)
npm run release -- prerelease

# Or specify a pre-release identifier
npm run release -- prerelease --preReleaseId=beta
# Results in: 1.0.1-beta.0
```

Install pre-release versions with:
```bash
npm install notion-to-ssg@beta
```

## Manual Override

If you need to skip certain steps:

```bash
# Skip npm publish (useful for testing)
npm run release -- --no-npm

# Skip git push
npm run release -- --no-git.push

# Skip GitHub release
npm run release -- --no-github.release

# Combine multiple skips
npm run release -- --no-npm --no-github.release
```

## Quick Reference

| Command | Description | Version Change |
|---------|-------------|----------------|
| `npm run release` | Interactive release | You choose |
| `npm run release:patch` | Bug fixes | 1.0.0 → 1.0.1 |
| `npm run release:minor` | New features | 1.0.0 → 1.1.0 |
| `npm run release:major` | Breaking changes | 1.0.0 → 2.0.0 |
| `npm run release:dry` | Test without changes | No change |

## After Release

1. **Announce the release**
   - Tweet about it
   - Post in relevant communities
   - Update documentation sites

2. **Monitor for issues**
   - Check GitHub issues
   - Monitor npm downloads
   - Watch for feedback

3. **Update examples**
   - Ensure examples in README still work
   - Update any external documentation

## Help

- release-it documentation: https://github.com/release-it/release-it
- Conventional Commits: https://www.conventionalcommits.org/
- Semantic Versioning: https://semver.org/

## Example Workflow

Here's a complete example workflow:

```bash
# 1. Make changes
git checkout -b feature/new-feature
# ... make your changes ...

# 2. Commit with conventional commit message
git add .
git commit -m "feat: add support for custom slugs"

# 3. Push and create PR
git push origin feature/new-feature
# ... create PR, get reviewed, merge to main ...

# 4. Checkout main and pull latest
git checkout main
git pull origin main

# 5. Test everything
node src/cli.js --help
npm pack --dry-run

# 6. Dry run the release
npm run release:dry

# 7. Actually release (for a new feature, use minor)
npm run release:minor

# 8. Verify
npm view notion-to-ssg version
# Check https://github.com/ZeFish/notion-to-ssg/releases

# 9. Done! 🎉
```

Happy releasing! 🚀
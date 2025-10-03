# Contributing to notion-to-ssg

Thank you for your interest in contributing to notion-to-ssg! We welcome contributions from the community.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/notion-to-ssg.git
   cd notion-to-ssg
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 14 or higher
- npm or yarn
- A Notion account with API access

### Setting up for local testing

1. Create a `.env` file in the project root:
   ```env
   NOTION_TOKEN=your_test_token_here
   ```

2. Create a test configuration file `notion.config.yml`:
   ```yaml
   databases:
     - databaseId: "your-test-database-id"
       srcDir: "test-output/posts"
       srcDirImages: "test-output/images"
       basePath: "/test"
       layout: "layouts/test.njk"
   ```

3. Test the CLI:
   ```bash
   node src/cli.js
   ```

4. Test the library:
   ```javascript
   const { exportNotionToSSG } = require('./src/index.js');
   // Your test code here
   ```

## Making Changes

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Keep functions focused and modular
- Add comments for complex logic
- Follow existing code patterns

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add support for custom image naming
fix: resolve issue with rollup property handling
docs: update README with new examples
refactor: simplify slug generation logic
test: add tests for property extraction
```

Use conventional commit prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Testing

Before submitting a pull request:

1. **Test the CLI** with various configurations
2. **Test edge cases** (empty properties, missing data, etc.)
3. **Test with different Notion property types**
4. **Verify image downloading works correctly**
5. **Check that stale file cleanup works**

### Manual Testing Checklist

- [ ] Export works with YAML config
- [ ] Export works with JSON config
- [ ] Multiple databases export correctly
- [ ] Images are downloaded and cached
- [ ] Slugs are generated correctly
- [ ] Front matter includes all properties
- [ ] Excluded properties are not in front matter
- [ ] Stale files are removed
- [ ] Cover images and icons are handled
- [ ] CLI help and version commands work

## Submitting Changes

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Detailed description of what changed and why
   - Reference any related issues
   - Screenshots/examples if applicable

3. **Wait for review** - Maintainers will review your PR and may request changes

## Reporting Bugs

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (Node version, OS, etc.)
- **Error messages** or logs
- **Configuration file** (sanitized, without secrets)
- **Sample Notion database structure** if relevant

## Feature Requests

We love new ideas! When requesting features:

- **Describe the use case** - why is this needed?
- **Explain the desired behavior**
- **Provide examples** if possible
- **Consider alternatives** - are there other ways to achieve this?

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Be respectful and considerate
- Welcome diverse perspectives
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment, trolling, or discriminatory comments
- Personal attacks or insults
- Publishing private information without permission
- Other conduct inappropriate in a professional setting

## Questions?

- Open an issue with the `question` label
- Check existing issues for similar questions
- Review the documentation thoroughly

## Recognition

Contributors will be recognized in:
- The project's README (if significant contributions)
- Release notes for their specific contributions
- GitHub's contributor graph

Thank you for contributing to notion-to-ssg! 🎉
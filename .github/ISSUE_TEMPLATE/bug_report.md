---
name: Bug Report
about: Report a bug or issue with notion-to-ssg
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Run command '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Error Messages
```
Paste any error messages here
```

## Configuration

**notion.config.yml (sanitized):**
```yaml
# Paste your config here, removing any sensitive data
databases:
  - databaseId: "xxxxx"
    srcDir: "src/posts"
    ...
```

## Environment

- **OS:** [e.g. macOS 14.0, Ubuntu 22.04, Windows 11]
- **Node.js version:** [run `node --version`]
- **npm version:** [run `npm --version`]
- **notion-to-ssg version:** [run `npx notion-to-ssg --version`]
- **Installation method:** [global, local, or npx]

## Notion Database Structure
Brief description of your Notion database structure (property types, etc.)

Example:
- Title property: "Name"
- Rich text property: "Description"
- Date property: "Published"
- Multi-select property: "Tags"

## Additional Context
Add any other context about the problem here. Screenshots are helpful!

## Possible Solution (Optional)
If you have ideas on how to fix this, please share!
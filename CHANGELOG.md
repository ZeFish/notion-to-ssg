# Changelog

## [2.0.1](https://github.com/ZeFish/notion-to-ssg/compare/v2.0.0...v2.0.1) (2025-10-18)

## [2.0.0](https://github.com/ZeFish/notion-to-ssg/compare/v1.1.0...v2.0.0) (2025-10-18)

## [1.2.0](https://github.com/ZeFish/notion-to-ssg/compare/v1.0.4...v1.2.0) (2025-10-03)

## [1.0.4](https://github.com/ZeFish/notion-to-ssg/compare/v1.0.3...v1.0.4) (2025-10-03)

## [1.0.3](https://github.com/ZeFish/notion-to-ssg/compare/v1.0.2...v1.0.3) (2025-10-03)

## [1.0.2](https://github.com/ZeFish/notion-to-ssg/compare/v1.0.1...v1.0.2) (2025-10-03)

## 1.0.1 (2025-10-03)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of notion-to-ssg
- Export Notion databases to Markdown files with YAML front matter
- Automatic image downloading with smart caching
- Support for all Notion property types (title, rich text, select, multi-select, date, people, files, checkbox, URL, email, phone, formula, relation, rollup, status)
- Flexible YAML or JSON configuration files
- Multiple database support in single run
- Customizable slug generation from any property
- Permalink template support
- Stale file cleanup (removes deleted pages)
- Cover image and icon downloading
- Front matter property exclusion
- Additional static front matter injection
- CLI tool with help and version commands
- Programmatic API for library usage
- Support for 11ty, Hugo, Jekyll, and other static site generators
- Comprehensive documentation and examples
- release-it integration for automated releases

### Features
- Zero hardcoded property names - works with any Notion schema
- Smart image caching to avoid re-downloading
- URL-friendly slugification with locale support
- Relative image paths for SSG compatibility
- Environment variable support via dotenv
- Configurable output directories
- Property normalization for complex types

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (though formal versioning will be more relevant if published).

## [Unreleased]

### Added

- Initial project setup with TypeScript.
- Core MCP server structure (`src/index.ts`) supporting stdio.
- Tool: `get_reserve_data` for Aave reserve information, with caching and placeholder for external price enrichment.
- Tool: `get_user_data` for Aave user-specific data.
- Tool: `get_token_info` using Aave Address Book.
- Tool: `get_interest_rate_strategies` using Aave Address Book.
- Tool: `get_historical_rates` (placeholder) for historical APY data.
- Helper utilities (`src/tools/helpers.ts`) for providers, market addresses, caching.
- Comprehensive `package.json` with scripts for dev, build, lint, format, test, docker:build.
- CLI script (`bin/aave-mcp`) for starting the server and listing tools/chains.
- Multi-stage `Dockerfile` for efficient and smaller Docker images.
- `README.md` with setup, usage, and tool documentation.
- `jest.config.js` and placeholder unit tests.
- `.gitignore` for Node.js/TypeScript projects.
- GitHub Actions workflow for CI (`.github/workflows/nodejs.yml`).
- Example Python integration script (`examples/python-integration/example.py`).

### Changed

- Refactored `src/index.ts` for modularity.
- Updated `ethers` to v5.x to resolve Aave SDK peer dependency issues.
- Updated `tsconfig.json` to target `es2020` and enable declaration file generation.

### Fixed

- Various TypeScript type issues during development of tools.
- Ethers v6 vs v5 provider import.

## [1.0.0] - YYYY-MM-DD (Example for future release)

### Added

- First stable release.

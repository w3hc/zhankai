[![npm version](https://img.shields.io/npm/v/zhankai.svg)](https://www.npmjs.com/package/zhankai)
[![npm downloads](https://img.shields.io/npm/dm/zhankai.svg)](https://www.npmjs.com/package/zhankai)

# Zhankai

CLI tool for exporting repository content into a structured markdown file for LLM processing.

## Features

- 📄 Markdown file generation from repository content
- 🔍 `.gitignore` integration
- 📊 Repository structure visualization
- ❓ AI-assisted query system
- 🔄 File truncation (30 lines preview for 500+ line files)
- 🖼️ Binary file handling with placeholders
- 📁 Automatic output organization in a dedicated folder
- 🙈 Automatic .gitignore management

## Installation

```bash
# Using npm
npm install -g zhankai

# Using yarn
yarn global add zhankai

# Using pnpm
pnpm add -g zhankai
```

## Basic Usage

```bash
cd your-project
zhankai
```

## Commands

### Documentation Generation

```bash
# Default output
zhankai

# Custom output file
zhankai -o custom-docs.md

# Directory depth limitation
zhankai -d 2

# Include file contents
zhankai -c

# Query Rukh API (https://github.com/w3hc/rukh)
zhankai -q "Describe this app"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <filename>` | Output file specification | `<REPOSITORY_NAME>_app_description.md` |
| `-d, --depth <number>` | Directory traversal depth | `Infinity` |
| `-c, --contents` | Content inclusion flag | `false` |
| `-q, --query <string>` | AI query string | - |
| `--version` | Version information | - |

## Output Organization

By default, Zhankai:

- Creates a dedicated /zhankai directory in your project
- Places all generated files inside this directory
- Automatically adds /zhankai to your .gitignore file (if one exists)

This helps keep your project root clean and prevents version control systems from tracking generated files.

## Development

### Versions

- pnpm `v9.15.4`
- Node.js `v23.7.0`

### Setup

```bash
git clone https://github.com/w3hc/zhankai.git
cd zhankai
pnpm i
pnpm build
```

## Support

Feel free to reach out to [Julien](https://github.com/julienbrg) through:

- Element: [@julienbrg:matrix.org](https://matrix.to/#/@julienbrg:matrix.org)
- Farcaster: [julien-](https://warpcast.com/julien-)
- Telegram: [@julienbrg](https://t.me/julienbrg)
- Twitter: [@julienbrg](https://twitter.com/julienbrg)
- Discord: [julienbrg](https://discordapp.com/users/julienbrg)
- LinkedIn: [julienberanger](https://www.linkedin.com/in/julienberanger/)

## 📄 License

GPL-3.0 License. See [LICENSE](LICENSE) for specifications.
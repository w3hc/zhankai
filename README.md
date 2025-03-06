[![npm version](https://img.shields.io/npm/v/zhankai.svg)](https://www.npmjs.com/package/zhankai)
[![npm downloads](https://img.shields.io/npm/dm/zhankai.svg)](https://www.npmjs.com/package/zhankai)

# Zhankai

CLI tool for exporting repository content into a structured markdown file for LLM processing.

Zhankai leverages the Rukh API which connects to Anthropic's [`claude-3-7-sonnet-20250219`](https://www.anthropic.com/news/claude-3-7-sonnet) model

## Features

- 📄 Markdown file generation from repository content
- 🔍 `.gitignore` integration
- 📊 Repository structure visualization
- 🧠 AI-assisted query system (Claude 3.7 Sonnet)
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

### Custom output file

```bash
zhankai -o custom-docs.md
```

### Ask LLM

Uses [`claude-3-7-sonnet-20250219`](https://www.anthropic.com/news/claude-3-7-sonnet).

> ⚠️ **Important:** Commit your changes before using the `-q` option. Zhankai will directly edit your code files when responding to queries, so having unsaved commits may lead to unexpected changes or conflicts.

```bash
zhankai -q "Add this or that feature"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <filename>` | Output file specification | `<REPOSITORY_NAME>_app_description.md` |
| `-d, --depth <number>` | Directory traversal depth | `Infinity` |
| `-c, --contents` | Content inclusion flag | `false` |
| `-q, --query <string>` | AI query to Claude 3.7 Sonnet via Rukh API | - |
| `--version` | Version information | - |

## Output Organization

By default, Zhankai:

- Creates a dedicated `/zhankai` directory in your project
- Places all generated files inside this directory
- Automatically adds `/zhankai` to your .gitignore file (if one exists)

This helps keep your project root clean and prevents version control systems from tracking generated files.

## Development

Feel free to reach out and contribute to this project. Please read the [contribution guidelines](CONTRIBUTING.md) before submitting pull requests.

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

## License

GPL-3.0 License. See [LICENSE](LICENSE) for specifications.
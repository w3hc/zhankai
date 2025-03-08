[![npm version](https://img.shields.io/npm/v/zhankai.svg)](https://www.npmjs.com/package/zhankai)
[![npm downloads](https://img.shields.io/npm/dm/zhankai.svg)](https://www.npmjs.com/package/zhankai)

# Zhankai

A CLI tool that exports repository content into structured markdown for LLM processing.

Zhankai utilizes the [Rukh API](https://rukh.w3hc.org/) to connect with Anthropic's [`claude-3-7-sonnet-20250219`](https://www.anthropic.com/news/claude-3-7-sonnet) model.

## Features

- 📄 Structured markdown generation from repository content
- 🔍 `.gitignore` integration
- 📊 Repository structure visualization
- 🧠 AI-assisted code modification with Claude 3.7 Sonnet
- 🔄 Intelligent file truncation (30 lines preview for large files)
- 🖼️ Binary file handling
- 📁 Automated output management
- 🙈 Automatic .gitignore configuration

## Installation

```bash
npm install -g zhankai
# or
yarn global add zhankai
# or
pnpm add -g zhankai
```

## Upgrade

```bash
npm install -g zhankai@latest
# or
yarn global add zhankai@latest
# or
pnpm add -g zhankai@latest
```

## Usage

### Basic

```bash
cd your-project
zhankai
```

### Custom Output File

```bash
zhankai -o custom-docs.md
```

### AI Query

> ⚠️ **Important:** Commit changes before using the `-q` option. Zhankai modifies code files when responding to queries.

```bash
zhankai -q "Implement error handling for the authentication flow"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <filename>` | Output file name | `<REPOSITORY_NAME>_app_description.md` |
| `-d, --depth <number>` | Directory traversal depth | `Infinity` |
| `-c, --contents` | Include file contents | `false` |
| `-q, --query <string>` | AI query to Claude 3.7 Sonnet | - |
| `--version` | Display version information | - |
| `--debug` | Enable debug mode | `false` |
| `--timeout <number>` | API request timeout in milliseconds | `240000` |
| `login` | Authenticate with GitHub and generate Ethereum wallet | - |
| `github` | Authenticate with GitHub using Personal Access Token | - |
| `logout` | Clear stored GitHub credentials | - |
| `sign <message>` | Sign a message with your Ethereum wallet | - |

## File Organization

Zhankai:
- Creates a `/zhankai` directory in your project
- Stores all generated files in this directory
- Adds `/zhankai` to your .gitignore automatically

## Development

Please review the [contribution guidelines](CONTRIBUTING.md) before submitting pull requests.

### Setup

```bash
git clone https://github.com/w3hc/zhankai.git
cd zhankai
pnpm i
pnpm build
```

### Testing

```bash
pnpm test
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
```

## Support

Contact [Julien](https://github.com/julienbrg) via:
- Element: [@julienbrg:matrix.org](https://matrix.to/#/@julienbrg:matrix.org)
- Farcaster: [julien-](https://warpcast.com/julien-)
- Telegram: [@julienbrg](https://t.me/julienbrg)
- Twitter: [@julienbrg](https://twitter.com/julienbrg)

## License

[GPL-3.0](LICENSE)
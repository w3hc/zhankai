[![npm version](https://img.shields.io/npm/v/zhankai.svg)](https://www.npmjs.com/package/zhankai)
[![npm downloads](https://img.shields.io/npm/dm/zhankai.svg)](https://www.npmjs.com/package/zhankai)

# Zhankai

CLI tool for exporting repository content into a structured markdown file for LLM processing.

## 🚀 Features

- 📄 Markdown file generation from repository content
- 🔍 `.gitignore` integration
- 📊 Repository structure visualization
- ❓ AI-assisted query system
- 🔄 File truncation (30 lines preview for 500+ line files)
- 🖼️ Binary file handling with placeholders
- 🔐 Authentication system

## 📦 Installation

```bash
# Using npm
npm install -g zhankai

# Using yarn
yarn global add zhankai

# Using pnpm
pnpm add -g zhankai
```

## 🎯 Basic Usage

```bash
# Version verification
zhankai --version

# Documentation generation
cd your-project
zhankai
```

## 💡 Commands

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
```

### AI Integration

> ⚠️ **Requirement**: [RGCVII](https://basescan.org/token/0x11dC980faf34A1D082Ae8A6a883db3A950a3c6E8) token holdings required.

```bash
# Authentication setup
zhankai setup

# Codebase queries
zhankai -q "describe functionality"

# Credential removal
zhankai logout
```

## 🛠️ Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <filename>` | Output file specification | `<REPOSITORY_NAME>_app_description.md` |
| `-d, --depth <number>` | Directory traversal depth | `Infinity` |
| `-c, --contents` | Content inclusion flag | `false` |
| `-q, --query <string>` | AI query string | - |
| `--version` | Version information | - |

## 🔒 Authentication Process

1. RGCVII token verification
2. `zhankai setup` execution
3. Required inputs:
   - Ethereum address
   - Etherscan message signature
   - Signature verification

## 🤝 Development

### Versions

- pnpm v9.12.2
- Node.js v20.9.0

### Setup

```bash
git clone https://github.com/your-username/zhankai.git
cd zhankai
pnpm i
pnpm build
```

## 📝 Technical Implementation

1. Repository scanning
2. `.gitignore` filtering
3. File processing:
   - Size-based truncation
   - Binary file conversion
   - Format preservation
4. Structure generation
5. Markdown compilation

## 🆘 Technical Support

- [Element](https://matrix.to/#/@julienbrg:matrix.org)
- [Farcaster](https://warpcast.com/julien-)
- [Telegram](https://t.me/julienbrg)
- [Twitter](https://twitter.com/julienbrg)
- [Discord](https://discordapp.com/users/julienbrg)
- [LinkedIn](https://www.linkedin.com/in/julienberanger/)

## 📄 License

GPL-3.0 License. See [LICENSE](LICENSE) for specifications.
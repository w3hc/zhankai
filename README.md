[![npm version](https://img.shields.io/npm/v/zhankai.svg)](https://www.npmjs.com/package/zhankai)
[![npm downloads](https://img.shields.io/npm/dm/zhankai.svg)](https://www.npmjs.com/package/zhankai)

# Zhankai

Writes the content of all files of a given repo. You can then use this file to save some time describing your app to your favorite LLM assistant. 

## Installation

You can install Zhankai globally using npm:

```bash
npm install -g zhankai
```

Or using yarn:

```bash
yarn global add zhankai
```

## Use

### Verify Installation

After installation, you can verify that Zhankai is installed correctly by checking its version:

```bash
zhankai --version
```

### Run

To use Zhankai, navigate to the root of your repository and run:

```bash
zhankai
```

This will create a `<REPOSITORY_NAME>_app_description.md` file at the root of your repository, containing the content of all files and the repository structure.

## Options

- `-o, --output <filename>`: Specify a custom output filename
- `-d, --depth <number>`: Set the maximum depth to traverse (default: Infinity)
- `-c, --contents`: Include file contents (default: false)
- `-q, --query "your question"` : Ask a question about your codebase (e.g., `zhankai -q "what does this app do?"`)

Examples:

```bash
# Save output to my-docs.md
zhankai -o my-docs.md

# Only include files up to 2 directories deep
zhankai -d 2

# Generate docs and ask about functionality
zhankai -q "explain the main features"
```

## Features

- Generates a markdown file with the content of all files in the repository
- Excludes files and directories specified in .gitignore
- Truncates files with more than 500 lines, showing only the first 30 lines
- Replaces image file contents (png, jpg, jpeg, ico) with a placeholder message
- Generates a tree structure of the repository
- Ask questions about your codebase using the `-q` option (e.g., `zhankai -q "explain this app"`)

## Contrib

### Install Dependencies

```bash
pnpm i
```

### Build and update

```bash
pnpm build
```

## Versions

- pnpm `v8.7.5`
- node `v20.9.0`

## Support

You can contact me via [Element](https://matrix.to/#/@julienbrg:matrix.org), [Farcaster](https://warpcast.com/julien-), [Telegram](https://t.me/julienbrg), [Twitter](https://twitter.com/julienbrg), [Discord](https://discordapp.com/users/julienbrg), or [LinkedIn](https://www.linkedin.com/in/julienberanger/).

## License

This project is licensed under the GPL-3.0 License.
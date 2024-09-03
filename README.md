# Zhankai

Writes the content of all files of a given repo. 

[![npm version](https://img.shields.io/npm/v/zhankai.svg)](https://www.npmjs.com/package/zhankai)
[![npm downloads](https://img.shields.io/npm/dm/zhankai.svg)](https://www.npmjs.com/package/zhankai)

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

Example:
```bash
zhankai -o custom_output.md -d 2
```

## Features

- Generates a markdown file with the content of all files in the repository
- Excludes files and directories specified in .gitignore
- Truncates files with more than 500 lines, showing only the first 30 lines
- Replaces image file contents (png, jpg, jpeg, ico) with a placeholder message
- Generates a tree structure of the repository

## Contrib

### Install Dependencies

```bash
pnpm i
```

### Build and Run Locally

```bash
pnpm build
npm install -g .
zhankai
```

## Versions

- pnpm `v8.7.5`
- node `v20.9.0`

## Support

You can contact me via [Element](https://matrix.to/#/@julienbrg:matrix.org), [Farcaster](https://warpcast.com/julien-), [Telegram](https://t.me/julienbrg), [Twitter](https://twitter.com/julienbrg), [Discord](https://discordapp.com/users/julienbrg), or [LinkedIn](https://www.linkedin.com/in/julienberanger/).

## License

This project is licensed under the GPL-3.0 License.
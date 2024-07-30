#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { Command } from "commander";

interface ZhankaiOptions {
  output: string;
  depth: number;
  contents: boolean;
}

const program = new Command();

program
  .version("1.0.0")
  .option("-o, --output <filename>", "output filename", "zhankai_output.md")
  .option("-d, --depth <number>", "maximum depth to traverse", "Infinity")
  .option("-c, --contents", "include file contents", false)
  .parse(process.argv);

const generateTimestamp = (): string => {
  const date = new Date();
  return (
    date
      .toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "UTC",
      })
      .replace(/,/g, "") + " UTC"
  );
};

const getLanguageTag = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const langMap: { [key: string]: string } = {
    ".ts": "typescript",
    ".js": "javascript",
    ".json": "json",
    ".md": "markdown",
    ".py": "python",
    ".rb": "ruby",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".html": "html",
    ".css": "css",
    ".php": "php",
    ".go": "go",
    ".rs": "rust",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".sh": "bash",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".xml": "xml",
    ".sql": "sql",
    ".r": "r",
    ".m": "matlab",
  };
  return langMap[ext] || "";
};

const excludedItems = ["dist", "node_modules", "pnpm-lock.yaml"];

const traverseDirectory = async (
  dir: string,
  options: ZhankaiOptions,
  currentDepth: number = 0,
  baseDir: string
): Promise<void> => {
  if (currentDepth > options.depth) return;

  const files = await fs.readdir(dir);

  for (const file of files) {
    if (excludedItems.includes(file)) continue;

    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith(".")) {
        await fs.appendFile(options.output, `\n## ${relativePath}\n\n`);
        await traverseDirectory(filePath, options, currentDepth + 1, baseDir);
      }
    } else {
      await processFile(filePath, relativePath, options);
    }
  }
};

const processFile = async (
  filePath: string,
  relativePath: string,
  options: ZhankaiOptions
): Promise<void> => {
  const langTag = getLanguageTag(filePath);
  await fs.appendFile(options.output, `\n### ${relativePath}\n\n`);
  await fs.appendFile(options.output, "```" + langTag + "\n");
  const content = await fs.readFile(filePath, "utf8");
  await fs.appendFile(options.output, content);
  await fs.appendFile(options.output, "\n```\n");
};

const getRepoName = async (dir: string): Promise<string> => {
  try {
    const gitConfigPath = path.join(dir, ".git", "config");
    const gitConfig = await fs.readFile(gitConfigPath, "utf8");
    const match = gitConfig.match(/url = .*\/(.*)\.git/);
    return match ? match[1] : path.basename(dir);
  } catch (error) {
    return path.basename(dir);
  }
};

const main = async () => {
  const options: ZhankaiOptions = {
    output: program.opts().output,
    depth:
      program.opts().depth === "Infinity"
        ? Infinity
        : parseInt(program.opts().depth),
    contents: program.opts().contents,
  };

  const baseDir = process.cwd();
  const repoName = await getRepoName(baseDir);

  let content = `# ${repoName}\n`;
  await fs.writeFile(options.output, content);

  await traverseDirectory(baseDir, options, 0, baseDir);

  content = `\n\nGenerated on: ${generateTimestamp()}`;
  await fs.appendFile(options.output, content);

  console.log(`Markdown file generated: ${options.output}`);
};

main().catch(console.error);

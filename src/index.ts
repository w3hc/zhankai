#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { Command } from "commander";
import { Dirent } from "fs";
import ignore from "ignore";

class K2000Loader {
  private position: number = 0;
  private direction: number = 1;
  private width: number = 10;
  private interval: NodeJS.Timeout | null = null;
  private lastLine: string = "";

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      process.stdout.write("\r" + " ".repeat(this.lastLine.length) + "\x1b[2A");

      const line =
        " ".repeat(this.position) +
        "•" +
        " ".repeat(this.width - this.position - 1) +
        "\n\n";
      this.lastLine = line;

      process.stdout.write("\r" + line);

      this.position += this.direction;

      if (this.position >= this.width - 1) {
        this.direction = -1;
      } else if (this.position <= 0) {
        this.direction = 1;
      }
    }, 30);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write("\r" + " ".repeat(this.lastLine.length) + "\r\n");
    }
  }
}

interface ZhankaiOptions {
  output: string;
  depth: number;
  contents: boolean;
  query?: string;
  debug?: boolean;
}

const program = new Command();

program
  .version("1.1.5")
  .option("-o, --output <filename>", "output filename")
  .option("-d, --depth <number>", "maximum depth to traverse", "Infinity")
  .option("-c, --contents", "include file contents", false)
  .option("-q, --query <string>", "query to send to Fatou API")
  .option("--debug", "enable debug mode")
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

const isImageFile = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".ico"].includes(ext);
};

const excludedItems = ["LICENSE", ".git"];

const loadGitignorePatterns = async (dir: string): Promise<string[]> => {
  const gitignorePath = path.join(dir, ".gitignore");
  try {
    const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
    return gitignoreContent
      .split("\n")
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
};

const traverseDirectory = async (
  dir: string,
  options: ZhankaiOptions,
  currentDepth: number = 0,
  baseDir: string,
  ig: ReturnType<typeof ignore>
): Promise<void> => {
  if (currentDepth > options.depth) return;

  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const relativePath = path.relative(baseDir, path.join(dir, file.name));
    if (excludedItems.includes(file.name) || ig.ignores(relativePath)) continue;

    const filePath = path.join(dir, file.name);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      if (!file.name.startsWith(".")) {
        await fs.appendFile(options.output, `\n## ${relativePath}\n\n`);
        await traverseDirectory(
          filePath,
          options,
          currentDepth + 1,
          baseDir,
          ig
        );
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

  if (isImageFile(filePath)) {
    await fs.appendFile(options.output, "[This is an image file]");
  } else {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n");

    if (lines.length > 500) {
      const truncatedContent = lines.slice(0, 30).join("\n");
      await fs.appendFile(options.output, truncatedContent);
      await fs.appendFile(options.output, "\n```\n");
      await fs.appendFile(
        options.output,
        "\n[This file was cut: it has more than 500 lines]\n"
      );
    } else {
      await fs.appendFile(options.output, content);
    }
  }

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

const generateFileStructure = async (
  dir: string,
  depth: number,
  prefix = "",
  isLast = true,
  baseDir: string,
  ig: ReturnType<typeof ignore>
): Promise<string> => {
  let treeStructure = "";
  const files: Dirent[] = await fs.readdir(dir, { withFileTypes: true });
  const lastIndex = files.length - 1;

  for (const [index, file] of files.entries()) {
    const relativePath = path.relative(baseDir, path.join(dir, file.name));
    if (excludedItems.includes(file.name) || ig.ignores(relativePath)) continue;

    const isDirectory = file.isDirectory();
    const newPrefix = prefix + (isLast ? "    " : "│   ");
    const connector = index === lastIndex ? "└── " : "├── ";

    treeStructure += `${prefix}${connector}${file.name}\n`;

    if (isDirectory && depth > 0) {
      treeStructure += await generateFileStructure(
        path.join(dir, file.name),
        depth - 1,
        newPrefix,
        index === lastIndex,
        baseDir,
        ig
      );
    }
  }

  return treeStructure;
};

const getUniqueFilename = async (baseFilename: string): Promise<string> => {
  let filename = baseFilename;
  let counter = 1;
  while (true) {
    try {
      await fs.access(filename);
      const ext = path.extname(baseFilename);
      const nameWithoutExt = baseFilename.slice(0, -ext.length);
      filename = `${nameWithoutExt}(${counter})${ext}`;
      counter++;
    } catch {
      return filename;
    }
  }
};

const sendQueryToFatou = async (
  query: string,
  filePath: string,
  debug: boolean
): Promise<string> => {
  const FATOU_API_URL = "http://193.108.55.119:3000/ai/ask";
  const loader = new K2000Loader();

  try {
    loader.start();

    const fileContent = await fs.readFile(filePath, "utf-8");
    const formData = new FormData();
    formData.append("message", query);

    const file = new File([fileContent], path.basename(filePath), {
      type: "text/markdown",
    });
    formData.append("file", file, file.name);

    if (debug) {
      console.log("File content (first 500 characters):");
      console.log(fileContent.slice(0, 500));
      console.log("...");
    }

    const response = await fetch(FATOU_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (debug) {
      console.log(
        "API Response Headers:",
        Object.fromEntries(response.headers.entries())
      );
      console.log("API Response Status:", response.status);
      console.log("API Response Body:", data);
    }

    loader.stop();
    return data.answer;
  } catch (error) {
    loader.stop();
    console.error("Error sending query to Fatou API:", error);
    return "Failed to get response from Fatou API";
  }
};

const main = async () => {
  const baseDir = process.cwd();
  const repoName = await getRepoName(baseDir);

  let baseOutputFilename =
    program.opts().output || `${repoName}_app_description.md`;
  const uniqueOutputFilename = await getUniqueFilename(baseOutputFilename);

  const options: ZhankaiOptions = {
    output: uniqueOutputFilename,
    depth:
      program.opts().depth === "Infinity"
        ? Infinity
        : parseInt(program.opts().depth),
    contents: program.opts().contents,
    query: program.opts().query,
    debug: program.opts().debug,
  };

  const gitignorePatterns = await loadGitignorePatterns(baseDir);
  const ig = ignore().add(gitignorePatterns);

  let content = `# ${repoName}\n\n`;
  await fs.writeFile(options.output, content);

  await traverseDirectory(baseDir, options, 0, baseDir, ig);

  const fileStructure = await generateFileStructure(
    baseDir,
    options.depth,
    "",
    true,
    baseDir,
    ig
  );
  await fs.appendFile(
    options.output,
    `\n## Structure\n\n\`\`\`\n${fileStructure}\`\`\`\n`
  );

  content = `\nTimestamp: ${generateTimestamp()}`;
  await fs.appendFile(options.output, content);

  console.log(
    `\nContent of all files and repo structure written: ${options.output}`
  );

  if (options.query) {
    await fs.writeFile(
      options.output,
      await fs.readFile(options.output, "utf-8")
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const fatouResponse = await sendQueryToFatou(
      options.query,
      options.output,
      options.debug || false
    );
    console.log(fatouResponse);
  }
};

main().catch(console.error);

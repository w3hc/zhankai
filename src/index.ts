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

const formatMarkdownForTerminal = (markdown: string): string => {
  const BOLD = "\x1b[1m";
  const BLUE = "\x1b[34m";
  const GREEN = "\x1b[32m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";
  const RESET = "\x1b[0m";

  let formatted = markdown
    .replace(/^# (.*$)/gm, `${BOLD}${BLUE}$1${RESET}`)
    .replace(/^## (.*$)/gm, `${BOLD}${GREEN}$1${RESET}`)
    .replace(/^### (.*$)/gm, `${BOLD}${CYAN}$1${RESET}`)
    .replace(/^#### (.*$)/gm, `${BOLD}${YELLOW}$1${RESET}`);

  formatted = formatted.replace(
    /```[a-z]*\n([\s\S]*?)```/g,
    (_, code) =>
      `\n${code
        .split("\n")
        .map((line: string) => `    ${line}`)
        .join("\n")}\n`
  );

  formatted = formatted.replace(/^- (.*$)/gm, `  • $1`);

  formatted = formatted.replace(/^[0-9]+\. (.*$)/gm, (match, content) => {
    const number = match.split(".")[0];
    return `  ${number}. ${content}`;
  });

  formatted = formatted.replace(/\|(.*)\|/g, (match) => {
    if (match.includes("-----")) {
      return "  " + "-".repeat(60);
    }

    const cells = match
      .split("|")
      .filter((cell) => cell.trim() !== "")
      .map((cell) => cell.trim());

    if (cells.length >= 2) {
      return `  ${cells[0]}: ${cells.slice(1).join(" | ")}`;
    }
    return match;
  });

  return "\n" + formatted + "\n";
};

const sendQueryToRukh = async (
  query: string,
  filePath: string,
  debug: boolean
): Promise<string> => {
  const RUKH_API_URL = "https://rukh.w3hc.org/ask";
  const loader = new K2000Loader();

  try {
    console.log("\nSending query to Rukh API...");
    console.log(`Query: "${query}"`);
    console.log(`File: ${filePath}`);

    loader.start();

    try {
      await fs.access(filePath);
      console.log("✓ File exists and is accessible");
    } catch (error) {
      console.error("✗ Error accessing file:", error);
      throw new Error(`Cannot access file at path: ${filePath}`);
    }

    const fileContent = await fs.readFile(filePath, "utf-8");
    console.log(`✓ File read successfully (${fileContent.length} bytes)`);

    const formData = new FormData();

    formData.append("message", query);
    formData.append("model", "");
    formData.append("sessionId", "");
    formData.append("walletAddress", "");
    formData.append("context", "");

    const fileName = path.basename(filePath);

    if (typeof File === "undefined") {
      console.log(
        "Running in Node.js environment - using Blob for file upload"
      );
      const blob = new Blob([fileContent], { type: "text/markdown" });
      formData.append("file", blob, fileName);
    } else {
      console.log("Running in browser environment - using File API");
      const file = new File([fileContent], fileName, {
        type: "text/markdown",
      });
      formData.append("file", file);
    }

    console.log("✓ FormData created with all required fields and file");
    console.log(`→ Sending request to ${RUKH_API_URL}`);

    console.log("Request details:");
    console.log("- Method: POST");
    console.log(`- File name: ${fileName}`);
    console.log(`- File size: ${fileContent.length} bytes`);
    console.log(
      "- Fields included: message, model, sessionId, walletAddress, context, file"
    );

    if (debug) {
      console.log("\nDEBUG - File content (first 500 characters):");
      console.log(fileContent.slice(0, 500));
      console.log("...");
    }

    const response = await fetch(RUKH_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
      },
      body: formData,
    });

    console.log(
      `← Received response with status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      console.error(
        `✗ Error response: ${response.status} ${response.statusText}`
      );

      let errorDetails = "";
      try {
        const errorData = await response.text();
        errorDetails = errorData;
        console.error("Error details:", errorDetails);
      } catch (e) {
        console.error("Could not parse error response");
      }

      if (response.status === 401) {
        throw new Error("Invalid API key. Please run 'zhankai setup' again.");
      }
      throw new Error(
        `HTTP error! status: ${response.status}, details: ${errorDetails}`
      );
    }

    console.log("✓ Received successful response");

    const responseBody = await response.text();
    console.log(`✓ Response body received (${responseBody.length} bytes)`);

    let data;
    try {
      data = JSON.parse(responseBody);
      console.log("✓ Response JSON parsed successfully");
    } catch (e) {
      console.error("✗ Failed to parse JSON response:", e);
      console.log("Raw response:", responseBody);
      throw new Error("Failed to parse API response as JSON");
    }

    if (debug || !(data.answer || data.output)) {
      console.log("\nResponse details:");
      console.log("- Headers:", Object.fromEntries(response.headers.entries()));
      console.log("- Full response body:", data);
    }

    const responseContent = data.answer || data.output;

    if (!responseContent) {
      console.error("✗ No answer or output field found in response");
      console.log("Response structure:", Object.keys(data));
      throw new Error("Missing answer/output field in API response");
    }

    console.log("✓ Response text extracted from response");

    const baseDir = process.cwd();
    const zhankaiDir = path.join(baseDir, "zhankai");

    const baseQueryFilename = "query.md";
    const queryFilePath = path.join(zhankaiDir, baseQueryFilename);

    const uniqueQueryFilename = await getUniqueFilename(queryFilePath);

    await fs.writeFile(uniqueQueryFilename, responseContent, "utf-8");
    console.log(`✓ Response saved to file: ${uniqueQueryFilename}`);

    const formattedResponse = formatMarkdownForTerminal(responseContent);

    loader.stop();
    return formattedResponse;
  } catch (error) {
    loader.stop();
    console.error("\n✗ Error sending query to Rukh API:", error);
    if (error instanceof Error) {
      return `Failed to get response from Rukh API: ${error.message}`;
    }
    return "Failed to get response from Rukh API";
  }
};

async function addToGitignore(pattern: string): Promise<void> {
  try {
    const gitignorePath = path.join(process.cwd(), ".gitignore");

    let currentContent = "";
    try {
      currentContent = await fs.readFile(gitignorePath, "utf8");
    } catch (error) {}

    if (!currentContent.split("\n").some((line) => line.trim() === pattern)) {
      const newContent =
        currentContent && !currentContent.endsWith("\n")
          ? `${currentContent}\n${pattern}\n`
          : `${currentContent}${pattern}\n`;

      await fs.writeFile(gitignorePath, newContent, "utf8");
      console.log(`Added /zhankai to .gitignore`);
    }
  } catch (error) {
    console.error("Error updating .gitignore:", error);
  }
}

const program = new Command();

program
  .version("1.1.5")
  .option("-o, --output <filename>", "output filename")
  .option("-d, --depth <number>", "maximum depth to traverse", "Infinity")
  .option("-c, --contents", "include file contents", false)
  .option("-q, --query <string>", "query to send to Rukh API")
  .option("--debug", "enable debug mode");

program.action(async (options) => {
  const baseDir = process.cwd();
  const repoName = await getRepoName(baseDir);

  const zhankaiDir = path.join(baseDir, "zhankai");
  try {
    await fs.mkdir(zhankaiDir, { recursive: true });

    try {
      const stats = await fs.stat(zhankaiDir);
      const now = new Date();
      const dirCreationTime = new Date(stats.birthtime);

      if (now.getTime() - dirCreationTime.getTime() > 5000) {
        console.log(`\nUsing existing zhankai directory: ${zhankaiDir}`);
      } else {
        console.log(`\nCreated zhankai directory: ${zhankaiDir}`);
      }
    } catch {
      console.log(`\nCreated zhankai directory: ${zhankaiDir}`);
    }
  } catch (error) {
    console.error("Error accessing zhankai directory:", error);
  }

  const gitignorePath = path.join(baseDir, ".gitignore");
  try {
    await fs.access(gitignorePath);
    await addToGitignore("/zhankai");
  } catch {
    console.log(
      "No .gitignore file found. Skipping addition of /zhankai to .gitignore."
    );
  }

  let baseOutputFilename = options.output || `${repoName}_app_description.md`;
  const outputPath = path.join(zhankaiDir, baseOutputFilename);
  const uniqueOutputFilename = await getUniqueFilename(outputPath);

  const zhankaiOptions: ZhankaiOptions = {
    output: uniqueOutputFilename,
    depth: options.depth === "Infinity" ? Infinity : parseInt(options.depth),
    contents: options.contents,
    query: options.query,
    debug: options.debug,
  };

  const gitignorePatterns = await loadGitignorePatterns(baseDir);
  const ig = ignore().add(gitignorePatterns);

  let content = `# ${repoName}\n\n`;
  await fs.writeFile(zhankaiOptions.output, content);

  await traverseDirectory(baseDir, zhankaiOptions, 0, baseDir, ig);

  const fileStructure = await generateFileStructure(
    baseDir,
    zhankaiOptions.depth,
    "",
    true,
    baseDir,
    ig
  );
  await fs.appendFile(
    zhankaiOptions.output,
    `\n## Structure\n\n\`\`\`\n${fileStructure}\`\`\`\n`
  );

  content = `\nTimestamp: ${generateTimestamp()}`;
  await fs.appendFile(zhankaiOptions.output, content);

  console.log(
    `\nContent of all files and repo structure written: ${zhankaiOptions.output}`
  );

  if (zhankaiOptions.query) {
    await fs.writeFile(
      zhankaiOptions.output,
      await fs.readFile(zhankaiOptions.output, "utf-8")
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const rukhResponse = await sendQueryToRukh(
      zhankaiOptions.query,
      zhankaiOptions.output,
      zhankaiOptions.debug || false
    );
    console.log(rukhResponse);
  }
});

program.parse(process.argv);

#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { Command } from "commander";
import { Dirent } from "fs";
import ignore from "ignore";
import { ethers } from "ethers";
import prompts from "prompts";

const CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".zhankai"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface AuthConfig {
  apiKey: string;
  walletAddress: string;
}

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

async function setupAuth(): Promise<void> {
  console.log("Setting up Zhankai authentication...");

  const { walletAddress } = await prompts({
    type: "text",
    name: "walletAddress",
    message: "Please enter your Ethereum wallet address:",
    validate: (value) =>
      ethers.isAddress(value) ? true : "Please enter a valid Ethereum address",
  });

  const messageResponse = await fetch(
    "http://localhost:3000/auth/get-message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    }
  );

  if (!messageResponse.ok) {
    throw new Error("Failed to get message for signing");
  }

  const { message } = await messageResponse.json();

  console.log(
    "\nPlease sign this message using https://etherscan.io/verifiedSignatures"
  );
  console.log(`Message to sign: ${message}`);

  const { signature } = await prompts({
    type: "text",
    name: "signature",
    message: "Please paste the Signature Hash from Etherscan:",
  });

  const verifyResponse = await fetch("http://localhost:3000/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      message,
      signature,
    }),
  });

  if (!verifyResponse.ok) {
    throw new Error("Failed to verify signature");
  }

  const { apiKey } = await verifyResponse.json();

  await AuthStore.setAuth({
    apiKey,
    walletAddress,
  });

  console.log("Setup complete! You can now use Zhankai with your API key.");
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

const sendQueryToFatou = async (
  query: string,
  filePath: string,
  debug: boolean
): Promise<string> => {
  const FATOU_API_URL = "http://localhost:3000/ai/ask";
  const loader = new K2000Loader();

  try {
    loader.start();

    const auth = await AuthStore.getAuth();
    if (!auth || !auth.apiKey) {
      loader.stop();
      throw new Error("Authentication required. Please run: zhankai setup");
    }

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
      console.log("Using API Key:", auth.apiKey);
    }

    const response = await fetch(FATOU_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": auth.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API key. Please run 'zhankai setup' again.");
      }
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

const AuthStore = {
  async init() {
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (error) {
      console.error("Error creating config directory:", error);
    }
  },

  async getAuth(): Promise<AuthConfig | null> {
    try {
      await this.init();
      const data = await fs.readFile(CONFIG_FILE, "utf8");
      const auth = JSON.parse(data) as AuthConfig;

      if (!auth || !auth.apiKey || !auth.walletAddress) {
        return null;
      }

      return auth;
    } catch (error) {
      console.error("Error reading auth config:", error);

      return null;
    }
  },

  async setAuth(auth: AuthConfig): Promise<void> {
    await this.init();
    const data = JSON.stringify(auth, null, 2);
    await fs.writeFile(CONFIG_FILE, data, { mode: 0o600 });
  },

  async clearAuth(): Promise<void> {
    try {
      await fs.unlink(CONFIG_FILE);
    } catch {}
  },
};

const program = new Command();

program
  .version("1.1.5")
  .option("-o, --output <filename>", "output filename")
  .option("-d, --depth <number>", "maximum depth to traverse", "Infinity")
  .option("-c, --contents", "include file contents", false)
  .option("-q, --query <string>", "query to send to Fatou API")
  .option("--debug", "enable debug mode");

program
  .command("setup")
  .description("Setup authentication for Zhankai")
  .action(setupAuth);

program
  .command("logout")
  .description("Clear stored credentials")
  .action(async () => {
    await AuthStore.clearAuth();
    console.log("Credentials cleared successfully");
  });

program.action(async (options) => {
  const baseDir = process.cwd();
  const repoName = await getRepoName(baseDir);

  let baseOutputFilename = options.output || `${repoName}_app_description.md`;
  const uniqueOutputFilename = await getUniqueFilename(baseOutputFilename);

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
    const auth = await AuthStore.getAuth();
    if (!auth) {
      console.error("Authentication required. Please run: zhankai setup");
      process.exit(1);
    }

    await fs.writeFile(
      zhankaiOptions.output,
      await fs.readFile(zhankaiOptions.output, "utf-8")
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const fatouResponse = await sendQueryToFatou(
      zhankaiOptions.query,
      zhankaiOptions.output,
      zhankaiOptions.debug || false
    );
    console.log(fatouResponse);
  }
});

program.parse(process.argv);

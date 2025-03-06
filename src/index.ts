#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { Command } from "commander";
import { Dirent } from "fs";
import ignore from "ignore";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { exec } from "child_process";
import prompts from "prompts";
import { promisify } from "util";

const execAsync = promisify(exec);

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

/**
 * Checks if there are uncommitted changes in the git repository
 * @returns Promise<boolean> - true if there are uncommitted changes, false otherwise
 */
async function hasUncommittedChanges(): Promise<boolean> {
  try {
    // Check if we're in a git repository
    await execAsync("git rev-parse --is-inside-work-tree");

    // Get git status in porcelain format
    const { stdout } = await execAsync("git status --porcelain");

    // If stdout is not empty, there are uncommitted changes
    return stdout.trim().length > 0;
  } catch (error) {
    // Not a git repository or git not installed
    return false;
  }
}

/**
 * Asks the user for confirmation to proceed with the query despite uncommitted changes
 * @returns Promise<boolean> - true if user confirms, false otherwise
 */
async function confirmProceedWithUncommittedChanges(): Promise<boolean> {
  const response = await prompts({
    type: "confirm",
    name: "value",
    message:
      "Uncommitted changes detected. Proceeding might overwrite files. Continue anyway?",
    initial: false,
  });

  return response.value;
}

/**
 * Sends a query to the Rukh API and handles the response
 * @param query The query string to send
 * @param filePath Path to the file containing the context for the query
 * @param debug Whether to enable debug mode
 * @returns The formatted response from the API
 */
const sendQueryToRukh = async (
  query: string,
  filePath: string,
  debug: boolean
): Promise<string> => {
  // Define constants
  // const RUKH_API_URL = "https://rukh.w3hc.org/ask"; // Production URL
  const RUKH_API_URL = "http://localhost:3000/ask"; // Local development URL
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  try {
    // Validate input file access
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error("✗ Error accessing file:", error);
      throw new Error(`Cannot access file at path: ${filePath}`);
    }

    // Read the file content
    const fileContent = await fs.readFile(filePath, "utf-8");
    if (debug) {
      console.log("\nDEBUG - File content length:", fileContent.length);
      console.log(
        "DEBUG - File content preview:",
        fileContent.slice(0, 200) + "..."
      );
    }

    // Prepare form data
    const formData = new FormData();
    formData.append("message", query);
    formData.append("model", "anthropic"); // Using Anthropic's model for better responses
    formData.append("sessionId", "");
    formData.append("walletAddress", "");
    formData.append("context", "zhankai");

    const fileName = path.basename(filePath);

    // Handle file attachment
    if (typeof File === "undefined") {
      if (debug)
        console.log(
          "Running in Node.js environment - using Blob for file upload"
        );
      const blob = new Blob([fileContent], { type: "text/markdown" });
      formData.append("file", blob, fileName);
    } else {
      const file = new File([fileContent], fileName, { type: "text/markdown" });
      formData.append("file", file);
    }

    console.log(`Sending request to ${RUKH_API_URL}`);

    // Retry logic for API requests
    let response;
    let attemptCount = 0;

    while (attemptCount < MAX_RETRIES) {
      try {
        response = await fetch(RUKH_API_URL, {
          method: "POST",
          headers: {
            accept: "application/json",
          },
          body: formData,
          // Adding timeout to avoid hanging requests
          signal: AbortSignal.timeout(60000), // 60 second timeout
        });

        // If successful, break out of retry loop
        if (response.ok) break;

        // Handle specific error responses
        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please check your API credentials."
          );
        }

        if (response.status === 429) {
          console.warn(
            `Rate limit hit. Retrying in ${RETRY_DELAY / 1000} seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          attemptCount++;
          continue;
        }

        // For other errors, try to extract error details
        const errorText = await response.text();
        let errorDetails = "Unknown error";

        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          errorDetails =
            errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch {
          // If not JSON, use the text
          errorDetails = errorText.slice(0, 200); // Limit error text length
        }

        console.error(`API error (${response.status}): ${errorDetails}`);

        // Decide whether to retry based on status code
        if ([500, 502, 503, 504].includes(response.status)) {
          console.log(
            `Server error. Retrying... (${attemptCount + 1}/${MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          attemptCount++;
        } else {
          // For other status codes, don't retry
          throw new Error(
            `API request failed with status ${response.status}: ${errorDetails}`
          );
        }
      } catch (fetchError: any) {
        // Network errors or timeouts
        console.error(
          `Request attempt ${attemptCount + 1} failed:`,
          fetchError.message
        );

        if (attemptCount < MAX_RETRIES - 1) {
          console.log(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          attemptCount++;
        } else {
          throw new Error(
            `Failed to connect to API after ${MAX_RETRIES} attempts: ${fetchError.message}`
          );
        }
      }
    }

    // If we've exited the loop without a response, all retries have failed
    if (!response || !response.ok) {
      throw new Error("All API request attempts failed");
    }

    // Process successful response
    const responseBody = await response.text();

    let data;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      console.error("✗ Failed to parse JSON response:", e);
      console.log("Raw response:", responseBody.slice(0, 500) + "...");
      throw new Error("Failed to parse API response as JSON");
    }

    if (debug) {
      console.log("\nResponse details:");
      console.log("- Status:", response.status);
      console.log("- Headers:", Object.fromEntries(response.headers.entries()));
      console.log("- Response data keys:", Object.keys(data));
    }

    // Extract the content from the response
    const responseContent = data.output || data.answer || "";

    if (!responseContent) {
      console.error("✗ No content found in response");
      console.log("Response structure:", Object.keys(data));
      throw new Error("Missing content in API response");
    }

    // Prepare to save the response to a file
    const baseDir = process.cwd();
    const zhankaiDir = path.join(baseDir, "zhankai");
    const baseQueryFilename = "query.md";
    const queryFilePath = path.join(zhankaiDir, baseQueryFilename);
    const uniqueQueryFilename = await getUniqueFilename(queryFilePath);

    // Save response to file
    try {
      await fs.writeFile(uniqueQueryFilename, responseContent, "utf-8");
      // Verify the file was written correctly
      const savedContent = await fs.readFile(uniqueQueryFilename, "utf-8");

      if (savedContent.length === 0) {
        console.warn(
          "Warning: Saved file appears to be empty. Trying alternative method..."
        );
        // Try synchronous write as fallback
        writeFileSync(uniqueQueryFilename, responseContent, "utf-8");
      }

      console.log(`Response saved in ${uniqueQueryFilename}`);
    } catch (writeError) {
      console.error("Error saving response to file:", writeError);
      console.log("Attempting alternate save method...");

      try {
        // Fallback to sync file writing
        writeFileSync(uniqueQueryFilename, responseContent, "utf-8");
        console.log(
          `Response saved in ${uniqueQueryFilename} (using fallback method)`
        );
      } catch (syncWriteError) {
        console.error(
          "Failed to save response with fallback method:",
          syncWriteError
        );
        // Continue execution, as we still have the response in memory
      }
    }

    // Format the response for terminal output
    const formattedResponse = formatMarkdownForTerminal(responseContent);

    // Process the API response if it contains file specifications
    try {
      if (data.output && typeof data.output === "string") {
        // Try to parse the output as JSON
        try {
          const jsonOutput = JSON.parse(data.output);

          if (Array.isArray(jsonOutput)) {
            console.log(
              `\nFound ${jsonOutput.length} file(s) to create/update from API response...\n`
            );

            for (const spec of jsonOutput) {
              if (!spec.fileName || typeof spec.fileName !== "string") {
                console.error(
                  "❌ Error: A file specification is missing the fileName property"
                );
                continue;
              }

              if (!spec.fileContent || typeof spec.fileContent !== "string") {
                console.error(
                  `❌ Error: File specification for ${spec.fileName} is missing the fileContent property`
                );
                continue;
              }

              const filePath = path.join(process.cwd(), spec.fileName);
              const dirPath = path.dirname(filePath);

              // Create directory if it doesn't exist
              if (!existsSync(dirPath)) {
                mkdirSync(dirPath, { recursive: true });
              }

              // Write the file
              try {
                writeFileSync(filePath, spec.fileContent);
                console.log(`Created/Updated file: ${spec.fileName}`);
              } catch (error) {
                console.error(
                  `❌ Error creating/updating file ${spec.fileName}:`,
                  error
                );
              }
            }

            console.log("\nDone! ✅");
          }
        } catch (error) {
          // Not valid JSON or not an array - this is normal for most responses
          if (debug) {
            console.log(
              "Response is not a valid JSON array, continuing with normal processing."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error processing API response as code:", error);
    }

    // Stop the loading animation and return the formatted response
    return formattedResponse;
  } catch (error) {
    // Handle all errors
    console.error("\n✗ Error sending query to Rukh API:", error);
    if (error instanceof Error) {
      return `Failed to get response from Rukh API: ${error.message}`;
    }
    return "Failed to get response from Rukh API";
  }
};

/**
 * Add a pattern to .gitignore if it doesn't already exist
 * @param pattern The pattern to add to .gitignore
 */
async function addToGitignore(pattern: string): Promise<void> {
  try {
    const gitignorePath = path.join(process.cwd(), ".gitignore");

    let currentContent = "";
    try {
      currentContent = await fs.readFile(gitignorePath, "utf8");
    } catch (error) {
      // Gitignore doesn't exist, we'll create a new one
    }

    if (!currentContent.split("\n").some((line) => line.trim() === pattern)) {
      const newContent =
        currentContent && !currentContent.endsWith("\n")
          ? `${currentContent}\n${pattern}\n`
          : `${currentContent}${pattern}\n`;

      await fs.writeFile(gitignorePath, newContent, "utf8");
      console.log(`Added ${pattern} to .gitignore`);
    }
  } catch (error) {
    console.error("Error updating .gitignore:", error);
  }
}

// Set up command line interface
const program = new Command();

program
  .version("1.4.0")
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

  // Add /zhankai to .gitignore
  await addToGitignore("/zhankai");

  // Generate unique output filename
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

  // Load gitignore patterns
  const gitignorePatterns = await loadGitignorePatterns(baseDir);
  const ig = ignore().add(gitignorePatterns);

  // Initialize output file with repo name
  let content = `# ${repoName}\n\n`;
  await fs.writeFile(zhankaiOptions.output, content);

  // Traverse directory and generate content
  await traverseDirectory(baseDir, zhankaiOptions, 0, baseDir, ig);

  // Generate and append file structure
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

  // Add timestamp
  content = `\nTimestamp: ${generateTimestamp()}`;
  await fs.appendFile(zhankaiOptions.output, content);

  console.log(
    `Content of all files and repo structure written: ${zhankaiOptions.output}`
  );

  // Handle query if provided
  if (zhankaiOptions.query) {
    // Check for uncommitted changes
    const hasChanges = await hasUncommittedChanges();

    if (hasChanges) {
      const shouldProceed = await confirmProceedWithUncommittedChanges();

      if (!shouldProceed) {
        console.log("Operation cancelled. Please commit your changes first.");
        return;
      }
    }

    // Send query to Rukh API
    console.log(`\nProcessing query: "${zhankaiOptions.query}"`);
    await sendQueryToRukh(
      zhankaiOptions.query,
      zhankaiOptions.output,
      zhankaiOptions.debug || false
    );
  }
});

program.parse(process.argv);

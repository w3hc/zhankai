#!/usr/bin/env node

import path from "path";
import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync } from "fs";
import prompts from "prompts";
import { ZhankaiConfig } from "./utils/types";
import { gitUtils } from "./utils/git";
import { fileUtils } from "./utils/file";
import { markdownUtils } from "./utils/markdown";
import { apiUtils } from "./utils/api";
import { logger } from "./ui/logger";
import { constants } from "./config/constants";
import { githubUtils } from "./utils/github";

const packageJsonPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

/**
 * Main CLI function
 */
async function main() {
  // Set up command line interface
  const program = new Command();

  program
    .version(pkg.version)
    .description(
      "CLI tool for exporting repository content into a structured markdown file"
    )
    .option("-o, --output <filename>", "output filename")
    .option("-d, --depth <number>", "maximum depth to traverse", "Infinity")
    .option("-c, --contents", "include file contents", false)
    .option("-q, --query <string>", "query to send to Rukh API")
    .option("--debug", "enable debug mode")
    .option(
      "--timeout <number>",
      "API request timeout in milliseconds",
      String(constants.DEFAULT_TIMEOUT_MS)
    );

  program.action(async (options) => {
    try {
      await runZhankai(options);
    } catch (error) {
      logger.error("Failed to execute Zhankai:", error);
      process.exit(1);
    }
  });

  program
    .command("login")
    .description("Check if you are authenticated with GitHub via Git")
    .action(async () => {
      await githubUtils.checkGitHubAuth();
    });

  program.parse(process.argv);
}

/**
 * Main Zhankai execution function
 */
async function runZhankai(options: any) {
  const baseDir = process.cwd();
  const repoName = await gitUtils.getRepoName(baseDir);

  // Parse options into config
  const config: ZhankaiConfig = {
    output: options.output || `${repoName}_app_description.md`,
    depth: options.depth === "Infinity" ? Infinity : parseInt(options.depth),
    contents: options.contents,
    query: options.query,
    debug: options.debug,
    timeout: options.timeout
      ? parseInt(options.timeout)
      : constants.DEFAULT_TIMEOUT_MS,
  };

  // Setup output directory
  const zhankaiDir = await setupOutputDirectory(baseDir);

  // Generate unique output filename
  const outputPath = path.join(zhankaiDir, config.output);
  const uniqueOutputPath = await fileUtils.getUniqueFilename(outputPath);
  config.output = uniqueOutputPath;

  // Load gitignore patterns
  const ignoreRules = await fileUtils.getIgnoreRules(baseDir);

  // Generate repository documentation
  await generateRepoDocumentation(baseDir, repoName, config, ignoreRules);

  // Handle query if provided
  if (config.query) {
    await handleQuery(config);
  }
}

/**
 * Sets up the output directory
 */
async function setupOutputDirectory(baseDir: string): Promise<string> {
  const zhankaiDir = path.join(baseDir, constants.ZHANKAI_DIR);

  try {
    if (!existsSync(zhankaiDir)) {
      mkdirSync(zhankaiDir, { recursive: true });
      logger.info(`Created zhankai directory: ${zhankaiDir}`);

      // Add /zhankai to .gitignore
      await gitUtils.addToGitignore(baseDir, constants.ZHANKAI_DIR);
    } else {
      logger.info(`Using existing zhankai directory: ${zhankaiDir}`);
    }

    return zhankaiDir;
  } catch (error) {
    logger.error("Error setting up output directory:", error);
    throw error;
  }
}

/**
 * Generates repository documentation
 */
async function generateRepoDocumentation(
  baseDir: string,
  repoName: string,
  config: ZhankaiConfig,
  ignoreRules: any
): Promise<void> {
  // Initialize output file with repo name
  let content = `# ${repoName}\n\n`;
  await fileUtils.writeFile(config.output, content);

  // Traverse directory and generate content
  await fileUtils.traverseDirectory(baseDir, config, 0, baseDir, ignoreRules);

  // Generate and append file structure
  const fileStructure = await fileUtils.generateFileStructure(
    baseDir,
    config.depth,
    "",
    true,
    baseDir,
    ignoreRules
  );

  await fileUtils.appendFile(
    config.output,
    `\n## Structure\n\n\`\`\`\n${fileStructure}\`\`\`\n`
  );

  // Add timestamp
  content = `\nTimestamp: ${markdownUtils.generateTimestamp()}`;
  await fileUtils.appendFile(config.output, content);

  logger.info(
    `Content of all files and repo structure written: ${config.output}`
  );
}

/**
 * Handles query to Rukh API
 */
async function handleQuery(config: ZhankaiConfig): Promise<void> {
  // Check for uncommitted changes
  const hasChanges = await gitUtils.hasUncommittedChanges();

  if (hasChanges) {
    const shouldProceed = await confirmProceedWithUncommittedChanges();

    if (!shouldProceed) {
      logger.info("Operation cancelled. Please commit your changes first.");
      return;
    }
  }

  // Send query to Rukh API
  logger.info(`Processing query: "${config.query}"`);
  await apiUtils.sendQueryToRukh(
    config.query || "",
    config.output,
    config.debug || false,
    config.timeout
  );
}

/**
 * Asks the user for confirmation to proceed with the query despite uncommitted changes
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

// Run the main function
main().catch((err) => {
  logger.error("Unhandled error:", err);
  process.exit(1);
});

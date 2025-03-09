#!/usr/bin/env node

import path from "path";
import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync } from "fs";
import prompts from "prompts";
import { ZhankaiConfig } from "./utils/types";
import { GitHubCredentials } from "./utils/github-auth";
import { gitUtils } from "./utils/git";
import { fileUtils } from "./utils/file";
import { markdownUtils } from "./utils/markdown";
import { apiUtils } from "./utils/api";
import { logger } from "./ui/logger";
import { constants } from "./config/constants";
import { colors } from "./config/constants";
import { githubUtils } from "./utils/github";
import { walletUtils } from "./utils/wallet";
import { githubAuthUtils } from "./utils/github-auth";

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
    .description(
      "Authenticate with GitHub and generate an Ethereum wallet derived from your GitHub identity"
    )
    .action(async () => {
      try {
        // First check GitHub authentication via Git (basic check)
        await githubUtils.checkGitHubAuth();

        // Always authenticate with GitHub first
        logger.info(
          "GitHub authentication is required to generate your wallet"
        );
        const githubCredentials = await handleGitHubAuth();

        if (!githubCredentials) {
          logger.error("GitHub authentication is required to proceed");
          return;
        }

        // Check if wallet already exists
        const walletExists = await walletUtils.walletExists();

        if (walletExists) {
          const existingWallet = await walletUtils.getWalletCredentials();
          if (existingWallet) {
            logger.info(
              `Ethereum wallet already exists: ${existingWallet.address}`
            );

            // Ask if user wants to regenerate wallet from GitHub identity
            const response = await prompts({
              type: "confirm",
              name: "regenerate",
              message:
                "Do you want to regenerate your wallet from your GitHub identity? (This will overwrite the existing one)",
              initial: false,
            });

            if (!response.regenerate) {
              return;
            }
          }
        }

        // Generate a wallet derived from GitHub username
        logger.info(
          `Generating Ethereum wallet derived from GitHub identity: ${githubCredentials.username}`
        );
        const wallet = await walletUtils.generateWalletFromGitHub(
          githubCredentials.username
        );

        logger.info(
          `${colors.FG_GREEN}✓ Wallet generated successfully!${colors.RESET}`
        );
        logger.info(`${colors.BOLD}Address:${colors.RESET} ${wallet.address}`);
        logger.info(
          `${colors.BOLD}Source:${colors.RESET} Derived from GitHub username: ${githubCredentials.username}`
        );
        logger.info(
          `${colors.FG_YELLOW}Important: Your wallet private key is stored securely in your home directory.${colors.RESET}`
        );

        // Inform user about Rukh authentication
        logger.info(
          `${colors.FG_GREEN}✓ You can now use the -q option with Rukh authentication!${colors.RESET}`
        );
        logger.info(
          `This wallet will be used to authenticate with the Rukh API when you use 'zhankai -q'`
        );
        logger.info(
          `${colors.FG_YELLOW}Note: Premium features may require sponsoring the W3HC organization on GitHub.${colors.RESET}`
        );
      } catch (error) {
        logger.error("Failed during login:", error);
      }
    });

  program
    .command("github")
    .description("Authenticate with GitHub using Personal Access Token")
    .action(async () => {
      try {
        const credentials = await handleGitHubAuth();
        if (credentials) {
          logger.info(
            `${colors.FG_GREEN}✓ Successfully authenticated as GitHub user: ${colors.BOLD}${credentials.username}${colors.RESET}`
          );
        }
      } catch (error) {
        logger.error("Failed during GitHub authentication:", error);
      }
    });

  program
    .command("logout")
    .description("Clear stored GitHub credentials")
    .action(async () => {
      try {
        await githubAuthUtils.clearCredentials();
        logger.info(
          `${colors.FG_GREEN}✓ Successfully logged out from GitHub${colors.RESET}`
        );
      } catch (error) {
        logger.error("Failed to logout:", error);
      }
    });

  program
    .command("sign")
    .description("Sign a message with your Ethereum wallet")
    .argument("<message>", "message to sign")
    .action(async (message) => {
      try {
        const result = await walletUtils.signMessage(message);

        if (!result) {
          logger.error(
            "Failed to sign message. No wallet found. Please run 'zhankai login' first."
          );
          return;
        }

        logger.info(`${colors.BOLD}Message:${colors.RESET} ${result.message}`);
        logger.info(
          `${colors.BOLD}Message Hash:${colors.RESET} ${result.messageHash}`
        );
        logger.info(
          `${colors.BOLD}Signature:${colors.RESET} ${result.signature}`
        );
      } catch (error) {
        logger.error("Failed to sign message:", error);
      }
    });

  program.parse(process.argv);
}

/**
 * Handle GitHub authentication using personal access token
 * @returns GitHub credentials if authentication successful, null otherwise
 */
async function handleGitHubAuth(): Promise<GitHubCredentials | null> {
  // Check if already authenticated
  const isAuthenticated = await githubAuthUtils.isAuthenticated();

  if (isAuthenticated) {
    const credentials = await githubAuthUtils.getGitHubCredentials();
    if (credentials) {
      logger.info(
        `Already authenticated with GitHub as: ${colors.BOLD}${credentials.username}${colors.RESET}`
      );

      // Ask if user wants to re-authenticate
      const response = await prompts({
        type: "confirm",
        name: "reauth",
        message: "Do you want to re-authenticate with GitHub?",
        initial: false,
      });

      if (!response.reauth) {
        return credentials;
      }
    }
  }

  // Authenticate with GitHub using PAT
  const githubCredentials = await githubAuthUtils.authenticate();

  if (!githubCredentials) {
    logger.error("GitHub authentication failed or was cancelled.");
    return null;
  }

  return githubCredentials;
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

  // Enable debug mode if specified
  if (config.debug) {
    logger.enableDebugMode();
    logger.debug("Debug mode enabled");
  }

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

  // Check for GitHub authentication
  const isAuthenticated = await githubAuthUtils.isAuthenticated();
  const walletExists = await walletUtils.walletExists();

  if (!isAuthenticated || !walletExists) {
    logger.warn(
      "You are not authenticated with GitHub or don't have a wallet."
    );
    logger.warn("Some features might be restricted.");
    logger.warn("To authenticate and create a wallet, run: zhankai login");

    // Ask if user wants to continue without authentication
    const response = await prompts({
      type: "confirm",
      name: "continue",
      message: "Do you want to continue without authentication?",
      initial: true,
    });

    if (!response.continue) {
      logger.info("Operation cancelled. Please run 'zhankai login' first.");
      return;
    }
  } else {
    const githubCredentials = await githubAuthUtils.getGitHubCredentials();
    const walletAddress = await walletUtils.getWalletAddress();

    logger.info(`Using GitHub identity: ${githubCredentials?.username}`);
    logger.info(`Using wallet address: ${walletAddress}`);
    logger.info("Authentication enabled for Rukh API");
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

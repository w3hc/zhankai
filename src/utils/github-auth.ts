import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "../ui/logger";
import { colors } from "../config/constants";
import { TerminalLoader } from "../ui/loader";
import prompts from "prompts";

// Path for storing GitHub tokens
const getGitHubAuthFilePath = (): string => {
  // Get the user's home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
  // Use the .zhankai directory, same as for the wallet
  const zhankaiDir = path.join(homeDir, ".zhankai");

  // Ensure the directory exists
  if (!fs.existsSync(zhankaiDir)) {
    fs.mkdirSync(zhankaiDir, { recursive: true });
  }

  return path.join(zhankaiDir, "github.json");
};

// Simple encryption/decryption functions (similar to wallet.ts)
const encrypt = (text: string, password: string): string => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (encryptedText: string, password: string): string => {
  try {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = crypto.scryptSync(password, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error(
      "Failed to decrypt GitHub token. The password may be incorrect."
    );
    throw new Error("Failed to decrypt GitHub token");
  }
};

// Get a password from the environment or generate one based on machine-specific info
const getEncryptionPassword = (): string => {
  // If there's an environment variable set, use that
  if (process.env.ZHANKAI_GITHUB_PASSWORD) {
    return process.env.ZHANKAI_GITHUB_PASSWORD;
  }

  // Otherwise use a combination of machine-specific information (same as wallet.ts)
  const username = process.env.USER || process.env.USERNAME || "user";
  const hostname = require("os").hostname();
  const appName = "zhankai";

  return crypto
    .createHash("sha256")
    .update(`${username}-${hostname}-${appName}`)
    .digest("hex");
};

interface GitHubCredentials {
  username: string;
  accessToken: string;
}

export const githubAuthUtils = {
  /**
   * Check if a user is already authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const filePath = getGitHubAuthFilePath();
    return fs.existsSync(filePath);
  },

  /**
   * Get GitHub credentials if they exist
   */
  async getGitHubCredentials(): Promise<GitHubCredentials | null> {
    try {
      const filePath = getGitHubAuthFilePath();

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

      if (!data.username || !data.encryptedToken) {
        return null;
      }

      const accessToken = decrypt(data.encryptedToken, getEncryptionPassword());

      return {
        username: data.username,
        accessToken,
      };
    } catch (error) {
      logger.error("Failed to retrieve GitHub credentials:", error);
      return null;
    }
  },

  /**
   * Verify GitHub access token and get user info
   */
  async verifyToken(token: string): Promise<string | null> {
    const loader = new TerminalLoader("Verifying GitHub token...");
    loader.start();

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        loader.stop(`${colors.FG_RED}✗ Invalid GitHub token${colors.RESET}`);
        return null;
      }

      const userData = await response.json();
      const username = userData.login;

      loader.stop(`${colors.FG_GREEN}✓ GitHub token verified${colors.RESET}`);
      return username;
    } catch (error) {
      loader.stop(
        `${colors.FG_RED}✗ Error verifying GitHub token${colors.RESET}`
      );
      logger.error("Error verifying GitHub token:", error);
      return null;
    }
  },

  /**
   * Save GitHub credentials
   */
  async saveCredentials(username: string, token: string): Promise<void> {
    try {
      const encryptedToken = encrypt(token, getEncryptionPassword());
      fs.writeFileSync(
        getGitHubAuthFilePath(),
        JSON.stringify(
          {
            username,
            encryptedToken,
          },
          null,
          2
        )
      );
    } catch (error) {
      logger.error("Failed to save GitHub credentials:", error);
      throw new Error("Failed to save GitHub credentials");
    }
  },

  /**
   * Authenticate with GitHub using a personal access token
   */
  async authenticate(): Promise<GitHubCredentials | null> {
    logger.info("\nGitHub Authentication");
    logger.info("-----------------");
    logger.info("1. Go to https://github.com/settings/tokens");
    logger.info(
      '2. Click "Generate new token" > "Generate new token (classic)"'
    );
    logger.info('3. Give it a name (e.g. "Zhankai CLI")');
    logger.info('4. Select the "read:user" scope (minimum required)');
    logger.info('5. Click "Generate token" and copy it');
    logger.info(
      "\nNote: Only the read:user scope is needed to verify your GitHub identity"
    );
    logger.info("The token will be stored securely on your machine.\n");

    const tokenResponse = await prompts({
      type: "password",
      name: "token",
      message: "Enter your GitHub Personal Access Token:",
      validate: (value) => (value.length > 0 ? true : "Token cannot be empty"),
    });

    if (!tokenResponse.token) {
      logger.error("Authentication cancelled");
      return null;
    }

    const username = await this.verifyToken(tokenResponse.token);

    if (!username) {
      logger.error("Failed to authenticate with GitHub. Invalid token.");
      return null;
    }

    // Save the credentials
    await this.saveCredentials(username, tokenResponse.token);
    logger.info(
      `${colors.FG_GREEN}✓ Successfully authenticated as GitHub user: ${colors.BOLD}${username}${colors.RESET}`
    );

    return {
      username,
      accessToken: tokenResponse.token,
    };
  },

  /**
   * Clear GitHub credentials
   */
  async clearCredentials(): Promise<void> {
    const filePath = getGitHubAuthFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info("GitHub credentials cleared");
    }
  },
};

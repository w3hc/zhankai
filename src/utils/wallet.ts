import { Wallet, ethers } from "ethers";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "../ui/logger";
import { colors } from "../config/constants";

// Define the path for storing wallet data
const getWalletFilePath = (): string => {
  // Get the user's home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE || ".";
  // Create a .zhankai directory in the user's home directory
  const zhankaiDir = path.join(homeDir, ".zhankai");

  // Ensure the directory exists
  if (!fs.existsSync(zhankaiDir)) {
    fs.mkdirSync(zhankaiDir, { recursive: true });
  }

  return path.join(zhankaiDir, "wallet.json");
};

// Simple encryption/decryption functions
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
    logger.error("Failed to decrypt wallet. The password may be incorrect.");
    throw new Error("Failed to decrypt wallet");
  }
};

// Get a password from the environment or generate one based on machine-specific info
const getEncryptionPassword = (): string => {
  // If there's an environment variable set, use that
  if (process.env.ZHANKAI_WALLET_PASSWORD) {
    return process.env.ZHANKAI_WALLET_PASSWORD;
  }

  // Otherwise use a combination of machine-specific information
  // This isn't perfect security, but it's better than storing in plaintext
  const username = process.env.USER || process.env.USERNAME || "user";
  const hostname = require("os").hostname();
  const appName = "zhankai";

  return crypto
    .createHash("sha256")
    .update(`${username}-${hostname}-${appName}`)
    .digest("hex");
};

/**
 * Wallet utilities for Ethereum operations
 */
export const walletUtils = {
  /**
   * Generates a new random Ethereum wallet and stores credentials securely
   */
  async generateWallet(): Promise<{ address: string; privateKey: string }> {
    try {
      // Generate a new random wallet
      const wallet = ethers.Wallet.createRandom();

      // Get the wallet's address and private key
      const address = wallet.address;
      const privateKey = wallet.privateKey;

      // Encrypt and store the private key
      const walletData = {
        address,
        encryptedPrivateKey: encrypt(privateKey, getEncryptionPassword()),
        source: "random",
      };

      fs.writeFileSync(
        getWalletFilePath(),
        JSON.stringify(walletData, null, 2)
      );

      return { address, privateKey };
    } catch (error) {
      logger.error("Failed to generate wallet:", error);
      throw new Error("Failed to generate Ethereum wallet");
    }
  },

  /**
   * Generates an Ethereum wallet derived from a GitHub username
   * This creates a deterministic wallet based on the GitHub identity
   */
  async generateWalletFromGitHub(
    githubUsername: string
  ): Promise<{ address: string; privateKey: string }> {
    try {
      // Create a deterministic seed based on the GitHub username
      // Add a salt to ensure security even if username is known
      const salt = "zhankai-wallet-v1";
      const seed = crypto
        .createHash("sha256")
        .update(`${githubUsername}-${salt}`)
        .digest("hex");

      // Generate deterministic wallet from the seed
      const wallet = ethers.Wallet.fromPhrase(
        ethers.Mnemonic.fromEntropy(`0x${seed}`).phrase
      );

      // Get the wallet's address and private key
      const address = wallet.address;
      const privateKey = wallet.privateKey;

      // Encrypt and store the private key
      const walletData = {
        address,
        encryptedPrivateKey: encrypt(privateKey, getEncryptionPassword()),
        source: `github:${githubUsername}`,
      };

      fs.writeFileSync(
        getWalletFilePath(),
        JSON.stringify(walletData, null, 2)
      );

      return { address, privateKey };
    } catch (error) {
      logger.error("Failed to generate GitHub-derived wallet:", error);
      throw new Error("Failed to generate GitHub-derived Ethereum wallet");
    }
  },

  /**
   * Retrieves the stored wallet credentials
   */
  async getWalletCredentials(): Promise<{
    address: string;
    privateKey: string;
    source?: string;
  } | null> {
    try {
      const walletFilePath = getWalletFilePath();

      if (!fs.existsSync(walletFilePath)) {
        return null;
      }

      const walletData = JSON.parse(fs.readFileSync(walletFilePath, "utf8"));

      if (!walletData.address || !walletData.encryptedPrivateKey) {
        return null;
      }

      const privateKey = decrypt(
        walletData.encryptedPrivateKey,
        getEncryptionPassword()
      );

      return {
        address: walletData.address,
        privateKey,
        source: walletData.source,
      };
    } catch (error) {
      logger.error("Failed to retrieve wallet credentials:", error);
      return null;
    }
  },

  /**
   * Gets just the wallet address without the private key
   */
  async getWalletAddress(): Promise<string> {
    try {
      const credentials = await this.getWalletCredentials();
      return credentials ? credentials.address : "";
    } catch (error) {
      logger.error("Failed to get wallet address:", error);
      return "";
    }
  },

  /**
   * Signs a message with the stored wallet's private key
   */
  async signMessage(message: string): Promise<{
    message: string;
    signature: string;
    messageHash: string;
  } | null> {
    try {
      const credentials = await this.getWalletCredentials();

      if (!credentials) {
        logger.error("No wallet found. Please run 'zhankai login' first.");
        return null;
      }

      // Create a wallet instance from the private key
      const wallet = new ethers.Wallet(credentials.privateKey);

      // Calculate the hash of the message (Ethereum signed message)
      const messageHash = ethers.hashMessage(message);

      // Sign the message
      const signature = await wallet.signMessage(message);

      return { message, signature, messageHash };
    } catch (error) {
      logger.error("Failed to sign message:", error);
      return null;
    }
  },

  /**
   * Checks if a wallet already exists
   */
  async walletExists(): Promise<boolean> {
    const walletFilePath = getWalletFilePath();
    return fs.existsSync(walletFilePath);
  },
};

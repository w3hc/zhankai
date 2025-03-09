/**
 * Main configuration interface for Zhankai
 */
export interface ZhankaiConfig {
  /** Output file path */
  output: string;

  /** Maximum directory traversal depth */
  depth: number;

  /** Whether to include file contents */
  contents: boolean;

  /** Query string for Rukh API */
  query?: string;

  /** Debug mode flag */
  debug?: boolean;

  /** API request timeout in milliseconds */
  timeout?: number;
}

/**
 * File content structure
 */
export interface FileContent {
  /** Relative file path */
  fileName: string;

  /** Content of the file */
  fileContent: string;
}

/**
 * API response structure
 */
export interface RukhResponse {
  /** Output message from the API */
  output?: string;

  /** Alternative response field */
  answer?: string;

  /** Files to update */
  filesToUpdate?: FileToUpdate[];
}

/**
 * File update specification
 */
export interface FileToUpdate {
  /** Path of the file to update */
  fileName: string;

  /** New content for the file */
  fileContent: string;
}

/**
 * Ethereum wallet credentials
 */
export interface WalletCredentials {
  /** Ethereum address */
  address: string;

  /** Wallet private key */
  privateKey: string;
}

/**
 * Result of a message signing operation
 */
export interface SignMessageResult {
  /** The original message */
  message: string;

  /** The generated signature */
  signature: string;

  /** The hash of the message */
  messageHash: string;
}

/**
 * Authentication data for Rukh API
 */
export interface RukhAuthData {
  /** GitHub username */
  githubUserName: string;

  /** Nonce from the SIWE challenge */
  nonce: string;

  /** Signature of the SIWE challenge message */
  signature: string;
}

/**
 * SIWE challenge response from Rukh API
 */
export interface SiweChallenge {
  /** Challenge message to sign */
  message: string;

  /** Nonce to include in verification */
  nonce: string;
}

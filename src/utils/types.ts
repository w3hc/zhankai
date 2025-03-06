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

/**
 * Application constants
 */
export const constants = {
  /** Directory name for Zhankai output */
  ZHANKAI_DIR: "zhankai",

  /** Maximum file lines before truncation */
  MAX_FILE_LINES: 500,

  /** Preview lines for truncated files */
  PREVIEW_LINES: 30,

  /** URL for Rukh API */
  RUKH_API_URL: "https://rukh.w3hc.org/ask",

  /** Maximum API retry attempts */
  MAX_RETRIES: 5,

  /** Delay between retry attempts in milliseconds */
  RETRY_DELAY: 5000,

  /** Default timeout for API requests in milliseconds (2 minutes) */
  DEFAULT_TIMEOUT_MS: 120000,

  /** Items to exclude from processing */
  EXCLUDED_ITEMS: ["LICENSE", ".git"],

  /** Default items to add to ignore list */
  DEFAULT_IGNORES: ["node_modules", ".git", "zhankai", "dist", "build"],
};

/**
 * Terminal colors for formatting
 */
export const colors = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  DIM: "\x1b[2m",
  ITALIC: "\x1b[3m",
  UNDERLINE: "\x1b[4m",
  BLINK: "\x1b[5m",
  INVERSE: "\x1b[7m",
  HIDDEN: "\x1b[8m",

  // Foreground colors
  FG_BLACK: "\x1b[30m",
  FG_RED: "\x1b[31m",
  FG_GREEN: "\x1b[32m",
  FG_YELLOW: "\x1b[33m",
  FG_BLUE: "\x1b[34m",
  FG_MAGENTA: "\x1b[35m",
  FG_CYAN: "\x1b[36m",
  FG_WHITE: "\x1b[37m",

  // Background colors
  BG_BLACK: "\x1b[40m",
  BG_RED: "\x1b[41m",
  BG_GREEN: "\x1b[42m",
  BG_YELLOW: "\x1b[43m",
  BG_BLUE: "\x1b[44m",
  BG_MAGENTA: "\x1b[45m",
  BG_CYAN: "\x1b[46m",
  BG_WHITE: "\x1b[47m",
};

/**
 * Language mappings for code highlighting
 */
export const languageMap: Record<string, string> = {
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

/**
 * Image file extensions
 */
export const imageExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
];

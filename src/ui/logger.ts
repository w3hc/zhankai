import { colors } from "../config/constants";

/**
 * Log levels
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  useColors: boolean;
}

/**
 * Simple logger utility
 */
class Logger {
  private config: LoggerConfig = {
    level: LogLevel.INFO,
    useColors: true,
  };

  /**
   * Sets the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable color output
   */
  setColorOutput(useColors: boolean): void {
    this.config.useColors = useColors;
  }

  /**
   * Enables debug mode
   */
  enableDebugMode(): void {
    this.config.level = LogLevel.DEBUG;
  }

  /**
   * Logs debug messages
   */
  debug(...args: any[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      const prefix = this.config.useColors
        ? `${colors.FG_CYAN}[DEBUG]${colors.RESET} `
        : "[DEBUG] ";
      console.log(prefix, ...args);
    }
  }

  /**
   * Logs info messages
   */
  info(...args: any[]): void {
    if (this.config.level <= LogLevel.INFO) {
      const prefix = this.config.useColors
        ? `${colors.FG_GREEN}[INFO]${colors.RESET} `
        : "[INFO] ";
      console.log(prefix, ...args);
    }
  }

  /**
   * Logs warning messages
   */
  warn(...args: any[]): void {
    if (this.config.level <= LogLevel.WARN) {
      const prefix = this.config.useColors
        ? `${colors.FG_YELLOW}[WARN]${colors.RESET} `
        : "[WARN] ";
      console.warn(prefix, ...args);
    }
  }

  /**
   * Logs error messages
   */
  error(...args: any[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      const prefix = this.config.useColors
        ? `${colors.FG_RED}[ERROR]${colors.RESET} `
        : "[ERROR] ";
      console.error(prefix, ...args);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

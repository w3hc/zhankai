import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../ui/logger";

const execAsync = promisify(exec);

/**
 * Git utilities namespace
 */
export const gitUtils = {
  /**
   * Gets the repository name from the current directory
   */
  async getRepoName(dir: string): Promise<string> {
    try {
      // Try to get the repository name from git
      const { stdout } = await execAsync("git rev-parse --show-toplevel", {
        cwd: dir,
      });
      const repoPath = stdout.trim();
      return path.basename(repoPath);
    } catch (error) {
      // If git command fails, use the directory name
      return path.basename(dir);
    }
  },

  /**
   * Checks if there are uncommitted changes in the git repository
   */
  async hasUncommittedChanges(): Promise<boolean> {
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
  },

  /**
   * Adds a directory or pattern to .gitignore if it doesn't already exist
   */
  async addToGitignore(repoDir: string, pattern: string): Promise<void> {
    try {
      const gitignorePath = path.join(repoDir, ".gitignore");

      let currentContent = "";
      try {
        currentContent = await fs.readFile(gitignorePath, "utf8");
      } catch (error) {
        // Gitignore doesn't exist, we'll create a new one
      }

      // Format pattern with leading slash if it doesn't have one
      const formattedPattern = pattern.startsWith("/")
        ? pattern
        : `/${pattern}`;

      // Check if pattern already exists
      if (
        !currentContent
          .split("\n")
          .some(
            (line) =>
              line.trim() === formattedPattern || line.trim() === pattern
          )
      ) {
        const newContent =
          currentContent && !currentContent.endsWith("\n")
            ? `${currentContent}\n${formattedPattern}\n`
            : `${currentContent}${formattedPattern}\n`;

        await fs.writeFile(gitignorePath, newContent, "utf8");
        logger.info(`Added ${formattedPattern} to .gitignore`);
      }
    } catch (error) {
      logger.error("Error updating .gitignore:", error);
    }
  },

  /**
   * Gets the git config information for a repository
   */
  async getGitConfig(dir: string): Promise<Record<string, string>> {
    try {
      const { stdout } = await execAsync("git config --list", { cwd: dir });

      const config: Record<string, string> = {};
      stdout
        .trim()
        .split("\n")
        .forEach((line) => {
          const [key, value] = line.split("=");
          if (key && value) {
            config[key.trim()] = value.trim();
          }
        });

      return config;
    } catch (error) {
      logger.debug("Could not retrieve git config:", error);
      return {};
    }
  },
};

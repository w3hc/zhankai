import fs from "fs/promises";
import { writeFileSync } from "fs";
import path from "path";
import { Dirent } from "fs";
import ignore from "ignore";
import { logger } from "../ui/logger";
import { constants, languageMap, imageExtensions } from "../config/constants";
import { ZhankaiConfig } from "./types";

// Define the return type of ignore() since Ignore isn't exported directly
type IgnoreInstance = ReturnType<typeof ignore>;

/**
 * File utilities namespace
 */
export const fileUtils = {
  /**
   * Writes content to a file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      logger.error(`Error writing to file ${filePath}:`, error);

      // Fallback to sync write
      try {
        writeFileSync(filePath, content, "utf-8");
      } catch (syncError) {
        throw new Error(`Failed to write to file ${filePath}: ${syncError}`);
      }
    }
  },

  /**
   * Appends content to a file
   */
  async appendFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.appendFile(filePath, content, "utf-8");
    } catch (error) {
      logger.error(`Error appending to file ${filePath}:`, error);

      // Try to read current content and write the combined content
      try {
        const currentContent = await fs.readFile(filePath, "utf-8");
        await this.writeFile(filePath, currentContent + content);
      } catch (readError) {
        throw new Error(`Failed to append to file ${filePath}: ${readError}`);
      }
    }
  },

  /**
   * Gets a unique filename by adding a counter if the file already exists
   */
  async getUniqueFilename(baseFilename: string): Promise<string> {
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
  },

  /**
   * Gets ignore rules from .gitignore if it exists
   */
  async getIgnoreRules(dir: string): Promise<IgnoreInstance> {
    const ig = ignore();

    try {
      const gitignorePath = path.join(dir, ".gitignore");
      const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");

      // Add default ignores
      ig.add(constants.DEFAULT_IGNORES);

      // Add rules from .gitignore
      ig.add(gitignoreContent);
    } catch (error) {
      // If .gitignore doesn't exist, use default ignores
      ig.add(constants.DEFAULT_IGNORES);
    }

    return ig;
  },

  /**
   * Determines if a file is a binary image file
   */
  isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  },

  /**
   * Gets the language tag for syntax highlighting
   */
  getLanguageTag(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return languageMap[ext] || "";
  },

  /**
   * Processes a file for inclusion in the documentation
   */
  async processFile(
    filePath: string,
    relativePath: string,
    options: ZhankaiConfig
  ): Promise<void> {
    const langTag = this.getLanguageTag(filePath);

    await this.appendFile(options.output, `\n### ${relativePath}\n\n`);
    await this.appendFile(options.output, "```" + langTag + "\n");

    if (this.isImageFile(filePath)) {
      await this.appendFile(options.output, "[This is an image file]");
    } else {
      try {
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split("\n");

        if (lines.length > constants.MAX_FILE_LINES) {
          const truncatedContent = lines
            .slice(0, constants.PREVIEW_LINES)
            .join("\n");
          await this.appendFile(options.output, truncatedContent);
          await this.appendFile(options.output, "\n```\n");
          await this.appendFile(
            options.output,
            `\n[This file was cut: it has more than ${constants.MAX_FILE_LINES} lines]\n`
          );
        } else {
          await this.appendFile(options.output, content);
          await this.appendFile(options.output, "\n```\n");
        }
      } catch (error) {
        await this.appendFile(options.output, "[Unable to read file content]");
        await this.appendFile(options.output, "\n```\n");
        logger.error(`Error reading file ${filePath}:`, error);
      }
    }
  },

  /**
   * Traverses a directory to collect file information
   */
  async traverseDirectory(
    dir: string,
    options: ZhankaiConfig,
    currentDepth: number = 0,
    baseDir: string,
    ig: IgnoreInstance
  ): Promise<void> {
    if (currentDepth > options.depth) return;

    try {
      const files = await fs.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const relativePath = path.relative(baseDir, path.join(dir, file.name));

        if (
          constants.EXCLUDED_ITEMS.includes(file.name) ||
          ig.ignores(relativePath)
        ) {
          continue;
        }

        const filePath = path.join(dir, file.name);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          if (!file.name.startsWith(".")) {
            await this.appendFile(options.output, `\n## ${relativePath}\n\n`);

            await this.traverseDirectory(
              filePath,
              options,
              currentDepth + 1,
              baseDir,
              ig
            );
          }
        } else {
          await this.processFile(filePath, relativePath, options);
        }
      }
    } catch (error) {
      logger.error(`Error traversing directory ${dir}:`, error);
    }
  },

  /**
   * Generates a tree-like file structure
   */
  async generateFileStructure(
    dir: string,
    depth: number,
    prefix = "",
    isLast = true,
    baseDir: string,
    ig: IgnoreInstance
  ): Promise<string> {
    let treeStructure = "";

    try {
      const files: Dirent[] = await fs.readdir(dir, { withFileTypes: true });
      const lastIndex = files.length - 1;

      for (const [index, file] of files.entries()) {
        const relativePath = path.relative(baseDir, path.join(dir, file.name));

        if (
          constants.EXCLUDED_ITEMS.includes(file.name) ||
          ig.ignores(relativePath)
        ) {
          continue;
        }

        const isDirectory = file.isDirectory();
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        const connector = index === lastIndex ? "└── " : "├── ";

        treeStructure += `${prefix}${connector}${file.name}\n`;

        if (isDirectory && depth > 0) {
          treeStructure += await this.generateFileStructure(
            path.join(dir, file.name),
            depth - 1,
            newPrefix,
            index === lastIndex,
            baseDir,
            ig
          );
        }
      }
    } catch (error) {
      logger.error(`Error generating file structure for ${dir}:`, error);
    }

    return treeStructure;
  },
};

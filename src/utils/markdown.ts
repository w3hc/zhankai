import { colors } from "../config/constants";

/**
 * Markdown utilities namespace
 */
export const markdownUtils = {
  /**
   * Generates a timestamp string for documentation
   */
  generateTimestamp(): string {
    const date = new Date();
    return (
      date
        .toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "UTC",
        })
        .replace(/,/g, "") + " UTC"
    );
  },

  /**
   * Formats markdown for terminal display with colors
   */
  formatMarkdownForTerminal(markdown: string): string {
    let formatted = markdown
      .replace(/^# (.*$)/gm, `${colors.BOLD}${colors.FG_BLUE}$1${colors.RESET}`)
      .replace(
        /^## (.*$)/gm,
        `${colors.BOLD}${colors.FG_GREEN}$1${colors.RESET}`
      )
      .replace(
        /^### (.*$)/gm,
        `${colors.BOLD}${colors.FG_CYAN}$1${colors.RESET}`
      )
      .replace(
        /^#### (.*$)/gm,
        `${colors.BOLD}${colors.FG_YELLOW}$1${colors.RESET}`
      );

    // Format code blocks - indent and remove backticks
    formatted = formatted.replace(
      /```[a-z]*\n([\s\S]*?)```/g,
      (_, code) =>
        `\n${code
          .split("\n")
          .map((line: string) => `    ${line}`)
          .join("\n")}\n`
    );

    // Format bullet points
    formatted = formatted.replace(/^- (.*$)/gm, `  • $1`);

    // Format numbered lists
    formatted = formatted.replace(/^[0-9]+\. (.*$)/gm, (match, content) => {
      const number = match.split(".")[0];
      return `  ${number}. ${content}`;
    });

    // Format tables
    formatted = formatted.replace(/\|(.*)\|/g, (match) => {
      if (match.includes("-----")) {
        return "  " + "-".repeat(60);
      }

      const cells = match
        .split("|")
        .filter((cell) => cell.trim() !== "")
        .map((cell) => cell.trim());

      if (cells.length >= 2) {
        return `  ${cells[0]}: ${cells.slice(1).join(" | ")}`;
      }
      return match;
    });

    return "\n" + formatted + "\n";
  },

  /**
   * Sanitizes content for markdown
   */
  sanitize(content: string): string {
    return content
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
  },

  /**
   * Creates markdown table from data
   */
  createTable(headers: string[], rows: string[][]): string {
    let table = "";

    // Add headers
    table += `| ${headers.join(" | ")} |\n`;

    // Add separator
    table += `| ${headers.map(() => "---").join(" | ")} |\n`;

    // Add rows
    for (const row of rows) {
      table += `| ${row.join(" | ")} |\n`;
    }

    return table;
  },
};

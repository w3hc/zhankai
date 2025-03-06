import { describe, it, expect, vi, beforeEach } from "vitest";
import { markdownUtils } from "../../src/utils/markdown";
import { colors } from "../../src/config/constants";

describe("markdownUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("generateTimestamp", () => {
    it("should generate a correctly formatted timestamp", () => {
      // Set a fixed date for testing
      const fixedDate = new Date("2023-10-15T12:30:45Z");
      vi.setSystemTime(fixedDate);

      const timestamp = markdownUtils.generateTimestamp();

      // Expected format: "Oct 15 2023 12:30:45 PM UTC"
      expect(timestamp).toBe("Oct 15 2023 12:30:45 PM UTC");
    });
  });

  describe("formatMarkdownForTerminal", () => {
    it("should format headings with colors", () => {
      const markdown =
        "# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4";
      const formatted = markdownUtils.formatMarkdownForTerminal(markdown);

      expect(formatted).toContain(
        `${colors.BOLD}${colors.FG_BLUE}Heading 1${colors.RESET}`
      );
      expect(formatted).toContain(
        `${colors.BOLD}${colors.FG_GREEN}Heading 2${colors.RESET}`
      );
      expect(formatted).toContain(
        `${colors.BOLD}${colors.FG_CYAN}Heading 3${colors.RESET}`
      );
      expect(formatted).toContain(
        `${colors.BOLD}${colors.FG_YELLOW}Heading 4${colors.RESET}`
      );
    });

    it("should format code blocks with indentation", () => {
      const markdown = "```javascript\nconst x = 1;\nconsole.log(x);\n```";
      const formatted = markdownUtils.formatMarkdownForTerminal(markdown);

      expect(formatted).toContain("\n    const x = 1;\n    console.log(x);\n");
      expect(formatted).not.toContain("```javascript");
    });

    it("should format bullet points", () => {
      const markdown = "- Item 1\n- Item 2\n- Item 3";
      const formatted = markdownUtils.formatMarkdownForTerminal(markdown);

      expect(formatted).toContain("  • Item 1");
      expect(formatted).toContain("  • Item 2");
      expect(formatted).toContain("  • Item 3");
    });

    it("should format numbered lists", () => {
      const markdown = "1. First item\n2. Second item\n3. Third item";
      const formatted = markdownUtils.formatMarkdownForTerminal(markdown);

      expect(formatted).toContain("  1. First item");
      expect(formatted).toContain("  2. Second item");
      expect(formatted).toContain("  3. Third item");
    });

    it("should format tables", () => {
      const markdown =
        "| Header 1 | Header 2 |\n|---------|----------|\n| Cell 1 | Cell 2 |";
      const formatted = markdownUtils.formatMarkdownForTerminal(markdown);

      expect(formatted).toContain("  Header 1: Header 2");
      expect(formatted).toContain("  Cell 1: Cell 2");
    });
  });

  describe("sanitize", () => {
    it("should escape HTML and markdown special characters", () => {
      const input = "<div>Test</div> [link](url)";
      const sanitized = markdownUtils.sanitize(input);

      expect(sanitized).toBe("&lt;div&gt;Test&lt;/div&gt; \\[link\\](url)");
    });
  });

  describe("createTable", () => {
    it("should create a properly formatted markdown table", () => {
      const headers = ["Name", "Age", "Location"];
      const rows = [
        ["Alice", "30", "New York"],
        ["Bob", "25", "San Francisco"],
        ["Charlie", "35", "London"],
      ];

      const table = markdownUtils.createTable(headers, rows);

      // Check header row
      expect(table).toContain("| Name | Age | Location |");

      // Check separator row
      expect(table).toContain("| --- | --- | --- |");

      // Check data rows
      expect(table).toContain("| Alice | 30 | New York |");
      expect(table).toContain("| Bob | 25 | San Francisco |");
      expect(table).toContain("| Charlie | 35 | London |");
    });
  });
});

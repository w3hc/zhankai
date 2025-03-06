import { describe, it, expect } from "vitest";
import {
  constants,
  colors,
  languageMap,
  imageExtensions,
} from "../../src/config/constants";

describe("constants", () => {
  it("should have the expected configuration properties", () => {
    expect(constants).toHaveProperty("ZHANKAI_DIR");
    expect(constants).toHaveProperty("MAX_FILE_LINES");
    expect(constants).toHaveProperty("PREVIEW_LINES");
    expect(constants).toHaveProperty("RUKH_API_URL");
    expect(constants).toHaveProperty("MAX_RETRIES");
    expect(constants).toHaveProperty("RETRY_DELAY");
    expect(constants).toHaveProperty("DEFAULT_TIMEOUT_MS");
    expect(constants).toHaveProperty("EXCLUDED_ITEMS");
    expect(constants).toHaveProperty("DEFAULT_IGNORES");
  });

  it("should have valid values for all properties", () => {
    // Check directory name
    expect(constants.ZHANKAI_DIR).toBe("zhankai");

    // Check numeric values
    expect(constants.MAX_FILE_LINES).toBeGreaterThan(0);
    expect(constants.PREVIEW_LINES).toBeGreaterThan(0);
    expect(constants.PREVIEW_LINES).toBeLessThan(constants.MAX_FILE_LINES);
    expect(constants.MAX_RETRIES).toBeGreaterThan(0);
    expect(constants.RETRY_DELAY).toBeGreaterThan(0);
    expect(constants.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);

    // Check arrays
    expect(Array.isArray(constants.EXCLUDED_ITEMS)).toBe(true);
    expect(Array.isArray(constants.DEFAULT_IGNORES)).toBe(true);

    // Check API URL format
    expect(constants.RUKH_API_URL).toMatch(/^https?:\/\//);
  });
});

describe("colors", () => {
  it("should have the expected terminal color codes", () => {
    // Style codes
    expect(colors).toHaveProperty("RESET");
    expect(colors).toHaveProperty("BOLD");
    expect(colors).toHaveProperty("DIM");

    // Foreground colors
    expect(colors).toHaveProperty("FG_BLACK");
    expect(colors).toHaveProperty("FG_RED");
    expect(colors).toHaveProperty("FG_GREEN");

    // Background colors
    expect(colors).toHaveProperty("BG_BLACK");
    expect(colors).toHaveProperty("BG_RED");
    expect(colors).toHaveProperty("BG_GREEN");
  });

  it("should have valid ANSI escape sequences", () => {
    // Check format of color codes
    Object.values(colors).forEach((code) => {
      expect(code).toMatch(/^\x1b\[\d+m$/);
    });
  });
});

describe("languageMap", () => {
  it("should map file extensions to correct language identifiers", () => {
    expect(languageMap[".ts"]).toBe("typescript");
    expect(languageMap[".js"]).toBe("javascript");
    expect(languageMap[".json"]).toBe("json");
    expect(languageMap[".md"]).toBe("markdown");
    expect(languageMap[".py"]).toBe("python");
  });

  it("should have valid language identifiers for all extensions", () => {
    Object.entries(languageMap).forEach(([ext, lang]) => {
      expect(ext).toMatch(/^\.[a-z]+$/);
      expect(typeof lang).toBe("string");
      expect(lang.length).toBeGreaterThan(0);
    });
  });
});

describe("imageExtensions", () => {
  it("should include common image file extensions", () => {
    expect(imageExtensions).toContain(".png");
    expect(imageExtensions).toContain(".jpg");
    expect(imageExtensions).toContain(".jpeg");
    expect(imageExtensions).toContain(".gif");
    expect(imageExtensions).toContain(".svg");
  });

  it("should have valid extension format for all items", () => {
    imageExtensions.forEach((ext) => {
      expect(ext).toMatch(/^\.[a-z]+$/);
    });
  });
});

import { describe, it, expect } from "vitest";
import { VERSION } from "../../src/config/version";
import pkg from "../../package.json";

describe("VERSION", () => {
  it("should be a valid semantic version", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("should match the version in package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });
});

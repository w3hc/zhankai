import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { walletUtils } from "../../src/utils/wallet";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Mock dependencies
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));
vi.mock("path", () => ({
  join: vi.fn().mockImplementation((...args) => args.join("/")),
}));
vi.mock("crypto", () => ({
  randomBytes: vi.fn().mockReturnValue(Buffer.from("0123456789abcdef")),
  scryptSync: vi
    .fn()
    .mockReturnValue(Buffer.from("0123456789abcdef0123456789abcdef")),
  createCipheriv: vi.fn(),
  createDecipheriv: vi.fn(),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("mock-password-hash"),
  })),
}));
vi.mock("ethers");
vi.mock("../../src/ui/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock("os", () => ({
  hostname: vi.fn().mockReturnValue("mock-hostname"),
}));

describe("walletUtils", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890";
  const mockPrivateKey =
    "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const mockEncryptedKey = "0123456789abcdef:encrypted-private-key";

  // Mock for cipher and decipher
  const mockCipher = {
    update: vi.fn().mockReturnValue("encrypted-private-key"),
    final: vi.fn().mockReturnValue(""),
  };

  const mockDecipher = {
    update: vi.fn().mockReturnValue(mockPrivateKey),
    final: vi.fn().mockReturnValue(""),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Set up process.env
    process.env.USER = "test-user";

    // Mock Wallet.createRandom
    vi.mocked(ethers.Wallet.createRandom).mockReturnValue({
      address: mockAddress,
      privateKey: mockPrivateKey,
    } as any);

    // Mock Wallet constructor
    vi.mocked(ethers.Wallet).mockImplementation(() => {
      return {
        address: mockAddress,
        privateKey: mockPrivateKey,
        signMessage: vi.fn().mockResolvedValue("0xmocksignature"),
      } as any;
    });

    // Mock ethers.hashMessage
    vi.mocked(ethers.hashMessage).mockReturnValue("0xmockhash");

    // Mock cipher and decipher
    vi.mocked(crypto.createCipheriv).mockReturnValue(mockCipher as any);
    vi.mocked(crypto.createDecipheriv).mockReturnValue(mockDecipher as any);

    // Mock path.join
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));

    // Default mock for existsSync (no file)
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateWallet", () => {
    it("should generate a new wallet and store credentials", async () => {
      const result = await walletUtils.generateWallet();

      expect(ethers.Wallet.createRandom).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(mockAddress),
        expect.any(String)
      );
      expect(result).toEqual({
        address: mockAddress,
        privateKey: mockPrivateKey,
      });
    });

    it("should handle errors during wallet generation", async () => {
      // Mock error
      vi.mocked(ethers.Wallet.createRandom).mockImplementation(() => {
        throw new Error("Wallet generation failed");
      });

      await expect(walletUtils.generateWallet()).rejects.toThrow(
        "Failed to generate Ethereum wallet"
      );
    });
  });

  describe("getWalletCredentials", () => {
    it("should return null if no wallet file exists", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await walletUtils.getWalletCredentials();

      expect(result).toBeNull();
    });

    it("should return wallet credentials if they exist", async () => {
      // Mock file exists
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock file content
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          address: mockAddress,
          encryptedPrivateKey: mockEncryptedKey,
        })
      );

      const result = await walletUtils.getWalletCredentials();

      expect(crypto.createDecipheriv).toHaveBeenCalled();
      expect(result).toEqual({
        address: mockAddress,
        privateKey: mockPrivateKey,
      });
    });

    it("should handle malformed wallet data", async () => {
      // Mock file exists but with invalid data
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          // Missing required fields
          some: "invalid data",
        })
      );

      const result = await walletUtils.getWalletCredentials();

      expect(result).toBeNull();
    });
  });

  describe("signMessage", () => {
    it("should return null if no wallet exists", async () => {
      vi.spyOn(walletUtils, "getWalletCredentials").mockResolvedValue(null);

      const result = await walletUtils.signMessage("test message");

      expect(result).toBeNull();
    });

    it("should sign a message and return the result", async () => {
      vi.spyOn(walletUtils, "getWalletCredentials").mockResolvedValue({
        address: mockAddress,
        privateKey: mockPrivateKey,
      });

      const message = "test message";
      const result = await walletUtils.signMessage(message);

      expect(ethers.hashMessage).toHaveBeenCalledWith(message);
      expect(result).toEqual({
        message,
        signature: "0xmocksignature",
        messageHash: "0xmockhash",
      });
    });

    it("should handle errors during signing", async () => {
      vi.spyOn(walletUtils, "getWalletCredentials").mockResolvedValue({
        address: mockAddress,
        privateKey: mockPrivateKey,
      });

      // Mock signMessage to throw
      const mockWallet = {
        address: mockAddress,
        privateKey: mockPrivateKey,
        signMessage: vi.fn().mockRejectedValue(new Error("Signing failed")),
      };
      vi.mocked(ethers.Wallet).mockImplementation(() => mockWallet as any);

      const result = await walletUtils.signMessage("test message");

      expect(result).toBeNull();
    });
  });

  describe("walletExists", () => {
    it("should return true if wallet file exists", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await walletUtils.walletExists();

      expect(result).toBe(true);
    });

    it("should return false if wallet file doesn't exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await walletUtils.walletExists();

      expect(result).toBe(false);
    });
  });
});

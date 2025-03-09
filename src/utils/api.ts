import fs from "fs/promises";
import path from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { constants } from "../config/constants";
import { logger } from "../ui/logger";
import { fileUtils } from "./file";
import { markdownUtils } from "./markdown";
import { TerminalLoader } from "../ui/loader";
import { RukhResponse, FileToUpdate } from "./types";
import { walletUtils } from "./wallet";
import { githubAuthUtils } from "./github-auth";

/**
 * API utilities namespace
 */
export const apiUtils = {
  /**
   * Fetches a SIWE challenge from Rukh API
   */
  async fetchSiweChallenge(): Promise<{
    message: string;
    nonce: string;
  } | null> {
    try {
      const loader = new TerminalLoader(
        "Fetching authentication challenge from Rukh API"
      );
      loader.start();

      const response = await fetch(
        `${constants.RUKH_API_URL.replace("/ask", "")}/siwe/challenge`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );

      loader.stop();

      if (!response.ok) {
        logger.error(
          `Failed to fetch SIWE challenge: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = await response.json();
      logger.debug("Received SIWE challenge:", data);
      return data;
    } catch (error) {
      logger.error("Error fetching SIWE challenge:", error);
      return null;
    }
  },

  /**
   * Signs a message using the GitHub-derived wallet
   */
  async signChallengeWithGithubWallet(message: string): Promise<{
    signature: string;
    address: string;
    githubUsername: string;
  } | null> {
    try {
      // Get GitHub credentials
      const githubCredentials = await githubAuthUtils.getGitHubCredentials();
      if (!githubCredentials) {
        logger.error(
          "No GitHub credentials found. Please run 'zhankai login' first."
        );
        return null;
      }

      // Get wallet credentials
      const walletCredentials = await walletUtils.getWalletCredentials();
      if (!walletCredentials) {
        logger.error(
          "No wallet credentials found. Please run 'zhankai login' first."
        );
        return null;
      }

      // Sign the message
      const signResult = await walletUtils.signMessage(message);
      if (!signResult) {
        logger.error("Failed to sign message");
        return null;
      }

      return {
        signature: signResult.signature,
        address: walletCredentials.address,
        githubUsername: githubCredentials.username,
      };
    } catch (error) {
      logger.error("Error signing challenge:", error);
      return null;
    }
  },

  /**
   * Sends a query to the Rukh API and handles the response
   */
  async sendQueryToRukh(
    query: string,
    filePath: string,
    debug: boolean,
    timeout: number = constants.DEFAULT_TIMEOUT_MS
  ): Promise<string> {
    try {
      // Validate input file access
      try {
        await fs.access(filePath);
      } catch (error) {
        logger.error("✗ Error accessing file:", error);
        throw new Error(`Cannot access file at path: ${filePath}`);
      }

      // Read the file content
      const fileContent = await fs.readFile(filePath, "utf-8");
      if (debug) {
        logger.debug("File content length:", fileContent.length);
        logger.debug(
          "File content preview:",
          fileContent.slice(0, 200) + "..."
        );
      }

      // Get SIWE authentication data
      let authData = null;
      try {
        // Fetch challenge
        const challenge = await this.fetchSiweChallenge();
        if (!challenge) {
          logger.warn(
            "Failed to get authentication challenge, proceeding without authentication"
          );
        } else {
          // Sign challenge
          const signatureData = await this.signChallengeWithGithubWallet(
            challenge.message
          );
          if (signatureData) {
            authData = {
              githubUserName: signatureData.githubUsername,
              nonce: challenge.nonce,
              signature: signatureData.signature,
            };
            logger.info(
              `Authenticated as GitHub user: ${signatureData.githubUsername}`
            );
            logger.debug("Auth data:", authData);
          }
        }
      } catch (authError) {
        logger.warn(
          "Authentication error, proceeding without authentication:",
          authError
        );
      }

      // Prepare form data
      const formData = new FormData();
      formData.append("message", query);
      formData.append("model", "anthropic");
      formData.append("sessionId", "");
      formData.append(
        "walletAddress",
        authData ? await walletUtils.getWalletAddress() : ""
      );
      formData.append("context", "zhankai");

      // Add auth data if available
      if (authData) {
        formData.append("data", JSON.stringify(authData));
      }

      const fileName = path.basename(filePath);

      // Handle file attachment
      if (typeof File === "undefined") {
        if (debug) {
          logger.debug(
            "Running in Node.js environment - using Blob for file upload"
          );
        }
        const blob = new Blob([fileContent], { type: "text/markdown" });
        formData.append("file", blob, fileName);
      } else {
        const file = new File([fileContent], fileName, {
          type: "text/markdown",
        });
        formData.append("file", file);
      }

      const loader = new TerminalLoader(
        `Sending request to ${constants.RUKH_API_URL}`
      );
      loader.start();

      // Retry logic for API requests
      let response;
      let attemptCount = 0;

      while (attemptCount < constants.MAX_RETRIES) {
        try {
          loader.updateMessage(
            `Sending request to ${constants.RUKH_API_URL}${
              attemptCount > 0
                ? ` (attempt ${attemptCount + 1}/${constants.MAX_RETRIES})`
                : ""
            }`
          );

          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          response = await fetch(constants.RUKH_API_URL, {
            method: "POST",
            headers: {
              accept: "application/json",
            },
            body: formData,
            signal: controller.signal,
          });

          // Clear the timeout
          clearTimeout(timeoutId);

          // If successful, break out of retry loop
          if (response.ok) break;

          // Handle specific error responses
          if (response.status === 401) {
            throw new Error(
              "Authentication failed. Please check your API credentials."
            );
          }

          if (response.status === 429) {
            loader.updateMessage(
              `Rate limit hit. Retrying in ${
                constants.RETRY_DELAY / 1000
              } seconds... (attempt ${attemptCount + 1}/${
                constants.MAX_RETRIES
              })`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, constants.RETRY_DELAY)
            );
            attemptCount++;
            continue;
          }

          // For other errors, try to extract error details
          const errorText = await response.text();
          let errorDetails = "Unknown error";

          try {
            // Try to parse as JSON
            const errorJson = JSON.parse(errorText);
            errorDetails =
              errorJson.message || errorJson.error || JSON.stringify(errorJson);
          } catch {
            // If not JSON, use the text
            errorDetails = errorText.slice(0, 200); // Limit error text length
          }

          logger.error(`API error (${response.status}): ${errorDetails}`);

          // Decide whether to retry based on status code
          if ([500, 502, 503, 504].includes(response.status)) {
            loader.updateMessage(
              `Server error. Retrying... (${attemptCount + 1}/${
                constants.MAX_RETRIES
              })`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, constants.RETRY_DELAY)
            );
            attemptCount++;
          } else {
            // For other status codes, don't retry
            throw new Error(
              `API request failed with status ${response.status}: ${errorDetails}`
            );
          }
        } catch (fetchError: any) {
          // Network errors or timeouts
          const isTimeout =
            fetchError.name === "AbortError" ||
            fetchError.message?.includes("timeout") ||
            fetchError.message?.includes("aborted");

          loader.updateMessage(
            `Request attempt ${attemptCount + 1} failed: ${
              isTimeout ? "Timeout" : fetchError.message
            }`
          );

          if (attemptCount < constants.MAX_RETRIES - 1) {
            loader.updateMessage(
              `Retrying in ${constants.RETRY_DELAY / 1000} seconds...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, constants.RETRY_DELAY)
            );
            attemptCount++;
          } else {
            throw new Error(
              `Failed to connect to API after ${constants.MAX_RETRIES} attempts: ${fetchError.message}`
            );
          }
        }
      }

      // If we've exited the loop without a response, all retries have failed
      if (!response || !response.ok) {
        throw new Error("All API request attempts failed");
      }

      // Process successful response
      const responseBody = await response.text();

      // Save raw response for debugging
      const baseDir = process.cwd();
      const zhankaiDir = path.join(baseDir, constants.ZHANKAI_DIR);
      const rawResponsePath = path.join(zhankaiDir, "raw_response.txt");

      try {
        await fs.writeFile(rawResponsePath, responseBody, "utf-8");
        if (debug) {
          logger.debug(`Raw response saved to ${rawResponsePath}`);
        }
      } catch (writeError) {
        logger.error("Failed to save raw response:", writeError);
      }

      let data: RukhResponse;
      try {
        data = JSON.parse(responseBody);
      } catch (e) {
        logger.error("✗ Failed to parse JSON response:", e);
        logger.debug("Raw response:", responseBody.slice(0, 1000) + "...");
        throw new Error("Failed to parse API response as JSON");
      }

      if (debug) {
        logger.debug("\nResponse details:");
        logger.debug("- Status:", response.status);

        // Fix for Headers.entries() TypeScript error
        // Use a compatible way to log headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        logger.debug("- Headers:", headers);

        logger.debug("- Response data keys:", Object.keys(data));
      }

      // Extract the content from the response
      const responseContent = data.output || data.answer || "";

      if (!responseContent) {
        logger.error("✗ No content found in response");
        logger.debug("Response structure:", Object.keys(data));
        throw new Error("Missing content in API response");
      }

      // Prepare to save the response to a file
      const baseQueryFilename = "query.md";
      const queryFilePath = path.join(zhankaiDir, baseQueryFilename);
      const uniqueQueryFilename = await fileUtils.getUniqueFilename(
        queryFilePath
      );

      // Save response to file
      try {
        await fs.writeFile(uniqueQueryFilename, responseContent, "utf-8");
        // Verify the file was written correctly
        const savedContent = await fs.readFile(uniqueQueryFilename, "utf-8");

        if (savedContent.length === 0) {
          logger.warn(
            "Warning: Saved file appears to be empty. Trying alternative method..."
          );
          // Try synchronous write as fallback
          writeFileSync(uniqueQueryFilename, responseContent, "utf-8");
        }

        logger.info(`Response saved in ${uniqueQueryFilename}`);
      } catch (writeError) {
        logger.error("Error saving response to file:", writeError);
        logger.info("Attempting alternate save method...");

        try {
          // Fallback to sync file writing
          writeFileSync(uniqueQueryFilename, responseContent, "utf-8");
          logger.info(
            `Response saved in ${uniqueQueryFilename} (using fallback method)`
          );
        } catch (syncWriteError) {
          logger.error(
            "Failed to save response with fallback method:",
            syncWriteError
          );
          // Continue execution, as we still have the response in memory
        }
      }

      // Format the response for terminal output
      const formattedResponse =
        markdownUtils.formatMarkdownForTerminal(responseContent);

      // Process the API response if it contains file specifications
      await this.processResponseForFileUpdates(data);

      loader.stop();
      // Return the formatted response
      return formattedResponse;
    } catch (error) {
      // Handle all errors
      logger.error("\n✗ Error sending query to Rukh API:", error);
      if (error instanceof Error) {
        return `Failed to get response from Rukh API: ${error.message}`;
      }
      return "Failed to get response from Rukh API";
    }
  },

  /**
   * Processes API response for file updates
   */
  async processResponseForFileUpdates(data: RukhResponse): Promise<void> {
    try {
      // First check the filesToUpdate field if it exists
      if (
        data.filesToUpdate &&
        Array.isArray(data.filesToUpdate) &&
        data.filesToUpdate.length > 0
      ) {
        logger.info(
          `Found ${data.filesToUpdate.length} file(s) to update from filesToUpdate field...\n`
        );

        for (const fileSpec of data.filesToUpdate) {
          await this.updateFile(fileSpec);
        }

        logger.info("Done! ✅");
        return;
      }

      // Then try to parse the output as JSON
      if (data.output && typeof data.output === "string") {
        try {
          // Try to extract file specs if they're in JSON format
          // This regex looks for an array of objects with fileName and fileContent properties
          const jsonRegex =
            /\[\s*\{\s*"fileName"\s*:\s*"[^"]+"\s*,\s*"fileContent"\s*:\s*"(?:\\"|[^"])+"\s*\}\s*(?:,\s*\{\s*"fileName"\s*:\s*"[^"]+"\s*,\s*"fileContent"\s*:\s*"(?:\\"|[^"])+"\s*\}\s*)*\]/;
          const match = data.output.match(jsonRegex);

          if (match) {
            try {
              const jsonOutput = JSON.parse(match[0]);
              if (Array.isArray(jsonOutput) && jsonOutput.length > 0) {
                logger.info(
                  `\nFound ${jsonOutput.length} file(s) to create/update from JSON in output...\n`
                );

                for (const spec of jsonOutput) {
                  if (spec.fileName && spec.fileContent) {
                    await this.updateFile(spec);
                  }
                }

                logger.info("Done! ✅");
                return;
              }
            } catch (err) {
              logger.error("Failed to parse JSON in output:", err);
            }
          }

          // If not found with regex, try direct JSON parse
          const jsonOutput = JSON.parse(data.output);
          if (Array.isArray(jsonOutput)) {
            logger.info(
              `\nFound ${jsonOutput.length} file(s) to create/update from API response...\n`
            );

            for (const spec of jsonOutput) {
              if (!spec.fileName || typeof spec.fileName !== "string") {
                logger.error(
                  "❌ Error: A file specification is missing the fileName property"
                );
                continue;
              }

              if (!spec.fileContent || typeof spec.fileContent !== "string") {
                logger.error(
                  `❌ Error: File specification for ${spec.fileName} is missing the fileContent property`
                );
                continue;
              }

              await this.updateFile(spec);
            }

            logger.info("Done! ✅");
          }
        } catch (error) {
          // Not valid JSON or not an array - this is normal for most responses
          logger.debug(
            "Response is not a valid JSON array, continuing with normal processing."
          );
        }
      }
    } catch (error) {
      logger.error("Error processing API response for file updates:", error);
    }
  },

  /**
   * Updates a file based on specifications from API response
   */
  async updateFile(fileSpec: FileToUpdate): Promise<void> {
    const filePath = path.join(process.cwd(), fileSpec.fileName);
    const dirPath = path.dirname(filePath);

    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    // Write the file
    try {
      writeFileSync(filePath, fileSpec.fileContent);
      logger.info(`Created/Updated file: ${fileSpec.fileName}`);
    } catch (error) {
      logger.error(
        `❌ Error creating/updating file ${fileSpec.fileName}:`,
        error
      );
    }
  },
};

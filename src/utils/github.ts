import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Check GitHub authentication and retrieve user info
 */
export const githubUtils = {
  async checkGitHubAuth(): Promise<void> {
    try {
      // Try to get the GitHub username from git config
      const { stdout: username } = await execAsync(
        "git config --global user.name"
      );

      // Try to get the GitHub email from git config
      const { stdout: email } = await execAsync(
        "git config --global user.email"
      );

      // Attempt to verify GitHub connection
      const { stdout: remotes } = await execAsync("git remote -v");

      // Check if any remotes are GitHub repositories
      const githubRemotes = remotes
        .split("\n")
        .filter((remote) => remote.includes("github.com"));

      if (username.trim() && email.trim() && githubRemotes.length > 0) {
        console.log(`✅ Logged in as: ${username.trim()} (${email.trim()})`);
      } else {
        console.log(
          "❌ Git configuration incomplete. Set up your Git user.name and user.email."
        );
      }
    } catch (error) {
      console.log("❌ Unable to verify Git authentication.");
    }
  },
};

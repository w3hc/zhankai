import readline from "readline";

/**
 * A minimalist terminal loader that displays an animation while a request is in progress
 */
export class TerminalLoader {
  private frames: string[];
  private interval: NodeJS.Timeout | null;
  private frameIndex: number;
  private message: string;
  private isActive: boolean;

  /**
   * Creates a new TerminalLoader instance
   * @param message The message to display alongside the animation
   * @param frames The animation frames (defaults to a simple spinner)
   */
  constructor(
    message: string = "Loading",
    frames: string[] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  ) {
    this.frames = frames;
    this.frameIndex = 0;
    this.message = message;
    this.interval = null;
    this.isActive = false;
  }

  /**
   * Starts the loader animation
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    process.stdout.write("\x1B[?25l"); // Hide cursor

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  /**
   * Updates the loader message
   * @param message The new message to display
   */
  updateMessage(message: string): void {
    this.message = message;
  }

  /**
   * Stops the loader animation and optionally displays a completion message
   * @param completionMessage Optional message to display after stopping the loader
   */
  stop(completionMessage?: string): void {
    if (!this.isActive) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Ensure the line is completely cleared
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    process.stdout.write("\x1B[?25h");
    this.isActive = false;
  }
}

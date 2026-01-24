import pc from 'picocolors';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  private message: string;
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.interval = setInterval(() => {
      const frame = pc.cyan(frames[this.frameIndex]);
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % frames.length;
    }, 80);
  }

  stop(success = true): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\x1B[?25h'); // Show cursor
    const icon = success ? pc.green('✓') : pc.red('✗');
    process.stdout.write(`\r${icon} ${this.message}\n`);
  }

  update(message: string): void {
    this.message = message;
  }
}

export function createSpinner(message: string): Spinner {
  return new Spinner(message);
}

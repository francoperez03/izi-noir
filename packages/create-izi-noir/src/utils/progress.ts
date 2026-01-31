import pc from 'picocolors';

const THINKING_PHRASES = [
  'Initializing ZK environment',
  'Configuring proof system',
  'Setting up circuit compiler',
  'Preparing cryptographic primitives',
  'Generating project scaffold',
  'Configuring Noir integration',
  'Setting up React components',
  'Preparing WASM bindings',
];

const FILE_ICONS: Record<string, string> = {
  '.json': '📦',
  '.ts': '📜',
  '.tsx': '⚛️',
  '.css': '🎨',
  '.html': '🌐',
  '.md': '📝',
  '.svg': '🖼️',
  default: '📄',
};

function getFileIcon(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.'));
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ProgressReporter {
  private currentLine = '';
  private thinkingIndex = 0;
  private thinkingInterval: ReturnType<typeof setInterval> | null = null;

  async startThinking(): Promise<void> {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.showThinking();
  }

  private showThinking(): void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    let dotCount = 0;

    this.thinkingInterval = setInterval(() => {
      const frame = pc.cyan(frames[frameIndex]);
      const phrase = THINKING_PHRASES[this.thinkingIndex % THINKING_PHRASES.length];
      const dots = '.'.repeat(dotCount % 4);
      // \x1B[2K clears the entire line, \r returns cursor to start
      process.stdout.write(`\x1B[2K\r${frame} ${pc.dim(phrase)}${dots}`);
      frameIndex = (frameIndex + 1) % frames.length;
      dotCount++;

      if (dotCount % 12 === 0) {
        this.thinkingIndex++;
      }
    }, 80);
  }

  stopThinking(): void {
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
    }
    process.stdout.write('\r\x1B[K'); // Clear line
  }

  async reportFile(filename: string, isLast = false): Promise<void> {
    const icon = getFileIcon(filename);
    const line = `  ${icon} ${pc.dim('created')} ${pc.white(filename)}`;

    // Typewriter effect for the filename
    process.stdout.write('  ' + icon + ' ' + pc.dim('created') + ' ');

    for (const char of filename) {
      process.stdout.write(pc.white(char));
      await sleep(8 + Math.random() * 12); // Variable speed for natural feel
    }

    process.stdout.write('\n');
    this.currentLine = line;
  }

  async reportDirectory(dirname: string): Promise<void> {
    process.stdout.write(`  📁 ${pc.dim('mkdir')}   ${pc.blue(dirname)}/\n`);
    await sleep(30);
  }

  showSuccess(message: string): void {
    process.stdout.write('\x1B[?25h'); // Show cursor
    console.log();
    console.log(pc.green('✓') + ' ' + message);
  }

  showError(message: string): void {
    process.stdout.write('\x1B[?25h'); // Show cursor
    console.log();
    console.log(pc.red('✗') + ' ' + message);
  }
}

export function createProgressReporter(): ProgressReporter {
  return new ProgressReporter();
}

// Progress bar for npm install
export class InstallProgress {
  private interval: ReturnType<typeof setInterval> | null = null;
  private progress = 0;
  private packages = [
    'react', 'react-dom', 'vite', '@izi-noir/sdk',
    '@noir-lang/acvm_js', '@noir-lang/noirc_abi',
    'prism-react-renderer', 'typescript',
  ];
  private currentPackage = 0;

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    const barWidth = 30;
    const frames = ['◐', '◓', '◑', '◒'];
    let frameIndex = 0;

    this.interval = setInterval(() => {
      const frame = pc.cyan(frames[frameIndex]);
      const filled = Math.floor((this.progress / 100) * barWidth);
      const empty = barWidth - filled;
      const bar = pc.green('█'.repeat(filled)) + pc.dim('░'.repeat(empty));
      const pkg = this.packages[this.currentPackage % this.packages.length];

      // \x1B[2K clears the entire line, \r returns cursor to start
      process.stdout.write(
        `\x1B[2K\r${frame} Installing dependencies ${bar} ${pc.dim(pkg)}`
      );

      frameIndex = (frameIndex + 1) % frames.length;

      // Simulate progress
      if (this.progress < 95) {
        this.progress += Math.random() * 3;
        if (this.progress > (this.currentPackage + 1) * 12) {
          this.currentPackage++;
        }
      }
    }, 100);
  }

  stop(success = true): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\x1B[?25h'); // Show cursor
    process.stdout.write('\r\x1B[K'); // Clear line

    const icon = success ? pc.green('✓') : pc.red('✗');
    const message = success ? 'Dependencies installed' : 'Failed to install dependencies';
    console.log(`${icon} ${message}`);
  }
}

export function createInstallProgress(): InstallProgress {
  return new InstallProgress();
}

// Dynamic progress for git init
export class GitProgress {
  private interval: ReturnType<typeof setInterval> | null = null;
  private phases = [
    'Initializing repository',
    'Setting up version control',
    'Creating .git directory',
    'Configuring git objects',
    'Preparing initial branch',
  ];
  private phaseIndex = 0;
  private dotCount = 0;

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    this.interval = setInterval(() => {
      const frame = pc.cyan(frames[frameIndex]);
      const phase = this.phases[this.phaseIndex % this.phases.length];
      const dots = '.'.repeat(this.dotCount % 4);

      // \x1B[2K clears the entire line, \r returns cursor to start
      process.stdout.write(`\x1B[2K\r${frame} ${pc.dim(phase)}${dots}`);

      frameIndex = (frameIndex + 1) % frames.length;
      this.dotCount++;

      // Change phase every ~8 iterations (640ms)
      if (this.dotCount % 8 === 0) {
        this.phaseIndex++;
      }
    }, 80);
  }

  stop(success = true): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\x1B[?25h'); // Show cursor
    process.stdout.write('\r\x1B[K'); // Clear line

    const icon = success ? pc.green('✓') : pc.red('✗');
    const message = success ? 'Git repository initialized' : 'Failed to initialize git';
    console.log(`${icon} ${message}`);
  }
}

export function createGitProgress(): GitProgress {
  return new GitProgress();
}

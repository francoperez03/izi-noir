import type { ProjectOptions } from '../prompts/project.js';

export function generateConfig(options: ProjectOptions): string {
  return `import { defineConfig } from '@izi-noir/sdk';

export default defineConfig({
  // Directory containing your circuit files
  circuitsDir: './circuits',

  // Output directory for compiled circuits
  outDir: './generated',

  // Proving provider to use
  provider: '${options.provider}',

  // Enable watch mode optimizations
  watch: {
    // Debounce file changes (ms)
    debounce: 100,
  },
});
`;
}

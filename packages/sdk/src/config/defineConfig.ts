/**
 * Configuration for IZI-NOIR project build
 */
export interface IziNoirBuildConfig {
  /** Directory containing circuit files */
  circuitsDir: string;

  /** Output directory for compiled circuits */
  outDir: string;

  /** Proving provider to use */
  provider: 'arkworks' | 'barretenberg';

  /** Watch mode configuration */
  watch?: {
    /** Debounce time for file changes in milliseconds */
    debounce?: number;
  };

  /** Advanced options */
  advanced?: {
    /** Enable debug output */
    debug?: boolean;
    /** Parallel compilation */
    parallel?: boolean;
  };
}

/**
 * Helper function to define IZI-NOIR configuration with type safety.
 *
 * @example
 * ```typescript
 * // izi-noir.config.ts
 * import { defineConfig } from '@izi-noir/sdk';
 *
 * export default defineConfig({
 *   circuitsDir: './circuits',
 *   outDir: './generated',
 *   provider: 'arkworks',
 * });
 * ```
 */
export function defineConfig(config: IziNoirBuildConfig): IziNoirBuildConfig {
  return config;
}

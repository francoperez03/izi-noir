import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Paths to a Noir project structure
 */
export interface NoirProjectPaths {
  /** Root directory of the project */
  rootDir: string;
  /** Source directory (src/) */
  srcDir: string;
  /** Path to main.nr */
  mainNrPath: string;
  /** Path to Nargo.toml */
  nargoTomlPath: string;
}

/**
 * Create a temporary Noir project with the given code
 *
 * @param noirCode - The Noir source code to write to main.nr
 * @param prefix - Prefix for the temp directory name
 * @param packageName - Name for the package in Nargo.toml
 * @returns Paths to the created project structure
 */
export async function createNoirProject(
  noirCode: string,
  prefix = 'noir-circuit-',
  packageName = 'circuit'
): Promise<NoirProjectPaths> {
  const rootDir = await mkdtemp(join(tmpdir(), prefix));
  const srcDir = join(rootDir, 'src');

  await mkdir(srcDir, { recursive: true });

  const nargoToml = `[package]
name = "${packageName}"
type = "bin"
authors = [""]

[dependencies]
`;

  await writeFile(join(rootDir, 'Nargo.toml'), nargoToml);
  await writeFile(join(srcDir, 'main.nr'), noirCode);

  return {
    rootDir,
    srcDir,
    mainNrPath: join(srcDir, 'main.nr'),
    nargoTomlPath: join(rootDir, 'Nargo.toml'),
  };
}

/**
 * Clean up a Noir project directory
 */
export async function cleanupNoirProject(paths: NoirProjectPaths): Promise<void> {
  await rm(paths.rootDir, { recursive: true, force: true });
}
